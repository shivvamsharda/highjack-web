
-- Recreate the database trigger that was removed
-- This will automatically call the Twitter bot when a hijack is completed

CREATE OR REPLACE FUNCTION public.trigger_twitter_post()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger if status changed from something else to 'completed'
  IF OLD.status IS DISTINCT FROM 'completed' AND NEW.status = 'completed' THEN
    -- Call the Twitter bot edge function asynchronously
    PERFORM
      net.http_post(
        url := 'https://nejapljbwzbsfmmkfouj.supabase.co/functions/v1/post-hijack-tweet',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lamFwbGpid3pic2ZtbWtmb3VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NjEzNjEsImV4cCI6MjA2NjMzNzM2MX0.qbusAEFuwlFovgerxCzZBbkxX2aRVp0lqEGQ3l5mUbc"}'::jsonb,
        body := json_build_object('hijack_id', NEW.id)::jsonb
      );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on token_hijacks table
DROP TRIGGER IF EXISTS trigger_twitter_post_on_completion ON public.token_hijacks;
CREATE TRIGGER trigger_twitter_post_on_completion
  AFTER UPDATE ON public.token_hijacks
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_twitter_post();
