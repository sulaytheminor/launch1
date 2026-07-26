'use client';

import { useCallback, useEffect, useState } from 'react';
import { CreatedToken } from '@/lib/types';

const STORAGE_KEY = 'stmc_created_tokens';

function readAll(): CreatedToken[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CreatedToken[]) : [];
  } catch {
    return [];
  }
}

function writeAll(tokens: CreatedToken[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

/**
 * Simple client-side "database" for the MVP. This keeps the app fully
 * static-export/Netlify-friendly with no backend required. Swap this for
 * a real API + database later without touching any UI component — every
 * component reads through this hook or the plain functions below.
 */
export function useTokenStore() {
  const [tokens, setTokens] = useState<CreatedToken[]>([]);

  useEffect(() => {
    setTokens(readAll());
  }, []);

  const addToken = useCallback((token: CreatedToken) => {
    setTokens((prev) => {
      const next = [token, ...prev];
      writeAll(next);
      return next;
    });
  }, []);

  return { tokens, addToken };
}

export function getTokenByAddress(address: string): CreatedToken | undefined {
  return readAll().find((t) => t.mintAddress === address);
}
