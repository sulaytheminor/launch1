'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchTokenByMint } from '@/hooks/usePortfolio';
import { CreatedToken } from '@/lib/types';
import { explorerUrl, dexScreenerUrl } from '@/lib/constants';

export default function TokenLaunchPage({ params }: { params: { address: string } }) {
  const [token, setToken] = useState<CreatedToken | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetchTokenByMint(params.address).then((t) => {
      if (!cancelled) setToken(t);
    });
    return () => {
      cancelled = true;
    };
  }, [params.address]);

  if (token === undefined) {
    return <p className="text-sm text-gray-500">Loading...</p>;
  }

  if (!token) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-gray-500">
        No portfolio record found for this token address — it may not have
        been created through STMC, or the save step may have failed. You can
        still view it on Solscan directly.
        <div className="mt-4">
          <a
            href={explorerUrl(params.address)}
            target="_blank"
            rel="noreferrer"
            className="text-accentBlue hover:underline"
          >
            View {params.address} on Solscan
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-6">
        {token.logoDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={token.logoDataUrl}
            alt={token.name}
            className="h-16 w-16 rounded-full border border-border object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-black text-xl">
            🪙
          </div>
        )}
        <div>
          <h1 className="text-xl font-semibold text-white">{token.name}</h1>
          <p className="text-sm text-gray-400">{token.symbol}</p>
        </div>
      </div>

      <p className="text-sm text-gray-300">{token.description}</p>

      <div className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-card p-6 text-sm sm:grid-cols-3">
        <div>
          <div className="text-xs text-gray-500">Creator</div>
          <Link
            href={`/portfolio/${token.creatorWallet}`}
            className="font-mono text-xs text-accentBlue hover:underline"
          >
            {token.creatorWallet.slice(0, 6)}...{token.creatorWallet.slice(-6)}
          </Link>
        </div>
        <div>
          <div className="text-xs text-gray-500">Supply</div>
          <div className="text-white">{Number(token.supply).toLocaleString()}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Created</div>
          <div className="text-white">
            {new Date(token.createdAt).toLocaleDateString()}
          </div>
        </div>
        <div className="sm:col-span-3">
          <div className="text-xs text-gray-500">Token address</div>
          <div className="break-all font-mono text-xs text-gray-300">
            {token.mintAddress}
          </div>
        </div>
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
          DEX Screener
        </a>
      </div>
    </div>
  );
}
