// netlify/functions/solana-rpc.js
//
// Thin, safe proxy to a Solana JSON-RPC endpoint, with automatic fallback
// across multiple RPC providers when one is unreachable, rate-limiting, or
// erroring — and strict "never retry a host that already failed" tracking
// across the whole client-side retry sequence, not just within one call.
//
// Why this exists instead of calling Solana RPC directly from the browser:
//  - Lets the RPC endpoint(s) be swapped for a private/paid provider
//    (Helius, QuickNode, Triton, Chainstack, etc.) via env vars without ever
//    putting that URL (which usually embeds an API key) in frontend code.
//  - Restricts callers to a small allowlist of read-only RPC methods so this
//    function can't be abused as an open RPC relay.
//  - Gives one place to normalize error handling and multi-endpoint
//    fallback for the frontend.
//
// Endpoint resolution order:
//  1. SOLANA_RPC_URL (your primary/paid endpoint, if set)
//  2. SOLANA_RPC_FALLBACK_URLS (comma-separated extra endpoints, if set)
//  3. A small built-in list of public endpoints, always appended last as a
//     final safety net.
//
// Provider detection: Solana's own docs are explicit that the default
// public endpoint (api.mainnet-beta.solana.com) is shared infrastructure,
// not meant for production, and will return 429/403 under real load
// (see https://solana.com/docs/rpc). If SOLANA_RPC_URL isn't set, this
// function is running entirely on that shared public tier (plus other
// public fallbacks), so it logs a one-line warning on every cold start
// pointing at how to configure a dedicated endpoint. This never blocks a
// request — it's informational only, visible in Netlify function logs.
//
// "Don't retry a failed endpoint" across attempts: each client-side retry
// (src/lib/retry.js / src/lib/solanaRpc.js) sends back the *hosts* (not
// full URLs — no risk of leaking a key embedded in a custom endpoint's
// path/query) that already failed on earlier attempts, via `excludeHosts`.
// Those hosts are filtered out before this invocation even tries them. On
// failure, the response's `failedHosts` lists every host actually
// attempted this invocation so the client can add them to its exclusion
// set for the next attempt. Only if literally every configured endpoint
// has already failed at least once does the exclusion list reset — better
// to give a real, distinct endpoint another shot than to hard-fail
// permanently after one bad pass through a short list.

const BUILT_IN_FALLBACKS = [
  "https://api.mainnet-beta.solana.com",
  "https://solana-rpc.publicnode.com",
  "https://rpc.ankr.com/solana",
  "https://solana.drpc.org",
];

// Only allow the read-only methods this app actually needs.
const ALLOWED_METHODS = new Set([
  "getHealth",
  "getAccountInfo",
  "getTokenSupply",
  "getTokenLargestAccounts",
  "getMultipleAccounts",
]);

let loggedProviderStatusOnce = false;

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

/** Safe-to-expose identifier for an endpoint: hostname only, never the
 *  full URL (which may carry an API key in its path or query string). */
function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/** Logs (once per cold start) whether we're relying on the default public
 *  RPC tier, and points at how to configure a dedicated one instead. */
function logProviderDetectionOnce() {
  if (loggedProviderStatusOnce) return;
  loggedProviderStatusOnce = true;

  if (process.env.SOLANA_RPC_URL) {
    console.log(
      `[solana-rpc] Using configured primary endpoint: ${hostOf(process.env.SOLANA_RPC_URL)}`
    );
  } else {
    console.warn(
      "[solana-rpc] No SOLANA_RPC_URL configured — running entirely on public " +
        "RPC endpoints (api.mainnet-beta.solana.com and other free fallbacks). " +
        "Solana's own docs note public endpoints are shared infrastructure not " +
        "meant for production traffic and will 429/403 under real load. Set " +
        "SOLANA_RPC_URL (and optionally SOLANA_RPC_FALLBACK_URLS) in your Netlify " +
        "environment variables to a dedicated provider (Helius, QuickNode, " +
        "Triton, Chainstack, etc.) for reliable service."
    );
  }
}

/** Rotates the endpoint list so a different one is tried first each attempt. */
function rotateEndpoints(endpoints, attempt) {
  if (endpoints.length <= 1) return endpoints;
  const offset = ((attempt - 1) % endpoints.length + endpoints.length) % endpoints.length;
  return [...endpoints.slice(offset), ...endpoints.slice(0, offset)];
}

/** Drops any endpoint whose host is in excludeHosts — i.e. one that already
 *  failed on an earlier client-side attempt. If that would leave nothing to
 *  try, falls back to the full list rather than dead-ending permanently. */
function excludeFailedHosts(endpoints, excludeHosts) {
  if (!excludeHosts || excludeHosts.length === 0) return endpoints;
  const excludeSet = new Set(excludeHosts);
  const remaining = endpoints.filter((url) => !excludeSet.has(hostOf(url)));
  return remaining.length > 0 ? remaining : endpoints;
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

  logProviderDetectionOnce();

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return respond(400, { error: "Invalid JSON body" });
  }

  const { method, params, attempt, excludeHosts } = body;

  if (typeof method !== "string" || !ALLOWED_METHODS.has(method)) {
    return respond(400, { error: `Method not permitted: ${method}` });
  }
  if (params !== undefined && !Array.isArray(params)) {
    return respond(400, { error: "params must be an array" });
  }
  if (excludeHosts !== undefined && !Array.isArray(excludeHosts)) {
    return respond(400, { error: "excludeHosts must be an array" });
  }

  let endpoints = excludeFailedHosts(getRpcEndpoints(), excludeHosts);
  endpoints = rotateEndpoints(endpoints, Number.isInteger(attempt) ? attempt : 1);

  let lastError = null;
  let sawRateLimit = false;
  let sawTransient = false;
  const triedHosts = [];

  for (const rpcUrl of endpoints) {
    const host = hostOf(rpcUrl);
    triedHosts.push(host);

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
        continue; // try the next, different endpoint
      }

      if (isRateLimitResponse(upstream.status, json)) {
        sawRateLimit = true;
        sawTransient = true;
        lastError = json?.error?.message || `Rate limited (HTTP ${upstream.status})`;
        continue; // try the next, different endpoint
      }

      if (!upstream.ok) {
        if (isTransientStatus(upstream.status)) sawTransient = true;
        lastError = json?.error?.message || `Upstream RPC error (HTTP ${upstream.status})`;
        continue; // try the next, different endpoint
      }

      // Success — return immediately, even if this wasn't the first endpoint.
      return respond(200, { ...json, __meta: { usedHost: host } });
    } catch (err) {
      // Network-level failure reaching this endpoint — always worth trying
      // a different one, never this same host again this invocation.
      sawTransient = true;
      lastError = `Failed to reach ${host}: ${err.message}`;
      continue;
    }
  }

  // Every available endpoint failed. `retryable` covers ANY transient
  // failure (429s, 5xx, network errors, bad responses) — not just rate
  // limits. `failedHosts` tells the client exactly which hosts to exclude
  // on its next attempt, so a dead endpoint is never retried again.
  return respond(502, {
    error: lastError || "All Solana RPC endpoints failed.",
    rateLimited: sawRateLimit,
    retryable: sawTransient,
    failedHosts: triedHosts,
  });
}

function respond(statusCode, payload) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  };
}
