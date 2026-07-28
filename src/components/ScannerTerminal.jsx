import React from "react";
import "./ScannerTerminal.css";

/**
 * Renders a CMD/terminal-style log of analysis steps.
 *
 * @param {{ lines: Array<{ id: string, text: string, status: "pending"|"done"|"error", successText?: string, errorText?: string }> }} props
 */
export default function ScannerTerminal({ lines }) {
  if (!lines || lines.length === 0) return null;

  return (
    <div className="scanner-terminal" role="log" aria-live="polite">
      {lines.map((line) => (
        <div key={line.id} className="scanner-terminal-line">
          <span className="scanner-terminal-prompt">&gt;</span>
          <span className="scanner-terminal-text">{line.text}</span>
          {line.status === "pending" && (
            <span className="scanner-terminal-spinner" aria-label="Working" />
          )}
          {line.status === "done" && (
            <span className="scanner-terminal-ok">
              ✓ {line.successText || "Complete"}
            </span>
          )}
          {line.status === "error" && (
            <span className="scanner-terminal-fail">
              ✗ Failed{line.errorText ? ` — ${line.errorText}` : ""}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
