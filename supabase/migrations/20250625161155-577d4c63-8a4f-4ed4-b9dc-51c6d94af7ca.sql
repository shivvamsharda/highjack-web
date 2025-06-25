
-- Create table to track dynamic pricing for hijacks
CREATE TABLE public.hijack_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  current_fee_sol DECIMAL(10, 4) NOT NULL DEFAULT 0.1,
  last_hijack_at TIMESTAMP WITH TIME ZONE,
  last_fee_update_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add trigger to update updated_at column
CREATE TRIGGER update_hijack_pricing_updated_at
  BEFORE UPDATE ON public.hijack_pricing
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial pricing record
INSERT INTO public.hijack_pricing (current_fee_sol, last_fee_update_at)
VALUES (0.1, now());

-- Add fee_paid_sol column to token_hijacks table to track actual fee paid
ALTER TABLE public.token_hijacks 
ADD COLUMN fee_paid_sol DECIMAL(10, 4);

-- Update existing records to have the old fee (0.01 SOL)
UPDATE public.token_hijacks 
SET fee_paid_sol = 0.01 
WHERE fee_paid_sol IS NULL;

-- Enable realtime for hijack_pricing table
ALTER TABLE public.hijack_pricing REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hijack_pricing;
