import { WalletReadyState } from "@solana/wallet-adapter-base";

// Wallets STMC Helper always lists as primary options, regardless of
// whether the extension happens to be installed in the current browser —
// the user should always see Phantom and Solflare as choices, with an
// "Install" affordance if one is missing. These are the two wallets we
// import an adapter class for in WalletContextProvider.jsx, which is what
// makes it possible to list them even when not installed.
export const PRIMARY_WALLET_NAMES = ["Phantom", "Solflare"];

/**
 * Splits the combined wallet-adapter wallet list (the explicit Phantom /
 * Solflare adapters + anything else auto-detected via the Wallet Standard,
 * e.g. MetaMask, Backpack, Glow) into:
 *  - primary: Phantom & Solflare, always present
 *  - other: any additional wallet the browser actually reports as
 *    installed (MetaMask included, if the browser detects it) — nothing
 *    is blocked from appearing here
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
      w.readyState === WalletReadyState.Installed
  );

  return { primary, other };
}
