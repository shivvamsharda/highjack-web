
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { HijackFormData, HijackRecord } from './types.ts'

export async function checkDuplicateSignature(
  supabase: ReturnType<typeof createClient>,
  signature: string
): Promise<boolean> {
  const { data: existingSignature, error: signatureCheckError } = await supabase
    .from('token_hijacks')
    .select('transaction_signature')
    .eq('transaction_signature', signature)
    .single()

  if (signatureCheckError && signatureCheckError.code !== 'PGRST116') {
    throw new Error('Failed to verify transaction signature uniqueness')
  }

  return !!existingSignature
}

export async function createHijackRecord(
  supabase: ReturnType<typeof createClient>,
  formData: HijackFormData & { feePaidSol: number }
): Promise<HijackRecord> {
  const { data: hijackRecord, error: insertError } = await supabase
    .from('token_hijacks')
    .insert({
      wallet_address: formData.userWalletAddress,
      token_name: formData.tokenName,
      ticker_symbol: formData.ticker.toUpperCase(),
      image_file_name: formData.imageFile.name,
      image_file_size: formData.imageFile.size,
      image_file_type: formData.imageFile.type,
      status: 'processing',
      transaction_signature: formData.paymentSignature,
      fee_paid_sol: formData.feePaidSol
    })
    .select()
    .single()

  if (insertError) {
    throw new Error('Failed to create hijack record')
  }

  return hijackRecord
}

export async function updateHijackRecordSuccess(
  supabase: ReturnType<typeof createClient>,
  recordId: string,
  explorerUrl: string,
  imageUri: string,
  metadataUri: string,
  metadata: any,
  blockTime?: number
): Promise<void> {
  const { error: updateError } = await supabase
    .from('token_hijacks')
    .update({
      status: 'completed',
      explorer_url: explorerUrl,
      image_uri: imageUri,
      metadata_uri: metadataUri,
      new_metadata: metadata,
      block_time: blockTime
    })
    .eq('id', recordId)

  if (updateError) {
    console.error('Error updating hijack record:', updateError)
    throw new Error('Failed to update hijack record')
  }

  console.log('Hijack record updated successfully')

  // Call Twitter bot edge function directly
  try {
    console.log('Calling Twitter bot to post tweet for hijack:', recordId)
    
    const { data: twitterResponse, error: twitterError } = await supabase.functions.invoke('post-hijack-tweet', {
      body: { hijack_id: recordId }
    })

    if (twitterError) {
      console.error('Error calling Twitter bot:', twitterError)
      // Don't throw error here - Twitter posting failure shouldn't fail the entire hijack
    } else {
      console.log('Twitter bot called successfully:', twitterResponse)
    }
  } catch (error) {
    console.error('Failed to call Twitter bot:', error)
    // Don't throw error here - Twitter posting failure shouldn't fail the entire hijack
  }
}

export async function updateHijackRecordError(
  supabase: ReturnType<typeof createClient>,
  recordId: string,
  errorMessage: string
): Promise<void> {
  await supabase
    .from('token_hijacks')
    .update({
      status: 'failed',
      error_message: errorMessage
    })
    .eq('id', recordId)
}
