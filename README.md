# STMC Launchpad

A simple Solana memecoin creation tool. It creates a standard SPL token with
on-chain Metaplex metadata — **no bonding curve, no automatic liquidity
pool, no exchange logic**. Creators hold 100% of supply after creation and
add liquidity manually themselves if/when they want.

## What this is not

- Not a Pump.fun-style bonding curve.
- Not a DEX or exchange.
- Does not create a Raydium (or any) liquidity pool automatically.

## Features

- Phantom / Solflare wallet connect (`@solana/wallet-adapter`)
- Token creator form (name, symbol, description, supply, decimals, logo)
- "✨ Generate Random Meme Coin" — one click, no input required, auto-fills
  the whole form (name, symbol, description, lore, Twitter bio, launch
  announcement, logo prompt) via `/api/generate-meme`
- Configurable platform fee (default 1%, see `.env.example`), isolated in
  `lib/fee.ts` so the percentage or destination wallet can change later
  without touching the rest of the app
- Optional "dev buy" SOL amount — since no liquidity pool exists at
  creation time, this is **not** a market swap; it's disclosed in the UI as
  SOL the creator reserves for adding liquidity later
- Per-token launch page at `/token/[address]`
- "My Tokens" dashboard (stored locally in the browser for this MVP)
- Optional one-click mint/freeze authority revocation (trust signal)

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in values, see below
npm run dev
```

## Environment variables

All documented in `.env.example`. Set the same keys in Netlify under
**Site settings → Environment variables**.

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SOLANA_RPC_URL` | yes | Use a paid RPC provider (Helius, QuickNode, etc.) for production — public endpoints rate-limit token creation traffic. |
| `NEXT_PUBLIC_SOLANA_NETWORK` | yes | `devnet` or `mainnet-beta`. Test on devnet first. |
| `NEXT_PUBLIC_FEE_WALLET` | yes | Public key only, not a secret. |
| `NEXT_PUBLIC_FEE_BPS` | yes | Fee in basis points, `100` = 1%. |
| `NEXT_PUBLIC_IMAGE_UPLOAD_ENDPOINT` | no | Leave blank to use the built-in data-URI metadata (fine for MVP/testing, not ideal for permanent production metadata — see note below). |

No private keys are ever stored in this app. Every on-chain transaction is
built client-side and signed by the user's own connected wallet.

## Metadata / logo storage note

For simplicity, this MVP encodes the token's logo + JSON metadata as a
`data:` URI directly in the on-chain metadata `uri` field, so a fully
working token can be created with zero external services. This works, but
`data:` URIs are unconventional for production metadata — most wallets and
explorers expect metadata hosted on Arweave, IPFS, or standard HTTPS. Before
a real mainnet launch, wire up an upload step (Bundlr/Irys, NFT.Storage,
or your own S3 bucket) and pass that URL as `metadataUri` in
`lib/createToken.ts` instead.

## Deploying to Netlify

1. Push this repo to GitHub/GitLab/Bitbucket.
2. In Netlify: **Add new site → Import an existing project**.
3. Build command: `npm run build` (already set in `netlify.toml`).
4. Publish directory: `.next` (already set in `netlify.toml`).
5. The `@netlify/plugin-nextjs` plugin (declared in `netlify.toml` and
   `package.json`) handles Next.js App Router routes, including the
   `/api/generate-meme` route, automatically — no extra config needed.
6. Add the environment variables above in **Site settings → Environment
   variables**, then deploy.

## Project structure

```
app/                  Next.js App Router pages + API route
  page.tsx            Home / token creator
  dashboard/          "My Tokens" dashboard
  token/[address]/    Public launch page per token
  api/generate-meme/  AI meme-concept generator endpoint
components/           UI components (form, wallet button, cards, etc.)
lib/                  Solana logic: token creation, fee split, constants, types
hooks/                Client-side token history store (localStorage)
```

## Security / trust notes

- STMC never takes ownership of a created token. Mint/update authority is
  set to the creator's connected wallet.
- Liquidity is entirely manual — this app does not touch Raydium, Orca, or
  any AMM.
- Consider setting `NEXT_PUBLIC_SOLANA_NETWORK=devnet` and testing fully
  before pointing at `mainnet-beta`.
