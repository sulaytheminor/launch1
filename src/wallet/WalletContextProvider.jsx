import React, { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";

// Single source of truth for cluster + supported wallets. Future STMC tools
// that need a Connection (e.g. to build/send a transaction) should pull it
// from useAppWallet() rather than creating their own — this is the only
// place that should know about the RPC endpoint.
const NETWORK = "mainnet-beta"; // swap to "devnet" while building/testing new features
const ENDPOINT = clusterApiUrl(NETWORK);

// The wallet-adapter library auto-merges in any browser extension that
// implements the Wallet Standard (e.g. MetaMask's Solana snap), even ones
// we didn't add below. This list is the fixed set STMC Helper actually
// supports and displays, in display order — see useAppWallet.js.
export const SUPPORTED_WALLET_NAMES = ["Phantom", "Solflare"];

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
