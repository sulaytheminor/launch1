import React from "react";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import useAppWallet from "../wallet/useAppWallet.js";
import { buildWalletGroups } from "../wallet/walletList.js";
import "./WalletSelect.css";

function WalletRow({ walletEntry, onPick }) {
  const installed = walletEntry.readyState === WalletReadyState.Installed;
  const { name, icon } = walletEntry.adapter;

  return (
    <button className="wallet-select-item" onClick={() => onPick(walletEntry)}>
      <span className="wallet-select-icon-wrap">
        {icon ? (
          <img src={icon} alt="" className="wallet-select-icon" />
        ) : (
          <span className="wallet-select-icon-fallback">{name.charAt(0)}</span>
        )}
      </span>
      <span className="wallet-select-name">{name}</span>
      <span
        className={`wallet-select-status ${installed ? "is-installed" : ""}`}
      >
        {installed ? "Installed" : "Install"}
      </span>
    </button>
  );
}

export default function WalletSelect({ onClose }) {
  const { wallets, connect } = useAppWallet();
  const { primary, other } = buildWalletGroups(wallets);

  const handlePick = async (walletEntry) => {
    if (walletEntry.readyState !== WalletReadyState.Installed) {
      window.open(walletEntry.adapter.url, "_blank", "noopener,noreferrer");
      return;
    }
    onClose();
    await connect(walletEntry.adapter.name);
  };

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
          {primary.map((w) => (
            <WalletRow key={w.adapter.name} walletEntry={w} onPick={handlePick} />
          ))}
        </div>

        {other.length > 0 && (
          <>
            <div className="wallet-select-divider">Other detected wallets</div>
            <div className="wallet-select-list">
              {other.map((w) => (
                <WalletRow
                  key={w.adapter.name}
                  walletEntry={w}
                  onPick={handlePick}
                />
              ))}
            </div>
          </>
        )}

        <button className="wallet-select-cancel" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
