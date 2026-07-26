/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Logo files are stored as data URLs / base64 client-side for this MVP,
    // so no remote image domains are required. Add domains here if you later
    // move logo hosting to Arweave/IPFS/S3.
    unoptimized: true,
  },
};

module.exports = nextConfig;
