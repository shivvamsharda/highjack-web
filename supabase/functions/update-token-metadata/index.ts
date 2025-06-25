
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { Connection, PublicKey } from 'https://esm.sh/@solana/web3.js@1.98.2'
import { validateFormData, validateWalletAddress } from './validation.ts'
import { checkDuplicateSignature, createHijackRecord, updateHijackRecordSuccess, updateHijackRecordError } from './database.ts'
import { verifyPaymentTransaction } from './payment-verification.ts'
import { uploadImageAndMetadata } from './storage.ts'
import { createKeypairFromPrivateKey, updateTokenMetadata } from './blockchain.ts'
import { getCurrentFee, updateFeeAfterHijack, verifyPaymentAmount } from './fee-management.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  let hijackRecordId: string | null = null

  try {
    console.log('Starting dynamic pricing token metadata update process...')
    
    const formData = await req.formData()
    const validatedData = validateFormData(formData)

    if (!validatedData) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields including payment signature' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Verify the wallet address is valid
    if (!validateWalletAddress(validatedData.userWalletAddress)) {
      return new Response(
        JSON.stringify({ error: 'Invalid wallet address' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('Getting current hijack fee...')
    
    // Get current fee
    const feeInfo = await getCurrentFee(supabase)
    console.log(`Current hijack fee: ${feeInfo.currentFee} SOL`)

    console.log('Checking for duplicate transaction signature...')

    // Check if transaction signature already exists in database
    const isDuplicate = await checkDuplicateSignature(supabase, validatedData.paymentSignature)

    if (isDuplicate) {
      console.log('Duplicate signature detected:', validatedData.paymentSignature)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Transaction signature already verified',
          details: 'This transaction has already been used to hijack the token'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
      )
    }

    // Get environment variables
    const rpcUrl = Deno.env.get('RPC_URL')
    const mintAddressStr = Deno.env.get('MINT_ADDRESS')
    const treasuryWalletStr = Deno.env.get('WALLET_ADDRESS')
    const walletKeyStr = Deno.env.get('WALLET_KEY')

    if (!rpcUrl || !mintAddressStr || !treasuryWalletStr || !walletKeyStr) {
      throw new Error('Missing required environment variables (RPC_URL, MINT_ADDRESS, WALLET_ADDRESS, WALLET_KEY)')
    }

    console.log('Environment variables loaded, connecting to Solana...')

    // Initialize Solana connection to verify payment
    const connection = new Connection(rpcUrl, 'confirmed')
    const mintAddress = new PublicKey(mintAddressStr)
    const treasuryWallet = new PublicKey(treasuryWalletStr)

    // Verify payment transaction
    const paymentVerification = await verifyPaymentTransaction(
      connection,
      validatedData.paymentSignature,
      validatedData.userWalletAddress,
      treasuryWallet
    )

    if (!paymentVerification.isValid) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: paymentVerification.error,
          details: 'The transaction was not sent from the wallet address you provided'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    // Get transaction details to verify payment amount
    console.log('Verifying payment amount against current fee...')
    
    let txDetails
    try {
      txDetails = await connection.getTransaction(validatedData.paymentSignature, {
        commitment: 'finalized'
      })
    } catch (error) {
      console.error('Error fetching transaction for amount verification:', error)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to verify payment amount'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    if (!txDetails) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Payment transaction not found for amount verification'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    // Extract payment amount from transaction
    const preBalances = txDetails.meta?.preBalances || []
    const postBalances = txDetails.meta?.postBalances || []
    
    if (preBalances.length < 2 || postBalances.length < 2) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Unable to verify payment amount from transaction'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    // Calculate actual payment amount (in SOL)
    const senderBalanceChange = (preBalances[0] - postBalances[0]) / 1_000_000_000 // Convert lamports to SOL
    const actualPaymentAmount = senderBalanceChange - (txDetails.meta?.fee || 0) / 1_000_000_000 // Subtract transaction fee
    
    console.log(`Payment amount verification: expected ${feeInfo.currentFee} SOL, actual ${actualPaymentAmount} SOL`)

    // Verify payment amount matches current fee
    if (!verifyPaymentAmount(actualPaymentAmount, feeInfo.currentFee)) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Incorrect payment amount. Expected ${feeInfo.currentFee} SOL, received ${actualPaymentAmount} SOL`,
          details: 'The payment amount does not match the current hijack fee'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    // Create initial hijack record in database with fee paid
    const hijackRecord = await createHijackRecord(supabase, {
      ...validatedData,
      feePaidSol: feeInfo.currentFee
    })
    hijackRecordId = hijackRecord.id
    console.log('Created hijack record:', hijackRecordId)

    // Create keypair from private key
    let updateAuthorityKeypair
    try {
      updateAuthorityKeypair = createKeypairFromPrivateKey(walletKeyStr)
    } catch (error) {
      console.error('Error parsing WALLET_KEY:', error)
      throw new Error('Invalid WALLET_KEY format. Must be base58 string or JSON array.')
    }

    // Upload image and metadata to storage
    const uploadResult = await uploadImageAndMetadata(
      supabase,
      validatedData.imageFile,
      validatedData.tokenName,
      validatedData.ticker,
      validatedData.userWalletAddress
    )

    // Update token metadata on-chain
    const updateTransactionSignature = await updateTokenMetadata(
      rpcUrl,
      mintAddress,
      updateAuthorityKeypair,
      validatedData.tokenName,
      validatedData.ticker,
      uploadResult.metadataUri
    )

    const explorerUrl = `https://explorer.solana.com/tx/${validatedData.paymentSignature}`
    const updateExplorerUrl = `https://explorer.solana.com/tx/${updateTransactionSignature}`

    // Update hijack record with success data
    await updateHijackRecordSuccess(
      supabase,
      hijackRecordId,
      explorerUrl,
      uploadResult.imageUri,
      uploadResult.metadataUri,
      uploadResult.metadata,
      paymentVerification.blockTime
    )

    // Update fee after successful hijack
    await updateFeeAfterHijack(supabase, feeInfo.id, feeInfo.currentFee)

    console.log('Token hijack completed successfully with dynamic pricing!')

    return new Response(
      JSON.stringify({
        success: true,
        transactionSignature: validatedData.paymentSignature,
        updateTransactionSignature,
        explorerUrl,
        updateExplorerUrl,
        imageUri: uploadResult.imageUri,
        metadataUri: uploadResult.metadataUri,
        newMetadata: uploadResult.metadata,
        blockTime: paymentVerification.blockTime,
        feePaid: feeInfo.currentFee,
        nextFee: feeInfo.currentFee + 0.1,
        message: `Token metadata successfully updated! Fee was ${feeInfo.currentFee} SOL, next hijack will cost ${feeInfo.currentFee + 0.1} SOL`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in update-token-metadata function:', error)
    
    // Update hijack record with error if we have a record ID
    if (hijackRecordId) {
      await updateHijackRecordError(supabase, hijackRecordId, error.message)
    }

    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Failed to update token metadata on-chain', 
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    )
  }
})
