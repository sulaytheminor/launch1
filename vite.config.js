import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // @solana/web3.js and the wallet-adapter packages were written for
  // Node and expect `global`/`Buffer` to exist. These settings polyfill
  // just enough of that for the browser build without pulling in a full
  // Node shim.
  define: {
    global: "globalThis",
  },
  resolve: {
    alias: {
      buffer: "buffer",
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
    include: ["buffer"],
  },
  build: {
    outDir: "dist",
  },
});
