
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const INTERNAL_API_KEY = Deno.env.get('INTERNAL_API_KEY') || 'fallback-internal-key'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-key',
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

  try {
    console.log('Getting current hijack fee...')
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

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
          currentFee: 0.1
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const now = new Date()
    const lastHijack = pricing.last_hijack_at ? new Date(pricing.last_hijack_at) : null
    const timeSinceLastHijack = lastHijack ? now.getTime() - lastHijack.getTime() : null
    const minutesSinceLastHijack = timeSinceLastHijack ? Math.floor(timeSinceLastHijack / (1000 * 60)) : null
    
    // Use consistent 20-minute intervals for all calculations
    const decayIntervalMinutes = 20
    const nextDecreaseIn = lastHijack && minutesSinceLastHijack !== null 
      ? Math.max(0, decayIntervalMinutes - minutesSinceLastHijack) 
      : null

    console.log(`Current fee: ${pricing.current_fee_sol} SOL`)
    console.log(`Minutes since last hijack: ${minutesSinceLastHijack}`)
    console.log(`Next decrease in: ${nextDecreaseIn} minutes`)
    
    return new Response(
      JSON.stringify({
        success: true,
        currentFee: pricing.current_fee_sol,
        lastHijackAt: pricing.last_hijack_at,
        nextFeeAfterHijack: Number(pricing.current_fee_sol) + 0.1,
        nextDecreaseIn: nextDecreaseIn,
        timeSinceLastHijack: minutesSinceLastHijack,
        decayInterval: decayIntervalMinutes
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in internal get-hijack-fee function:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        currentFee: 0.1
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    )
  }
})
