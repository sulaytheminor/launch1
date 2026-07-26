import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyWalletSignature, buildOwnershipMessage } from '@/lib/verifySignature';
import { SOLANA_RPC_URL } from '@/lib/constants';

export const dynamic = 'force-dynamic';

interface SaveTokenBody {
  walletAddress: string;
  tokenAddress: string;
  name: string;
  symbol: string;
  description?: string;
  logo?: string | null;
  supply?: string;
  decimals?: number;
  transactionSignature: string;
  signature: string; // base58 ed25519 signature of the ownership message
}

/**
 * Best-effort on-chain sanity check: confirms the given transaction
 * signature actually exists on-chain and lists walletAddress as a signer.
 * This is a secondary check — the primary proof of ownership is the
 * ed25519 signature verified below, since a public RPC can be slow/rate
 * limited and shouldn't be a hard single point of failure for saving a
 * record of a transaction that already succeeded client-side.
 */
async function transactionLooksValid(
  walletAddress: string,
  transactionSignature: string
): Promise<boolean> {
  try {
    const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
    const tx = await connection.getTransaction(transactionSignature, {
      maxSupportedTransactionVersion: 0,
    });
    if (!tx) return false;
    const accountKeys = tx.transaction.message.getAccountKeys().staticAccountKeys;
    return accountKeys.some((key) => key.equals(new PublicKey(walletAddress)));
  } catch {
    // RPC hiccup — don't fail the whole request on this secondary check.
    return true;
  }
}

export async function POST(req: NextRequest) {
  let body: SaveTokenBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const {
    walletAddress,
    tokenAddress,
    name,
    symbol,
    description,
    logo,
    supply,
    decimals,
    transactionSignature,
    signature,
  } = body;

  if (!walletAddress || !tokenAddress || !name || !symbol || !transactionSignature || !signature) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
  }

  // 1. Verify the wallet actually signed a message tied to this exact
  //    mint + transaction — this is what stops anyone from POSTing a
  //    fabricated walletAddress they don't control.
  const expectedMessage = buildOwnershipMessage({
    walletAddress,
    tokenAddress,
    transactionSignature,
  });
  const validSignature = verifyWalletSignature(expectedMessage, signature, walletAddress);
  if (!validSignature) {
    return NextResponse.json(
      { error: 'Wallet signature verification failed.' },
      { status: 401 }
    );
  }

  // 2. Secondary on-chain sanity check (see doc comment above).
  const validTx = await transactionLooksValid(walletAddress, transactionSignature);
  if (!validTx) {
    return NextResponse.json(
      { error: 'Transaction signature does not match this wallet on-chain.' },
      { status: 401 }
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('created_tokens').insert({
      wallet_address: walletAddress,
      token_address: tokenAddress,
      name,
      symbol,
      description: description || null,
      logo: logo || null,
      supply: supply || null,
      decimals: decimals ?? null,
      transaction_signature: transactionSignature,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to save token record.' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet');
  const mint = req.nextUrl.searchParams.get('mint');

  if (!wallet && !mint) {
    return NextResponse.json(
      { error: 'Provide a wallet or mint query parameter.' },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    let query = supabase.from('created_tokens').select('*').order('created_at', { ascending: false });

    if (wallet) query = query.eq('wallet_address', wallet);
    if (mint) query = query.eq('token_address', mint);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ tokens: data ?? [] });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to load token records.' },
      { status: 500 }
    );
  }
}
