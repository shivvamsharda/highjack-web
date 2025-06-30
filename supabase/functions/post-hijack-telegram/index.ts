
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Telegram Bot API credentials from environment
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_API")?.trim()
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID")?.trim()

function validateTelegramCredentials() {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error("Missing TELEGRAM_API environment variable")
  }
  if (!TELEGRAM_CHAT_ID) {
    throw new Error("Missing TELEGRAM_CHAT_ID environment variable")
  }
}

async function sendTelegramMessage(messageText: string): Promise<any> {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
  
  const params = {
    chat_id: TELEGRAM_CHAT_ID,
    text: messageText,
    parse_mode: 'HTML'
  }

  console.log("Sending Telegram message to chat:", TELEGRAM_CHAT_ID)
  console.log("Message content:", messageText)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })

  const responseText = await response.text()
  console.log("Telegram API Response:", responseText)

  if (!response.ok) {
    throw new Error(
      `Telegram API error! status: ${response.status}, body: ${responseText}`
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

    console.log('Processing Telegram message for hijack:', hijack_id)
    
    // Validate Telegram credentials
    validateTelegramCredentials()

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

    // Build message content using the same format as Twitter bot
    let messageContent = ''
    
    if (previousHijack) {
      // Show transformation from previous identity to new identity
      messageContent = `🏴‍☠️ Token Hijacked! 

${previousHijack.token_name} ($${previousHijack.ticker_symbol}) just got a new identity! 

🔥 Name: ${hijack.token_name}
💎 Symbol: $${hijack.ticker_symbol}
👑 Hijacker: ${hijack.wallet_address.slice(0, 6)}...${hijack.wallet_address.slice(-4)}`
    } else {
      // Fall back to generic message if no previous hijack found
      messageContent = `🏴‍☠️ Token Hijacked! 

${hijack.token_name} ($${hijack.ticker_symbol}) just got a new identity! 

🔥 Name: ${hijack.token_name}
💎 Symbol: $${hijack.ticker_symbol}
👑 Hijacker: ${hijack.wallet_address.slice(0, 6)}...${hijack.wallet_address.slice(-4)}`
    }

    // Add social links if they exist
    const socialLinks = []
    if (hijack.x_link) socialLinks.push(`🐦 X: ${hijack.x_link}`)
    if (hijack.telegram_link) socialLinks.push(`📱 TG: ${hijack.telegram_link}`)
    if (hijack.website_link) socialLinks.push(`🌐 Site: ${hijack.website_link}`)

    if (socialLinks.length > 0) {
      const linksText = `\n\n🔗 Links:\n${socialLinks.join('\n')}`
      messageContent = messageContent + linksText + '\n\n#TOKENHIGHJACK'
    } else {
      // Add hashtag even without social links
      messageContent += '\n\n#TOKENHIGHJACK'
    }

    console.log('Telegram message content prepared:', messageContent)
    console.log('Message length:', messageContent.length)

    let telegramResult
    let messageStatus = 'success'
    let errorMessage = null

    try {
      // Send the actual Telegram message
      telegramResult = await sendTelegramMessage(messageContent)
      console.log('Telegram message sent successfully:', telegramResult)
    } catch (telegramError) {
      console.error('Error sending Telegram message:', telegramError)
      messageStatus = 'failed'
      errorMessage = telegramError instanceof Error ? telegramError.message : 'Unknown Telegram error'
      telegramResult = null
    }

    // Store Telegram message record in database for tracking
    const { data: telegramRecord, error: telegramError } = await supabase
      .from('telegram_posts')
      .insert({
        hijack_id: hijack_id,
        message_content: messageContent,
        telegram_message_id: telegramResult?.result?.message_id?.toString() || null,
        status: messageStatus,
        error_message: errorMessage,
        posted_at: messageStatus === 'success' ? new Date().toISOString() : null
      })
      .select()
      .single()

    if (telegramError) {
      console.error('Error storing Telegram message record:', telegramError)
      throw new Error('Failed to store Telegram message record')
    }

    console.log('Telegram message record created:', telegramRecord.id)

    return new Response(
      JSON.stringify({ 
        success: messageStatus === 'success',
        message: messageStatus === 'success' ? 'Telegram message sent successfully' : 'Telegram message failed to send',
        telegram_record_id: telegramRecord.id,
        telegram_message_id: telegramResult?.result?.message_id || null,
        content: messageContent,
        error: errorMessage
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in post-hijack-telegram:', error)
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
