
-- Add social link columns to token_hijacks table
ALTER TABLE public.token_hijacks 
ADD COLUMN x_link TEXT,
ADD COLUMN telegram_link TEXT,
ADD COLUMN website_link TEXT;

-- Add index for faster queries on social links (optional but good practice)
CREATE INDEX idx_token_hijacks_social_links ON public.token_hijacks(x_link, telegram_link, website_link) WHERE x_link IS NOT NULL OR telegram_link IS NOT NULL OR website_link IS NOT NULL;
