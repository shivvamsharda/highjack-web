import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { Connection, PublicKey, Keypair } from 'https://esm.sh/@solana/web3.js@1.98.2'
import { createUmi } from 'https://esm.sh/@metaplex-foundation/umi-bundle-defaults@0.9.2'
import { createSignerFromKeypair, signerIdentity } from 'https://esm.sh/@metaplex-foundation/umi@0.9.2'
import { updateV1, fetchMetadataFromSeeds } from 'https://esm.sh/@metaplex-foundation/mpl-token-metadata@3.2.1'
import { publicKey } from 'https://esm.sh/@metaplex-foundation/umi@0.9.2'
import bs58 from 'https://esm.sh/bs58@5.0.0'

const INTERNAL_API_KEY = Deno.env.get('INTERNAL_API_KEY') || 'fallback-internal-key'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-key',
}

// Validation functions
interface HijackFormData {
  tokenName: string;
  ticker: string;
  imageFile: File;
  userWalletAddress: string;
  paymentSignature: string;
}

function validateFormData(formData: FormData): HijackFormData | null {
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

function validateWalletAddress(address: string): boolean {
  try {
    new PublicKey(address)
    return true
  } catch {
    return false
  }
}

// Database functions
interface HijackRecord {
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

async function checkDuplicateSignature(
  supabase: ReturnType<typeof createClient>,
  signature: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('hijack_attempts')
    .select('id')
    .eq('transaction_signature', signature)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking duplicate signature:', error)
    throw new Error('Failed to check transaction signature')
  }

  return !!data
}

async function createHijackRecord(
  supabase: ReturnType<typeof createClient>,
  data: HijackFormData & { feePaidSol: number }
): Promise<HijackRecord> {
  const hijackRecord = {
    wallet_address: data.userWalletAddress,
    token_name: data.tokenName,
    ticker_symbol: data.ticker,
    image_file_name: data.imageFile.name,
    image_file_size: data.imageFile.size,
    image_file_type: data.imageFile.type,
    status: 'processing',
    transaction_signature: data.paymentSignature,
    fee_paid_sol: data.feePaidSol
  }

  const { data: record, error } = await supabase
    .from('hijack_attempts')
    .insert(hijackRecord)
    .select()
    .single()

  if (error) {
    console.error('Error creating hijack record:', error)
    throw new Error('Failed to create hijack record')
  }

  return record
}

async function updateHijackRecordSuccess(
  supabase: ReturnType<typeof createClient>,
  recordId: string,
  explorerUrl: string,
  imageUri: string,
  metadataUri: string,
  metadata: any,
  blockTime?: number
): Promise<void> {
  const { error } = await supabase
    .from('hijack_attempts')
    .update({
      status: 'completed',
      explorer_url: explorerUrl,
      image_uri: imageUri,
      metadata_uri: metadataUri,
      metadata_json: metadata,
      completed_at: new Date().toISOString(),
      block_time: blockTime
    })
    .eq('id', recordId)

  if (error) {
    console.error('Error updating hijack record with success:', error)
    throw new Error('Failed to update hijack record')
  }
}

async function updateHijackRecordError(
  supabase: ReturnType<typeof createClient>,
  recordId: string,
  errorMessage: string
): Promise<void> {
  const { error } = await supabase
    .from('hijack_attempts')
    .update({
      status: 'failed',
      error_message: errorMessage
    })
    .eq('id', recordId)

  if (error) {
    console.error('Error updating hijack record with error:', error)
  }
}

// Payment verification
async function verifyPaymentTransaction(
  connection: Connection,
  signature: string,
  senderAddress: string,
  treasuryWallet: PublicKey
): Promise<{ isValid: boolean; error?: string; blockTime?: number }> {
  try {
    const txDetails = await connection.getTransaction(signature, {
      commitment: 'finalized'
    })

    if (!txDetails) {
      return { isValid: false, error: 'Transaction not found or not finalized' }
    }

    if (!txDetails.meta || txDetails.meta.err) {
      return { isValid: false, error: 'Transaction failed or has no metadata' }
    }

    const senderPubkey = new PublicKey(senderAddress)
    const accountKeys = txDetails.transaction.message.accountKeys

    let senderIndex = -1
    let treasuryIndex = -1

    for (let i = 0; i < accountKeys.length; i++) {
      if (accountKeys[i].equals(senderPubkey)) {
        senderIndex = i
      }
      if (accountKeys[i].equals(treasuryWallet)) {
        treasuryIndex = i
      }
    }

    if (senderIndex === -1) {
      return { isValid: false, error: 'Sender wallet not found in transaction' }
    }

    if (treasuryIndex === -1) {
      return { isValid: false, error: 'Treasury wallet not found in transaction' }
    }

    const preBalances = txDetails.meta.preBalances
    const postBalances = txDetails.meta.postBalances

    const senderBalanceChange = preBalances[senderIndex] - postBalances[senderIndex]
    const treasuryBalanceChange = postBalances[treasuryIndex] - preBalances[treasuryIndex]

    if (senderBalanceChange <= 0 || treasuryBalanceChange <= 0) {
      return { isValid: false, error: 'No valid payment transfer detected' }
    }

    return { 
      isValid: true, 
      blockTime: txDetails.blockTime || undefined
    }
  } catch (error) {
    console.error('Error verifying payment transaction:', error)
    return { isValid: false, error: 'Failed to verify transaction' }
  }
}

// Fee management
interface FeeInfo {
  currentFee: number;
  id: string;
}

async function getCurrentFee(
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
    return { currentFee: 0.1, id: '' }
  }

  return {
    currentFee: Number(pricing.current_fee_sol),
    id: pricing.id
  }
}

