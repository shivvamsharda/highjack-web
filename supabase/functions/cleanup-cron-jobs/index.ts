
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

    // Step 2: Try to disable the hourly job using SQL execution function
    console.log('Step 2: Attempting to disable the hourly cron job...')
    
    const disableQueries = [
      "SELECT cron.alter_job(1, active => false)", // Disable job ID 1 (hourly job)
      "SELECT cron.alter_job(2, active => false)", // Try job ID 2 as backup
      "UPDATE cron.job SET active = false WHERE jobname = 'decay-hijack-fees-hourly'" // Direct SQL approach
    ]

    const disableResults = []
    
    for (const query of disableQueries) {
      try {
        console.log(`Attempting query: ${query}`)
        const { data, error } = await supabase.rpc('sql', { query })
        if (error) {
          console.log(`Disable attempt failed: ${query} - Error: ${error.message}`)
          disableResults.push({ query, success: false, error: error.message })
        } else {
          console.log(`Disable attempt succeeded: ${query}`)
          disableResults.push({ query, success: true, result: data })
          break // Stop on first success
        }
      } catch (err) {
        console.log(`Disable attempt exception: ${query} - Exception: ${err.message}`)
        disableResults.push({ query, success: false, error: err.message })
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

    // Step 4: Analyze results
    const workingJobExists = finalJobs?.some(job => job.jobname === 'fee-decay-working' && job.active)
    const hourlyJobDisabled = finalJobs?.some(job => job.jobname === 'decay-hijack-fees-hourly' && !job.active)
    const totalActiveJobs = finalJobs?.filter(job => job.active).length || 0
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Cron job cleanup completed',
        initialJobs: currentJobs,
        disableAttempts: disableResults,
        finalJobs: finalJobs,
        analysis: {
          workingJobActive: workingJobExists,
          hourlyJobDisabled: hourlyJobDisabled,
          totalActiveJobs: totalActiveJobs,
          isClean: totalActiveJobs === 1 && workingJobExists,
          status: hourlyJobDisabled && workingJobExists ? 
            'SUCCESS: Hourly job disabled, 20-minute job still active' :
            'PARTIAL: May need additional manual intervention'
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
