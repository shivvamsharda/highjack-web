
export interface UpdateTokenMetadataParams {
  tokenName: string;
  ticker: string;
  imageFile: File;
  userWalletAddress: string;
  xLink?: string;
  telegramLink?: string;
  websiteLink?: string;
  description?: string;
}

export interface UpdateTokenMetadataResponse {
  success: boolean;
  transactionSignature?: string;
  updateTransactionSignature?: string;
  explorerUrl?: string;
  updateExplorerUrl?: string;
  imageUri?: string;
  metadataUri?: string;
  newMetadata?: any;
  blockTime?: number;
  error?: string;
  details?: string;
  message?: string;
}

export interface CurrentTokenMetadata {
  name: string;
  symbol: string;
  image: string | null;
  description: string | null;
  metadataUri: string;
  updateAuthority: string;
  isMutable?: boolean | null;
  mintAddress: string;
  creators?: any[];
  collection?: any;
}

export interface FetchCurrentMetadataResponse {
  success: boolean;
  metadata?: CurrentTokenMetadata;
  error?: string;
  details?: string;
}
