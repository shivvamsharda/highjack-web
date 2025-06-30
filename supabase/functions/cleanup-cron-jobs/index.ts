
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
    console.log('FINAL CRON CLEANUP - Starting final cleanup verification')
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Step 1: Run the cleanup function we created
    console.log('Step 1: Executing cleanup function...')
    const { data: cleanupResult, error: cleanupError } = await supabase.rpc('cleanup_hourly_cron_job')
    
    if (cleanupError) {
      console.error('Error running cleanup function:', cleanupError)
    } else {
      console.log('Cleanup function result:', cleanupResult)
    }

    // Step 2: Verify current cron jobs status
    console.log('Step 2: Verifying final cron job state...')
    const { data: finalJobs, error: finalError } = await supabase.rpc('get_cron_job_status')
    
    if (finalError) {
      console.error('Error checking final cron jobs:', finalError)
    } else {
      console.log('Final cron jobs:', finalJobs)
    }

    // Step 3: Check fee status
    console.log('Step 3: Checking current fee status...')
    const { data: pricing, error: pricingError } = await supabase
      .from('hijack_pricing')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Step 4: Analyze results
    const activeCronJobs = finalJobs?.filter(job => job.active) || []
    const hourlyJobExists = activeCronJobs.some(job => job.jobname === 'decay-hijack-fees-hourly')
    const workingJobExists = activeCronJobs.some(job => job.jobname === 'fee-decay-working')
    const cleanupSuccess = !hourlyJobExists && workingJobExists && activeCronJobs.length === 1

    console.log('FINAL CLEANUP ANALYSIS:', {
      totalActiveCronJobs: activeCronJobs.length,
      hourlyJobRemoved: !hourlyJobExists,
      workingJobActive: workingJobExists,
      cleanupSuccess,
      currentFee: pricing?.current_fee_sol
    })

    return new Response(
      JSON.stringify({
        success: true,
        cleanupSuccess,
        message: cleanupSuccess ? 
          '✅ SUCCESS: Cleanup completed! Only the 20-minute fee decay job is now active.' :
          '⚠️ ATTENTION: Cleanup may need manual intervention.',
        details: {
          cleanupFunction: cleanupResult,
          finalCronJobs: activeCronJobs,
          analysis: {
            totalActiveCronJobs: activeCronJobs.length,
            hourlyJobRemoved: !hourlyJobExists,
            workingJobActive: workingJobExists,
            expectedState: cleanupSuccess
          },
          feeStatus: pricing ? {
            currentFee: pricing.current_fee_sol,
            lastHijackAt: pricing.last_hijack_at,
            lastUpdateAt: pricing.last_fee_update_at
          } : null
        },
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in final cleanup function:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Final cleanup failed',
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    )
  }
})
