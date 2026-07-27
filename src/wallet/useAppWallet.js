import { useCallback, useEffect, useRef } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { SUPPORTED_WALLET_NAMES } from "./WalletContextProvider.jsx";

/**
 * Single entry point for wallet state and actions.
 *
 * Any future STMC feature that needs to know who's connected, or that needs
 * to ask the wallet to sign/send a transaction, should use this hook rather
 * than reaching into @solana/wallet-adapter-react directly — it's the one
 * place that owns the "select, then connect" sequencing below.
 *
 * `signTransaction`, `signAllTransactions`, and `sendTransaction` are passed
 * straight through from the adapter and are not used anywhere yet. They're
 * exposed now so a later feature (e.g. "approve this transaction") can call
 * them without any changes to this file.
 */
export default function useAppWallet() {
  const { connection } = useConnection();
  const {
    wallet,
    wallets,
    publicKey,
    connected,
    connecting,
    disconnecting,
    select,
    connect,
    disconnect,
    signTransaction,
    signAllTransactions,
    sendTransaction,
  } = useWallet();

  // select() only requests a wallet change; it doesn't connect. We track
  // "the user asked to connect this wallet" and fire connect() once the
  // adapter context has actually switched to it.
  const pendingConnectName = useRef(null);

  useEffect(() => {
    if (
      pendingConnectName.current &&
      wallet?.adapter?.name === pendingConnectName.current &&
      !connected &&
      !connecting
    ) {
      pendingConnectName.current = null;
      connect().catch((err) => {
        // Most commonly a user closing/rejecting the wallet popup — not a
        // bug, so just surface it in the console instead of throwing.
        console.warn("Wallet connection was not completed:", err?.message || err);
      });
    }
  }, [wallet, connected, connecting, connect]);

  const connectWallet = useCallback(
    async (walletName) => {
      if (!walletName) {
        return connect();
      }
      if (wallet?.adapter?.name === walletName) {
        return connect();
      }
      pendingConnectName.current = walletName;
      select(walletName);
      return undefined;
    },
    [select, connect, wallet]
  );

  // wallet-adapter-react auto-merges in any browser extension that
  // implements the Wallet Standard (e.g. MetaMask's Solana snap), which
  // would otherwise show up in the picker even though we never added it.
  // Only ever show the wallets STMC Helper explicitly supports, in a fixed
  // order, regardless of what else is installed.
  const supportedWallets = SUPPORTED_WALLET_NAMES.map((name) =>
    wallets.find((w) => w.adapter.name === name)
  ).filter(Boolean);

  return {
    connection,
    wallet,
    wallets,
    supportedWallets,
    publicKey,
    address: publicKey ? publicKey.toBase58() : null,
    connected,
    connecting,
    disconnecting,
    connect: connectWallet,
    disconnect,
    // Foundation for future transaction-signing features — unused for now.
    signTransaction,
    signAllTransactions,
    sendTransaction,
  };
}
