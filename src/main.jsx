import React from "react";
import ReactDOM from "react-dom/client";
import { Buffer } from "buffer";
import App from "./App.jsx";
import "./index.css";

// @solana/web3.js expects Node's Buffer to be available globally, which
// doesn't exist in the browser by default.
window.Buffer = window.Buffer || Buffer;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
