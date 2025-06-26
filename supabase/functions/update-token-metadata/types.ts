
export interface HijackFormData {
  userWalletAddress: string
  tokenName: string
  ticker: string
  imageFile: File
  paymentSignature: string
  xLink?: string
  telegramLink?: string
  websiteLink?: string
}

export interface HijackRecord {
  id: string
  wallet_address: string
  token_name: string
  ticker_symbol: string
  image_file_name: string | null
  image_file_size: number | null
  image_file_type: string | null
  status: string
  transaction_signature: string | null
  explorer_url: string | null
  image_uri: string | null
  metadata_uri: string | null
  new_metadata: any | null
  block_time: number | null
  error_message: string | null
  created_at: string
  updated_at: string
  fee_paid_sol: number | null
  x_link: string | null
  telegram_link: string | null
  website_link: string | null
}

export interface TokenMetadata {
  name: string
  symbol: string  
  description: string
  image: string
  external_url?: string
  attributes?: Array<{
    trait_type: string
    value: string | number
  }>
  properties?: {
    files?: Array<{
      uri: string
      type: string
    }>
    category?: string
    creators?: Array<{
      address: string
      share: number
    }>
  }
  social?: {
    x?: string
    telegram?: string
    website?: string
  }
}
