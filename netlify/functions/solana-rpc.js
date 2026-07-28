// netlify/functions/solana-rpc.js
//
// Thin, safe proxy to a Solana JSON-RPC endpoint.
//
// Why this exists instead of calling Solana RPC directly from the browser:
//  - Lets the RPC endpoint be swapped for a private/paid provider (Helius,
//    QuickNode, Triton, etc.) via the SOLANA_RPC_URL env var without ever
//    putting that URL (which usually embeds an API key) in frontend code.
//  - Restricts callers to a small allowlist of read-only RPC methods so this
//    function can't be abused as an open RPC relay.
//  - Gives one place to normalize error handling for the frontend.
//
// No secret key is required to run this with the default public endpoint,
// but if you configure SOLANA_RPC_URL to a provider that needs a key in the
// URL or headers, that value only ever lives in Netlify's environment
// variables — never in the client bundle.

const DEFAULT_RPC_URL = "https://api.mainnet-beta.solana.com";

// Only allow the read-only methods this app actually needs.
const ALLOWED_METHODS = new Set([
  "getHealth",
  "getAccountInfo",
  "getTokenSupply",
  "getTokenLargestAccounts",
  "getMultipleAccounts",
]);

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

  const rpcUrl = process.env.SOLANA_RPC_URL || DEFAULT_RPC_URL;

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
      return respond(502, {
        error: `Upstream RPC returned a non-JSON response (HTTP ${upstream.status})`,
      });
    }

    if (!upstream.ok) {
      return respond(502, {
        error: json?.error?.message || `Upstream RPC error (HTTP ${upstream.status})`,
      });
    }

    return respond(200, json);
  } catch (err) {
    return respond(502, { error: `Failed to reach Solana RPC: ${err.message}` });
  }
}

function respond(statusCode, payload) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  };
}