async function updateFeeAfterHijack(
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

function verifyPaymentAmount(
  paymentAmount: number,
  expectedFee: number,
  tolerance: number = 0.001
): boolean {
  const difference = Math.abs(paymentAmount - expectedFee)
  const isValid = difference <= tolerance
  
  console.log(`Payment verification: expected ${expectedFee} SOL, received ${paymentAmount} SOL, difference: ${difference}, valid: ${isValid}`)
  
  return isValid
}

// Storage functions
async function uploadImageAndMetadata(
  supabase: ReturnType<typeof createClient>,
  imageFile: File,
  tokenName: string,
  ticker: string,
  userWalletAddress: string
): Promise<{ imageUri: string; metadataUri: string; metadata: any }> {
  console.log('Uploading image to Supabase Storage...')

  const timestamp = Date.now()
  const imageExtension = imageFile.name.split('.').pop() || 'jpg'
  const imageFileName = `images/${timestamp}-${userWalletAddress.slice(0, 8)}-${tokenName.replace(/\s+/g, '-').toLowerCase()}.${imageExtension}`

  const imageBytes = new Uint8Array(await imageFile.arrayBuffer())
  const { data: imageUploadData, error: imageUploadError } = await supabase.storage
    .from('token-assets')
    .upload(imageFileName, imageBytes, {
      contentType: imageFile.type,
      upsert: false
    })

  if (imageUploadError) {
    console.error('Error uploading image:', imageUploadError)
    throw new Error(`Failed to upload image: ${imageUploadError.message}`)
  }

  const { data: imageUrlData } = supabase.storage
    .from('token-assets')
    .getPublicUrl(imageFileName)

  const imageUri = imageUrlData.publicUrl
  console.log('Image uploaded to Supabase Storage:', imageUri)

  // Use new description template
  const tokenDescription = "Steal the billboard. Make it yours. Leave your mark on-chain. Message from the hijacker:"

  const metadata = {
    name: tokenName,
    symbol: ticker.toUpperCase(),
    description: tokenDescription,
    image: imageUri,
    // Social links at top level (not nested in properties)
    twitter: "https://x.com/highjack_me",
    telegram: "https://t.me/highjackme",
    website: "https://highjack.me/",
    attributes: [
      {
        trait_type: "Hijacked",
        value: "Yes"
      },
      {
        trait_type: "Original Hijacker", 
        value: userWalletAddress
      },
      {
        trait_type: "Hijack Date",
        value: new Date().toISOString()
      }
    ],
    properties: {
      files: [
        {
          uri: imageUri,
          type: imageFile.type,
        }
      ],
      category: "image"
    }
  }

  console.log('Uploading metadata to Supabase Storage...')

  const metadataFileName = `metadata/${timestamp}-${userWalletAddress.slice(0, 8)}-${tokenName.replace(/\s+/g, '-').toLowerCase()}.json`

  const metadataBytes = new TextEncoder().encode(JSON.stringify(metadata, null, 2))
  const { data: metadataUploadData, error: metadataUploadError } = await supabase.storage
    .from('token-assets')
    .upload(metadataFileName, metadataBytes, {
      contentType: 'application/json',
      upsert: false
    })

  if (metadataUploadError) {
    console.error('Error uploading metadata:', metadataUploadError)
    throw new Error(`Failed to upload metadata: ${metadataUploadError.message}`)
  }

  const { data: metadataUrlData } = supabase.storage
    .from('token-assets')
    .getPublicUrl(metadataFileName)

  const metadataUri = metadataUrlData.publicUrl
  console.log('Metadata uploaded to Supabase Storage:', metadataUri)

  return { imageUri, metadataUri, metadata }
}

// Blockchain functions
function createKeypairFromPrivateKey(walletKeyStr: string): Keypair {
  let privateKeyBytes: Uint8Array
  if (walletKeyStr.startsWith('[') && walletKeyStr.endsWith(']')) {
    const keyArray = JSON.parse(walletKeyStr)
    privateKeyBytes = new Uint8Array(keyArray)
  } else {
    privateKeyBytes = bs58.decode(walletKeyStr)
  }
  return Keypair.fromSecretKey(privateKeyBytes)
}

async function updateTokenMetadata(
  rpcUrl: string,
  mintAddress: PublicKey,
  updateAuthorityKeypair: Keypair,
  tokenName: string,
  ticker: string,
  metadataUri: string
): Promise<string> {
  console.log('Initializing Metaplex Umi...')
  const umi = createUmi(rpcUrl)
  
  console.log('Update authority address:', updateAuthorityKeypair.publicKey.toBase58())

  const updateAuthoritySigner = createSignerFromKeypair(umi, {
    publicKey: publicKey(updateAuthorityKeypair.publicKey.toBase58()),
    secretKey: updateAuthorityKeypair.secretKey
  })

  umi.use(signerIdentity(updateAuthoritySigner))

  console.log('Fetching current token metadata...')
  const mintPublicKey = publicKey(mintAddress.toBase58())
  const currentMetadata = await fetchMetadataFromSeeds(umi, { mint: mintPublicKey })

  if (!currentMetadata) {
    throw new Error('Token metadata not found on-chain')
  }

  console.log('Current update authority:', currentMetadata.updateAuthority)
  console.log('Our update authority:', updateAuthoritySigner.publicKey)

  if (currentMetadata.updateAuthority !== updateAuthoritySigner.publicKey) {
    throw new Error(`Update authority mismatch. Expected: ${updateAuthoritySigner.publicKey}, Got: ${currentMetadata.updateAuthority}`)
  }

  console.log('Updating token metadata on-chain...')

  const updateResult = await updateV1(umi, {
    mint: mintPublicKey,
    authority: updateAuthoritySigner,
    data: {
      name: tokenName,
      symbol: ticker.toUpperCase(),
      uri: metadataUri,
      sellerFeeBasisPoints: currentMetadata.sellerFeeBasisPoints,
      creators: currentMetadata.creators,
      collection: currentMetadata.collection,
      uses: currentMetadata.uses,
    },
  }).sendAndConfirm(umi)

  const updateTransactionSignatureString = bs58.encode(updateResult.signature)
  
  console.log('Metadata update transaction signature:', updateTransactionSignatureString)

  return updateTransactionSignatureString
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Verify internal authentication
  const internalKey = req.headers.get('x-internal-key')
  if (internalKey !== INTERNAL_API_KEY) {
    console.log('Unauthorized internal access attempt')
    return new Response(
      JSON.stringify({ error: 'Unauthorized internal access' }),
      { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  let hijackRecordId: string | null = null

  try {
    console.log('Starting internal dynamic pricing token metadata update process...')
    
    const formData = await req.formData()
    const validatedData = validateFormData(formData)

    if (!validatedData) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields including payment signature' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (!validateWalletAddress(validatedData.userWalletAddress)) {
      return new Response(
        JSON.stringify({ error: 'Invalid wallet address' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('Getting current hijack fee...')
    
    const feeInfo = await getCurrentFee(supabase)
    console.log(`Current hijack fee: ${feeInfo.currentFee} SOL`)

    console.log('Checking for duplicate transaction signature...')

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

    const rpcUrl = Deno.env.get('RPC_URL')
    const mintAddressStr = Deno.env.get('MINT_ADDRESS')
    const treasuryWalletStr = Deno.env.get('WALLET_ADDRESS')
    const walletKeyStr = Deno.env.get('WALLET_KEY')

    if (!rpcUrl || !mintAddressStr || !treasuryWalletStr || !walletKeyStr) {
      throw new Error('Missing required environment variables (RPC_URL, MINT_ADDRESS, WALLET_ADDRESS, WALLET_KEY)')
    }

    console.log('Environment variables loaded, connecting to Solana...')

    const connection = new Connection(rpcUrl, 'confirmed')
    const mintAddress = new PublicKey(mintAddressStr)
    const treasuryWallet = new PublicKey(treasuryWalletStr)

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

    const senderBalanceChange = (preBalances[0] - postBalances[0]) / 1_000_000_000
    const actualPaymentAmount = senderBalanceChange - (txDetails.meta?.fee || 0) / 1_000_000_000
    
    console.log(`Payment amount verification: expected ${feeInfo.currentFee} SOL, actual ${actualPaymentAmount} SOL`)

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

    const hijackRecord = await createHijackRecord(supabase, {
      ...validatedData,
      feePaidSol: feeInfo.currentFee
    })
    hijackRecordId = hijackRecord.id
    console.log('Created hijack record:', hijackRecordId)

    let updateAuthorityKeypair
    try {
      updateAuthorityKeypair = createKeypairFromPrivateKey(walletKeyStr)
    } catch (error) {
      console.error('Error parsing WALLET_KEY:', error)
      throw new Error('Invalid WALLET_KEY format. Must be base58 string or JSON array.')
    }

    const uploadResult = await uploadImageAndMetadata(
      supabase,
      validatedData.imageFile,
      validatedData.tokenName,
      validatedData.ticker,
      validatedData.userWalletAddress
    )

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

    await updateHijackRecordSuccess(
      supabase,
      hijackRecordId,
      explorerUrl,
      uploadResult.imageUri,
      uploadResult.metadataUri,
      uploadResult.metadata,
      paymentVerification.blockTime
    )

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
    console.error('Error in internal update-token-metadata function:', error)
    
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
