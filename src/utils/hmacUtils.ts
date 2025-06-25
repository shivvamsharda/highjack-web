
// HMAC utilities for secure API communication
export async function generateHMACSignature(body: string, secretKey?: string): Promise<{ signature: string; timestamp: string }> {
  const timestamp = Date.now().toString();
  
  // For client-side, we'll use a simplified approach
  // In production, consider using server-side signing for maximum security
  const key = secretKey || 'hijack-app-secret-2024'; // This should match server-side
  
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const dataToSign = `${timestamp}:${body}`;
  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(dataToSign));
  const signature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return { signature, timestamp };
}

export function validateOrigin(): boolean {
  const allowedOrigins = [
    'https://36339aa0-bfe6-4f2a-96b6-00b913a168af.lovableproject.com',
    'localhost:3000',
    'localhost:5173'
  ];
  
  const currentOrigin = window.location.hostname;
  return allowedOrigins.some(allowed => currentOrigin.includes(allowed.replace('https://', '').replace('http://', '')));
}
