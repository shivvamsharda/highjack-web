
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

// Rate limiting store (in-memory for now)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Allowed domains for CORS
const ALLOWED_ORIGINS = [
  'https://36339aa0-bfe6-4f2a-96b6-00b913a168af.lovableproject.com',
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
  'update-token-metadata': { requests: 5, window: 3600 } // 5 per hour (strict for hijacking)
}

// HMAC signature validation
async function validateHMACSignature(request: Request, body: string): Promise<boolean> {
  const signature = request.headers.get('x-signature')
  const timestamp = request.headers.get('x-timestamp')
  
  if (!signature || !timestamp) return false
  
  // Check timestamp is within 5 minutes
  const now = Date.now()
  const requestTime = parseInt(timestamp)
  if (Math.abs(now - requestTime) > 300000) return false
  
  const secretKey = Deno.env.get('HMAC_SECRET_KEY')
  if (!secretKey) return false
  
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secretKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const dataToSign = `${timestamp}:${body}`
  const expectedSignature = await crypto.subtle.sign('HMAC', key, encoder.encode(dataToSign))
  const expectedHex = Array.from(new Uint8Array(expectedSignature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  
  return signature === expectedHex
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
  
  // Check origin
  if (origin && !ALLOWED_ORIGINS.some(allowed => origin.includes(allowed.replace('https://', '').replace('http://', '')))) {
    return { valid: false, error: 'Invalid origin' }
  }
  
  // Check referer for additional security
  if (referer && !ALLOWED_ORIGINS.some(allowed => referer.startsWith(allowed))) {
    return { valid: false, error: 'Invalid referer' }
  }
  
  // Block common HTTP clients
  const blockedUserAgents = ['postman', 'insomnia', 'curl', 'wget', 'httpie']
  if (userAgent && blockedUserAgents.some(blocked => userAgent.toLowerCase().includes(blocked))) {
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
        const formData = await request.formData()
        result = await supabase.functions.invoke('internal-update-token-metadata', {
          body: formData,
          headers: { 'x-internal-key': INTERNAL_API_KEY }
        })
        break
        
      default:
        return new Response(
          JSON.stringify({ error: 'Endpoint not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        )
    }
    
    if (result.error) {
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
    
    // Security validation
    const securityCheck = validateRequest(req)
    if (!securityCheck.valid) {
      console.log('Security validation failed:', securityCheck.error)
      return new Response(
        JSON.stringify({ error: 'Request blocked', reason: securityCheck.error }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    // Extract endpoint from URL path
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const endpoint = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2]
    
    // Get client identifier for rate limiting
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown'
    const walletAddress = url.searchParams.get('wallet') || clientIP
    
    // Rate limiting check
    if (!checkRateLimit(walletAddress, endpoint)) {
      console.log('Rate limit exceeded for:', walletAddress, endpoint)
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.'
        }),
        { 
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    // For sensitive operations, require HMAC signature
    if (endpoint === 'update-token-metadata') {
      const body = await req.text()
      const isValidSignature = await validateHMACSignature(req, body)
      
      if (!isValidSignature) {
        console.log('Invalid HMAC signature for sensitive operation')
        return new Response(
          JSON.stringify({ 
            error: 'Invalid request signature',
            message: 'Request must be properly signed'
          }),
          { 
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      
      // Recreate request with body for routing
      req = new Request(req.url, {
        method: req.method,
        headers: req.headers,
        body: body
      })
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
