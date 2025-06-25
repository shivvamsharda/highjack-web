
-- Remove the problematic database trigger and function that uses non-existent net schema
DROP TRIGGER IF EXISTS trigger_twitter_post_on_completion ON public.token_hijacks;
DROP FUNCTION IF EXISTS public.trigger_twitter_post();
