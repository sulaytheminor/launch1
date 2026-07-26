import React, { useState } from "react";
import { useTheme, THEMES } from "../context/ThemeContext.jsx";
import useAppWallet from "../wallet/useAppWallet.js";
import "./Settings.css";

function shortenAddress(address, chars = 4) {
  if (!address) return "";
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export default function Settings({ onDisconnect }) {
  const { theme, setTheme } = useTheme();
  const { address } = useAppWallet();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      // Clipboard API can be unavailable (permissions, insecure context) —
      // fail quietly rather than breaking the page.
      console.warn("Could not copy address:", err?.message || err);
    }
  };

  return (
    <div className="settings">
      <div className="contact-bar">
        <span className="contact-bar-title">Contact me</span>
        <span className="contact-bar-email">sulaythemin0@gmail.com</span>
      </div>

      <div className="settings-body">
        <section>
          <h2 className="settings-section-title">Wallet</h2>

          <div className="settings-row wallet-address-row">
            <span className="settings-label">Connected address</span>
            <div className="wallet-address-group">
              <span className="wallet-address" title={address || ""}>
                {shortenAddress(address)}
              </span>
              <button className="copy-button" onClick={handleCopy}>
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          <div className="settings-row">
            <span className="settings-label">Session</span>
            <button className="settings-button" onClick={onDisconnect}>
              Disconnect wallet
            </button>
          </div>
        </section>

        <section>
          <h2 className="settings-section-title">Theme</h2>
          <div className="settings-row">
            <span className="settings-label">Appearance</span>
            <div className="theme-options">
              <button
                className={`theme-pill ${
                  theme === THEMES.BLACK ? "selected" : ""
                }`}
                onClick={() => setTheme(THEMES.BLACK)}
              >
                Black
              </button>
              <button
                className={`theme-pill ${
                  theme === THEMES.WHITE ? "selected" : ""
                }`}
                onClick={() => setTheme(THEMES.WHITE)}
              >
                White
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
