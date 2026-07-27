# STMC Helper

A minimal, dark-mode-first React foundation for the STMC Helper toolset.

## What's here

- Landing screen with a real "connect solana wallet" button — clicking it
  always opens a wallet picker listing **Phantom** and **Solflare** as the
  primary options (shown with their official bundled icons, always present
  even if not yet installed — clicking a not-installed one opens its install
  page). Any other genuinely Solana-compatible wallet detected via the
  Wallet Standard (e.g. Backpack, Glow) shows up under "Other detected
  wallets". MetaMask is explicitly excluded — this is a Solana-only app, and
  some setups register MetaMask as a generic wallet entry even though it
  isn't a native Solana wallet.
- Post-connection layout with a collapsible sidebar (Home, Settings) and
  persistent "STMC helper" branding in the top-left. The app only shows this
  layout once a wallet is actually connected (`wallet.connected` from the
  adapter — no local placeholder flag).
- Settings page showing the connected address (shortened, e.g. `7xKX...9P2a`)
  with a copy button, and a "Disconnect wallet" button that calls the real
  adapter `disconnect()`.
- A Black/White theme switcher and a contact bar.
- A full theme system driven by CSS variables (`src/index.css`), so future
  pages/tools automatically pick up whichever theme is active.

## Wallet foundation

- `src/wallet/WalletContextProvider.jsx` — sets up the Solana `Connection`
  and the list of supported wallet adapters (Phantom, Solflare). Also
  exports `SUPPORTED_WALLET_NAMES`, the fixed, ordered list of wallets STMC
  Helper actually shows — this exists because `wallet-adapter-react` will
  silently merge in *any* browser extension that implements the Wallet
  Standard (e.g. MetaMask's Solana snap), and we don't want those showing
  up unannounced in the picker.
- `src/wallet/walletList.js` — defines which wallets are always shown as
  primary (`Phantom`, `Solflare`) and which are blocked from ever appearing
  (`MetaMask`). Add a wallet's name here to promote it to a primary option,
  or block another one, without touching any component.
- `src/wallet/useAppWallet.js` — the one hook every component uses for
  wallet state (`address`, `connected`, `connecting`, `disconnect`, `connect`,
  `supportedWallets`) and handles the "select wallet, then connect"
  sequencing. It also passes through `signTransaction`,
  `signAllTransactions`, and `sendTransaction` from the adapter — unused
  today, but ready for a future feature (e.g. "sign this transaction") to
  call directly without touching this file.
- The "Choose a wallet" picker (`WalletSelect.jsx`) always lists Phantom and
  Solflare with their official icons (from `adapter.icon`, bundled by the
  wallet-adapter packages themselves). Clicking an installed wallet connects
  it; clicking one that isn't installed opens that wallet's install page
  instead.
- No transactions or payments are implemented yet — this is only the
  connection layer.
- Cluster defaults to `mainnet-beta` in `WalletContextProvider.jsx`; switch
  the `NETWORK` constant to `devnet` while building/testing new features
  that touch the chain.

## Local development

```bash
npm install
npm run dev
```

`npm install` will pull in `@solana/web3.js` and the wallet-adapter packages
— you'll need network access for that (this repo can't vendor them). To
actually test a connection you'll need the Phantom or Solflare browser
extension installed.

## Build

```bash
npm run build
```

Outputs a static site to `dist/`.

## Deploying to Netlify

This repo includes a `netlify.toml` already configured with:

- Build command: `npm run build`
- Publish directory: `dist`
- SPA redirect (`/* -> /index.html`) so client-side navigation works.

Just connect the repo (or drag-and-drop the `dist/` folder) in Netlify — no
extra configuration needed.

### If the build fails looking for a `.next` directory

This project has no Next.js code or config in it — the build/publish
settings above are all it needs. If a deploy still fails with an error
about `@netlify/plugin-nextjs` or a missing `.next` folder, that plugin was
enabled at the **site level** in the Netlify dashboard (not from this repo),
usually from auto-detection or a leftover setting on the site. `netlify.toml`
can't remove a dashboard-installed plugin, so clear it there:

1. Netlify dashboard → your site → **Site configuration** → **Build & deploy**
   → **Build plugins**.
2. Find `@netlify/plugin-nextjs` and remove it.
3. Also check **Build & deploy** → **Build settings** and make sure the
   framework isn't manually pinned to "Next.js" — set it to detect
   automatically, or explicitly to "Vite" if offered.
4. Redeploy.

As a safety net, `netlify.toml` also sets `NETLIFY_NEXT_PLUGIN_SKIP = "true"`,
which makes the Next.js plugin no-op instead of failing if it's ever
present — but removing it from the dashboard is the real fix.

## Project structure

```
src/
  context/ThemeContext.jsx   # theme state (black/white), no localStorage
  components/
    Landing.jsx              # pre-connection screen
    Sidebar.jsx               # collapsible left nav
    Logo.jsx                  # "STMC helper" branding
    Home.jsx                  # placeholder for future STMC tools
    Settings.jsx               # wallet, theme, contact
  App.jsx                     # top-level state: connection, active page, sidebar
```

## Adding future tools

Add a new component under `src/components/`, add a nav entry in
`Sidebar.jsx`'s `NAV_ITEMS`, and render it in `App.jsx` alongside `Home` and
`Settings`. Every component automatically inherits the active theme through
the CSS variables set on `.app-root`.
