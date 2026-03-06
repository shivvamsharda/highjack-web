
-- Create twitter_posts table for logging tweet attempts
CREATE TABLE public.twitter_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hijack_id UUID NOT NULL REFERENCES public.token_hijacks(id) ON DELETE CASCADE,
  tweet_id TEXT,
  tweet_content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'retry')),
  error_message TEXT,
  posted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_twitter_posts_hijack_id ON public.twitter_posts(hijack_id);
CREATE INDEX idx_twitter_posts_status ON public.twitter_posts(status);
CREATE INDEX idx_twitter_posts_created_at ON public.twitter_posts(created_at DESC);

-- Add Row Level Security (RLS)
ALTER TABLE public.twitter_posts ENABLE ROW LEVEL SECURITY;

-- Create policy that allows anyone to view twitter posts (public feed)
CREATE POLICY "Anyone can view twitter posts" 
  ON public.twitter_posts 
  FOR SELECT 
  USING (true);

-- Create policy that allows anyone to insert twitter posts (for edge function)
CREATE POLICY "Anyone can create twitter posts" 
  ON public.twitter_posts 
  FOR INSERT 
  WITH CHECK (true);

-- Create policy that allows anyone to update twitter posts (for edge function updates)
CREATE POLICY "Anyone can update twitter posts" 
  ON public.twitter_posts 
  FOR UPDATE 
  USING (true);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_twitter_posts_updated_at 
    BEFORE UPDATE ON public.twitter_posts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for live updates
ALTER TABLE public.twitter_posts REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.twitter_posts;

-- Create function to automatically call Twitter bot when hijack is completed
CREATE OR REPLACE FUNCTION public.trigger_twitter_post()
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
