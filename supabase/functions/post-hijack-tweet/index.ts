import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Twitter API credentials from environment
const TWITTER_API_KEY = Deno.env.get("TWITTER_API_KEY")?.trim()
const TWITTER_API_KEY_SECRET = Deno.env.get("TWITTER_API_KEY_SECRET")?.trim()
const TWITTER_ACCESS_KEY = Deno.env.get("TWITTER_ACCESS_KEY")?.trim()
const TWITTER_ACCESS_KEY_SECRET = Deno.env.get("TWITTER_ACCESS_KEY_SECRET")?.trim()

function validateTwitterCredentials() {
  if (!TWITTER_API_KEY) {
    throw new Error("Missing TWITTER_API_KEY environment variable")
  }
  if (!TWITTER_API_KEY_SECRET) {
    throw new Error("Missing TWITTER_API_KEY_SECRET environment variable")
  }
  if (!TWITTER_ACCESS_KEY) {
    throw new Error("Missing TWITTER_ACCESS_KEY environment variable")
  }
  if (!TWITTER_ACCESS_KEY_SECRET) {
    throw new Error("Missing TWITTER_ACCESS_KEY_SECRET environment variable")
  }
}

function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string
): string {
  const signatureBaseString = `${method}&${encodeURIComponent(
    url
  )}&${encodeURIComponent(
    Object.entries(params)
      .sort()
      .map(([k, v]) => `${k}=${v}`)
      .join("&")
  )}`
  
  const signingKey = `${encodeURIComponent(
    consumerSecret
  )}&${encodeURIComponent(tokenSecret)}`
  
  const hmacSha1 = createHmac("sha1", signingKey)
  const signature = hmacSha1.update(signatureBaseString).digest("base64")
  
  console.log("Signature Base String:", signatureBaseString)
  console.log("Generated Signature:", signature)
  
  return signature
}

function generateOAuthHeader(method: string, url: string): string {
  const oauthParams = {
    oauth_consumer_key: TWITTER_API_KEY!,
    oauth_nonce: Math.random().toString(36).substring(2),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: TWITTER_ACCESS_KEY!,
    oauth_version: "1.0",
  }

  const signature = generateOAuthSignature(
    method,
    url,
    oauthParams,
    TWITTER_API_KEY_SECRET!,
    TWITTER_ACCESS_KEY_SECRET!
  )

  const signedOAuthParams = {
    ...oauthParams,
    oauth_signature: signature,
  }

  const entries = Object.entries(signedOAuthParams).sort((a, b) =>
    a[0].localeCompare(b[0])
  )

  return (
    "OAuth " +
    entries
      .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
      .join(", ")
  )
}

async function sendTweet(tweetText: string): Promise<any> {
  const url = "https://api.x.com/2/tweets"
  const method = "POST"
  const params = { text: tweetText }

  const oauthHeader = generateOAuthHeader(method, url)
  console.log("OAuth Header:", oauthHeader)

  const response = await fetch(url, {
    method: method,
    headers: {
      Authorization: oauthHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  })

  const responseText = await response.text()
  console.log("Twitter API Response:", responseText)

  if (!response.ok) {
    throw new Error(
      `Twitter API error! status: ${response.status}, body: ${responseText}`
    )
  }

  return JSON.parse(responseText)
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
    
    // Validate Twitter credentials
    validateTwitterCredentials()

    // Get current hijack details from database
    const { data: hijack, error: hijackError } = await supabase
      .from('token_hijacks')
      .select('*')
      .eq('id', hijack_id)
      .single()

    if (hijackError || !hijack) {
      console.error('Error fetching hijack:', hijackError)
      throw new Error('Hijack not found')
    }

    // Get the previous hijack to show what was transformed
    const { data: previousHijacks, error: previousError } = await supabase
      .from('token_hijacks')
      .select('token_name, ticker_symbol')
      .lt('created_at', hijack.created_at)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)

    if (previousError) {
      console.error('Error fetching previous hijack:', previousError)
    }

    const previousHijack = previousHijacks && previousHijacks.length > 0 ? previousHijacks[0] : null

    // Build tweet content based on whether we have previous hijack info
    let tweetContent = ''
    
    if (previousHijack) {
      // Show transformation from previous identity to new identity
      tweetContent = `🏴‍☠️ Token Hijacked! 

${previousHijack.token_name} ($${previousHijack.ticker_symbol}) has been hijacked and transformed into ${hijack.token_name} ($${hijack.ticker_symbol})!

👑 Hijacker: ${hijack.wallet_address.slice(0, 6)}...${hijack.wallet_address.slice(-4)}

#TokenHijack #Solana #DeFi #HIGHJACK`
    } else {
      // Fall back to generic message if no previous hijack found
      tweetContent = `🏴‍☠️ Token Hijacked! 

Meet the new identity: ${hijack.token_name} ($${hijack.ticker_symbol})!

👑 Hijacker: ${hijack.wallet_address.slice(0, 6)}...${hijack.wallet_address.slice(-4)}

#TokenHijack #Solana #DeFi #HIGHJACK`
    }

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

    let tweetResult
    let tweetStatus = 'success'
    let errorMessage = null

    try {
      // Send the actual tweet
      tweetResult = await sendTweet(tweetContent)
      console.log('Tweet posted successfully:', tweetResult)
    } catch (twitterError) {
      console.error('Error posting tweet:', twitterError)
      tweetStatus = 'failed'
      errorMessage = twitterError instanceof Error ? twitterError.message : 'Unknown Twitter error'
      tweetResult = null
    }

    // Store tweet record in database for tracking
    const { data: tweetRecord, error: tweetError } = await supabase
      .from('twitter_posts')
      .insert({
        hijack_id: hijack_id,
        tweet_content: tweetContent,
        tweet_id: tweetResult?.data?.id || null,
        status: tweetStatus,
        error_message: errorMessage,
        posted_at: tweetStatus === 'success' ? new Date().toISOString() : null
      })
      .select()
      .single()

    if (tweetError) {
      console.error('Error storing tweet record:', tweetError)
      throw new Error('Failed to store tweet record')
    }

    console.log('Tweet record created:', tweetRecord.id)

    return new Response(
      JSON.stringify({ 
        success: tweetStatus === 'success',
        message: tweetStatus === 'success' ? 'Tweet posted successfully' : 'Tweet failed to post',
        tweet_id: tweetRecord.id,
        twitter_tweet_id: tweetResult?.data?.id || null,
        content: tweetContent,
        error: errorMessage
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
