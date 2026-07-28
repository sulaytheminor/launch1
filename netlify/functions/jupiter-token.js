// netlify/functions/jupiter-token.js
//
// Proxies Jupiter's public Tokens V2 API (https://dev.jup.ag/docs/tokens/v2/token-information).
// This endpoint is free and does not require an API key, but the request is
// routed through a serverless function anyway so that:
//  - the frontend never depends on a third-party host's CORS policy directly,
//  - if Jupiter's API tier requires a key in the future (or you want a
//    higher-rate-limit key), it can be added here via an env var without
//    touching the client bundle,
//  - errors and "token not found" responses are normalized for the UI.
//
// Returns real market/metadata for the given mint if Jupiter has indexed it
// (name, symbol, decimals, price, market cap, 24h volume, liquidity, holder
// count, mint/freeze authority audit, verification status). Returns
// { found: false } — never fabricated numbers — if the token isn't indexed.

const JUPITER_TOKENS_URL = "https://lite-api.jup.ag/tokens/v2/search";

export async function handler(event) {
  const mint = event.queryStringParameters?.mint;

  if (!mint || typeof mint !== "string") {
    return respond(400, { error: "Missing required query parameter: mint" });
  }

  try {
    const upstream = await fetch(
      `${JUPITER_TOKENS_URL}?query=${encodeURIComponent(mint)}`,
      { headers: { Accept: "application/json" } }
    );

    if (!upstream.ok) {
      return respond(502, {
        error: `Jupiter token API returned HTTP ${upstream.status}`,
      });
    }

    const results = await upstream.json();

    if (!Array.isArray(results) || results.length === 0) {
      return respond(200, { found: false });
    }

    // The search endpoint can match by symbol/name too — make sure we only
    // use an exact mint-address match.
    const match = results.find((t) => t.id === mint);

    if (!match) {
      return respond(200, { found: false });
    }

    return respond(200, { found: true, token: match });
  } catch (err) {
    return respond(502, { error: `Failed to reach Jupiter API: ${err.message}` });
  }
}

function respond(statusCode, payload) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  };
}
