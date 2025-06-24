
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
    console.log('get-rpc-endpoint function called');

    // Get the RPC_URL from environment variables (Supabase secrets)
    const rpcUrl = Deno.env.get('RPC_URL');
    
    if (!rpcUrl) {
      console.error('RPC_URL not found in environment variables');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'RPC_URL not configured',
          rpcUrl: 'https://api.mainnet-beta.solana.com' // fallback
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    console.log('RPC_URL found and returned');

    return new Response(
      JSON.stringify({ 
        success: true, 
        rpcUrl: rpcUrl 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )

  } catch (error) {
    console.error('Error in get-rpc-endpoint:', error);

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        rpcUrl: 'https://api.mainnet-beta.solana.com' // fallback
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
