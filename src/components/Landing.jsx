import React, { useState } from "react";
import useAppWallet from "../wallet/useAppWallet.js";
import WalletSelect from "./WalletSelect.jsx";
import "./Landing.css";

export default function Landing() {
  const { installedWallets, connect, connecting } = useAppWallet();
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleClick = async () => {
    if (installedWallets.length === 0) {
      // No Solana wallet extension detected — send the user to install one
      // instead of pretending a connection happened.
      window.open("https://phantom.app/", "_blank", "noopener,noreferrer");
      return;
    }

    if (installedWallets.length === 1) {
      await connect(installedWallets[0].adapter.name);
      return;
    }

    setPickerOpen(true);
  };

  const handleSelect = async (walletName) => {
    setPickerOpen(false);
    await connect(walletName);
  };

  return (
    <div className="landing">
      <h1 className="landing-title">STMC Helper</h1>
      <button
        className="connect-button"
        onClick={handleClick}
        disabled={connecting}
      >
        {connecting ? "connecting..." : "connect solana wallet"}
      </button>

      {pickerOpen && (
        <WalletSelect
          wallets={installedWallets}
          onSelect={handleSelect}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
