
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
    console.log('CRON CLEANUP - Starting cron job cleanup process')
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Step 1: Get current cron jobs status
    console.log('Step 1: Checking current cron jobs...')
    const { data: currentJobs, error: cronError } = await supabase.rpc('get_cron_job_status')
    
    if (cronError) {
      console.error('Error checking cron jobs:', cronError)
    } else {
      console.log('Current cron jobs:', currentJobs)
    }

    // Step 2: Force cleanup using SQL commands
    console.log('Step 2: Attempting to cleanup problematic cron jobs...')
    
    // Try to unschedule the hourly job directly
    const cleanupQueries = [
      "SELECT cron.unschedule('decay-hijack-fees-hourly')",
      "SELECT cron.unschedule('decay-hijack-fees-20min')", 
      "SELECT cron.unschedule('decay-hijack-fees-emergency-fix')",
      "SELECT cron.unschedule('decay-hijack-fees-20min-fixed')"
    ]

    const cleanupResults = []
    
    for (const query of cleanupQueries) {
      try {
        const { data, error } = await supabase.rpc('sql', { query })
        if (error) {
          console.log(`Job removal attempt: ${query} - Error: ${error.message}`)
        } else {
          console.log(`Job removal attempt: ${query} - Success`)
        }
        cleanupResults.push({ query, success: !error, error: error?.message })
      } catch (err) {
        console.log(`Job removal attempt: ${query} - Exception: ${err.message}`)
        cleanupResults.push({ query, success: false, error: err.message })
      }
    }

    // Step 3: Verify final state
    console.log('Step 3: Verifying final cron job state...')
    const { data: finalJobs, error: finalError } = await supabase.rpc('get_cron_job_status')
    
    if (finalError) {
      console.error('Error checking final cron jobs:', finalError)
    } else {
      console.log('Final cron jobs:', finalJobs)
    }

    // Step 4: Check if we have the right job remaining
    const workingJobExists = finalJobs?.some(job => job.jobname === 'fee-decay-working')
    const totalJobs = finalJobs?.length || 0
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Cron job cleanup completed',
        initialJobs: currentJobs,
        cleanupResults: cleanupResults,
        finalJobs: finalJobs,
        analysis: {
          workingJobExists,
          totalFeeJobs: totalJobs,
          isClean: totalJobs === 1 && workingJobExists,
          recommendation: totalJobs > 1 ? 
            'Multiple fee-related jobs still exist - may need manual intervention' :
            workingJobExists ? 
              'System is clean - only fee-decay-working job remains' :
              'No fee decay jobs found - system may need reconfiguration'
        },
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in cleanup-cron-jobs function:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Cron cleanup failed',
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    )
  }
})
