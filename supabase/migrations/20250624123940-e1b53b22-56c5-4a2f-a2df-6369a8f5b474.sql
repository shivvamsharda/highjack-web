
-- Create a public storage bucket for token assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'token-assets', 
  'token-assets', 
  true, 
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/json']
);

-- Create RLS policy to allow public uploads to the bucket
CREATE POLICY "Allow public uploads to token-assets bucket" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'token-assets');

-- Create RLS policy to allow public access to files in the bucket
CREATE POLICY "Allow public access to token-assets bucket" ON storage.objects
  FOR SELECT USING (bucket_id = 'token-assets');

-- Create RLS policy to allow public updates to files in the bucket (for metadata updates)
CREATE POLICY "Allow public updates to token-assets bucket" ON storage.objects
  FOR UPDATE USING (bucket_id = 'token-assets');
