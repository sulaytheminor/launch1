import { PublicKey } from '@solana/web3.js';
import { FEE_BPS, FEE_WALLET_ADDRESS } from './constants';

export interface FeeSplit {
  totalLamports: number;
  feeLamports: number;
  netLamports: number;
  feeSol: number;
  netSol: number;
}

/**
 * Splits a SOL amount (in lamports) into the STMC platform fee and the
 * remaining "net" amount, using FEE_BPS from the environment.
 *
 * This is the single place fee math happens — if the fee percentage or
 * destination wallet ever changes, only this file and constants.ts need
 * to be touched.
 */
export function splitFee(totalLamports: number): FeeSplit {
  const feeLamports = Math.floor((totalLamports * FEE_BPS) / 10_000);
  const netLamports = totalLamports - feeLamports;

  return {
    totalLamports,
    feeLamports,
    netLamports,
    feeSol: feeLamports / 1e9,
    netSol: netLamports / 1e9,
  };
}

export function getFeeWalletPublicKey(): PublicKey {
  return new PublicKey(FEE_WALLET_ADDRESS);
}

export function feePercentLabel(): string {
  return `${(FEE_BPS / 100).toFixed(2).replace(/\.00$/, '')}%`;
}
