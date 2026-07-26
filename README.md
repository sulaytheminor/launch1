# STMC Launchpad

A simple Solana memecoin creation tool. It creates a standard SPL token with
on-chain Metaplex metadata — **no bonding curve, no automatic liquidity
pool, no exchange logic**. Creators hold 100% of supply after creation and
add liquidity manually themselves if/when they want.

The wallet **is** the account — there are no usernames or passwords.
Connecting Phantom or Solflare is required before the token creation flow
is even visible, and every creator gets a public portfolio page at
`/portfolio/[wallet-address]` showing everything they've created.

## What this is not

- Not a Pump.fun-style bonding curve.
- Not a DEX or exchange.
- Does not create a Raydium (or any) liquidity pool automatically.

## Features

- Phantom / Solflare wallet connect (`@solana/wallet-adapter`); the token
  creator UI is fully gated behind a connected wallet (`ConnectGate.tsx`)
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
- Public creator portfolio at `/portfolio/[wallet-address]`, backed by
  Supabase (Postgres) — every token a wallet has created, with logo, name,
  symbol, creation date, mint address, supply, tx signature, Solscan link,
  and DEX Screener link
- `/dashboard` is a convenience alias that redirects a connected wallet to
  its own portfolio page
- Wallet-signature verification on every portfolio write (see below) —
  the server never trusts a bare `walletAddress` from the frontend
- Optional one-click mint/freeze authority revocation (trust signal)
- Configured for **mainnet-beta** by default (see the network warning below)

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in values, see below
npm run dev
```

You'll also need a Supabase project — see "Database setup" below — before
token creation history will save anywhere.

## Environment variables

All documented in `.env.example`. Set the same keys in Netlify under
**Site settings → Environment variables**.

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SOLANA_RPC_URL` | yes | Use a paid RPC provider (Helius, QuickNode, etc.) for production — public endpoints rate-limit token creation traffic. |
| `NEXT_PUBLIC_SOLANA_NETWORK` | yes | `devnet` or `mainnet-beta`. **Defaults to `mainnet-beta`** — real SOL is at stake. Use `devnet` while testing. |
| `NEXT_PUBLIC_FEE_WALLET` | yes | Public key only, not a secret. |
| `NEXT_PUBLIC_FEE_BPS` | yes | Fee in basis points, `100` = 1%. |
| `NEXT_PUBLIC_IMAGE_UPLOAD_ENDPOINT` | no | Leave blank to use the built-in data-URI metadata (fine for MVP/testing, not ideal for permanent production metadata — see note below). |
| `SUPABASE_URL` | yes | Your Supabase project URL. Server-only — not prefixed `NEXT_PUBLIC_`. |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | **Secret.** Full read/write, bypasses RLS. Used only inside `app/api/tokens/route.ts`. Never expose client-side. |

No private keys are ever stored in this app. Every on-chain transaction is
built client-side and signed by the user's own connected wallet.

## Database setup (Supabase)

1. Create a free project at https://supabase.com.
2. Open the SQL editor and run `lib/db-schema.sql` — this creates the
   `created_tokens` table, indexes, and a public-read row-level-security
   policy (writes only happen server-side via the service role key).
3. Copy your project URL and **service role key** (Project Settings → API)
   into `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

## How wallet-based accounts work

There's no separate signup step:

```
Connect Phantom/Solflare  →  wallet address becomes the account ID
       →  ConnectGate unlocks the token creator
       →  after on-chain creation, the wallet signs an ownership message
       →  server verifies the signature, then saves the record
       →  the wallet's portfolio at /portfolio/[address] updates
```

The signed message binds the wallet address to the exact mint address and
transaction signature it's vouching for (`lib/verifySignature.ts`), so a
signature can't be replayed to claim a different token. The API route also
does a best-effort on-chain check that the transaction really does list
that wallet as a signer. **Reading** a portfolio page is intentionally
public (same as a Solscan page would be) — only **writing** a new record
requires proof of wallet ownership.

## Metadata / logo storage note

For simplicity, this MVP encodes the token's logo + JSON metadata as a
`data:` URI directly in the on-chain metadata `uri` field, so a fully
working token can be created with zero external services. This works, but
`data:` URIs are unconventional for production metadata — most wallets and
explorers expect metadata hosted on Arweave, IPFS, or standard HTTPS. Before
a real mainnet launch, wire up an upload step (Bundlr/Irys, NFT.Storage,
or your own S3 bucket) and pass that URL as `metadataUri` in
`lib/createToken.ts` instead. The same base64 logo is also stored in the
`logo` column in Supabase for convenience in the portfolio/launch pages —
for a lot of tokens you'll likely want to move that to hosted URLs too.

## Deploying to Netlify

1. Push this repo to GitHub/GitLab/Bitbucket.
2. In Netlify: **Add new site → Import an existing project**.
3. Build command: `npm run build` (already set in `netlify.toml`).
4. Publish directory: `.next` (already set in `netlify.toml`).
5. The `@netlify/plugin-nextjs` plugin (declared in `netlify.toml` and
   `package.json`) handles Next.js App Router routes, including the
   `/api/generate-meme` and `/api/tokens` routes, automatically — no extra
   config needed.
6. Add all environment variables above in **Site settings → Environment
   variables**, then deploy.

## Project structure

```
app/                  Next.js App Router pages + API routes
  page.tsx            Home / token creator (gated by ConnectGate)
  dashboard/           Redirects a connected wallet to its own portfolio
  portfolio/[address]/ Public creator portfolio (all tokens by a wallet)
  token/[address]/     Public launch page per token
  api/generate-meme/   AI meme-concept generator endpoint
  api/tokens/          Verified token-record save (POST) + read (GET)
components/           UI components (form, wallet button, gate, cards, etc.)
lib/                  Solana logic, fee split, Supabase client, signature
                       verification, constants, types, db-schema.sql
hooks/                usePortfolio — fetches token records from the API
```

## Security / trust notes

- STMC never takes ownership of a created token. Mint/update authority is
  set to the creator's connected wallet.
- Liquidity is entirely manual — this app does not touch Raydium, Orca, or
  any AMM.
- The wallet is the identity: no usernames or passwords are stored
  anywhere, and the token creation flow is inaccessible without a
  connected wallet.
- Every write to the portfolio database requires a verified ed25519
  signature from the wallet it claims to belong to — a frontend-supplied
  `walletAddress` alone is never trusted.
- This app is configured for **mainnet-beta by default**. Set
  `NEXT_PUBLIC_SOLANA_NETWORK=devnet` and test thoroughly before pointing
  it at mainnet with real funds.
