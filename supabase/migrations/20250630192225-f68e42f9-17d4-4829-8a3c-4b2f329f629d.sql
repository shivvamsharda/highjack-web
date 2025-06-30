
-- Clear all data from token_hijacks table
DELETE FROM public.token_hijacks;

-- Clear all data from twitter_posts table (related to hijacks)
DELETE FROM public.twitter_posts;

-- Reset the hijack pricing to initial state
UPDATE public.hijack_pricing 
SET current_fee_sol = 0.1, 
    last_hijack_at = NULL, 
    last_fee_update_at = now();
