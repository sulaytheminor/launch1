import React from "react";
import "./WalletSelect.css";

export default function WalletSelect({ wallets, onSelect, onClose }) {
  return (
    <div className="wallet-select-overlay" onClick={onClose}>
      <div
        className="wallet-select-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Choose a wallet"
      >
        <h2 className="wallet-select-title">Choose a wallet</h2>
        <div className="wallet-select-list">
          {wallets.map((w) => (
            <button
              key={w.adapter.name}
              className="wallet-select-item"
              onClick={() => onSelect(w.adapter.name)}
            >
              {w.adapter.name}
            </button>
          ))}
        </div>
        <button className="wallet-select-cancel" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
