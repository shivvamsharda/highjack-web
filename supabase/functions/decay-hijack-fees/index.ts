
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
    const body = await req.json().catch(() => ({}))
    const isDebug = body.debug || body.manual_trigger
    const isEmergencyFix = body.emergency_fix
    const triggerType = body.manual_trigger ? 'MANUAL' : body.scheduled ? 'SCHEDULED' : 'UNKNOWN'
    
    console.log(`[${triggerType}] Fee decay check initiated at ${new Date().toISOString()}`)
    if (isEmergencyFix) {
      console.log('[EMERGENCY_FIX] Running emergency decay fix mode')
    }
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get current pricing
    const { data: pricing, error: fetchError } = await supabase
      .from('hijack_pricing')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (fetchError) {
      console.error('Error fetching hijack pricing:', fetchError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch pricing' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const now = new Date()
    const lastHijack = pricing.last_hijack_at ? new Date(pricing.last_hijack_at) : null
    const currentFee = Number(pricing.current_fee_sol)
    const minimumFee = 0.1
    
    console.log(`Current state: fee=${currentFee} SOL, minimum=${minimumFee} SOL`)
    console.log(`Last hijack: ${lastHijack ? lastHijack.toISOString() : 'NEVER'}`)
    
    // Calculate time since last hijack with detailed logging
    let shouldDecay = false
    let minutesSinceLastHijack = 0
    const decayIntervalMinutes = 20 // Standardized to 20 minutes
    
    if (lastHijack) {
      const timeDiff = now.getTime() - lastHijack.getTime()
      minutesSinceLastHijack = Math.floor(timeDiff / (1000 * 60))
      
      console.log(`Time since last hijack: ${minutesSinceLastHijack} minutes`)
      console.log(`Decay threshold: ${decayIntervalMinutes} minutes`)
      console.log(`Fee above minimum: ${currentFee > minimumFee}`)
      
      // EMERGENCY FIX: If it's been more than 4 hours (240 minutes), force reset to minimum
      if (isEmergencyFix && minutesSinceLastHijack > 240) {
        console.log(`[EMERGENCY] ${minutesSinceLastHijack} minutes is way too long, forcing reset to minimum`)
        shouldDecay = true
        // Force to minimum in emergency mode
      } else {
        // Normal decay logic: decay if it's been more than 20 minutes since last hijack and fee is above minimum
        shouldDecay = minutesSinceLastHijack >= decayIntervalMinutes && currentFee > minimumFee
      }
    } else {
      console.log('No hijacks recorded - checking if fee needs reset to minimum')
      // If no hijacks ever, and fee is above minimum, decay it to minimum
      shouldDecay = currentFee > minimumFee
      minutesSinceLastHijack = 9999 // Indicate no hijack ever
    }

    console.log(`Decay decision: ${shouldDecay ? 'YES' : 'NO'}`)

    if (shouldDecay) {
      let newFee: number
      
      if (isEmergencyFix && minutesSinceLastHijack > 240) {
        // Emergency: Force to minimum
        newFee = minimumFee
        console.log(`[EMERGENCY DECAY] Forcing fee from ${currentFee} to ${newFee} SOL due to ${minutesSinceLastHijack} minutes delay`)
      } else {
        // Normal decay: subtract 0.1
        newFee = Math.max(minimumFee, currentFee - 0.1)
        console.log(`[NORMAL DECAY] Reducing fee from ${currentFee} to ${newFee} SOL`)
      }
      
      const { error: updateError } = await supabase
        .from('hijack_pricing')
        .update({
          current_fee_sol: newFee,
          last_fee_update_at: now.toISOString()
        })
        .eq('id', pricing.id)

      if (updateError) {
        console.error('Error updating fee:', updateError)
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to update fee' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }

      console.log(`[SUCCESS] Fee successfully updated to ${newFee} SOL`)
      
      return new Response(
        JSON.stringify({
          success: true,
          message: `Fee ${isEmergencyFix && minutesSinceLastHijack > 240 ? 'emergency reset' : 'decayed'} from ${currentFee} to ${newFee} SOL`,
          oldFee: currentFee,
          newFee: newFee,
          decayed: true,
          triggerType: triggerType,
          emergencyFix: isEmergencyFix,
          minutesSinceLastHijack: minutesSinceLastHijack,
          decayThreshold: decayIntervalMinutes
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      const reasonsNoDecay = []
      if (currentFee <= minimumFee) reasonsNoDecay.push(`fee at minimum (${minimumFee} SOL)`)
      if (lastHijack && minutesSinceLastHijack < decayIntervalMinutes) {
        reasonsNoDecay.push(`only ${minutesSinceLastHijack} minutes since last hijack (need ${decayIntervalMinutes})`)
      }
      
      const reason = reasonsNoDecay.length > 0 ? reasonsNoDecay.join(', ') : 'unknown'
      console.log(`[NO DECAY] Reason: ${reason}`)
      
      return new Response(
        JSON.stringify({
          success: true,
          message: `No fee decay needed - ${reason}`,
          currentFee: currentFee,
          decayed: false,
          triggerType: triggerType,
          emergencyFix: isEmergencyFix,
          minutesSinceLastHijack: minutesSinceLastHijack,
          decayThreshold: decayIntervalMinutes,
          nextDecayIn: lastHijack ? Math.max(0, decayIntervalMinutes - minutesSinceLastHijack) : 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Error in decay-hijack-fees function:', error)
    
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
