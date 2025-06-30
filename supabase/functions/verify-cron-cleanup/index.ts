
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
    console.log('CRON CLEANUP VERIFICATION - Starting verification process')
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Step 1: Check current cron jobs status
    console.log('Step 1: Checking current cron jobs...')
    const { data: cronJobs, error: cronError } = await supabase.rpc('get_cron_job_status')
    
    if (cronError) {
      console.error('Error checking cron jobs:', cronError)
    } else {
      console.log('Current cron jobs:', cronJobs)
    }

    // Step 2: Get current fee status
    console.log('Step 2: Checking current fee status...')
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
          error: 'Failed to fetch pricing data' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Step 3: Analyze the cleanup results
    const activeCronJobs = cronJobs?.filter(job => job.active) || []
    const hourlyJobExists = activeCronJobs.some(job => job.jobname === 'decay-hijack-fees-hourly')
    const workingJobExists = activeCronJobs.some(job => job.jobname === 'fee-decay-working')
    
    // Calculate time metrics
    const now = new Date()
    const lastHijack = pricing.last_hijack_at ? new Date(pricing.last_hijack_at) : null
    const lastUpdate = pricing.last_fee_update_at ? new Date(pricing.last_fee_update_at) : null
    const minutesSinceLastHijack = lastHijack ? Math.floor((now.getTime() - lastHijack.getTime()) / (1000 * 60)) : null
    const minutesSinceLastUpdate = lastUpdate ? Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60)) : null

    // Determine cleanup success
    const cleanupSuccess = !hourlyJobExists && workingJobExists && activeCronJobs.length === 1

    console.log('Cleanup verification results:', {
      totalActiveCronJobs: activeCronJobs.length,
      hourlyJobExists,
      workingJobExists,
      cleanupSuccess,
      currentFee: pricing.current_fee_sol
    })

    return new Response(
      JSON.stringify({
        success: true,
        cleanupSuccess,
        message: cleanupSuccess ? 
          'Cleanup successful! Only one cron job is now active.' :
          'Cleanup may need attention - multiple jobs or wrong job active.',
        verification: {
          totalActiveCronJobs: activeCronJobs.length,
          hourlyJobRemoved: !hourlyJobExists,
          workingJobActive: workingJobExists,
          expectedState: activeCronJobs.length === 1 && workingJobExists
        },
        cronJobs: activeCronJobs,
        feeStatus: {
          currentFee: pricing.current_fee_sol,
          lastHijackAt: pricing.last_hijack_at,
          lastUpdateAt: pricing.last_fee_update_at,
          minutesSinceLastHijack,
          minutesSinceLastUpdate,
          nextDecayDue: minutesSinceLastHijack !== null ? Math.max(0, 20 - minutesSinceLastHijack) : null
        },
        timestamp: now.toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in verify-cron-cleanup function:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Verification failed',
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    )
  }
})
