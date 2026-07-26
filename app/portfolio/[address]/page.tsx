'use client';

import Link from 'next/link';
import { usePortfolio } from '@/hooks/usePortfolio';
import { explorerUrl, dexScreenerUrl } from '@/lib/constants';

function shortAddress(address: string) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export default function PortfolioPage({ params }: { params: { address: string } }) {
  const { tokens, loading, error } = usePortfolio(params.address);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">STMC Creator Portfolio</h1>
        <p className="mt-1 break-all font-mono text-xs text-gray-500">
          Wallet: {params.address}
        </p>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading portfolio...</p>}

      {error && (
        <div className="rounded-lg border border-accentRed/40 bg-accentRed/10 px-4 py-3 text-sm text-accentRed">
          {error}
        </div>
      )}

      {!loading && !error && tokens.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-gray-500">
          This wallet hasn't created any tokens yet.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {tokens.map((token) => (
          <div
            key={token.mintAddress}
            className="rounded-xl border border-border bg-card p-5"
          >
            <div className="flex items-center gap-3">
              {token.logoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={token.logoDataUrl}
                  alt={token.name}
                  className="h-12 w-12 rounded-full border border-border object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-black text-lg">
                  🚀
                </div>
              )}
              <div>
                <div className="font-medium text-white">{token.name}</div>
                <div className="text-xs text-gray-500">{token.symbol}</div>
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-y-2 text-xs">
              <dt className="text-gray-500">Created</dt>
              <dd className="text-right text-gray-300">
                {new Date(token.createdAt).toLocaleDateString()}
              </dd>
              <dt className="text-gray-500">Supply</dt>
              <dd className="text-right text-gray-300">
                {Number(token.supply).toLocaleString()}
              </dd>
              <dt className="text-gray-500">Mint</dt>
              <dd className="truncate text-right font-mono text-gray-300">
                {shortAddress(token.mintAddress)}
              </dd>
              <dt className="text-gray-500">Tx signature</dt>
              <dd className="truncate text-right font-mono text-gray-300">
                {shortAddress(token.txSignature)}
              </dd>
            </dl>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/token/${token.mintAddress}`}
                className="rounded-lg bg-accentBlue px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
              >
                View Token →
              </Link>
              <a
                href={explorerUrl(token.mintAddress)}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-border px-3 py-1.5 text-xs text-gray-300 hover:border-accentBlue"
              >
                Solscan
              </a>
              <a
                href={dexScreenerUrl(token.mintAddress)}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-border px-3 py-1.5 text-xs text-gray-300 hover:border-accentRed"
              >
                DEX Screener
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
