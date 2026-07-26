import React, { useState } from "react";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import WalletContextProvider from "./wallet/WalletContextProvider.jsx";
import useAppWallet from "./wallet/useAppWallet.js";
import Landing from "./components/Landing.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Logo from "./components/Logo.jsx";
import Home from "./components/Home.jsx";
import Settings from "./components/Settings.jsx";
import "./App.css";

function AppShell() {
  const { connected, disconnect } = useAppWallet();
  const [activePage, setActivePage] = useState("home");
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  const handleDisconnect = async () => {
    await disconnect();
    setActivePage("home");
  };

  if (!connected) {
    return <Landing />;
  }

  return (
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
  );
}

export default function App() {
  return (
    <WalletContextProvider>
      <ThemeProvider>
        <AppShell />
      </ThemeProvider>
    </WalletContextProvider>
  );
}
