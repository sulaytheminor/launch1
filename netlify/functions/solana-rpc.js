// netlify/functions/solana-rpc.js
//
// Thin, safe proxy to a Solana JSON-RPC endpoint, with automatic fallback
// across multiple RPC providers when one is unreachable or rate-limiting.
//
// Why this exists instead of calling Solana RPC directly from the browser:
//  - Lets the RPC endpoint(s) be swapped for a private/paid provider
//    (Helius, QuickNode, Triton, etc.) via env vars without ever putting
//    that URL (which usually embeds an API key) in frontend code.
//  - Restricts callers to a small allowlist of read-only RPC methods so this
//    function can't be abused as an open RPC relay.
//  - Gives one place to normalize error handling and rate-limit fallback
//    for the frontend.
//
// Endpoint resolution order:
//  1. SOLANA_RPC_URL (your primary/paid endpoint, if set)
//  2. SOLANA_RPC_FALLBACK_URLS (comma-separated extra endpoints, if set)
//  3. A small built-in list of public endpoints, always appended last as a
//     final safety net.
//
// For a single incoming request, every endpoint is tried in order until one
// succeeds — a 502/503/504, a 429 (rate limit), or a network error on one
// endpoint just moves on to the next. If ALL endpoints fail, this responds
// 502 with `retryable: true` (see below) so the frontend's retry wrapper
// (src/lib/retry.js) tries the whole request again — up to 3 attempts total
// — rather than giving up on the first 502.
//
// Each client-side retry also sends an `attempt` number, which rotates
// which endpoint we start from (attempt 1 starts at endpoint 0, attempt 2
// starts at endpoint 1, etc.). Combined with the per-request loop above,
// this means a request that fails 3 times in a row will actually have
// tried every configured endpoint from a different starting point each
// time, instead of always hammering the same one first.

const BUILT_IN_FALLBACKS = [
  "https://api.mainnet-beta.solana.com",
  "https://solana-rpc.publicnode.com",
  "https://rpc.ankr.com/solana",
];

// Only allow the read-only methods this app actually needs.
const ALLOWED_METHODS = new Set([
  "getHealth",
  "getAccountInfo",
  "getTokenSupply",
  "getTokenLargestAccounts",
  "getMultipleAccounts",
]);

function getRpcEndpoints() {
  const configured = [];
  if (process.env.SOLANA_RPC_URL) configured.push(process.env.SOLANA_RPC_URL);
  if (process.env.SOLANA_RPC_FALLBACK_URLS) {
    configured.push(
      ...process.env.SOLANA_RPC_FALLBACK_URLS.split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    );
  }

  const endpoints = configured.length ? configured : [];
  for (const fallback of BUILT_IN_FALLBACKS) {
    if (!endpoints.includes(fallback)) endpoints.push(fallback);
  }
  return endpoints;
}

/** Rotates the endpoint list so a different one is tried first each attempt. */
function rotateEndpoints(endpoints, attempt) {
  if (endpoints.length <= 1) return endpoints;
  const offset = ((attempt - 1) % endpoints.length + endpoints.length) % endpoints.length;
  return [...endpoints.slice(offset), ...endpoints.slice(0, offset)];
}

function isRateLimitResponse(httpStatus, json) {
  if (httpStatus === 429) return true;
  const message = json?.error?.message || "";
  return /too many requests|rate limit/i.test(message);
}

// 5xx (bad gateway/unavailable/timeout) and 429 are all transient — worth a
// retry with a different endpoint. A 4xx other than 429 (e.g. malformed
// request) is not, since retrying it will just fail the same way.
function isTransientStatus(httpStatus) {
  return httpStatus === 429 || httpStatus >= 500;
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return respond(405, { error: "Method not allowed" });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return respond(400, { error: "Invalid JSON body" });
  }

  const { method, params, attempt } = body;

  if (typeof method !== "string" || !ALLOWED_METHODS.has(method)) {
    return respond(400, { error: `Method not permitted: ${method}` });
  }
  if (params !== undefined && !Array.isArray(params)) {
    return respond(400, { error: "params must be an array" });
  }

  const endpoints = rotateEndpoints(
    getRpcEndpoints(),
    Number.isInteger(attempt) ? attempt : 1
  );
  let lastError = null;
  let sawRateLimit = false;
  let sawTransient = false;

  for (const rpcUrl of endpoints) {
    try {
      const upstream = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method,
          params: params || [],
        }),
      });

      const text = await upstream.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        sawTransient = true;
        lastError = `Upstream RPC returned a non-JSON response (HTTP ${upstream.status})`;
        continue; // try next endpoint
      }

      if (isRateLimitResponse(upstream.status, json)) {
        sawRateLimit = true;
        sawTransient = true;
        lastError = json?.error?.message || `Rate limited (HTTP ${upstream.status})`;
        continue; // try next endpoint
      }

      if (!upstream.ok) {
        if (isTransientStatus(upstream.status)) sawTransient = true;
        lastError = json?.error?.message || `Upstream RPC error (HTTP ${upstream.status})`;
        continue; // try next endpoint
      }

      // Success — return immediately, even if this wasn't the first endpoint.
      return respond(200, json);
    } catch (err) {
      // Network-level failure reaching this endpoint — always worth trying
      // the next one / a later client-side retry.
      sawTransient = true;
      lastError = `Failed to reach ${rpcUrl}: ${err.message}`;
      continue;
    }
  }

  // Every configured endpoint failed. `retryable` covers ANY transient
  // failure (429s, 5xx, network errors, bad responses) — not just rate
  // limits — so the frontend retries a plain 502 just as readily as a 429.
  return respond(502, {
    error: lastError || "All Solana RPC endpoints failed.",
    rateLimited: sawRateLimit,
    retryable: sawTransient,
  });
}

function respond(statusCode, payload) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  };
}
