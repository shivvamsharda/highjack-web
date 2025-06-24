
export interface HijackFormData {
  tokenName: string;
  ticker: string;
  imageFile: File;
  userWalletAddress: string;
  paymentSignature: string;
}

export interface PaymentVerificationResult {
  isValid: boolean;
  error?: string;
  blockTime?: number;
}

export interface MetadataUploadResult {
  imageUri: string;
  metadataUri: string;
  metadata: any;
}

export interface HijackRecord {
  id: string;
  wallet_address: string;
  token_name: string;
  ticker_symbol: string;
  image_file_name: string;
  image_file_size: number;
  image_file_type: string;
  status: string;
  transaction_signature: string;
}
