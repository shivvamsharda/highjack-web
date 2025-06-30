
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
    console.log('EMERGENCY FEE FIX - Starting immediate fee correction')
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Step 1: Check current cron job status
    console.log('Step 1: Checking cron job status...')
    const { data: cronStatus, error: cronError } = await supabase.rpc('check_fee_decay_cron_status')
    
    if (cronError) {
      console.error('Error checking cron status:', cronError)
    } else {
      console.log('Current cron jobs:', cronStatus)
    }

    // Step 2: Manually trigger decay function with emergency flag
    console.log('Step 2: Triggering emergency decay...')
    const { data: decayResult, error: decayError } = await supabase.functions.invoke('decay-hijack-fees', {
      body: { 
        manual_trigger: true, 
        debug: true, 
        emergency_fix: true 
      }
    })

    if (decayError) {
      console.error('Error calling decay function:', decayError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to trigger decay function',
          details: decayError.message 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    console.log('Emergency decay result:', decayResult)

    // Step 3: Verify the fee was updated
    console.log('Step 3: Verifying fee update...')
    const { data: updatedPricing, error: fetchError } = await supabase
      .from('hijack_pricing')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (fetchError) {
      console.error('Error fetching updated pricing:', fetchError)
    } else {
      console.log(`Verified fee is now: ${updatedPricing.current_fee_sol} SOL`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Emergency fee fix completed',
        cronJobStatus: cronStatus,
        decayResult: decayResult,
        updatedFee: updatedPricing?.current_fee_sol,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in emergency-fee-fix function:', error)
    
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
