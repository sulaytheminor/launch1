import React from "react";
import "./RiskScoreBar.css";

const LEVELS = ["LOW", "MEDIUM", "HIGH", "VERY HIGH"];

export default function RiskScoreBar({ score, level }) {
  const filled = Math.round((score / 100) * 10);
  const bar = "█".repeat(filled) + "░".repeat(10 - filled);

  return (
    <div className="risk-score-bar">
      <div className="risk-score-bar-row">
        <span className="risk-score-bar-ascii">{bar}</span>
        <span className="risk-score-bar-value">{score}/100</span>
      </div>
      <div className="risk-score-levels">
        {LEVELS.map((l) => (
          <span
            key={l}
            className={`risk-score-level ${l === level ? "active" : ""} ${l
              .toLowerCase()
              .replace(" ", "-")}`}
          >
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}
