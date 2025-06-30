
-- Emergency Fix for Fee Decay System
-- Clean up existing cron jobs and recreate with proper configuration

-- First, unschedule ALL existing fee decay cron jobs to start clean
SELECT cron.unschedule('decay-hijack-fees-hourly');
SELECT cron.unschedule('decay-hijack-fees-20min');
SELECT cron.unschedule('decay-hijack-fees-20min-fixed');

-- Ensure extensions are enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create new cron job with enhanced error handling and logging
SELECT cron.schedule(
  'decay-hijack-fees-emergency-fix',
  '*/20 * * * *', -- Every 20 minutes
  $$
  SELECT
    net.http_post(
        url:='https://nejapljbwzbsfmmkfouj.supabase.co/functions/v1/decay-hijack-fees',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lamFwbGpid3pic2ZtbWtmb3VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NjEzNjEsImV4cCI6MjA2NjMzNzM2MX0.qbusAEFuwlFovgerxCzZBbkxX2aRVp0lqEGQ3l5mUbc"}'::jsonb,
        body:='{"scheduled": true, "debug": true, "emergency_fix": true}'::jsonb
    ) as request_id;
  $$
);

-- Add function to check cron job status
CREATE OR REPLACE FUNCTION public.check_fee_decay_cron_status()
RETURNS TABLE(
  jobname text,
  schedule text,
  active boolean,
  jobid bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cron.job.jobname::text,
    cron.job.schedule::text,
    cron.job.active,
    cron.job.jobid
  FROM cron.job 
  WHERE cron.job.jobname LIKE '%decay%';
END;
$$;

-- Add function to manually reset fee to minimum (emergency use)
CREATE OR REPLACE FUNCTION public.emergency_reset_fee_to_minimum()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  current_pricing RECORD;
BEGIN
  -- Get current pricing
  SELECT * INTO current_pricing
  FROM public.hijack_pricing
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Update fee to minimum
  UPDATE public.hijack_pricing
  SET 
    current_fee_sol = 0.1,
    last_fee_update_at = now()
  WHERE id = current_pricing.id;
  
  -- Return result
  SELECT jsonb_build_object(
    'success', true,
    'message', 'Fee reset to minimum 0.1 SOL',
    'old_fee', current_pricing.current_fee_sol,
    'new_fee', 0.1,
    'reset_time', now()
  ) INTO result;
  
  RETURN result;
END;
$$;
