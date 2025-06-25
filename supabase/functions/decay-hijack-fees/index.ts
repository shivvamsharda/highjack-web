
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
    console.log('Checking for fee decay...')
    
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
    
    // Check if we should decay the fee
    let shouldDecay = false
    
    if (lastHijack) {
      const hoursSinceLastHijack = (now.getTime() - lastHijack.getTime()) / (1000 * 60 * 60)
      // Decay if it's been more than 1 hour since last hijack and fee is above minimum
      shouldDecay = hoursSinceLastHijack >= 1 && currentFee > 0.1
    } else {
      // If no hijacks ever, and fee is above minimum, decay it
      shouldDecay = currentFee > 0.1
    }

    if (shouldDecay) {
      const newFee = Math.max(0.1, currentFee - 0.1) // Never go below 0.1 SOL
      
      console.log(`Decaying fee from ${currentFee} to ${newFee} SOL`)
      
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

      return new Response(
        JSON.stringify({
          success: true,
          message: `Fee decayed from ${currentFee} to ${newFee} SOL`,
          oldFee: currentFee,
          newFee: newFee,
          decayed: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      console.log(`No decay needed. Current fee: ${currentFee} SOL`)
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No fee decay needed',
          currentFee: currentFee,
          decayed: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Error in decay-hijack-fees function:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    )
  }
})
