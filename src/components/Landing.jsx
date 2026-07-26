import React from "react";
import "./Landing.css";

export default function Landing({ onConnect }) {
  return (
    <div className="landing">
      <h1 className="landing-title">STMC Helper</h1>
      <button className="connect-button" onClick={onConnect}>
        connect solana wallet
      </button>
    </div>
  );
}
