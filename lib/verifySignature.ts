import nacl from 'tweetnacl';
import bs58 from 'bs58';

/**
 * Verifies that `signatureBase58` is a valid ed25519 signature of
 * `message`, produced by the private key matching `walletAddressBase58`.
 *
 * This is what stands between "the frontend said this wallet created the
 * token" and actual proof of it — a client can put any string in a
 * walletAddress field, but it cannot forge a signature without the
 * matching private key, which only the wallet extension holds.
 */
export function verifyWalletSignature(
  message: string,
  signatureBase58: string,
  walletAddressBase58: string
): boolean {
  try {
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signatureBase58);
    const publicKeyBytes = bs58.decode(walletAddressBase58);

    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
  } catch {
    return false;
  }
}

/**
 * Builds the exact message the client must sign with wallet.signMessage()
 * before a token-creation record is accepted. Including the mint address
 * and tx signature ties the signature to this specific creation event —
 * it can't be replayed to authorize a different token.
 */
export function buildOwnershipMessage(params: {
  walletAddress: string;
  tokenAddress: string;
  transactionSignature: string;
}): string {
  return [
    'STMC Launchpad — confirm token creation',
    `Wallet: ${params.walletAddress}`,
    `Token: ${params.tokenAddress}`,
    `Tx: ${params.transactionSignature}`,
  ].join('\n');
}
