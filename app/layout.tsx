import type { Metadata } from 'next';
import './globals.css';
import { AppWalletProvider } from '@/components/WalletProvider';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'STMC Launchpad',
  description: 'Create SPL memecoins on Solana. No bonding curve, no forced liquidity — you stay in control.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black font-sans text-white">
        <AppWalletProvider>
          <Navbar />
          <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
        </AppWalletProvider>
      </body>
    </html>
  );
}
