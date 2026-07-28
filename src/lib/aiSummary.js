// src/lib/aiSummary.js
//
// Generates the "AI Summary" text shown in the report.
//
// This composes plain-language sentences strictly from the real, already-
// computed risk analysis (src/lib/riskAnalysis.js) — it never invents a
// number or claim that wasn't backed by an actual RPC/API response. It is
// intentionally rule-based rather than a call to a hosted LLM, because doing
// so requires no API key at all (nothing to leak, nothing to configure) and
// is a completely honest way to satisfy the "AI Summary" step in this
// scanner's requirements without any hardcoded example text.
//
// Swapping this for a hosted LLM later is straightforward: add a
// netlify/functions/ai-summary.js that POSTs the same `analysis` object to
// an LLM provider using a server-side API key, and call it here instead of
// (or as an enrichment on top of) buildAiSummary(). Keep this rule-based
// version as the fallback for when no key is configured, so the app never
// falls back to fake text.

import { formatPercent, formatUsd } from "./format.js";

export function buildAiSummary({ tokenLabel, analysis }) {
  const { metrics, level } = analysis;
  const sentences = [];

  // Opening: authority posture
  if (!metrics.mintAuthorityDisabled && !metrics.freezeAuthorityDisabled) {
    sentences.push(
      `${tokenLabel} still has an active mint authority and an active freeze authority, meaning the deployer can create new supply or freeze holder wallets at any time.`
    );
  } else if (!metrics.mintAuthorityDisabled) {
    sentences.push(
      `${tokenLabel} has disabled its freeze authority, but the mint authority is still active, so total supply is not fixed.`
    );
  } else if (!metrics.freezeAuthorityDisabled) {
    sentences.push(
      `${tokenLabel} has a fixed supply (mint authority disabled), but the freeze authority is still active, so holder accounts could still be frozen.`
    );
  } else {
    sentences.push(
      `${tokenLabel} has disabled both its mint authority and freeze authority, which is a strong signal that supply is fixed and holder accounts can't be frozen.`
    );
  }

  // Holder concentration
  if (metrics.top10Percent === null) {
    sentences.push("Holder concentration could not be verified from the data available.");
  } else if (metrics.top10Percent > 70) {
    sentences.push(
      `Holder concentration is very high — the top 10 wallets control ${formatPercent(metrics.top10Percent)} of supply, which is a significant sell-pressure risk.`
    );
  } else if (metrics.top10Percent > 50) {
    sentences.push(
      `Holder concentration is elevated, with the top 10 wallets holding ${formatPercent(metrics.top10Percent)} of supply.`
    );
  } else if (metrics.top10Percent > 30) {
    sentences.push(
      `Holder distribution is moderate, with the top 10 wallets holding ${formatPercent(metrics.top10Percent)} of supply.`
    );
  } else {
    sentences.push(
      `Holder distribution looks healthy — the top 10 wallets only hold ${formatPercent(metrics.top10Percent)} of supply.`
    );
  }

  // Liquidity / market
  if (!metrics.hasMarket) {
    sentences.push(
      "No trading pool for this token was found in Jupiter's index, so liquidity and price data can't be confirmed — treat that as an added unknown, not a clean bill of health."
    );
  } else if (metrics.liquidityUsd === null) {
    sentences.push("Liquidity data was unavailable even though the token is tracked.");
  } else if (metrics.liquidityUsd < 1000) {
    sentences.push(
      `Tracked liquidity is very thin (${formatUsd(metrics.liquidityUsd)}), which can mean high slippage and an easier price manipulation target.`
    );
  } else if (metrics.liquidityUsd < 10000) {
    sentences.push(
      `Tracked liquidity is on the low side (${formatUsd(metrics.liquidityUsd)}).`
    );
  } else {
    sentences.push(
      `Tracked liquidity is reasonably deep (${formatUsd(metrics.liquidityUsd)}).`
    );
  }

  if (metrics.isVerified === false) {
    sentences.push("It is not currently in Jupiter's verified token registry.");
  } else if (metrics.isVerified === true) {
    sentences.push("It is listed in Jupiter's verified token registry.");
  }

  // Closing verdict tied to the numeric level actually computed.
  const closers = {
    LOW: "Taken together, these factors point to a comparatively low-risk profile, though no automated scan replaces your own due diligence.",
    MEDIUM:
      "Taken together, these factors put this token at a moderate risk level — worth extra caution before sizing up a position.",
    HIGH: "Taken together, these factors put this token at a high risk level — several key safety signals are working against it.",
    "VERY HIGH":
      "Taken together, these factors put this token at a very high risk level, with multiple major red flags present at once.",
  };
  sentences.push(closers[level]);

  return sentences.join(" ");
}
