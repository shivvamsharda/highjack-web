
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const INTERNAL_API_KEY = Deno.env.get('INTERNAL_API_KEY') || 'fallback-internal-key'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-key',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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
    console.log('Internal get-treasury-wallet function called');

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
    console.error('Error in internal get-treasury-wallet:', error);

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
