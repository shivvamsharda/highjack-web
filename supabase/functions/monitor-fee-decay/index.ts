
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
    console.log('Monitoring fee decay system...')
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get current fee status
    const { data: pricing, error: pricingError } = await supabase
      .from('hijack_pricing')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (pricingError) {
      console.error('Error fetching pricing:', pricingError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to fetch pricing data',
          details: pricingError.message 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Get cron job status
    const { data: cronJobs, error: cronError } = await supabase.rpc('get_cron_job_status')
    
    if (cronError) {
      console.error('Error fetching cron status:', cronError)
    }

    // Calculate time metrics
    const now = new Date()
    const lastHijack = pricing.last_hijack_at ? new Date(pricing.last_hijack_at) : null
    const lastUpdate = pricing.last_fee_update_at ? new Date(pricing.last_fee_update_at) : null
    const minutesSinceLastHijack = lastHijack ? Math.floor((now.getTime() - lastHijack.getTime()) / (1000 * 60)) : null
    const minutesSinceLastUpdate = lastUpdate ? Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60)) : null

    // Test database decay function
    const { data: decayTest, error: decayError } = await supabase.rpc('decay_fee_direct')
    
    console.log('Fee decay system status:', {
      currentFee: pricing.current_fee_sol,
      minutesSinceLastHijack,
      minutesSinceLastUpdate,
      cronJobs: cronJobs?.length || 0,
      decayTestResult: decayTest
    })

    return new Response(
      JSON.stringify({
        success: true,
        status: {
          currentFee: pricing.current_fee_sol,
          lastHijackAt: pricing.last_hijack_at,
          lastUpdateAt: pricing.last_fee_update_at,
          minutesSinceLastHijack,
          minutesSinceLastUpdate,
          isAtMinimum: pricing.current_fee_sol <= 0.1,
          shouldDecay: minutesSinceLastHijack !== null && minutesSinceLastHijack >= 20 && pricing.current_fee_sol > 0.1
        },
        cronJobs: cronJobs || [],
        decayTest: decayTest,
        timestamp: now.toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in monitor-fee-decay function:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    )
  }
})
