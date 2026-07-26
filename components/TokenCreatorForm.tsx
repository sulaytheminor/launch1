'use client';

import { useState, FormEvent } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';
import { TokenFormData, MemeConcept, CreatedToken } from '@/lib/types';
import { createSplToken } from '@/lib/createToken';
import { buildOwnershipMessage } from '@/lib/verifySignature';
import DevBuyPanel from './DevBuyPanel';
import SuccessCard from './SuccessCard';

const EMPTY_FORM: TokenFormData = {
  name: '',
  symbol: '',
  description: '',
  supply: '1000000000',
  decimals: 9,
  logoDataUrl: null,
};

function buildMetadataDataUri(form: TokenFormData): string {
  // MVP metadata hosting: encode the JSON metadata (including the logo as a
  // base64 image, if provided) directly as a data: URI so no external
  // storage service is required to get a working token live. For
  // production, swap this for a real upload to Arweave/IPFS/S3 — the app
  // only needs a URI string here, so that swap is a one-line change.
  const metadata = {
    name: form.name,
    symbol: form.symbol,
    description: form.description,
    image: form.logoDataUrl || '',
  };
  const json = JSON.stringify(metadata);
  const base64 = typeof window !== 'undefined' ? window.btoa(unescape(encodeURIComponent(json))) : '';
  return `data:application/json;base64,${base64}`;
}

