
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

export interface FeeInfo {
  currentFee: number;
  id: string;
}

export async function getCurrentFee(
  supabase: ReturnType<typeof createClient>
): Promise<FeeInfo> {
  const { data: pricing, error } = await supabase
    .from('hijack_pricing')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    console.error('Error fetching current fee:', error)
    // Return base fee as fallback
    return { currentFee: 0.1, id: '' }
  }

  return {
    currentFee: Number(pricing.current_fee_sol),
    id: pricing.id
  }
}

export async function updateFeeAfterHijack(
  supabase: ReturnType<typeof createClient>,
  pricingId: string,
  currentFee: number
): Promise<void> {
  const newFee = currentFee + 0.1
  const now = new Date().toISOString()

  console.log(`Updating fee from ${currentFee} to ${newFee} SOL after successful hijack`)

  const { error } = await supabase
    .from('hijack_pricing')
    .update({
      current_fee_sol: newFee,
      last_hijack_at: now,
      last_fee_update_at: now
    })
    .eq('id', pricingId)

  if (error) {
    console.error('Error updating fee after hijack:', error)
    throw new Error('Failed to update hijack fee')
  }

  console.log(`Fee successfully updated to ${newFee} SOL`)
}

export async function verifyPaymentAmount(
  paymentAmount: number,
  expectedFee: number,
  tolerance: number = 0.001 // Small tolerance for SOL precision
): Promise<boolean> {
  const difference = Math.abs(paymentAmount - expectedFee)
  const isValid = difference <= tolerance
  
  console.log(`Payment verification: expected ${expectedFee} SOL, received ${paymentAmount} SOL, difference: ${difference}, valid: ${isValid}`)
  
  return isValid
}
