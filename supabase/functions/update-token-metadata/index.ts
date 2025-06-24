import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { Connection, Keypair, PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction, LAMPORTS_PER_SOL } from 'https://esm.sh/@solana/web3.js@1.98.2'
import { Metaplex, keypairIdentity, bundlrStorage } from 'https://esm.sh/@metaplex-foundation/js@0.20.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Starting token metadata update process...')
    
    const formData = await req.formData()
    const tokenName = formData.get('tokenName') as string
    const ticker = formData.get('ticker') as string
    const imageFile = formData.get('imageFile') as File
    const userWalletAddress = formData.get('userWalletAddress') as string

    if (!tokenName || !ticker || !imageFile || !userWalletAddress) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Get environment variables
    const rpcUrl = Deno.env.get('RPC_URL')
    const mintAddressStr = Deno.env.get('MINT_ADDRESS')
    const walletKeyStr = Deno.env.get('WALLET_KEY')

    if (!rpcUrl || !mintAddressStr || !walletKeyStr) {
      throw new Error('Missing required environment variables')
    }

    console.log('Environment variables loaded, connecting to Solana...')

    // Initialize Solana connection
    const connection = new Connection(rpcUrl, 'confirmed')
    
    // Parse the private key and create keypair
    const walletKeyArray = JSON.parse(walletKeyStr)
    const walletKeypair = Keypair.fromSecretKey(new Uint8Array(walletKeyArray))
    
    const mintAddress = new PublicKey(mintAddressStr)
    const userWallet = new PublicKey(userWalletAddress)

    console.log('Wallet and mint address initialized')

    // Initialize Metaplex
    const metaplex = Metaplex.make(connection)
      .use(keypairIdentity(walletKeypair))
      .use(bundlrStorage())

    console.log('Metaplex initialized, processing image upload...')

    // Convert File to Buffer for upload
    const imageBuffer = await imageFile.arrayBuffer()
    const imageUint8Array = new Uint8Array(imageBuffer)

    // Upload image to storage (using Metaplex/Bundlr)
    const imageUri = await metaplex.storage().upload({
      buffer: imageUint8Array,
      fileName: `${ticker.toLowerCase()}_image.${imageFile.name.split('.').pop()}`,
      contentType: imageFile.type,
    })

    console.log('Image uploaded to:', imageUri)

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

    // Upload metadata JSON
    const metadataUri = await metaplex.storage().uploadJson(metadata)
    console.log('Metadata uploaded to:', metadataUri)

    // Find the token metadata account
    const nft = await metaplex.nfts().findByMint({ mintAddress })
    
    console.log('Found existing token metadata, updating...')

    // Update the token metadata
    const { response } = await metaplex.nfts().update({
      nftOrSft: nft,
      name: tokenName,
      symbol: ticker,
      uri: metadataUri,
    })

    console.log('Token metadata updated successfully!')
    console.log('Transaction signature:', response.signature)

    // Get transaction details for verification
    const txDetails = await connection.getTransaction(response.signature, {
      commitment: 'confirmed'
    })

    return new Response(
      JSON.stringify({
        success: true,
        transactionSignature: response.signature,
        explorerUrl: `https://explorer.solana.com/tx/${response.signature}`,
        imageUri,
        metadataUri,
        newMetadata: metadata,
        blockTime: txDetails?.blockTime,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in update-token-metadata function:', error)
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
