import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  createSetAuthorityInstruction,
  AuthorityType,
} from '@solana/spl-token';
import {
  createCreateMetadataAccountV3Instruction,
  PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID,
} from '@metaplex-foundation/mpl-token-metadata';
import type { WalletContextState } from '@solana/wallet-adapter-react';
import { splitFee, getFeeWalletPublicKey } from './fee';
import { TokenFormData } from './types';

export interface CreateTokenResult {
  mintAddress: string;
  txSignature: string;
  feeSol: number;
  devBuySol: number;
}

export interface CreateTokenOptions {
  connection: Connection;
  wallet: WalletContextState;
  form: TokenFormData;
  metadataUri: string; // pre-uploaded (or data-URI) JSON metadata location
  /** Extra SOL the creator wants to route through the fee split as a "dev buy". */
  devBuyLamports: number;
  /** Whether to revoke mint authority immediately after minting supply. */
  revokeMintAuthority: boolean;
  /** Whether to revoke freeze authority immediately after creation. */
  revokeFreezeAuthority: boolean;
}

function findMetadataPda(mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );
  return pda;
}

/**
 * Creates a standard SPL token: mint account, on-chain metadata (Metaplex
 * Token Metadata program), and mints the full supply to the creator's own
 * wallet. No bonding curve, no liquidity pool, no automated market is
 * created — the creator holds 100% of supply afterward and can add
 * liquidity manually on any DEX if/when they choose to.
 *
 * The STMC platform fee (and optional "dev buy" SOL) is collected in the
 * same transaction as a plain SOL transfer to the fee wallet. Because no
 * pool exists yet at creation time, a "dev buy" cannot be an actual market
 * swap — instead the SOL the creator allocates as a dev buy is split the
 * same way (fee + net) and the net portion is disclosed in the UI as SOL
 * reserved by the creator for their own future liquidity add, NOT as
 * tokens purchased on a market. See DevBuyPanel.tsx for the user-facing
 * explanation.
 */
export async function createSplToken(
  opts: CreateTokenOptions
): Promise<CreateTokenResult> {
  const { connection, wallet, form, metadataUri, devBuyLamports } = opts;

  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet is not connected.');
  }

  const payer = wallet.publicKey;
  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;

  const lamportsForMint = await getMinimumBalanceForRentExemptMint(connection);
  const decimals = form.decimals;
  const supply = BigInt(form.supply);
  const rawSupply = supply * BigInt(10 ** decimals);

  const associatedTokenAccount = await getAssociatedTokenAddress(mint, payer);
  const metadataPda = findMetadataPda(mint);

  const tx = new Transaction();

  // 1. Create the mint account
  tx.add(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: mint,
      space: MINT_SIZE,
      lamports: lamportsForMint,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMintInstruction(mint, decimals, payer, payer)
  );

  // 2. Create the creator's associated token account and mint full supply into it
  tx.add(
    createAssociatedTokenAccountInstruction(
      payer,
      associatedTokenAccount,
      payer,
      mint
    ),
    createMintToInstruction(mint, associatedTokenAccount, payer, rawSupply)
  );

  // 3. Attach on-chain metadata (name/symbol/logo+description via metadataUri)
  tx.add(
    createCreateMetadataAccountV3Instruction(
      {
        metadata: metadataPda,
        mint,
        mintAuthority: payer,
        payer,
        updateAuthority: payer,
      },
      {
        createMetadataAccountArgsV3: {
          data: {
            name: form.name,
            symbol: form.symbol,
            uri: metadataUri,
            sellerFeeBasisPoints: 0,
            creators: null,
            collection: null,
            uses: null,
          },
          isMutable: true,
          collectionDetails: null,
        },
      }
    )
  );

  // 4. Platform fee (+ optional dev-buy SOL, split the same way — see fee.ts)
  const totalFeeLamports = devBuyLamports; // fee % of whatever the creator opts to route through
  if (totalFeeLamports > 0) {
    const { feeLamports } = splitFee(totalFeeLamports);
    if (feeLamports > 0) {
      tx.add(
        SystemProgram.transfer({
          fromPubkey: payer,
          toPubkey: getFeeWalletPublicKey(),
          lamports: feeLamports,
        })
      );
    }
    // Net lamports intentionally stay in the creator's wallet — see the
    // doc comment above on why there is no on-chain "buy" here.
  }

  // 5. Optional: revoke mint/freeze authority right away (a common trust signal)
  if (opts.revokeMintAuthority) {
    tx.add(
      createSetAuthorityInstruction(mint, payer, AuthorityType.MintTokens, null)
    );
  }
  if (opts.revokeFreezeAuthority) {
    tx.add(
      createSetAuthorityInstruction(mint, payer, AuthorityType.FreezeAccount, null)
    );
  }

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = payer;

  // The mint keypair must co-sign since it's a brand-new account being created.
  tx.partialSign(mintKeypair);

  const signedTx = await wallet.signTransaction(tx);
  const raw = signedTx.serialize();
  const signature = await connection.sendRawTransaction(raw, {
    skipPreflight: false,
  });

  await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    'confirmed'
  );

  const { feeSol, netSol } = splitFee(totalFeeLamports);

  return {
    mintAddress: mint.toBase58(),
    txSignature: signature,
    feeSol,
    devBuySol: netSol,
  };
}
