
-- Create token_hijacks table to store all hijack data
CREATE TABLE public.token_hijacks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  token_name TEXT NOT NULL,
  ticker_symbol TEXT NOT NULL,
  image_file_name TEXT,
  image_file_size INTEGER,
  image_file_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  transaction_signature TEXT,
  explorer_url TEXT,
  image_uri TEXT,
  metadata_uri TEXT,
  new_metadata JSONB,
  block_time BIGINT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_token_hijacks_wallet_address ON public.token_hijacks(wallet_address);
CREATE INDEX idx_token_hijacks_status ON public.token_hijacks(status);
CREATE INDEX idx_token_hijacks_created_at ON public.token_hijacks(created_at DESC);
CREATE INDEX idx_token_hijacks_transaction_signature ON public.token_hijacks(transaction_signature) WHERE transaction_signature IS NOT NULL;

-- Add Row Level Security (RLS)
ALTER TABLE public.token_hijacks ENABLE ROW LEVEL SECURITY;

-- Create policies that allow anyone to view recent hijacks (public feed)
CREATE POLICY "Anyone can view token hijacks" 
  ON public.token_hijacks 
  FOR SELECT 
  USING (true);

-- Create policy that allows anyone to insert hijacks (public app)
CREATE POLICY "Anyone can create token hijacks" 
  ON public.token_hijacks 
  FOR INSERT 
  WITH CHECK (true);

-- Create policy that allows anyone to update hijacks (for edge function updates)
CREATE POLICY "Anyone can update token hijacks" 
  ON public.token_hijacks 
  FOR UPDATE 
  USING (true);

-- Create function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_token_hijacks_updated_at 
    BEFORE UPDATE ON public.token_hijacks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for live updates
ALTER TABLE public.token_hijacks REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.token_hijacks;
