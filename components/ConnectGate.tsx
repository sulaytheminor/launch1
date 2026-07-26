'use client';

import { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

// Avoid SSR for anything touching the wallet adapter's browser-only state.
function ConnectGateInner({ children }: { children: ReactNode }) {
  const { connected, connecting, publicKey } = useWallet();
  const { setVisible } = useWalletModal();

  if (connected && publicKey) {
    return <>{children}</>;
  }

  return (
    <div className="rounded-xl border border-border bg-card p-10 text-center">
      <h2 className="text-lg font-semibold text-white">Connect your wallet to continue</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">
        Your wallet address is your STMC account — there are no usernames or
        passwords. Connect Phantom or Solflare to create a token and access
        your creator portfolio.
      </p>
      <button
        onClick={() => setVisible(true)}
        disabled={connecting}
        className="mt-6 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-50"
      >
        {connecting ? 'Connecting...' : 'Connect Wallet'}
      </button>
    </div>
  );
}

export default dynamic(() => Promise.resolve(ConnectGateInner), { ssr: false });
