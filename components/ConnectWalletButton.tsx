'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { SOLANA_NETWORK } from '@/lib/constants';

function shortAddress(address: string) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export default function ConnectWalletButton() {
  const { publicKey, disconnect, connecting } = useWallet();
  const { setVisible } = useWalletModal();
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setError(null);
    try {
      if (publicKey) {
        await disconnect();
      } else {
        setVisible(true);
      }
    } catch (e) {
      // Most commonly: user rejected the connection request in their wallet.
      setError('Connection was rejected. Please try again.');
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={connecting}
        className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-white transition hover:border-accentBlue disabled:opacity-50"
      >
        {connecting
          ? 'Connecting...'
          : publicKey
          ? shortAddress(publicKey.toBase58())
          : 'Connect Wallet'}
      </button>
      {publicKey && (
        <span className="text-xs text-gray-500">{SOLANA_NETWORK}</span>
      )}
      {error && <span className="text-xs text-accentRed">{error}</span>}
    </div>
  );
}
