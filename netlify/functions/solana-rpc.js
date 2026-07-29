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
// For a single incoming request, each endpoint is tried in order until one
// succeeds. If every endpoint reports a rate limit, the response carries
// `rateLimited: true` so the frontend can show a clear "RPC limit detected"
// message and drive its own client-side retry (see src/lib/solanaRpc.js)
// instead of a generic failure.

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

function isRateLimitResponse(httpStatus, json) {
  if (httpStatus === 429) return true;
  const message = json?.error?.message || "";
  return /too many requests|rate limit/i.test(message);
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

  const { method, params } = body;

  if (typeof method !== "string" || !ALLOWED_METHODS.has(method)) {
    return respond(400, { error: `Method not permitted: ${method}` });
  }
  if (params !== undefined && !Array.isArray(params)) {
    return respond(400, { error: "params must be an array" });
  }

  const endpoints = getRpcEndpoints();
  let lastError = null;
  let sawRateLimit = false;

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
        lastError = `Upstream RPC returned a non-JSON response (HTTP ${upstream.status})`;
        continue; // try next endpoint
      }

      if (isRateLimitResponse(upstream.status, json)) {
        sawRateLimit = true;
        lastError = json?.error?.message || `Rate limited (HTTP ${upstream.status})`;
        continue; // try next endpoint
      }

      if (!upstream.ok) {
        lastError = json?.error?.message || `Upstream RPC error (HTTP ${upstream.status})`;
        continue; // try next endpoint
      }

      // Success — return immediately, even if this wasn't the first endpoint.
      return respond(200, json);
    } catch (err) {
      lastError = `Failed to reach ${rpcUrl}: ${err.message}`;
      continue; // network error — try next endpoint
    }
  }

  // Every configured endpoint failed.
  return respond(502, {
    error: lastError || "All Solana RPC endpoints failed.",
    rateLimited: sawRateLimit,
  });
}

function respond(statusCode, payload) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  };
}
