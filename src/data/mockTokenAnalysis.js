/**
 * Placeholder analysis source for the Token Scanner.
 *
 * This is the ONLY place that should know whether analysis data is mocked
 * or real. When real analysis is wired up (on-chain lookups, an AI summary
 * call, etc.), replace the body of `analyzeToken` with the real
 * implementation and keep the same return shape — TokenScanner.jsx doesn't
 * need to change at all.
 *
 * Shape returned by analyzeToken(address):
 * {
 *   address: string,
 *   riskScore: number,        // 0-100
 *   checks: Array<{ label: string, passed: boolean }>,
 *   aiSummary: string,
 * }
 */

const MOCK_RESULT = {
  riskScore: 82,
  checks: [
    { label: "Contract verified", passed: true },
    { label: "Top 10 wallets own 55%", passed: false },
    { label: "Liquidity not locked", passed: false },
  ],
  aiSummary:
    "This token has high whale concentration and unlocked liquidity, which raises the risk of a sudden price drop if a large holder sells. Contract verification is a positive signal, but the ownership distribution is worth watching closely before entering a position.",
};

// Simulated network delay so the UI's loading state has something to show.
const MOCK_DELAY_MS = 900;

export function analyzeToken(address) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        address,
        ...MOCK_RESULT,
      });
    }, MOCK_DELAY_MS);
  });
}
