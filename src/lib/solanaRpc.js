// src/lib/solanaRpc.js
//
// Real on-chain data only. Every function here either returns data parsed
// straight out of a Solana JSON-RPC response, or throws — there is no
// placeholder/fallback value baked in.
//
// Rate-limit handling: the serverless proxy (netlify/functions/solana-rpc.js)
// already tries multiple RPC endpoints per request before giving up. On top
// of that, getMintInfo/getLargestHolders retry the whole request up to 3
// times when every endpoint reports a rate limit, via withRetry(). Errors
// thrown from rpcCall() carry an `err.rateLimited` flag so callers (and the
// retry helper) can tell a rate limit apart from a real "not found" error —
// only the former is retried.

import { withRetry } from "./retry.js";

const RPC_ENDPOINT = "/.netlify/functions/solana-rpc";

async function rpcCall(method, params) {
  let res;
  try {
    res = await fetch(RPC_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method, params }),
    });
  } catch (err) {
    throw new Error(
      "Could not reach the Solana RPC proxy. Check your network connection."
    );
  }

  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error("Received an invalid response from the Solana RPC proxy.");
  }

  if (!res.ok) {
    const err = new Error(json?.error || `RPC proxy error (HTTP ${res.status})`);
    err.rateLimited = Boolean(json?.rateLimited);
    throw err;
  }
  if (json.error) {
    const message = json.error.message || "Solana RPC returned an error.";
    const err = new Error(message);
    err.rateLimited = /too many requests|rate limit/i.test(message);
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
 * Retries automatically (up to 3 attempts) if every RPC endpoint reports a
 * rate limit, calling `onRetry(attempt, err)` before each retry.
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
    async () => {
      const result = await rpcCall("getAccountInfo", [
        mintAddress,
        { encoding: "jsonParsed" },
      ]);

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
 * 3 attempts) if every RPC endpoint reports a rate limit, calling
 * `onRetry(attempt, err)` before each retry.
 *
 * @returns {Array<{ address: string, amountRaw: string, decimals: number }>}
 */
export async function getLargestHolders(mintAddress, { onRetry } = {}) {
  return withRetry(
    async () => {
      const result = await rpcCall("getTokenLargestAccounts", [mintAddress]);
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
