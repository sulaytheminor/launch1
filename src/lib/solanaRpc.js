// src/lib/solanaRpc.js
//
// Real on-chain data only. Every function here either returns data parsed
// straight out of a Solana JSON-RPC response, or throws — there is no
// placeholder/fallback value baked in.
//
// Rate-limit / 502 handling: the serverless proxy (netlify/functions/solana-rpc.js)
// already tries multiple RPC endpoints per request before giving up. On top
// of that, getMintInfo/getLargestHolders retry the whole request up to 3
// times whenever the proxy reports a transient failure — a rate limit
// (429), a bad gateway/unavailable/timeout (502/503/504), or a network
// error — via withRetry(). Errors thrown from rpcCall() carry a
// `err.retryable` flag (and a more specific `err.rateLimited` flag for
// UI messaging) so callers can tell a transient failure apart from a real
// "not found" error — only the former is retried. Each retry also asks the
// proxy to start from a different RPC endpoint (see the `attempt` param
// below), so repeated failures actually rotate through every configured
// endpoint instead of hammering the same one.

import { withRetry } from "./retry.js";

const RPC_ENDPOINT = "/.netlify/functions/solana-rpc";

async function rpcCall(method, params, attempt = 1) {
  let res;
  try {
    res = await fetch(RPC_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method, params, attempt }),
    });
  } catch (err) {
    const networkErr = new Error(
      "Could not reach the Solana RPC proxy. Check your network connection."
    );
    // A failed fetch to our own proxy is itself transient (offline blip,
    // DNS hiccup, etc.) — worth retrying rather than failing immediately.
    networkErr.retryable = true;
    throw networkErr;
  }

  let json;
  try {
    json = await res.json();
  } catch {
    const err = new Error("Received an invalid response from the Solana RPC proxy.");
    err.retryable = true;
    throw err;
  }

  if (!res.ok) {
    const err = new Error(json?.error || `RPC proxy error (HTTP ${res.status})`);
    err.rateLimited = Boolean(json?.rateLimited);
    // Any 429/502/503/504 (or the proxy's own `retryable` flag) is worth
    // retrying with a different endpoint — not just rate limits.
    err.retryable =
      Boolean(json?.retryable) || err.rateLimited || res.status === 429 || res.status >= 500;
    throw err;
  }
  if (json.error) {
    const message = json.error.message || "Solana RPC returned an error.";
    const err = new Error(message);
    err.rateLimited = /too many requests|rate limit/i.test(message);
    err.retryable = err.rateLimited;
    throw err;
  }

  return json.result;
}

/**
 * Real connectivity check against the Solana RPC endpoint (via the proxy).
 * Throws if the endpoint can't be reached at all. Doesn't fabricate a
 * "connected" state — if this resolves, a real round trip to Solana RPC
 * actually happened.
 */
export async function checkConnection() {
  return rpcCall("getHealth", []);
}

/**
 * Fetches and parses an SPL token mint account.
 * Throws if the address doesn't exist on-chain or isn't a token mint.
 * Retries automatically (up to 3 attempts, rotating RPC endpoints) on any
 * transient failure — rate limit, 502/503/504, or network error — calling
 * `onRetry(attempt, err)` before each retry.
 *
 * @returns {{
 *   decimals: number,
 *   supplyRaw: string,        // raw u64 supply as a string (no decimals applied)
 *   mintAuthority: string|null,
 *   freezeAuthority: string|null,
 *   isInitialized: boolean,
 * }}
 */
export async function getMintInfo(mintAddress, { onRetry } = {}) {
  return withRetry(
    async (attempt) => {
      const result = await rpcCall(
        "getAccountInfo",
        [mintAddress, { encoding: "jsonParsed" }],
        attempt
      );

      if (!result || !result.value) {
        throw new Error(
          "No account was found at this address on Solana mainnet. Double-check the mint address."
        );
      }

      const parsed = result.value.data?.parsed;
      if (!parsed || parsed.type !== "mint" || !parsed.info) {
        throw new Error(
          "This address exists on-chain but is not an SPL token mint account."
        );
      }

      const info = parsed.info;
      return {
        decimals: info.decimals,
        supplyRaw: info.supply,
        mintAuthority: info.mintAuthority ?? null,
        freezeAuthority: info.freezeAuthority ?? null,
        isInitialized: Boolean(info.isInitialized),
      };
    },
    { maxAttempts: 3, onRetry }
  );
}

/**
 * Fetches the largest holder token accounts for a mint (on-chain, up to 20,
 * ordered descending by balance — this is exactly what Solana's
 * getTokenLargestAccounts RPC method returns). Retries automatically (up to
 * 3 attempts, rotating RPC endpoints) on any transient failure — rate
 * limit, 502/503/504, or network error — calling `onRetry(attempt, err)`
 * before each retry.
 *
 * @returns {Array<{ address: string, amountRaw: string, decimals: number }>}
 */
export async function getLargestHolders(mintAddress, { onRetry } = {}) {
  return withRetry(
    async (attempt) => {
      const result = await rpcCall("getTokenLargestAccounts", [mintAddress], attempt);
      const accounts = result?.value || [];
      return accounts.map((a) => ({
        address: a.address,
        amountRaw: a.amount,
        decimals: a.decimals,
      }));
    },
    { maxAttempts: 3, onRetry }
  );
}
