
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Telegram Bot API credentials from environment
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_API")?.trim()
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID")?.trim()

function validateTelegramCredentials() {
  console.log('Validating Telegram credentials...')
  console.log('Bot token exists:', !!TELEGRAM_BOT_TOKEN)
  console.log('Chat ID:', TELEGRAM_CHAT_ID)
  
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error("Missing TELEGRAM_API environment variable")
  }
  if (!TELEGRAM_CHAT_ID) {
    throw new Error("Missing TELEGRAM_CHAT_ID environment variable")
  }
}

async function testBotInfo(): Promise<any> {
  console.log('Testing bot info...')
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`
  
  const response = await fetch(url)
  const responseText = await response.text()
  console.log("Bot info response:", responseText)
  
  if (!response.ok) {
    throw new Error(`Bot info failed! status: ${response.status}, body: ${responseText}`)
  }
  
  return JSON.parse(responseText)
}

async function sendTestMessage(): Promise<any> {
  console.log('Sending test message...')
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
  
  const testMessage = `🤖 Telegram Bot Test

✅ Bot Configuration Test
📅 ${new Date().toISOString()}
🔧 Testing chat ID: ${TELEGRAM_CHAT_ID}

If you see this message, the bot is working correctly!`

  const params = {
    chat_id: TELEGRAM_CHAT_ID,
    text: testMessage,
    parse_mode: 'HTML'
  }

  console.log("Sending test message with params:", JSON.stringify(params, null, 2))

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })

  const responseText = await response.text()
  console.log("Send message response:", responseText)

  if (!response.ok) {
    throw new Error(`Send message failed! status: ${response.status}, body: ${responseText}`)
  }

  return JSON.parse(responseText)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== TELEGRAM BOT TEST STARTED ===')
    
    // Step 1: Validate credentials
    validateTelegramCredentials()
    console.log('✅ Credentials validation passed')

    // Step 2: Test bot info
    const botInfo = await testBotInfo()
    console.log('✅ Bot info retrieved successfully:', botInfo.result?.username)

    // Step 3: Send test message
    const messageResult = await sendTestMessage()
    console.log('✅ Test message sent successfully!')

    console.log('=== TELEGRAM BOT TEST COMPLETED SUCCESSFULLY ===')

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Telegram bot test completed successfully!',
        botInfo: botInfo.result,
        messageResult: messageResult.result,
        testDetails: {
          botUsername: botInfo.result?.username,
          chatId: TELEGRAM_CHAT_ID,
          messageId: messageResult.result?.message_id,
          timestamp: new Date().toISOString()
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Telegram bot test failed:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Telegram bot test failed',
        details: error.message,
        troubleshooting: {
          commonIssues: [
            'Bot token is invalid or expired',
            'Chat ID is incorrect (should start with -100 for supergroups)',
            'Bot is not added to the chat/channel',
            'Bot lacks necessary permissions in the chat',
            'Chat/channel is private and bot needs to be invited'
          ]
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    )
  }
})
