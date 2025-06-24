
export interface UpdateTokenMetadataParams {
  tokenName: string;
  ticker: string;
  imageFile: File;
  userWalletAddress: string;
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
