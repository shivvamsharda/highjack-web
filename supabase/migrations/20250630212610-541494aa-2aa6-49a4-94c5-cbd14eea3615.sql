
-- Drop the existing hourly cron job
SELECT cron.unschedule('decay-hijack-fees-hourly');

-- Create new cron job to decay hijack fees every 20 minutes
SELECT cron.schedule(
  'decay-hijack-fees-20min',
  '*/20 * * * *', -- At every 20th minute
  $$
  SELECT
    net.http_post(
        url:='https://nejapljbwzbsfmmkfouj.supabase.co/functions/v1/decay-hijack-fees',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lamFwbGpid3pic2ZtbWtmb3VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NjEzNjEsImV4cCI6MjA2NjMzNzM2MX0.qbusAEFuwlFovgerxCzZBbkxX2aRVp0lqEGQ3l5mUbc"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);
