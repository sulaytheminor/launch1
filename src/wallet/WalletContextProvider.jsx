import React, { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import { getHeliusRpcUrlOrNull } from "../lib/heliusConnection.js";

// Single source of truth for cluster + supported wallets. Future STMC tools
// that need a Connection (e.g. to build/send a transaction) should pull it
// from useAppWallet() rather than creating their own — this is the only
// place that should know about the RPC endpoint.
//
// All blockchain requests in this app go through Helius (configured via
// VITE_HELIUS_API_KEY — see src/lib/heliusConnection.js for details on how
// that env var is read and why it's safe to expose client-side here).
// If the key isn't configured, this falls back to Solana's default public
// endpoint rather than throwing — this provider wraps the entire app, so
// it must never crash it just because Helius isn't set up yet. The Token
// Scanner's own Helius connection (src/lib/heliusConnection.js#getConnection)
// still requires the key and surfaces a clear error if it's missing.
const NETWORK = "mainnet-beta"; // swap to "devnet" while building/testing new features
const HELIUS_URL = getHeliusRpcUrlOrNull();
if (!HELIUS_URL) {
  console.warn(
    "[WalletContextProvider] VITE_HELIUS_API_KEY is not set — falling back to " +
      "Solana's public RPC endpoint for wallet connectivity. Set VITE_HELIUS_API_KEY " +
      "(see .env.example) for reliable service."
  );
}
const ENDPOINT = HELIUS_URL || clusterApiUrl(NETWORK);

// The wallet-adapter library auto-merges in any browser extension that
// implements the Wallet Standard (e.g. MetaMask's Solana snap), on top of
// the adapters listed below. Which of those get top billing in the picker
// vs. an "other detected wallets" section is decided in
// src/wallet/walletList.js, not here — this file only owns the connection
// setup itself.

export default function WalletContextProvider({ children }) {
  // Phantom and Solflare both also implement the Wallet Standard, so they'd
  // be auto-detected either way — listing them explicitly just guarantees
  // they show up even on browsers/environments where standard detection
  // hasn't run yet, and makes it obvious where to add more wallets later.
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={ENDPOINT}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}
