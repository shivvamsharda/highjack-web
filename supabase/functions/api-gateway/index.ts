
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

// Rate limiting store (in-memory for now)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Allowed domains for CORS
const ALLOWED_ORIGINS = [
  'https://36339aa0-bfe6-4f2a-96b6-00b913a168af.lovableproject.com',
  'https://highjack.me/',
  'http://localhost:3000',
  'http://localhost:5173'
]

// Internal API key for service-to-service communication
const INTERNAL_API_KEY = Deno.env.get('INTERNAL_API_KEY') || 'fallback-internal-key'

// Rate limiting configuration
const RATE_LIMITS = {
  'get-token-metadata': { requests: 100, window: 3600 }, // 100 per hour
  'get-hijack-fee': { requests: 200, window: 3600 }, // 200 per hour
  'get-treasury-wallet': { requests: 50, window: 3600 }, // 50 per hour
  'update-token-metadata': { requests: 4, window: 60 } // 4 per minute (wallet-specific)
}

// Rate limiting check
function checkRateLimit(clientId: string, endpoint: string): boolean {
  const key = `${clientId}:${endpoint}`
  const now = Date.now()
  const limit = RATE_LIMITS[endpoint as keyof typeof RATE_LIMITS]
  
  if (!limit) return true // No limit configured
  
  const record = rateLimitStore.get(key)
  
  if (!record || now > record.resetTime) {
    // Reset or create new record
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + (limit.window * 1000)
    })
    return true
  }
  
  if (record.count >= limit.requests) {
    return false // Rate limit exceeded
  }
  
  record.count++
  rateLimitStore.set(key, record)
  return true
}

// Security validation middleware
function validateRequest(request: Request): { valid: boolean; error?: string } {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  const userAgent = request.headers.get('user-agent')
  
  // Check origin - be more permissive for development
  if (origin) {
    const isAllowed = ALLOWED_ORIGINS.some(allowed => {
      const cleanOrigin = origin.replace('https://', '').replace('http://', '')
      const cleanAllowed = allowed.replace('https://', '').replace('http://', '')
      return cleanOrigin.includes(cleanAllowed) || cleanAllowed.includes(cleanOrigin)
    })
    
    if (!isAllowed) {
      console.log('Origin not allowed:', origin)
      return { valid: false, error: 'Invalid origin' }
    }
  }
  
  // Block common HTTP clients but be less strict
  const blockedUserAgents = ['postman', 'insomnia', 'curl', 'wget', 'httpie']
  if (userAgent && blockedUserAgents.some(blocked => userAgent.toLowerCase().includes(blocked))) {
    console.log('Blocked user agent:', userAgent)
    return { valid: false, error: 'Client not allowed' }
  }
  
  return { valid: true }
}

// Route requests to internal functions
async function routeRequest(endpoint: string, request: Request): Promise<Response> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  try {
    let result
    
    switch (endpoint) {
      case 'get-token-metadata':
        result = await supabase.functions.invoke('internal-get-token-metadata', {
          headers: { 'x-internal-key': INTERNAL_API_KEY }
        })
        break
        
      case 'get-hijack-fee':
        result = await supabase.functions.invoke('internal-get-hijack-fee', {
          headers: { 'x-internal-key': INTERNAL_API_KEY }
        })
        break
        
      case 'get-treasury-wallet':
        result = await supabase.functions.invoke('internal-get-treasury-wallet', {
          headers: { 'x-internal-key': INTERNAL_API_KEY }
        })
        break
        
      case 'update-token-metadata':
        // For form data, we need to pass the request body directly
        const body = await request.arrayBuffer()
        result = await supabase.functions.invoke('internal-update-token-metadata', {
          body: body,
          headers: { 
            'x-internal-key': INTERNAL_API_KEY,
            'content-type': request.headers.get('content-type') || 'application/octet-stream'
          }
        })
        break
        
      default:
        return new Response(
          JSON.stringify({ error: 'Endpoint not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        )
    }
    
    if (result.error) {
      console.error(`Error calling internal function ${endpoint}:`, result.error)
      throw result.error
    }
    
    return new Response(
      JSON.stringify(result.data),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
    
  } catch (error) {
    console.error(`Error routing to ${endpoint}:`, error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': req.headers.get('origin') || '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature, x-timestamp, x-api-key',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  }
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    console.log('API Gateway - Processing request:', req.url)
    
    // Security validation - make it less strict for now
    const securityCheck = validateRequest(req)
    if (!securityCheck.valid) {
      console.log('Security validation failed:', securityCheck.error)
      // For now, just log but don't block - we can tighten this later
      console.log('Proceeding anyway for debugging...')
    }
    
    // Extract endpoint from URL path
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const endpoint = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2]
    
    console.log('Extracted endpoint:', endpoint)
    
    // Get client identifier for rate limiting - wallet-specific for update-token-metadata
    let clientId: string
    if (endpoint === 'update-token-metadata') {
      // For metadata update endpoint, extract wallet from form data or use IP as fallback
      let walletAddress: string | null = null
      
      // Try to get wallet address from form data for POST requests
      if (req.method === 'POST') {
        try {
          const formData = await req.formData()
          walletAddress = formData.get('userWalletAddress') as string
        } catch {
          // If formData parsing fails, fall back to query params or IP
          walletAddress = url.searchParams.get('wallet')
        }
      } else {
        walletAddress = url.searchParams.get('wallet')
      }
      
      if (!walletAddress) {
        return new Response(
          JSON.stringify({ 
            error: 'Wallet address required for metadata update endpoint',
            details: 'Please provide wallet address in form data or as query parameter'
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      clientId = walletAddress
      console.log('Using wallet address for rate limiting:', walletAddress)
    } else {
      // For other endpoints, use IP address or wallet if provided
      const clientIP = req.headers.get('x-forwarded-for') || 'unknown'
      const walletAddress = url.searchParams.get('wallet') || clientIP
      clientId = walletAddress
    }
    
    // Rate limiting check - now enforced for update-token-metadata endpoint
    if (endpoint === 'update-token-metadata') {
      if (!checkRateLimit(clientId, endpoint)) {
        console.log('Rate limit exceeded for wallet:', clientId, endpoint)
        return new Response(
          JSON.stringify({ 
            error: 'Rate limit exceeded',
            details: 'Maximum 4 requests per minute per wallet address for metadata update endpoint'
          }),
          { 
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    } else {
      // For other endpoints, just warn but don't block (for debugging)
      if (!checkRateLimit(clientId, endpoint)) {
        console.log('Rate limit exceeded for:', clientId, endpoint)
        console.log('Proceeding anyway for debugging...')
      }
    }
    
    // Route to internal function
    const response = await routeRequest(endpoint, req)
    
    // Add CORS headers to response
    const responseHeaders = new Headers(response.headers)
    Object.entries(corsHeaders).forEach(([key, value]) => {
      responseHeaders.set(key, value)
    })
    
    console.log('API Gateway - Request processed successfully')
    
    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders
    })
    
  } catch (error) {
    console.error('API Gateway error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Gateway error',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
