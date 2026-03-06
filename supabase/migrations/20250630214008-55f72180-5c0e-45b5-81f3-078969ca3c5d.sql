
-- Create telegram_posts table for logging Telegram message attempts
CREATE TABLE public.telegram_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hijack_id UUID NOT NULL REFERENCES public.token_hijacks(id) ON DELETE CASCADE,
  telegram_message_id TEXT,
  message_content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'retry')),
  error_message TEXT,
  posted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_telegram_posts_hijack_id ON public.telegram_posts(hijack_id);
CREATE INDEX idx_telegram_posts_status ON public.telegram_posts(status);
CREATE INDEX idx_telegram_posts_created_at ON public.telegram_posts(created_at DESC);

-- Add Row Level Security (RLS)
ALTER TABLE public.telegram_posts ENABLE ROW LEVEL SECURITY;

-- Create policy that allows anyone to view telegram posts (public feed)
CREATE POLICY "Anyone can view telegram posts" 
  ON public.telegram_posts 
  FOR SELECT 
  USING (true);

-- Create policy that allows anyone to insert telegram posts (for edge function)
CREATE POLICY "Anyone can create telegram posts" 
  ON public.telegram_posts 
  FOR INSERT 
  WITH CHECK (true);

-- Create policy that allows anyone to update telegram posts (for edge function updates)
CREATE POLICY "Anyone can update telegram posts" 
  ON public.telegram_posts 
  FOR UPDATE 
  USING (true);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_telegram_posts_updated_at 
    BEFORE UPDATE ON public.telegram_posts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for live updates
ALTER TABLE public.telegram_posts REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.telegram_posts;

-- Update the existing trigger function to call both Twitter and Telegram bots
CREATE OR REPLACE FUNCTION public.trigger_social_posts()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger if status changed from something else to 'completed'
  IF OLD.status IS DISTINCT FROM 'completed' AND NEW.status = 'completed' THEN
    -- Call the Twitter bot edge function asynchronously
    PERFORM
      net.http_post(
        url := 'https://bosqcsckprecaqpqsxlx.supabase.co/functions/v1/post-hijack-tweet',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvc3Fjc2NrcHJlY2FxcHFzeGx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NTU0MjEsImV4cCI6MjA4ODEzMTQyMX0.UhjEoSuo9oVbVM1KkqrOFl9zhhR1wX5EnEEuYnMBtx8"}'::jsonb,
        body := json_build_object('hijack_id', NEW.id)::jsonb
      );
    
    -- Call the Telegram bot edge function asynchronously
    PERFORM
      net.http_post(
        url := 'https://bosqcsckprecaqpqsxlx.supabase.co/functions/v1/post-hijack-telegram',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvc3Fjc2NrcHJlY2FxcHFzeGx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NTU0MjEsImV4cCI6MjA4ODEzMTQyMX0.UhjEoSuo9oVbVM1KkqrOFl9zhhR1wX5EnEEuYnMBtx8"}'::jsonb,
        body := json_build_object('hijack_id', NEW.id)::jsonb
      );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the old trigger and create new one with the updated function
DROP TRIGGER IF EXISTS trigger_twitter_post_on_completion ON public.token_hijacks;
CREATE TRIGGER trigger_social_posts_on_completion
  AFTER UPDATE ON public.token_hijacks
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_social_posts();
