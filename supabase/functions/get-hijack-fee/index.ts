
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

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
    console.log('Getting current hijack fee...')
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get current pricing
    const { data: pricing, error } = await supabase
      .from('hijack_pricing')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      console.error('Error fetching hijack pricing:', error)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to fetch current fee',
          currentFee: 0.1 // fallback to base fee
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Calculate time since last hijack for fee decay info
    const now = new Date()
    const lastHijack = pricing.last_hijack_at ? new Date(pricing.last_hijack_at) : null
    const timeSinceLastHijack = lastHijack ? now.getTime() - lastHijack.getTime() : null
    const minutesSinceLastHijack = timeSinceLastHijack ? Math.floor(timeSinceLastHijack / (1000 * 60)) : null
    
    // Calculate when next fee decrease will happen (if no new hijacks)
    const nextDecreaseIn = lastHijack && minutesSinceLastHijack !== null 
      ? Math.max(0, 60 - minutesSinceLastHijack) 
      : null

    console.log(`Current fee: ${pricing.current_fee_sol} SOL`)
    
    return new Response(
      JSON.stringify({
        success: true,
        currentFee: pricing.current_fee_sol,
        lastHijackAt: pricing.last_hijack_at,
        nextFeeAfterHijack: Number(pricing.current_fee_sol) + 0.1,
        nextDecreaseIn: nextDecreaseIn,
        timeSinceLastHijack: minutesSinceLastHijack
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in get-hijack-fee function:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        currentFee: 0.1 // fallback to base fee
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    )
  }
})
