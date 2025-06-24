
-- Create wallet_connections table to store connected wallet information
CREATE TABLE public.wallet_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL UNIQUE,
  wallet_type TEXT NOT NULL CHECK (wallet_type IN ('phantom', 'solflare', 'backpack')),
  connected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_active_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Add Row Level Security (RLS)
ALTER TABLE public.wallet_connections ENABLE ROW LEVEL SECURITY;

-- Create policy that allows anyone to insert wallet connections (public app)
CREATE POLICY "Anyone can create wallet connections" 
  ON public.wallet_connections 
  FOR INSERT 
  WITH CHECK (true);

-- Create policy that allows anyone to view wallet connections
CREATE POLICY "Anyone can view wallet connections" 
  ON public.wallet_connections 
  FOR SELECT 
  USING (true);

-- Create policy that allows anyone to update wallet connections
CREATE POLICY "Anyone can update wallet connections" 
  ON public.wallet_connections 
  FOR UPDATE 
  USING (true);

-- Create index for faster lookups by wallet address
CREATE INDEX idx_wallet_connections_address ON public.wallet_connections(wallet_address);
CREATE INDEX idx_wallet_connections_active ON public.wallet_connections(is_active, last_active_at);
