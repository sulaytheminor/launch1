// src/lib/format.js

/** Divides a raw integer token amount (as a string/BigInt) by 10^decimals. */
export function rawToUiNumber(raw, decimals) {
  const bigRaw = BigInt(raw);
  const divisor = 10n ** BigInt(decimals);
  const whole = bigRaw / divisor;
  const remainder = bigRaw % divisor;
  return Number(whole) + Number(remainder) / Number(divisor);
}

export function formatCompactNumber(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "N/A";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatUsd(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "N/A";
  if (value !== 0 && Math.abs(value) < 0.01) {
    return `$${value.toExponential(2)}`;
  }
  return `$${formatCompactNumber(value)}`;
}

export function formatPercent(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "N/A";
  return `${value.toFixed(digits)}%`;
}

export function shortenAddress(address, chars = 4) {
  if (!address || address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}
