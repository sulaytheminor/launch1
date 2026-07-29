import React, { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import ScannerTerminal from "./ScannerTerminal.jsx";
import RiskScoreBar from "./RiskScoreBar.jsx";
import { getMintInfo, getLargestHolders } from "../lib/solanaRpc.js";
import { getMarketData } from "../lib/jupiterMarket.js";
import { computeRiskAnalysis } from "../lib/riskAnalysis.js";
import { buildAiSummary } from "../lib/aiSummary.js";
import { formatUsd, formatCompactNumber, shortenAddress } from "../lib/format.js";
import "./TokenScanner.css";

// Minimum time each terminal line stays visible before moving to the next,
// purely for readability of the animation — it never masks a failure or
// delays past however long the real request actually took.
const MIN_STEP_MS = 350;

export default function TokenScanner() {
  const [address, setAddress] = useState("");
  const [lines, setLines] = useState([]);
  const [result, setResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  const addLine = (text, status, extra) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setLines((prev) => [...prev, { id, text, status, ...extra }]);
    return id;
  };

  const updateLine = (id, patch) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  // Runs one terminal step. `fn` receives an `onRetry(attempt, err)` callback
  // it can pass down to a retry-aware fetcher (see src/lib/retry.js) — when
  // that fires (rate limit, 502/503/504, or a network blip), the
  // currently-active line is marked with a warning and a fresh "Retrying..."
  // line takes over, so a multi-attempt fetch still reads as a clear
  // step-by-step log instead of a single stalled spinner.
  const runStep = async (text, successText, fn) => {
    let currentId = addLine(text, "pending", { successText });

    const handleRetry = async (attempt, err) => {
      const warningText = err?.rateLimited ? "RPC limit detected" : "RPC error detected";
      updateLine(currentId, { status: "warning", warningText });
      currentId = addLine("Retrying...", "pending", { successText: "Complete" });
    };

    const delay = new Promise((resolve) => setTimeout(resolve, MIN_STEP_MS));

    try {
      const [value] = await Promise.all([fn(handleRetry), delay]);
      updateLine(currentId, { status: "done" });
      return value;
    } catch (err) {
      updateLine(currentId, { status: "error", errorText: err.message });
      throw err;
    }
  };

  const handleAnalyze = async () => {
    const trimmed = address.trim();

    if (!trimmed) {
      setError("Enter a token address first.");
      setResult(null);
      setLines([]);
      return;
    }

    let pubkey;
    try {
      pubkey = new PublicKey(trimmed);
    } catch {
      setError("That doesn't look like a valid Solana address.");
      setResult(null);
      setLines([]);
      return;
    }

    const mint = pubkey.toBase58();

    setError("");
    setResult(null);
    setLines([]);
    setAnalyzing(true);

    try {
      // "Connecting" performs the first real RPC call (fetching the mint
      // account) rather than a separate getHealth ping — one fewer RPC round
      // trip per scan, and the natural place to surface a rate-limit retry
      // if the very first call gets throttled.
      const mintInfo = await runStep(
        "Connecting to Solana...",
        "Connected",
        (onRetry) => getMintInfo(mint, { onRetry })
      );

      await runStep("Fetching token metadata...", "Complete", async () => mintInfo);

      const largestHolders = await runStep(
        "Fetching holder distribution...",
        "Complete",
        (onRetry) => getLargestHolders(mint, { onRetry })
      );

      await runStep("Checking mint authority...", "Complete", async () => mintInfo);
      await runStep("Checking freeze authority...", "Complete", async () => mintInfo);

      const market = await runStep(
        "Checking liquidity...",
        "Complete",
        () => getMarketData(mint)
      );

      const analysis = await runStep(
        "Calculating STMC Risk Score...",
        "Complete",
        async () => computeRiskAnalysis({ mintInfo, largestHolders, market })
      );

      const tokenLabel = market.found
        ? market.symbol || market.name || shortenAddress(mint)
        : shortenAddress(mint);

      const summary = await runStep(
        "Generating AI Summary...",
        "Complete",
        async () => buildAiSummary({ tokenLabel, analysis })
      );

      setResult({ mint, mintInfo, largestHolders, market, analysis, summary });
    } catch (err) {
      setError(err.message || "Something went wrong while analyzing this token.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !analyzing) {
      handleAnalyze();
    }
  };

  return (
    <div className="token-scanner">
      <h1 className="token-scanner-title">Token Scanner</h1>
      <p className="token-scanner-subtitle">
        Enter a Solana token mint address to pull live on-chain data and
        market data, and get an STMC Risk Score.
      </p>

      <div className="token-scanner-form">
        <label className="token-scanner-label" htmlFor="token-address-input">
          Token mint address
        </label>
        <div className="token-scanner-input-row">
          <input
            id="token-address-input"
            className="token-scanner-input"
            type="text"
            placeholder="e.g. EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            disabled={analyzing}
          />
          <button
            className="token-scanner-button"
            onClick={handleAnalyze}
            disabled={analyzing}
          >
            {analyzing ? "Analyzing..." : "Analyze"}
          </button>
        </div>
        {error && <div className="token-scanner-error">{error}</div>}
      </div>

      <ScannerTerminal lines={lines} />

      {result && (
        <div className="token-scanner-result">
          <div className="token-scanner-result-header">
            {result.market.found && result.market.icon && (
              <img
                className="token-scanner-result-icon"
                src={result.market.icon}
                alt=""
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            )}
            <div>
              <div className="token-scanner-result-name">
                {result.market.found
                  ? `${result.market.name || "Unknown token"} (${
                      result.market.symbol || "?"
                    })`
                  : "Metadata not indexed by Jupiter"}
              </div>
              <div className="token-scanner-result-address">{result.mint}</div>
            </div>
          </div>

          <RiskScoreBar score={result.analysis.score} level={result.analysis.level} />

          <div>
            <div className="token-scanner-section-heading">Security Checklist</div>
            <ul className="token-scanner-checks">
              {result.analysis.checks.map((check) => (
                <li
                  key={check.label}
                  className={`token-scanner-check ${
                    check.passed ? "passed" : "failed"
                  }`}
                >
                  <span className="token-scanner-check-icon">
                    {check.passed ? "\u2705" : "\u274C"}
                  </span>
                  <span>{check.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="token-scanner-section-heading">Market Data</div>
            <div className="token-scanner-market-grid">
              <div>
                <span className="token-scanner-market-label">Price</span>
                <span>{formatUsd(result.market.found ? result.market.priceUsd : null)}</span>
              </div>
              <div>
                <span className="token-scanner-market-label">Market cap</span>
                <span>{formatUsd(result.market.found ? result.market.marketCapUsd : null)}</span>
              </div>
              <div>
                <span className="token-scanner-market-label">24h volume</span>
                <span>{formatUsd(result.market.found ? result.market.volume24hUsd : null)}</span>
              </div>
              <div>
                <span className="token-scanner-market-label">Liquidity</span>
                <span>{formatUsd(result.market.found ? result.market.liquidityUsd : null)}</span>
              </div>
              <div>
                <span className="token-scanner-market-label">Decimals</span>
                <span>{result.mintInfo.decimals}</span>
              </div>
              <div>
                <span className="token-scanner-market-label">Circulating supply</span>
                <span>{formatCompactNumber(result.analysis.metrics.circulatingSupplyUi)}</span>
              </div>
            </div>
            {!result.market.found && (
              <p className="token-scanner-market-note">
                This mint isn't indexed by Jupiter's token API, so price,
                market cap, volume, and liquidity can't be confirmed.
              </p>
            )}
          </div>

          <div>
            <div className="token-scanner-section-heading">AI Summary</div>
            <p className="token-scanner-summary">"{result.summary}"</p>
          </div>
        </div>
      )}
    </div>
  );
}
