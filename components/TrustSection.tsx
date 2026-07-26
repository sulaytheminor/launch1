export default function TrustSection() {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
        How STMC handles your token
      </h3>
      <ul className="space-y-2 text-sm text-gray-300">
        <li className="flex gap-2">
          <span className="text-accentBlue">•</span>
          STMC never takes ownership or control of any token you create. The
          mint and update authority are set to your connected wallet.
        </li>
        <li className="flex gap-2">
          <span className="text-accentBlue">•</span>
          You hold 100% of the initial supply in your own wallet immediately
          after creation.
        </li>
        <li className="flex gap-2">
          <span className="text-accentBlue">•</span>
          STMC does not create a liquidity pool for you. If you want your
          token tradeable on a DEX, you add liquidity yourself (e.g. on
          Raydium or Meteora) whenever you choose.
        </li>
        <li className="flex gap-2">
          <span className="text-accentBlue">•</span>
          A {(Number(process.env.NEXT_PUBLIC_FEE_BPS || '100') / 100).toFixed(0)}%
          service fee applies to token creation and any optional dev-buy
          amount — see the fee note on the create form for details.
        </li>
      </ul>
    </div>
  );
}
