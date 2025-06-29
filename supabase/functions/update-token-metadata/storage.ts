
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { MetadataUploadResult } from './types.ts'

export async function uploadImageAndMetadata(
  supabase: ReturnType<typeof createClient>,
  imageFile: File,
  tokenName: string,
  ticker: string,
  userWalletAddress: string,
  description?: string
): Promise<MetadataUploadResult> {
  console.log('Uploading image to Supabase Storage...')

  // Generate unique filename for image
  const timestamp = Date.now()
  const imageExtension = imageFile.name.split('.').pop() || 'jpg'
  const imageFileName = `images/${timestamp}-${userWalletAddress.slice(0, 8)}-${tokenName.replace(/\s+/g, '-').toLowerCase()}.${imageExtension}`

  // Upload image to Supabase Storage
  const imageBytes = new Uint8Array(await imageFile.arrayBuffer())
  const { data: imageUploadData, error: imageUploadError } = await supabase.storage
    .from('token-assets')
    .upload(imageFileName, imageBytes, {
      contentType: imageFile.type,
      upsert: false
    })

  if (imageUploadError) {
    console.error('Error uploading image:', imageUploadError)
    throw new Error(`Failed to upload image: ${imageUploadError.message}`)
  }

  // Get public URL for the uploaded image
  const { data: imageUrlData } = supabase.storage
    .from('token-assets')
    .getPublicUrl(imageFileName)

  const imageUri = imageUrlData.publicUrl
  console.log('Image uploaded to Supabase Storage:', imageUri)

  // Create token description with new template
  const baseTemplate = "Steal the billboard. Make it yours. Leave your mark on-chain. Message from the hijacker:"
  const tokenDescription = description 
    ? `${baseTemplate}\n${description}` 
    : baseTemplate

  // Create metadata object
  const metadata = {
    name: tokenName,
    symbol: ticker.toUpperCase(),
    description: tokenDescription,
    image: imageUri,
    attributes: [
      {
        trait_type: "Hijacked",
        value: "Yes"
      },
      {
        trait_type: "Original Hijacker", 
        value: userWalletAddress
      },
      {
        trait_type: "Hijack Date",
        value: new Date().toISOString()
      }
    ],
    properties: {
      files: [
        {
          uri: imageUri,
          type: imageFile.type,
        }
      ],
      category: "image",
      telegram: "https://t.me/highjackme",
      twitter: "https://x.com/highjack_me",
      website: "https://highjack.me/"
    }
  }

  console.log('Uploading metadata to Supabase Storage...')

  // Generate unique filename for metadata
  const metadataFileName = `metadata/${timestamp}-${userWalletAddress.slice(0, 8)}-${tokenName.replace(/\s+/g, '-').toLowerCase()}.json`

  // Upload metadata JSON to Supabase Storage
  const metadataBytes = new TextEncoder().encode(JSON.stringify(metadata, null, 2))
  const { data: metadataUploadData, error: metadataUploadError } = await supabase.storage
    .from('token-assets')
    .upload(metadataFileName, metadataBytes, {
      contentType: 'application/json',
      upsert: false
    })

  if (metadataUploadError) {
    console.error('Error uploading metadata:', metadataUploadError)
    throw new Error(`Failed to upload metadata: ${metadataUploadError.message}`)
  }

  // Get public URL for the uploaded metadata
  const { data: metadataUrlData } = supabase.storage
    .from('token-assets')
    .getPublicUrl(metadataFileName)

  const metadataUri = metadataUrlData.publicUrl
  console.log('Metadata uploaded to Supabase Storage:', metadataUri)

  return { imageUri, metadataUri, metadata }
}
