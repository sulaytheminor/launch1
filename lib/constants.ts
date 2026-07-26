// Central place for anything that reads an env var, so no other file
// hardcodes a secret, address, or cluster name.

export const SOLANA_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

export const SOLANA_NETWORK =
  (process.env.NEXT_PUBLIC_SOLANA_NETWORK as 'mainnet-beta' | 'devnet') ||
  'devnet';

// Public key of the wallet that collects the platform fee. This is a
// public address, not a secret — safe to expose via NEXT_PUBLIC_.
export const FEE_WALLET_ADDRESS =
  process.env.NEXT_PUBLIC_FEE_WALLET ||
  '29rzSKdRC1aqNcCeyxc9PHbmPE6ru6qcQjjcMezhrEFF';

// Platform fee in basis points (100 = 1%). Centralizing this means the
// fee percentage can change later by editing one env var.
export const FEE_BPS = Number(process.env.NEXT_PUBLIC_FEE_BPS || '100');

export function explorerUrl(address: string, kind: 'address' | 'tx' = 'address') {
  const cluster = SOLANA_NETWORK === 'mainnet-beta' ? '' : `?cluster=${SOLANA_NETWORK}`;
  return `https://solscan.io/${kind}/${address}${cluster}`;
}

export function dexScreenerUrl(mintAddress: string) {
  // DEX Screener only resolves a pair once liquidity exists. Until the
  // creator manually adds liquidity, this is a placeholder link.
  return `https://dexscreener.com/solana/${mintAddress}`;
}
