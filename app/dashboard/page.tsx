'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import ConnectGate from '@/components/ConnectGate';

/**
 * "My Tokens" now lives at /portfolio/[wallet-address] — the wallet IS the
 * account, so a signed-in user's dashboard is just their own portfolio
 * page. This route stays as a friendly, memorable entry point that
 * forwards a connected wallet straight there.
 */
export default function DashboardPage() {
  const { publicKey } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (publicKey) {
      router.replace(`/portfolio/${publicKey.toBase58()}`);
    }
  }, [publicKey, router]);

  return (
    <ConnectGate>
      <p className="text-sm text-gray-500">Redirecting to your portfolio...</p>
    </ConnectGate>
  );
}
