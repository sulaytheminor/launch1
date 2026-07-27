import React, { useState } from "react";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import useAppWallet from "../wallet/useAppWallet.js";
import WalletSelect from "./WalletSelect.jsx";
import "./Landing.css";

export default function Landing() {
  const { supportedWallets, connect, connecting } = useAppWallet();
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleChoose = async ({ adapter, readyState }) => {
    setPickerOpen(false);

    if (readyState === WalletReadyState.Installed) {
      await connect(adapter.name);
      return;
    }

    // Not installed — send the user to get the wallet instead of failing
    // silently or pretending a connection happened.
    window.open(adapter.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="landing">
      <h1 className="landing-title">STMC Helper</h1>
      <button
        className="connect-button"
        onClick={() => setPickerOpen(true)}
        disabled={connecting}
      >
        {connecting ? "connecting..." : "connect solana wallet"}
      </button>

      {pickerOpen && (
        <WalletSelect
          wallets={supportedWallets}
          onChoose={handleChoose}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
