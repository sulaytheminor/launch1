import React, { useState } from "react";
import { analyzeToken } from "../data/mockTokenAnalysis.js";
import "./TokenScanner.css";

export default function TokenScanner() {
  const [address, setAddress] = useState("");
  const [result, setResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  const handleAnalyze = async () => {
    const trimmed = address.trim();
    if (!trimmed) {
      setError("Enter a token address first.");
      setResult(null);
      return;
    }

    setError("");
    setAnalyzing(true);
    setResult(null);

    try {
      // Placeholder analysis only — no real blockchain or AI calls yet.
      // See src/data/mockTokenAnalysis.js for where the real
      // implementation will eventually go.
      const data = await analyzeToken(trimmed);
      setResult(data);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleAnalyze();
    }
  };

  return (
    <div className="token-scanner">
      <h1 className="token-scanner-title">Token Scanner</h1>
      <p className="token-scanner-subtitle">
        Enter a Solana token address to get a quick risk read. Results shown
        here are placeholder data while the real analysis engine is built.
      </p>

      <div className="token-scanner-form">
        <label className="token-scanner-label" htmlFor="token-address-input">
          Token address
        </label>
        <div className="token-scanner-input-row">
          <input
            id="token-address-input"
            className="token-scanner-input"
            type="text"
            placeholder="e.g. 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
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

      {result && (
        <div className="token-scanner-result">
          <div className="token-scanner-result-address">{result.address}</div>

          <div className="token-scanner-score-row">
            <span className="token-scanner-score-label">STMC Risk Score</span>
            <span className="token-scanner-score-value">
              {result.riskScore}/100
            </span>
          </div>

          <div>
            <div className="token-scanner-section-heading">Security</div>
            <ul className="token-scanner-checks">
              {result.checks.map((check) => (
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
            <div className="token-scanner-section-heading">AI Summary</div>
            <p className="token-scanner-summary">"{result.aiSummary}"</p>
          </div>
        </div>
      )}
    </div>
  );
}
