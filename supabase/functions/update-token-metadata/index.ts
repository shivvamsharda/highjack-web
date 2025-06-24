
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { Connection, PublicKey, Keypair } from 'https://esm.sh/@solana/web3.js@1.98.2'
import { createUmi } from 'https://esm.sh/@metaplex-foundation/umi-bundle-defaults@0.9.2'
import { createSignerFromKeypair, signerIdentity } from 'https://esm.sh/@metaplex-foundation/umi@0.9.2'
import { updateV1, fetchMetadataFromSeeds } from 'https://esm.sh/@metaplex-foundation/mpl-token-metadata@3.2.1'
import { publicKey } from 'https://esm.sh/@metaplex-foundation/umi@0.9.2'

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
    console.log('Starting real token metadata update process...')
    
    const formData = await req.formData()
    const tokenName = formData.get('tokenName') as string
    const ticker = formData.get('ticker') as string
    const imageFile = formData.get('imageFile') as File
    const userWalletAddress = formData.get('userWalletAddress') as string
    const paymentSignature = formData.get('paymentSignature') as string

    if (!tokenName || !ticker || !imageFile || !userWalletAddress || !paymentSignature) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields including payment signature' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Verify the wallet address is valid
    try {
      new PublicKey(userWalletAddress)
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid wallet address' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
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

    console.log('Verifying payment transaction...')

    // Verify the payment transaction exists and is confirmed
    const txDetails = await connection.getTransaction(paymentSignature, {
      commitment: 'confirmed'
    })

    if (!txDetails) {
      throw new Error('Payment transaction not found or not confirmed')
    }

    // Verify the payment was sent to the correct treasury wallet
    const instructions = txDetails.transaction.message.instructions
    let paymentToTreasury = false

    for (const instruction of instructions) {
      // Check if this is a system transfer instruction
      if (instruction.programId.equals(new PublicKey('11111111111111111111111111111112'))) {
        const accounts = instruction.accounts
        if (accounts.length >= 2) {
          const recipientKey = txDetails.transaction.message.accountKeys[accounts[1]]
          if (recipientKey.equals(treasuryWallet)) {
            paymentToTreasury = true
            console.log('Payment verified: sent to treasury wallet')
            break
          }
        }
      }
    }

    if (!paymentToTreasury) {
      throw new Error('Payment was not sent to the correct treasury wallet')
    }

    // Create initial hijack record in database
    const { data: hijackRecord, error: insertError } = await supabase
      .from('token_hijacks')
      .insert({
        wallet_address: userWalletAddress,
        token_name: tokenName,
        ticker_symbol: ticker.toUpperCase(),
        image_file_name: imageFile.name,
        image_file_size: imageFile.size,
        image_file_type: imageFile.type,
        status: 'processing',
        transaction_signature: paymentSignature
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating hijack record:', insertError)
      throw new Error('Failed to create hijack record')
    }

    hijackRecordId = hijackRecord.id
    console.log('Created hijack record:', hijackRecordId)

    // Initialize Umi for Metaplex operations
    console.log('Initializing Metaplex Umi...')
    const umi = createUmi(rpcUrl)
    
    // Create keypair from private key
    let updateAuthorityKeypair: Keypair
    try {
      // Handle both base58 and array formats
      let privateKeyBytes: Uint8Array
      if (walletKeyStr.startsWith('[') && walletKeyStr.endsWith(']')) {
        // Array format: [1,2,3,...]
        const keyArray = JSON.parse(walletKeyStr)
        privateKeyBytes = new Uint8Array(keyArray)
      } else {
        // Assume base58 format
        const bs58 = await import('https://esm.sh/bs58@5.0.0')
        privateKeyBytes = bs58.decode(walletKeyStr)
      }
      updateAuthorityKeypair = Keypair.fromSecretKey(privateKeyBytes)
    } catch (error) {
      console.error('Error parsing WALLET_KEY:', error)
      throw new Error('Invalid WALLET_KEY format. Must be base58 string or JSON array.')
    }

    console.log('Update authority address:', updateAuthorityKeypair.publicKey.toBase58())

    // Create UMI signer from keypair
    const updateAuthoritySigner = createSignerFromKeypair(umi, {
      publicKey: publicKey(updateAuthorityKeypair.publicKey.toBase58()),
      secretKey: updateAuthorityKeypair.secretKey
    })

    // Use the update authority as the identity
    umi.use(signerIdentity(updateAuthoritySigner))

    console.log('Uploading image to Supabase Storage...')

    // Generate unique filename for image
    const timestamp = Date.now()
    const imageExtension = imageFile.name.split('.').pop() || 'jpg'
    const imageFileName = `images/${timestamp}-${userWalletAddress.slice(0, 8)}-${tokenName.replace(/\s+/g, '-').toLowerCase()}.${imageExtension}`

    // Upload image to Supabase Storage
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

    // Get public URL for the uploaded image
    const { data: imageUrlData } = supabase.storage
      .from('token-assets')
      .getPublicUrl(imageFileName)

    const imageUri = imageUrlData.publicUrl
    console.log('Image uploaded to Supabase Storage:', imageUri)

    // Create metadata object
    const metadata = {
      name: tokenName,
      symbol: ticker.toUpperCase(),
      description: `${tokenName} (${ticker}) - Token hijacked on Solana`,
      image: imageUri,
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
        category: "image",
      }
    }

    console.log('Uploading metadata to Supabase Storage...')

    // Generate unique filename for metadata
    const metadataFileName = `metadata/${timestamp}-${userWalletAddress.slice(0, 8)}-${tokenName.replace(/\s+/g, '-').toLowerCase()}.json`

    // Upload metadata JSON to Supabase Storage
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

    // Get public URL for the uploaded metadata
    const { data: metadataUrlData } = supabase.storage
      .from('token-assets')
      .getPublicUrl(metadataFileName)

    const metadataUri = metadataUrlData.publicUrl
    console.log('Metadata uploaded to Supabase Storage:', metadataUri)

    // Fetch current metadata to verify update authority
    console.log('Fetching current token metadata...')
    const mintPublicKey = publicKey(mintAddress.toBase58())
    const currentMetadata = await fetchMetadataFromSeeds(umi, { mint: mintPublicKey })

    if (!currentMetadata) {
      throw new Error('Token metadata not found on-chain')
    }

    console.log('Current update authority:', currentMetadata.updateAuthority)
    console.log('Our update authority:', updateAuthoritySigner.publicKey)

    // Verify we have update authority
    if (currentMetadata.updateAuthority !== updateAuthoritySigner.publicKey) {
      throw new Error(`Update authority mismatch. Expected: ${updateAuthoritySigner.publicKey}, Got: ${currentMetadata.updateAuthority}`)
    }

    console.log('Updating token metadata on-chain...')

    // Update the metadata on-chain
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

    console.log('Metadata update transaction signature:', updateResult.signature)

    const explorerUrl = `https://explorer.solana.com/tx/${paymentSignature}`
    const updateExplorerUrl = `https://explorer.solana.com/tx/${updateResult.signature}`

    // Update hijack record with success data
    const { error: updateError } = await supabase
      .from('token_hijacks')
      .update({
        status: 'completed',
        explorer_url: explorerUrl,
        image_uri: imageUri,
        metadata_uri: metadataUri,
        new_metadata: metadata,
        block_time: txDetails?.blockTime,
        update_transaction_signature: updateResult.signature
      })
      .eq('id', hijackRecordId)

    if (updateError) {
      console.error('Error updating hijack record:', updateError)
    }

    console.log('Token hijack completed successfully with real file storage!')

    return new Response(
      JSON.stringify({
        success: true,
        transactionSignature: paymentSignature,
        updateTransactionSignature: updateResult.signature,
        explorerUrl,
        updateExplorerUrl,
        imageUri,
        metadataUri,
        newMetadata: metadata,
        blockTime: txDetails?.blockTime,
        message: 'Token metadata successfully updated on-chain with real file storage!'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in update-token-metadata function:', error)
    
    // Update hijack record with error if we have a record ID
    if (hijackRecordId) {
      await supabase
        .from('token_hijacks')
        .update({
          status: 'failed',
          error_message: error.message
        })
        .eq('id', hijackRecordId)
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
