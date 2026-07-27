import React from "react";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import "./WalletSelect.css";

export default function WalletSelect({ wallets, onChoose, onClose }) {
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
          {wallets.map(({ adapter, readyState }) => {
            const installed = readyState === WalletReadyState.Installed;
            return (
              <button
                key={adapter.name}
                className="wallet-select-item"
                onClick={() => onChoose({ adapter, readyState })}
              >
                <img
                  className="wallet-select-icon"
                  src={adapter.icon}
                  alt=""
                  aria-hidden="true"
                />
                <span className="wallet-select-name">{adapter.name}</span>
                {!installed && (
                  <span className="wallet-select-status">Install</span>
                )}
              </button>
            );
          })}
        </div>
        <button className="wallet-select-cancel" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
