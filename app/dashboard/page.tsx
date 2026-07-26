'use client';

import Link from 'next/link';
import { useTokenStore } from '@/hooks/useTokenStore';
import { explorerUrl } from '@/lib/constants';

export default function DashboardPage() {
  const { tokens } = useTokenStore();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">My Tokens</h1>
        <p className="mt-1 text-sm text-gray-400">
          Tokens you've created from this browser.
        </p>
      </div>

      {tokens.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-gray-500">
          You haven't created a token yet.{' '}
          <Link href="/" className="text-accentBlue hover:underline">
            Create your first one
          </Link>
          .
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-card text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Token</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Links</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((t) => (
                <tr key={t.mintAddress} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{t.name}</div>
                    <div className="text-xs text-gray-500">{t.symbol}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">
                    {t.mintAddress.slice(0, 6)}...{t.mintAddress.slice(-6)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-accentBlue/10 px-2 py-1 text-xs text-accentBlue">
                      Created
                    </span>
                  </td>
                  <td className="px-4 py-3 space-x-3">
                    <Link href={`/token/${t.mintAddress}`} className="text-accentBlue hover:underline">
                      Launch page
                    </Link>
                    <a
                      href={explorerUrl(t.mintAddress)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-gray-400 hover:underline"
                    >
                      Solscan
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
