
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Connection, PublicKey } from 'https://esm.sh/@solana/web3.js@1.95.0';
import { Metaplex } from 'https://esm.sh/@metaplex-foundation/js@0.20.1';

const INTERNAL_API_KEY = Deno.env.get('INTERNAL_API_KEY') || 'fallback-internal-key'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-key',
};

serve(async (req) => {
  console.log('Internal get-token-metadata function called');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

  try {
    const rpcUrl = Deno.env.get('RPC_URL');
    const mintAddress = Deno.env.get('MINT_ADDRESS');
    
    if (!rpcUrl || !mintAddress) {
      console.error('Missing required environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Connecting to Solana network...');
    
    const connection = new Connection(rpcUrl, 'confirmed');
    const metaplex = Metaplex.make(connection);
    const mintPublicKey = new PublicKey(mintAddress);
    
    console.log(`Fetching metadata for token: ${mintAddress}`);
    
    const nft = await metaplex.nfts().findByMint({ mintAddress: mintPublicKey });
    
    console.log('Successfully fetched token metadata');
    
    const currentMetadata = {
      name: nft.name,
      symbol: nft.symbol,
      image: nft.json?.image || null,
      description: nft.json?.description || null,
      metadataUri: nft.uri,
      updateAuthority: nft.updateAuthorityAddress?.toString(),
      mintAddress: mintAddress,
      creators: nft.creators,
      collection: nft.collection,
    };

    return new Response(
      JSON.stringify({
        success: true,
        metadata: currentMetadata
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error fetching token metadata:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to fetch token metadata',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
