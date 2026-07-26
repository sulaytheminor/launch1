import React from "react";
import { useTheme, THEMES } from "../context/ThemeContext.jsx";
import "./Settings.css";

export default function Settings({ onDisconnect }) {
  const { theme, setTheme } = useTheme();

  return (
    <div className="settings">
      <div className="contact-bar">
        <span className="contact-bar-title">Contact me</span>
        <span className="contact-bar-email">sulaythemin0@gmail.com</span>
      </div>

      <div className="settings-body">
        <section>
          <h2 className="settings-section-title">Wallet</h2>
          <div className="settings-row">
            <span className="settings-label">Connected wallet</span>
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