export default function TokenCreatorForm() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [form, setForm] = useState<TokenFormData>(EMPTY_FORM);
  const [devBuySol, setDevBuySol] = useState(0);
  const [revokeMint, setRevokeMint] = useState(false);
  const [revokeFreeze, setRevokeFreeze] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreatedToken | null>(null);

  const updateField = <K extends keyof TokenFormData>(key: K, value: TokenFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleLogoUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => updateField('logoDataUrl', reader.result as string);
    reader.readAsDataURL(file);
  };

  const generateRandomMemeCoin = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/generate-meme', { method: 'POST' });
      if (!res.ok) throw new Error('Generation failed');
      const concept: MemeConcept = await res.json();
      setForm((prev) => ({
        ...prev,
        name: concept.name,
        symbol: concept.symbol,
        description: concept.description,
        lore: concept.lore,
        twitterBio: concept.twitterBio,
        announcement: concept.announcement,
      }));
    } catch (e) {
      setError('Could not generate a meme concept. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!wallet.connected || !wallet.publicKey) {
      setError('Connect your wallet first.');
      return;
    }
    if (!form.name || !form.symbol || !form.supply) {
      setError('Name, symbol, and supply are required.');
      return;
    }

    setSubmitting(true);
    try {
      const metadataUri = buildMetadataDataUri(form);
      const devBuyLamports = Math.floor(devBuySol * 1e9);

      const created = await createSplToken({
        connection,
        wallet,
        form,
        metadataUri,
        devBuyLamports,
        revokeMintAuthority: revokeMint,
        revokeFreezeAuthority: revokeFreeze,
      });

      const creatorWallet = wallet.publicKey.toBase58();
      const record: CreatedToken = {
        mintAddress: created.mintAddress,
        txSignature: created.txSignature,
        name: form.name,
        symbol: form.symbol,
        description: form.description,
        supply: form.supply,
        decimals: form.decimals,
        logoDataUrl: form.logoDataUrl,
        creatorWallet,
        createdAt: new Date().toISOString(),
        devBuySol: created.devBuySol,
        feeSol: created.feeSol,
      };

      // Prove wallet ownership before this creation is saved to the
      // portfolio database — the server never trusts a bare wallet
      // address supplied by the frontend (see lib/verifySignature.ts).
      try {
        if (!wallet.signMessage) {
          throw new Error(
            'Your wallet does not support message signing, so this token could not be saved to your portfolio (it is still live on-chain).'
          );
        }
        const message = buildOwnershipMessage({
          walletAddress: creatorWallet,
          tokenAddress: created.mintAddress,
          transactionSignature: created.txSignature,
        });
        const signatureBytes = await wallet.signMessage(new TextEncoder().encode(message));
        const signature = bs58.encode(signatureBytes);

        const saveRes = await fetch('/api/tokens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress: creatorWallet,
            tokenAddress: created.mintAddress,
            name: form.name,
            symbol: form.symbol,
            description: form.description,
            logo: form.logoDataUrl,
            supply: form.supply,
            decimals: form.decimals,
            transactionSignature: created.txSignature,
            signature,
          }),
        });
        if (!saveRes.ok) {
          const body = await saveRes.json().catch(() => ({}));
          throw new Error(body.error || 'Could not save this token to your portfolio.');
        }
      } catch (saveErr: any) {
        // The token itself already exists on-chain regardless of this —
        // surface the portfolio-save issue without blocking the success view.
        setError(
          saveErr?.message ||
            'Token created on-chain, but saving it to your portfolio failed. You can still find it on Solscan.'
        );
      }

      setResult(record);
    } catch (err: any) {
      setError(err?.message || 'Token creation failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return <SuccessCard token={result} />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-5">
        <div>
          <h3 className="text-sm font-semibold text-white">Need an idea?</h3>
          <p className="text-xs text-gray-500">
            Auto-generate a full meme coin concept — name, lore, socials, logo prompt.
          </p>
        </div>
        <button
          type="button"
          onClick={generateRandomMemeCoin}
          disabled={generating}
          className="whitespace-nowrap rounded-lg bg-gradient-to-r from-accentBlue to-accentRed px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {generating ? 'Generating...' : '✨ Generate Random Meme Coin'}
        </button>
      </div>

      <div className="grid gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-2">
        <div className="sm:col-span-1">
          <label className="mb-1 block text-xs text-gray-400">Token name</label>
          <input
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="Dog Rocket"
            className="w-full rounded-lg border border-border bg-black px-3 py-2 text-sm text-white outline-none focus:border-accentBlue"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-400">Symbol</label>
          <input
            value={form.symbol}
            onChange={(e) => updateField('symbol', e.target.value.toUpperCase())}
            placeholder="$ROCKET"
            className="w-full rounded-lg border border-border bg-black px-3 py-2 text-sm text-white outline-none focus:border-accentBlue"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-gray-400">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
            rows={3}
            placeholder="A short description of your token"
            className="w-full rounded-lg border border-border bg-black px-3 py-2 text-sm text-white outline-none focus:border-accentBlue"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-400">Total supply</label>
          <input
            value={form.supply}
            onChange={(e) => updateField('supply', e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="1000000000"
            className="w-full rounded-lg border border-border bg-black px-3 py-2 text-sm text-white outline-none focus:border-accentBlue"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-400">Decimals</label>
          <input
            type="number"
            min={0}
            max={9}
            value={form.decimals}
            onChange={(e) => updateField('decimals', Number(e.target.value))}
            className="w-full rounded-lg border border-border bg-black px-3 py-2 text-sm text-white outline-none focus:border-accentBlue"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-gray-400">Logo</label>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => e.target.files && handleLogoUpload(e.target.files[0])}
            className="w-full text-sm text-gray-400 file:mr-3 file:rounded-lg file:border file:border-border file:bg-black file:px-3 file:py-1.5 file:text-sm file:text-white"
          />
          {form.logoDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={form.logoDataUrl}
              alt="Logo preview"
              className="mt-3 h-16 w-16 rounded-lg border border-border object-cover"
            />
          )}
        </div>
      </div>

      <DevBuyPanel value={devBuySol} onChange={setDevBuySol} />

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-3 text-sm font-semibold text-white">
          Trust checklist (optional)
        </h3>
        <label className="mb-2 flex items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={revokeMint}
            onChange={(e) => setRevokeMint(e.target.checked)}
          />
          Revoke mint authority after creation (supply becomes fixed forever)
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={revokeFreeze}
            onChange={(e) => setRevokeFreeze(e.target.checked)}
          />
          Revoke freeze authority after creation
        </label>
      </div>

      {error && (
        <div className="rounded-lg border border-accentRed/40 bg-accentRed/10 px-4 py-3 text-sm text-accentRed">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || !wallet.connected}
        className="w-full rounded-xl bg-white py-3 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-50"
      >
        {submitting
          ? 'Creating token...'
          : wallet.connected
          ? 'Create Token'
          : 'Connect wallet to create a token'}
      </button>
    </form>
  );
}
