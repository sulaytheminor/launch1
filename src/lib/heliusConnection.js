// src/lib/heliusConnection.js
//
// Single source of truth for the Solana RPC connection used by this app:
// Helius, configured via VITE_HELIUS_API_KEY. This replaces the previous
// multi-endpoint public-RPC proxy — Helius is a dedicated provider, so
// there's no more need to fall back across several shared/unreliable
// public endpoints.
//
// IMPORTANT — how Vite env vars work here:
//  - Vite only exposes variables prefixed `VITE_` to client code, and it
//    inlines their value into the bundle at BUILD time (not runtime). See
//    https://vite.dev/guide/env-and-mode.html.
//  - For local dev: put VITE_HELIUS_API_KEY=... in a `.env` file (see
//    .env.example) and restart `npm run dev`.
//  - For Netlify: set VITE_HELIUS_API_KEY in Site configuration ->
//    Environment variables. A local `.env` file is NOT read by Netlify's
//    build — the variable has to be configured there directly, or the
//    deployed build won't have it.
//  - Because it's a VITE_-prefixed variable, the key IS readable in the
//    deployed JS bundle by anyone who inspects it — that's the nature of
//    this connection pattern, not a bug. If you'd rather the key never
//    reach the browser, route calls through a serverless function instead.
//    Since it does ship client-side here, restrict the key to your site's
//    domain(s) in the Helius dashboard so it can't be reused elsewhere.

import { Connection } from "@solana/web3.js";

const HELIUS_API_KEY = import.meta.env.VITE_HELIUS_API_KEY;

export class MissingHeliusKeyError extends Error {
  constructor() {
    super(
      "No Helius API key configured. Set VITE_HELIUS_API_KEY in your .env " +
        "file (local dev) or in your Netlify site's environment variables " +
        "(deploys), then rebuild the app."
    );
    this.name = "MissingHeliusKeyError";
  }
}

export function hasHeliusKey() {
  return Boolean(HELIUS_API_KEY);
}

/** Builds the Helius RPC URL, or returns null if no key is configured —
 *  use this anywhere a missing key should degrade gracefully rather than
 *  throw (e.g. the app-wide wallet ConnectionProvider, which must never
 *  crash the whole app just because Helius isn't configured yet). */
export function getHeliusRpcUrlOrNull() {
  return HELIUS_API_KEY ? `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}` : null;
}

let cachedConnection = null;

/**
 * Returns a shared Connection to Helius's mainnet RPC.
 * Throws MissingHeliusKeyError if VITE_HELIUS_API_KEY isn't set — never
 * falls back to a public endpoint, and never returns a fake/mock
 * connection. Used by the Token Scanner, where "no key configured" should
 * surface as a clear, specific error at the point of use rather than
 * silently degrading.
 */
export function getConnection() {
  const url = getHeliusRpcUrlOrNull();
  if (!url) {
    throw new MissingHeliusKeyError();
  }
  if (!cachedConnection) {
    cachedConnection = new Connection(url, "confirmed");
  }
  return cachedConnection;
}
