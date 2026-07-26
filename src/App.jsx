import React, { useState } from "react";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import Landing from "./components/Landing.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Logo from "./components/Logo.jsx";
import Home from "./components/Home.jsx";
import Settings from "./components/Settings.jsx";
import "./App.css";

export default function App() {
  // Wallet connection is a UI placeholder only — no real Solana integration yet.
  const [connected, setConnected] = useState(false);
  const [activePage, setActivePage] = useState("home");
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  const handleConnect = () => setConnected(true);
  const handleDisconnect = () => {
    setConnected(false);
    setActivePage("home");
  };

  return (
    <ThemeProvider>
      {!connected ? (
        <Landing onConnect={handleConnect} />
      ) : (
        <div className="app-shell">
          <Sidebar
            activePage={activePage}
            onNavigate={setActivePage}
            expanded={sidebarExpanded}
            onToggle={() => setSidebarExpanded((prev) => !prev)}
          />
          <main className="app-main">
            <div className="app-topbar">
              <Logo />
            </div>
            {activePage === "home" && <Home />}
            {activePage === "settings" && (
              <Settings onDisconnect={handleDisconnect} />
            )}
          </main>
        </div>
      )}
    </ThemeProvider>
  );
}
