
-- Add description column to token_hijacks table
ALTER TABLE public.token_hijacks 
ADD COLUMN description TEXT;

-- Add index for faster queries on description (optional but good practice)
CREATE INDEX idx_token_hijacks_description ON public.token_hijacks(description) WHERE description IS NOT NULL;
