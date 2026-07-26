import TokenCreatorForm from '@/components/TokenCreatorForm';
import TrustSection from '@/components/TrustSection';
import { feePercentLabel } from '@/lib/fee';

export default function HomePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">
          Create a Solana memecoin in minutes
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-400">
          STMC creates a standard SPL token with on-chain metadata — no
          bonding curve, no automatic liquidity pool. You own 100% of supply
          and add liquidity yourself whenever you're ready. A {feePercentLabel()}{' '}
          creation / dev-buy service fee applies.
        </p>
      </div>

      <TokenCreatorForm />
      <TrustSection />
    </div>
  );
}
