
-- Fix the fee decay cron job system
-- First, unschedule any existing cron jobs for fee decay
SELECT cron.unschedule('decay-hijack-fees-20min');
SELECT cron.unschedule('decay-hijack-fees-hourly');

-- Ensure extensions are enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create new cron job with better error handling and consistent 20-minute intervals
SELECT cron.schedule(
  'decay-hijack-fees-20min-fixed',
  '*/20 * * * *', -- Every 20 minutes
  $$
  SELECT
    net.http_post(
        url:='https://nejapljbwzbsfmmkfouj.supabase.co/functions/v1/decay-hijack-fees',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lamFwbGpid3pic2ZtbWtmb3VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NjEzNjEsImV4cCI6MjA2NjMzNzM2MX0.qbusAEFuwlFovgerxCzZBbkxX2aRVp0lqEGQ3l5mUbc"}'::jsonb,
        body:='{"scheduled": true, "debug": true}'::jsonb
    ) as request_id;
  $$
);

-- Add a function to manually trigger fee decay for testing
CREATE OR REPLACE FUNCTION public.manual_trigger_fee_decay()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Call the decay edge function manually
  SELECT
    net.http_post(
        url:='https://nejapljbwzbsfmmkfouj.supabase.co/functions/v1/decay-hijack-fees',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lamFwbGpid3pic2ZtbWtmb3VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NjEzNjEsImV4cCI6MjA2NjMzNzM2MX0.qbusAEFuwlFovgerxCzZBbkxX2aRVp0lqEGQ3l5mUbc"}'::jsonb,
        body:='{"manual_trigger": true, "debug": true}'::jsonb
    ) INTO result;
    
  RETURN result;
END;
$$;
