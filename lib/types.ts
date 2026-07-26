export interface TokenFormData {
  name: string;
  symbol: string;
  description: string;
  supply: string; // kept as string in the form, parsed to bigint on submit
  decimals: number;
  logoDataUrl: string | null; // base64 data URL of the uploaded logo
  twitterBio?: string;
  lore?: string;
  announcement?: string;
}

export interface MemeConcept {
  name: string;
  symbol: string;
  description: string;
  lore: string;
  twitterBio: string;
  announcement: string;
  logoPrompt: string;
}

export interface CreatedToken {
  mintAddress: string;
  txSignature: string;
  name: string;
  symbol: string;
  description: string;
  supply: string;
  decimals: number;
  logoDataUrl: string | null;
  creatorWallet: string;
  createdAt: string; // ISO date
  devBuySol: number;
  feeSol: number;
}
