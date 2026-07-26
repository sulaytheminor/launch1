import React, { createContext, useContext, useMemo, useState } from "react";

const ThemeContext = createContext(undefined);

export const THEMES = {
  BLACK: "black",
  WHITE: "white",
};

export function ThemeProvider({ children }) {
  // No localStorage per spec — theme lives only in memory for this session.
  const [theme, setTheme] = useState(THEMES.BLACK);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme: () =>
        setTheme((prev) =>
          prev === THEMES.BLACK ? THEMES.WHITE : THEMES.BLACK
        ),
    }),
    [theme]
  );

  return (
    <ThemeContext.Provider value={value}>
      <div data-theme={theme} className="app-root">
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
