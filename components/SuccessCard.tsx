'use client';

import { useState } from 'react';
import Link from 'next/link';
import { explorerUrl, dexScreenerUrl } from '@/lib/constants';
import { CreatedToken } from '@/lib/types';

export default function SuccessCard({ token }: { token: CreatedToken }) {
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    await navigator.clipboard.writeText(token.mintAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-xl border border-accentBlue/40 bg-card p-6">
      <h2 className="mb-1 text-xl font-semibold text-white">
        Your token has been created 🎉
      </h2>
      <p className="mb-5 text-sm text-gray-400">
        {token.name} ({token.symbol}) is live on Solana.
      </p>

      <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-black px-3 py-2">
        <code className="flex-1 truncate text-xs text-gray-300">
          {token.mintAddress}
        </code>
        <button
          onClick={copyAddress}
          className="rounded-md border border-border px-2 py-1 text-xs text-gray-300 hover:border-accentBlue"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <a
          href={explorerUrl(token.mintAddress)}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-border px-4 py-2 text-sm text-white hover:border-accentBlue"
        >
          View on Solscan
        </a>
        <a
          href={dexScreenerUrl(token.mintAddress)}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-border px-4 py-2 text-sm text-white hover:border-accentRed"
        >
          DEX Screener (once liquidity exists)
        </a>
        <Link
          href={`/token/${token.mintAddress}`}
          className="rounded-lg bg-accentBlue px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          View Launch Page
        </Link>
      </div>
    </div>
  );
}
