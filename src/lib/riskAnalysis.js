// src/lib/riskAnalysis.js
//
// Turns the real on-chain mint data + real Jupiter market data into:
//   - an STMC Risk Score (0-100, higher = safer)
//   - a risk level (LOW / MEDIUM / HIGH / VERY HIGH)
//   - a dynamic security checklist
//
// Every check and score deduction below is derived from a field that was
// actually returned by Solana RPC or Jupiter's API for THIS mint. Nothing
// here is a fixed/example value — if a data point isn't available (e.g. an
// unindexed token has no Jupiter market data), the corresponding check is
// either omitted or explicitly marked "unknown" rather than guessed at.

import { rawToUiNumber, formatPercent, formatUsd } from "./format.js";

/**
 * @param {object} args
 * @param {{decimals:number, supplyRaw:string, mintAuthority:string|null, freezeAuthority:string|null}} args.mintInfo
 * @param {Array<{address:string, amountRaw:string, decimals:number}>} args.largestHolders
 * @param {ReturnType<typeof import('./jupiterMarket.js').getMarketData> extends Promise<infer T> ? T : never} args.market
 */
export function computeRiskAnalysis({ mintInfo, largestHolders, market }) {
  const mintAuthorityDisabled = mintInfo.mintAuthority === null;
  const freezeAuthorityDisabled = mintInfo.freezeAuthority === null;

  // Top-10 holder concentration, computed directly from on-chain balances
  // (getTokenLargestAccounts) relative to on-chain total supply — exact
  // integer math via BigInt so this is never off due to float rounding.
  const totalSupplyRaw = BigInt(mintInfo.supplyRaw);
  const top10Raw = largestHolders
    .slice(0, 10)
    .reduce((sum, h) => sum + BigInt(h.amountRaw), 0n);

  let top10Percent = null;
  if (totalSupplyRaw > 0n) {
    const basisPoints = (top10Raw * 10000n) / totalSupplyRaw;
    top10Percent = Number(basisPoints) / 100;
  }

  const hasMarket = market?.found === true;
  const liquidityUsd = hasMarket ? market.liquidityUsd : null;
  const isVerified = hasMarket ? market.isVerified : null;
  const organicScoreLabel = hasMarket ? market.organicScoreLabel : null;
  const holderCount = hasMarket ? market.holderCount : null;

  let score = 100;
  const deductions = [];
  const deduct = (points, reason) => {
    score -= points;
    deductions.push({ points, reason });
  };

  if (!mintAuthorityDisabled) {
    deduct(25, "Mint authority is still active — supply can be increased at will.");
  }
  if (!freezeAuthorityDisabled) {
    deduct(20, "Freeze authority is still active — holder accounts can be frozen.");
  }

  if (top10Percent === null) {
    deduct(10, "Holder distribution could not be verified.");
  } else if (top10Percent > 70) {
    deduct(25, `Top 10 holders control ${formatPercent(top10Percent)} of supply.`);
  } else if (top10Percent > 50) {
    deduct(15, `Top 10 holders control ${formatPercent(top10Percent)} of supply.`);
  } else if (top10Percent > 30) {
    deduct(8, `Top 10 holders control ${formatPercent(top10Percent)} of supply.`);
  }

  if (!hasMarket || liquidityUsd === null) {
    deduct(15, "No tracked liquidity pool could be found for this token.");
  } else if (liquidityUsd < 1000) {
    deduct(15, `Very low tracked liquidity (${formatUsd(liquidityUsd)}).`);
  } else if (liquidityUsd < 10000) {
    deduct(8, `Low tracked liquidity (${formatUsd(liquidityUsd)}).`);
  }

  if (isVerified === false) {
    deduct(5, "Token is not in Jupiter's verified registry.");
  }
  if (organicScoreLabel === "low") {
    deduct(5, "Jupiter organic trading score is low.");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let level;
  if (score >= 80) level = "LOW";
  else if (score >= 60) level = "MEDIUM";
  else if (score >= 40) level = "HIGH";
  else level = "VERY HIGH";

  const checks = [
    { label: "Mint authority disabled", passed: mintAuthorityDisabled },
    { label: "Freeze authority disabled", passed: freezeAuthorityDisabled },
    top10Percent !== null
      ? {
          label: `Top 10 holders own ${formatPercent(top10Percent)}`,
          passed: top10Percent <= 50,
        }
      : { label: "Top 10 holder concentration unverified", passed: false },
    hasMarket && liquidityUsd !== null
      ? {
          label: `Liquidity found (~${formatUsd(liquidityUsd)})`,
          passed: liquidityUsd > 0,
        }
      : { label: "No liquidity pool found", passed: false },
  ];

  if (isVerified !== null) {
    checks.push({ label: "Verified in Jupiter token registry", passed: isVerified });
  }
  if (organicScoreLabel) {
    checks.push({
      label: `Organic trading score: ${organicScoreLabel}`,
      passed: organicScoreLabel !== "low",
    });
  }
  if (holderCount !== null) {
    checks.push({
      label: `${holderCount.toLocaleString()} total holders tracked`,
      passed: holderCount >= 50,
    });
  }

  return {
    score,
    level,
    checks,
    deductions,
    metrics: {
      top10Percent,
      liquidityUsd,
      isVerified,
      organicScoreLabel,
      holderCount,
      mintAuthorityDisabled,
      freezeAuthorityDisabled,
      hasMarket,
      circulatingSupplyUi: rawToUiNumber(mintInfo.supplyRaw, mintInfo.decimals),
    },
  };
}
