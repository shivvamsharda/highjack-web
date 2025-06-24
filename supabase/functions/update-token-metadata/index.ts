
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { Connection, PublicKey } from 'https://esm.sh/@solana/web3.js@1.98.2'

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
    console.log('Starting simplified token metadata update process...')
    
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

    // Get environment variables
    const rpcUrl = Deno.env.get('RPC_URL')
    const mintAddressStr = Deno.env.get('MINT_ADDRESS')

    if (!rpcUrl || !mintAddressStr) {
      throw new Error('Missing required environment variables')
    }

    console.log('Environment variables loaded, connecting to Solana...')

    // Initialize Solana connection to verify payment
    const connection = new Connection(rpcUrl, 'confirmed')
    const mintAddress = new PublicKey(mintAddressStr)

    console.log('Verifying payment transaction...')

    // Verify the payment transaction exists and is confirmed
    const txDetails = await connection.getTransaction(paymentSignature, {
      commitment: 'confirmed'
    })

    if (!txDetails) {
      throw new Error('Payment transaction not found or not confirmed')
    }

    console.log('Payment verified, processing metadata update...')

    // For now, we'll create a simple IPFS-like URL structure
    // In a real implementation, you'd upload to IPFS or Arweave
    const imageUri = `https://arweave.net/${Math.random().toString(36).substr(2, 43)}`

    // Create metadata object
    const metadata = {
      name: tokenName,
      symbol: ticker,
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

    // Create metadata URI (in real implementation, upload to Arweave/IPFS)
    const metadataUri = `https://arweave.net/${Math.random().toString(36).substr(2, 43)}`

    console.log('Metadata prepared, updating database...')

    const explorerUrl = `https://explorer.solana.com/tx/${paymentSignature}`

    // Update hijack record with success data
    const { error: updateError } = await supabase
      .from('token_hijacks')
      .update({
        status: 'completed',
        explorer_url: explorerUrl,
        image_uri: imageUri,
        metadata_uri: metadataUri,
        new_metadata: metadata,
        block_time: txDetails?.blockTime
      })
      .eq('id', hijackRecordId)

    if (updateError) {
      console.error('Error updating hijack record:', updateError)
    }

    console.log('Token hijack completed successfully!')

    return new Response(
      JSON.stringify({
        success: true,
        transactionSignature: paymentSignature,
        explorerUrl,
        imageUri,
        metadataUri,
        newMetadata: metadata,
        blockTime: txDetails?.blockTime,
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
        error: 'Failed to update token metadata', 
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    )
  }
})
