// src/lib/solanaRpc.js
//
// Real on-chain data only, fetched directly from Helius (see
// src/lib/heliusConnection.js) via @solana/web3.js's Connection — no proxy
// server, no mock data, no placeholder values. Every function here either
// returns data parsed straight out of a real RPC response, or throws.
//
// Transient failures (rate limits, 5xx, network blips) are retried up to 3
// times with a short backoff via withRetry() (src/lib/retry.js). A genuine
// "mint not found" or "not an SPL token" error fails immediately instead of
// retrying something that can never succeed. If VITE_HELIUS_API_KEY isn't
// configured, every function here throws a clear MissingHeliusKeyError
// (see heliusConnection.js) on the very first attempt — that error is never
// retried, and it's surfaced to the user through the existing terminal/
// error UI rather than crashing the app.

import { PublicKey } from "@solana/web3.js";
import { withRetry } from "./retry.js";
import { getConnection, MissingHeliusKeyError } from "./heliusConnection.js";

/** Classifies a thrown error as retryable (rate limit, 5xx, network blip)
 *  vs. permanent (bad request, not found, missing config) so withRetry only
 *  retries what's actually worth retrying. */
function classifyError(err) {
  const message = String(err?.message || err || "");
  const rateLimited = /\b429\b|too many requests|rate limit/i.test(message);
  const transient =
    rateLimited ||
    /\b50[0-9]\b|bad gateway|service unavailable|gateway timeout|fetch failed|network ?error|timed? ?out|ECONNRESET|ETIMEDOUT/i.test(
      message
    );
  err.rateLimited = rateLimited;
  err.retryable = transient;
  return err;
}

async function callHelius(fn) {
  const connection = getConnection(); // throws MissingHeliusKeyError if unset — never retried
  try {
    return await fn(connection);
  } catch (err) {
    if (err instanceof MissingHeliusKeyError) throw err;
    throw classifyError(err instanceof Error ? err : new Error(String(err)));
  }
}

/**
 * Real connectivity check against Helius. Throws (MissingHeliusKeyError, or
 * a real network/RPC error) if it can't be reached — never fakes a
 * "connected" state.
 */
export async function checkConnection() {
  return callHelius((connection) => connection.getVersion());
}

/**
 * Fetches and parses an SPL token mint account via Helius.
 * Throws if the address doesn't exist on-chain, isn't a token mint, or if
 * VITE_HELIUS_API_KEY isn't configured. Retries automatically (up to 3
 * attempts) on any transient failure, calling `onRetry(attempt, err)`
 * before each retry.
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
      const result = await callHelius((connection) =>
        connection.getParsedAccountInfo(new PublicKey(mintAddress))
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
 * Fetches the largest holder token accounts for a mint via Helius (on-chain,
 * up to 20, ordered descending by balance — this is exactly what Solana's
 * getTokenLargestAccounts RPC method returns). Retries automatically (up to
 * 3 attempts) on any transient failure, calling `onRetry(attempt, err)`
 * before each retry.
 *
 * @returns {Array<{ address: string, amountRaw: string, decimals: number }>}
 */
export async function getLargestHolders(mintAddress, { onRetry } = {}) {
  return withRetry(
    async () => {
      const result = await callHelius((connection) =>
        connection.getTokenLargestAccounts(new PublicKey(mintAddress))
      );

      const accounts = result?.value || [];
      return accounts.map((a) => ({
        address: a.address.toBase58(),
        amountRaw: a.amount,
        decimals: a.decimals,
      }));
    },
    { maxAttempts: 3, onRetry }
  );
}
