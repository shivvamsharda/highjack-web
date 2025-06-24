
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('get-treasury-wallet function called');

    // Get the WALLET_ADDRESS from environment variables (Supabase secrets)
    const walletAddress = Deno.env.get('WALLET_ADDRESS');
    
    if (!walletAddress) {
      console.error('WALLET_ADDRESS not found in environment variables');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'WALLET_ADDRESS not configured in Supabase secrets'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Basic validation - check if it looks like a Solana address (44 characters, base58)
    if (walletAddress.length !== 44) {
      console.error('WALLET_ADDRESS appears to be invalid length:', walletAddress.length);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'WALLET_ADDRESS appears to be invalid - incorrect length'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    console.log('WALLET_ADDRESS found and returned:', walletAddress);

    return new Response(
      JSON.stringify({ 
        success: true, 
        walletAddress: walletAddress 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )

  } catch (error) {
    console.error('Error in get-treasury-wallet:', error);

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Failed to get treasury wallet: ${error.message}`
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
