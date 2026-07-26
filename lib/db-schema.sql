-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query)
-- to create the table STMC Launchpad reads/writes from.

create table if not exists created_tokens (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  token_address text not null unique,
  name text not null,
  symbol text not null,
  description text,
  logo text,                 -- base64 data URL or hosted image URL
  supply text,
  decimals integer,
  transaction_signature text not null,
  created_at timestamptz not null default now()
);

create index if not exists created_tokens_wallet_idx
  on created_tokens (wallet_address);

create index if not exists created_tokens_token_idx
  on created_tokens (token_address);

-- Row Level Security: writes only ever happen server-side via the
-- service role key (which bypasses RLS), after this app has verified an
-- ed25519 signature proving the request came from the wallet that owns
-- wallet_address. Public read access is intentional — creator portfolio
-- pages (/portfolio/[wallet-address]) and launch pages (/token/[address])
-- are meant to be publicly viewable, the same way a Solscan page is.
alter table created_tokens enable row level security;

create policy "Public read access"
  on created_tokens for select
  using (true);

-- No insert/update/delete policy is defined for the anon role, so those
-- operations are only possible via the service role key from the server.
