// src/lib/solanaRpc.js
//
// Real on-chain data only. Every function here either returns data parsed
// straight out of a Solana JSON-RPC response, or throws — there is no
// placeholder/fallback value baked in.

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
    throw new Error(json?.error || `RPC proxy error (HTTP ${res.status})`);
  }
  if (json.error) {
    throw new Error(json.error.message || "Solana RPC returned an error.");
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
 *
 * @returns {{
 *   decimals: number,
 *   supplyRaw: string,        // raw u64 supply as a string (no decimals applied)
 *   mintAuthority: string|null,
 *   freezeAuthority: string|null,
 *   isInitialized: boolean,
 * }}
 */
export async function getMintInfo(mintAddress) {
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
}

/**
 * Fetches the largest holder token accounts for a mint (on-chain, up to 20,
 * ordered descending by balance — this is exactly what Solana's
 * getTokenLargestAccounts RPC method returns).
 *
 * @returns {Array<{ address: string, amountRaw: string, decimals: number }>}
 */
export async function getLargestHolders(mintAddress) {
  const result = await rpcCall("getTokenLargestAccounts", [mintAddress]);
  const accounts = result?.value || [];
  return accounts.map((a) => ({
    address: a.address,
    amountRaw: a.amount,
    decimals: a.decimals,
  }));
}
