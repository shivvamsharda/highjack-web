
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { hijack_id } = await req.json()

    if (!hijack_id) {
      throw new Error('hijack_id is required')
    }

    console.log('Processing tweet for hijack:', hijack_id)

    // Get hijack details from database
    const { data: hijack, error: hijackError } = await supabase
      .from('token_hijacks')
      .select('*')
      .eq('id', hijack_id)
      .single()

    if (hijackError || !hijack) {
      console.error('Error fetching hijack:', hijackError)
      throw new Error('Hijack not found')
    }

    // Base tweet content
    let tweetContent = `🏴‍☠️ Token Hijacked! 

${hijack.token_name} ($${hijack.ticker_symbol}) just got a new identity! 

🔥 Name: ${hijack.token_name}
💎 Symbol: $${hijack.ticker_symbol}
👑 Hijacker: ${hijack.wallet_address.slice(0, 6)}...${hijack.wallet_address.slice(-4)}

#TokenHijack #Solana #DeFi #HIGHJACK`

    // Add social links if they exist
    const socialLinks = []
    if (hijack.x_link) socialLinks.push(`🐦 X: ${hijack.x_link}`)
    if (hijack.telegram_link) socialLinks.push(`📱 TG: ${hijack.telegram_link}`)
    if (hijack.website_link) socialLinks.push(`🌐 Site: ${hijack.website_link}`)

    if (socialLinks.length > 0) {
      const linksText = `\n\n🔗 Links:\n${socialLinks.join('\n')}`
      
      // Check if adding links would exceed Twitter's character limit (280)
      if ((tweetContent + linksText).length <= 280) {
        tweetContent += linksText
      } else {
        // If too long, add a shorter version
        tweetContent += `\n\n🔗 Links: ${socialLinks.join(' | ')}`
        
        // If still too long, truncate
        if (tweetContent.length > 280) {
          tweetContent = tweetContent.substring(0, 277) + '...'
        }
      }
    }

    console.log('Tweet content prepared:', tweetContent)
    console.log('Tweet length:', tweetContent.length)

    // Store tweet in database for tracking
    const { data: tweetRecord, error: tweetError } = await supabase
      .from('twitter_posts')
      .insert({
        hijack_id: hijack_id,
        tweet_content: tweetContent,
        status: 'posted' // For now, we'll mark as posted since we don't have actual Twitter API
      })
      .select()
      .single()

    if (tweetError) {
      console.error('Error storing tweet record:', tweetError)
      throw new Error('Failed to store tweet record')
    }

    console.log('Tweet record created:', tweetRecord.id)

    // Note: In a real implementation, you would use Twitter API here
    // For now, we're just logging and storing the tweet content
    console.log('Would post to Twitter:', tweetContent)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Tweet prepared and logged',
        tweet_id: tweetRecord.id,
        content: tweetContent
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in post-hijack-tweet:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error occurred' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
