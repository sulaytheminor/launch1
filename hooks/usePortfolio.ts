'use client';

import { useCallback, useEffect, useState } from 'react';
import { CreatedToken } from '@/lib/types';

// Shape returned by the API (snake_case, matches the Supabase table).
interface TokenRow {
  wallet_address: string;
  token_address: string;
  name: string;
  symbol: string;
  description: string | null;
  logo: string | null;
  supply: string | null;
  decimals: number | null;
  transaction_signature: string;
  created_at: string;
}

function rowToCreatedToken(row: TokenRow): CreatedToken {
  return {
    mintAddress: row.token_address,
    txSignature: row.transaction_signature,
    name: row.name,
    symbol: row.symbol,
    description: row.description || '',
    supply: row.supply || '0',
    decimals: row.decimals ?? 9,
    logoDataUrl: row.logo,
    creatorWallet: row.wallet_address,
    createdAt: row.created_at,
    devBuySol: 0,
    feeSol: 0,
  };
}

/** Fetches every token created by a given wallet — powers /portfolio/[address]. */
export function usePortfolio(walletAddress: string | null | undefined) {
  const [tokens, setTokens] = useState<CreatedToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!walletAddress) {
      setTokens([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/tokens?wallet=${encodeURIComponent(walletAddress)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setError(data.error);
          setTokens([]);
        } else {
          setTokens((data.tokens as TokenRow[]).map(rowToCreatedToken));
        }
      })
      .catch(() => {
        if (!cancelled) setError('Could not load portfolio.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [walletAddress]);

  return { tokens, loading, error };
}

/** Fetches a single token by its mint address — powers /token/[address]. */
export async function fetchTokenByMint(mintAddress: string): Promise<CreatedToken | null> {
  try {
    const res = await fetch(`/api/tokens?mint=${encodeURIComponent(mintAddress)}`);
    const data = await res.json();
    if (data.error || !data.tokens || data.tokens.length === 0) return null;
    return rowToCreatedToken(data.tokens[0] as TokenRow);
  } catch {
    return null;
  }
}
