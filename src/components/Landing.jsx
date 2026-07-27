import React, { useState } from "react";
import useAppWallet from "../wallet/useAppWallet.js";
import WalletSelect from "./WalletSelect.jsx";
import "./Landing.css";

export default function Landing() {
  const { connecting } = useAppWallet();
  const [pickerOpen, setPickerOpen] = useState(false);

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

      {pickerOpen && <WalletSelect onClose={() => setPickerOpen(false)} />}
    </div>
  );
}
