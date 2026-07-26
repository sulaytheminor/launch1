'use client';

import { useState } from 'react';
import { feePercentLabel } from '@/lib/fee';

const PRESETS = [0, 0.5, 1];

export default function DevBuyPanel({
  value,
  onChange,
}: {
  value: number;
  onChange: (sol: number) => void;
}) {
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState('');

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Dev Buy (optional)</h3>
        <span className="text-xs text-gray-500">{feePercentLabel()} fee applies</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => {
              setCustomOpen(false);
              onChange(preset);
            }}
            className={`rounded-lg border px-4 py-2 text-sm transition ${
              !customOpen && value === preset
                ? 'border-accentBlue bg-accentBlue/10 text-white'
                : 'border-border text-gray-400 hover:border-gray-600'
            }`}
          >
            {preset === 0 ? 'None' : `${preset} SOL`}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustomOpen(true)}
          className={`rounded-lg border px-4 py-2 text-sm transition ${
            customOpen
              ? 'border-accentBlue bg-accentBlue/10 text-white'
              : 'border-border text-gray-400 hover:border-gray-600'
          }`}
        >
          Custom
        </button>
      </div>

      {customOpen && (
        <input
          type="number"
          min={0}
          step={0.01}
          value={customValue}
          onChange={(e) => {
            setCustomValue(e.target.value);
            const num = parseFloat(e.target.value);
            onChange(Number.isFinite(num) && num >= 0 ? num : 0);
          }}
          placeholder="Custom SOL amount"
          className="mt-3 w-full rounded-lg border border-border bg-black px-3 py-2 text-sm text-white outline-none focus:border-accentBlue"
        />
      )}

      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        No liquidity pool exists yet at creation time, so this is not a
        market swap. Of the SOL you allocate here, {feePercentLabel()} goes to
        the STMC platform wallet as a service fee — the rest stays in your
        wallet, reserved by you for adding liquidity later if you choose to.
      </p>
    </div>
  );
}
