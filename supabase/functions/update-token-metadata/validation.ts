
import { PublicKey } from 'https://esm.sh/@solana/web3.js@1.98.2'
import { HijackFormData } from './types.ts'

export function validateFormData(formData: FormData): HijackFormData | null {
  const tokenName = formData.get('tokenName') as string
  const ticker = formData.get('ticker') as string
  const imageFile = formData.get('imageFile') as File
  const userWalletAddress = formData.get('userWalletAddress') as string
  const paymentSignature = formData.get('paymentSignature') as string

  if (!tokenName || !ticker || !imageFile || !userWalletAddress || !paymentSignature) {
    return null
  }

  return {
    tokenName,
    ticker,
    imageFile,
    userWalletAddress,
    paymentSignature
  }
}

export function validateWalletAddress(address: string): boolean {
  try {
    new PublicKey(address)
    return true
  } catch {
    return false
  }
}
