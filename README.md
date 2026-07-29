# STMC Helper

A minimal, dark-mode-first React foundation for the STMC Helper toolset.

## What's here

- Landing screen with a real "connect solana wallet" button, using the
  original connection flow: no wallet detected → opens Phantom's install
  page; exactly one wallet detected → connects to it directly; more than
  one detected → opens a picker. The picker always lists **Phantom** and
  **Solflare** (with their official bundled icons, shown even if not
  installed yet — clicking a not-installed one opens its install page).
  Any other wallet the browser actually detects — MetaMask included, if
  present — shows up under "Other detected wallets"; nothing is blocked.
- Post-connection layout with a collapsible sidebar (Home, Token Scanner,
  Settings) and persistent "STMC helper" branding in the top-left. The app
  only shows this layout once a wallet is actually connected
  (`wallet.connected` from the adapter — no local placeholder flag).
- **Token Scanner** — paste a Solana token mint address, hit Analyze, and
  watch a live terminal-style log while it pulls **real** data: on-chain
  mint info and holder distribution from Solana RPC, plus market data
  (price, market cap, volume, liquidity) from Jupiter's public Tokens API.
  From that it computes a real STMC Risk Score, a dynamic security
  checklist, and a summary — all derived from the actual fetched data, with
  no hardcoded/example values. If a data point can't be retrieved, the
  scanner shows that plainly instead of making something up. See
  "Token Scanner internals" below for the full pipeline.
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
  primary (`Phantom`, `Solflare`), and groups everything else the browser
  detects (MetaMask included) under "other". Add a name here to promote a
  wallet to primary, without touching any component.
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

`TokenScanner.jsx` is the reference example: a new page lives under
`src/components/`, gets one entry in `Sidebar.jsx`'s `NAV_ITEMS`, and one
line in `App.jsx`. Every component automatically inherits the active theme
through the CSS variables set on `.app-root`.

## Token Scanner internals

Every step in the terminal log corresponds to a real network call — nothing
is simulated except the minimum ~350ms a line stays visible before the next
one starts (so the log is readable even when a real response comes back
instantly).

```
src/lib/solanaRpc.js       # checkConnection, getMintInfo, getLargestHolders
src/lib/retry.js           # generic rate-limit-aware retry wrapper (max 3 attempts)
src/lib/jupiterMarket.js   # getMarketData (price/mcap/volume/liquidity)
src/lib/riskAnalysis.js    # computeRiskAnalysis — score + checklist, from real fields only
src/lib/aiSummary.js       # buildAiSummary — plain-language write-up of the real analysis
src/lib/format.js          # shared number/percent/USD formatting helpers

netlify/functions/solana-rpc.js    # allowlisted JSON-RPC proxy to Solana
netlify/functions/jupiter-token.js # proxy to Jupiter's public Tokens V2 API
```

**Why serverless functions for two APIs that don't need a key?** So the RPC
endpoint (and any future API key) never lives in frontend code. By default
`solana-rpc.js` talks to a small list of public endpoints (starting with
`https://api.mainnet-beta.solana.com`), which is fine for light use but
rate-limited. For real traffic, set a `SOLANA_RPC_URL` environment variable
in Netlify to a private RPC provider (Helius, QuickNode, Triton, etc.) —
including one with an API key baked into the URL — and it's tried first,
before falling back to any public endpoints. `SOLANA_RPC_FALLBACK_URLS`
(comma-separated) lets you add more endpoints to the fallback chain.

**Handling Solana RPC rate limits ("Too many requests for a specific RPC
call"):** two layers work together, and both are real, not simulated:

1. **Per-request endpoint fallback** (server-side, in `solana-rpc.js`): for
   a single call, each configured RPC endpoint is tried in order until one
   responds successfully. A rate limit or network error on one endpoint
   just moves to the next — the response only reports failure once every
   endpoint has been tried.
2. **Client-side retry, up to 3 attempts** (`src/lib/retry.js`, used by
   `getMintInfo`/`getLargestHolders` in `src/lib/solanaRpc.js`): if every
   endpoint is still rate-limited after step 1, the whole request is retried
   with a short backoff, up to 3 total attempts. Only rate-limit errors are
   retried — a real "mint not found" or "not an SPL token" error fails
   immediately instead of retrying something that can never succeed.

Every retry is visible in the terminal, not hidden: the affected line gets a
`⚠ RPC limit detected` marker and a new `Retrying...` line takes over until
it either succeeds (`✓ Complete`) or all 3 attempts are exhausted
(`✗ Failed`, with the real error).

The mint-metadata fetch also now doubles as the "Connecting to Solana..."
step (instead of a separate `getHealth` call), cutting one RPC round trip
out of every scan.

**What happens when data can't be found:** if the mint doesn't exist, isn't
an SPL token, or a request fails, the terminal shows `✗ Failed` on that
step with the real error message and the pipeline stops — no fallback
report is shown. If the mint exists on-chain but Jupiter hasn't indexed it
(no trading pool yet), the scanner still reports the real on-chain data
(authorities, holder distribution) and clearly marks price/market
cap/volume/liquidity as unavailable rather than guessing.

**AI Summary:** the summary text is generated by `buildAiSummary()` from the
already-computed risk analysis — it's a deterministic writer, not a call to
a hosted LLM, so it requires no API key and can't drift from the real
numbers it's describing. If you want actual LLM-generated prose instead,
add a `netlify/functions/ai-summary.js` that POSTs the same analysis object
to your LLM provider of choice using a server-side API key, and call it
from `TokenScanner.jsx` in place of (or as an enrichment on top of)
`buildAiSummary()` — keep the deterministic version as a fallback for when
no key is configured, so the app never falls back to fake text.

**STMC Risk Score:** starts at 100 and deducts points for each real risk
factor found (active mint/freeze authority, high top-10 holder
concentration computed directly from on-chain balances, thin or missing
liquidity, unverified in Jupiter's registry, low organic trading score).
See `computeRiskAnalysis()` in `src/lib/riskAnalysis.js` for the exact
weights — every deduction there cites the actual data point that triggered
it.
