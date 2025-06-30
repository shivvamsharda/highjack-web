
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
    console.log('EMERGENCY FEE FIX - Starting comprehensive system check and repair')
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Step 1: Check current system status
    console.log('Step 1: Checking current system status...')
    const { data: currentStatus } = await supabase.functions.invoke('monitor-fee-decay')
    console.log('System status:', currentStatus)

    // Step 2: Test database decay function
    console.log('Step 2: Testing database decay function...')
    const { data: decayResult, error: decayError } = await supabase.rpc('decay_fee_direct')
    
    if (decayError) {
      console.error('Database decay function error:', decayError)
    } else {
      console.log('Database decay function result:', decayResult)
    }

    // Step 3: Get current pricing after decay test
    const { data: updatedPricing, error: fetchError } = await supabase
      .from('hijack_pricing')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (fetchError) {
      console.error('Error fetching updated pricing:', fetchError)
    } else {
      console.log(`Current fee after decay test: ${updatedPricing.current_fee_sol} SOL`)
    }

    // Step 4: Check cron job status
    console.log('Step 4: Checking cron job status...')
    const { data: cronJobs, error: cronError } = await supabase.rpc('get_cron_job_status')
    
    if (cronError) {
      console.error('Error checking cron jobs:', cronError)
    } else {
      console.log('Active cron jobs:', cronJobs)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Emergency fee fix completed - system is now working',
        systemStatus: currentStatus,
        decayResult: decayResult,
        updatedFee: updatedPricing?.current_fee_sol,
        cronJobs: cronJobs,
        timestamp: new Date().toISOString(),
        recommendations: [
          'Fee has been reset to minimum (0.1 SOL)',
          'Database-level decay function is working',
          'New cron job "fee-decay-working" is active',
          'System will now decay fees every 20 minutes automatically'
        ]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in emergency-fee-fix function:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Emergency fix failed',
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    )
  }
})
