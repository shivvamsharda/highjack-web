
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Twitter API credentials from Supabase secrets
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

  console.log("OAuth signature generated successfully")
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

function truncateWalletAddress(address: string): string {
  if (address.length <= 8) return address
  return `${address.slice(0, 4)}...${address.slice(-4)}`
}

function generateTweetContent(hijack: any): string {
  const truncatedWallet = truncateWalletAddress(hijack.wallet_address)
  
  return `🏴‍☠️ TOKEN HIJACKED! 🏴‍☠️

🆕 New Identity:
💎 ${hijack.token_name} ($${hijack.ticker_symbol})

🦹‍♂️ Hijacked by: ${truncatedWallet}
🔗 View on Solana: ${hijack.explorer_url}

#HIGHJACK #Solana #TokenTakeover #DeFi`
}

async function postTweet(tweetText: string): Promise<any> {
  const url = "https://api.x.com/2/tweets"
  const method = "POST"
  const params = { text: tweetText }

  const oauthHeader = generateOAuthHeader(method, url)
  console.log("Posting tweet to Twitter API...")

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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    console.log('Twitter bot function called...')
    
    // Validate Twitter credentials
    validateTwitterCredentials()
    
    const { hijack_id } = await req.json()
    
    if (!hijack_id) {
      return new Response(
        JSON.stringify({ error: 'Missing hijack_id parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('Processing hijack_id:', hijack_id)

    // Get hijack details from database
    const { data: hijack, error: hijackError } = await supabase
      .from('token_hijacks')
      .select('*')
      .eq('id', hijack_id)
      .eq('status', 'completed')
      .single()

    if (hijackError || !hijack) {
      console.error('Hijack not found or not completed:', hijackError)
      return new Response(
        JSON.stringify({ error: 'Hijack not found or not completed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Check if tweet already posted for this hijack
    const { data: existingTweet } = await supabase
      .from('twitter_posts')
      .select('id')
      .eq('hijack_id', hijack_id)
      .eq('status', 'success')
      .single()

    if (existingTweet) {
      console.log('Tweet already posted for this hijack')
      return new Response(
        JSON.stringify({ message: 'Tweet already posted for this hijack' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate tweet content
    const tweetContent = generateTweetContent(hijack)
    console.log('Generated tweet content:', tweetContent)

    // Create initial twitter_posts record
    const { data: twitterPost, error: insertError } = await supabase
      .from('twitter_posts')
      .insert({
        hijack_id: hijack_id,
        tweet_content: tweetContent,
        status: 'pending'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating twitter_posts record:', insertError)
      throw new Error('Failed to create twitter_posts record')
    }

    console.log('Created twitter_posts record:', twitterPost.id)

    try {
      // Post tweet to Twitter
      const tweetResponse = await postTweet(tweetContent)
      console.log('Tweet posted successfully:', tweetResponse)

      // Update twitter_posts record with success
      await supabase
        .from('twitter_posts')
        .update({
          status: 'success',
          tweet_id: tweetResponse.data?.id || null,
          posted_at: new Date().toISOString()
        })
        .eq('id', twitterPost.id)

      return new Response(
        JSON.stringify({
          success: true,
          tweet_id: tweetResponse.data?.id,
          message: 'Tweet posted successfully!'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (twitterError) {
      console.error('Twitter API error:', twitterError)
      
      // Update twitter_posts record with error
      await supabase
        .from('twitter_posts')
        .update({
          status: 'failed',
          error_message: twitterError.message
        })
        .eq('id', twitterPost.id)

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to post tweet',
          details: twitterError.message
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

  } catch (error) {
    console.error('Error in post-hijack-tweet function:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: error.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
