// src/lib/jupiterMarket.js
//
// Real market/metadata only, sourced from Jupiter's public Tokens V2 API via
// the netlify/functions/jupiter-token.js proxy. If Jupiter hasn't indexed a
// token (e.g. it's brand new or has no trading pool), this returns
// `{ found: false }` rather than inventing numbers — callers must handle
// that case explicitly instead of falling back to placeholder data.

/**
 * @returns {{ found: false } | { found: true, name: string, symbol: string,
 *   icon: string|null, decimals: number, priceUsd: number|null,
 *   marketCapUsd: number|null, fdvUsd: number|null, liquidityUsd: number|null,
 *   volume24hUsd: number|null, holderCount: number|null, isVerified: boolean|null,
 *   organicScoreLabel: string|null,
 *   audit: { mintAuthorityDisabled: boolean|null, freezeAuthorityDisabled: boolean|null,
 *            topHoldersPercent: number|null } }}
 */
export async function getMarketData(mintAddress) {
  let res;
  try {
    res = await fetch(
      `/.netlify/functions/jupiter-token?mint=${encodeURIComponent(mintAddress)}`
    );
  } catch (err) {
    throw new Error("Could not reach the market data proxy. Check your network connection.");
  }

  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error("Received an invalid response from the market data proxy.");
  }

  if (!res.ok) {
    throw new Error(json?.error || `Market data proxy error (HTTP ${res.status})`);
  }

  if (!json.found) {
    return { found: false };
  }

  const t = json.token;
  const stats24h = t.stats24h;
  const volume24hUsd =
    stats24h && typeof stats24h.buyVolume === "number" && typeof stats24h.sellVolume === "number"
      ? stats24h.buyVolume + stats24h.sellVolume
      : null;

  return {
    found: true,
    name: t.name ?? null,
    symbol: t.symbol ?? null,
    icon: t.icon ?? null,
    decimals: typeof t.decimals === "number" ? t.decimals : null,
    priceUsd: typeof t.usdPrice === "number" ? t.usdPrice : null,
    marketCapUsd: typeof t.mcap === "number" ? t.mcap : null,
    fdvUsd: typeof t.fdv === "number" ? t.fdv : null,
    liquidityUsd: typeof t.liquidity === "number" ? t.liquidity : null,
    volume24hUsd,
    holderCount: typeof t.holderCount === "number" ? t.holderCount : null,
    isVerified: typeof t.isVerified === "boolean" ? t.isVerified : null,
    organicScoreLabel: t.organicScoreLabel ?? null,
    audit: {
      mintAuthorityDisabled:
        typeof t.audit?.mintAuthorityDisabled === "boolean"
          ? t.audit.mintAuthorityDisabled
          : null,
      freezeAuthorityDisabled:
        typeof t.audit?.freezeAuthorityDisabled === "boolean"
          ? t.audit.freezeAuthorityDisabled
          : null,
      topHoldersPercent:
        typeof t.audit?.topHoldersPercentage === "number"
          ? t.audit.topHoldersPercentage
          : null,
    },
  };
}
