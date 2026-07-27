import { WalletReadyState } from "@solana/wallet-adapter-base";

// These are the wallets STMC Helper actively supports and always lists as
// primary options, regardless of whether the extension happens to be
// installed in the current browser — the user should always see Phantom
// and Solflare as choices, with an "Install" affordance if it's missing.
export const PRIMARY_WALLET_NAMES = ["Phantom", "Solflare"];

// This is a Solana-only app. Some browser setups (e.g. MetaMask's Solana
// snap) register MetaMask as a generic Wallet Standard entry even though
// it isn't a native Solana wallet — that's confusing here, so it's
// excluded rather than ever shown as a primary or secondary option.
export const EXCLUDED_WALLET_NAMES = ["MetaMask"];

/**
 * Splits the combined wallet-adapter wallet list (explicit adapters +
 * anything auto-detected via the Wallet Standard) into:
 *  - primary: Phantom & Solflare, always present
 *  - other: any additional genuinely-detected Solana wallets (e.g.
 *    Backpack, Glow), excluding the blocklist above
 */
export function buildWalletGroups(wallets) {
  const byName = new Map(wallets.map((w) => [w.adapter.name, w]));

  const primary = PRIMARY_WALLET_NAMES.map((name) => byName.get(name)).filter(
    Boolean
  );
  const primaryNames = new Set(primary.map((w) => w.adapter.name));

  const other = wallets.filter(
    (w) =>
      !primaryNames.has(w.adapter.name) &&
      !EXCLUDED_WALLET_NAMES.includes(w.adapter.name) &&
      w.readyState === WalletReadyState.Installed
  );

  return { primary, other };
}
