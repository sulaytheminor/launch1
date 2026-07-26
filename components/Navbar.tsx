'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';

// Wallet adapter reads browser APIs, so the button must be client-only.
const ConnectWalletButton = dynamic(() => import('./ConnectWalletButton'), {
  ssr: false,
});

export default function Navbar() {
  return (
    <header className="border-b border-border bg-black/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-accentBlue" />
          <span className="text-lg font-semibold tracking-tight text-white">
            STMC <span className="text-accentBlue">Launchpad</span>
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-sm text-gray-400">
          <Link href="/" className="hover:text-white">Create</Link>
          <Link href="/dashboard" className="hover:text-white">My Tokens</Link>
          <ConnectWalletButton />
        </nav>
      </div>
    </header>
  );
}
