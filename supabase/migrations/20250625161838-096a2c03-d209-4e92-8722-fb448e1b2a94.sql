
-- Enable the pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable the pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create the cron job to decay hijack fees every hour
SELECT cron.schedule(
  'decay-hijack-fees-hourly',
  '0 * * * *', -- At minute 0 of every hour
  $$
  SELECT
    net.http_post(
        url:='https://nejapljbwzbsfmmkfouj.supabase.co/functions/v1/decay-hijack-fees',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lamFwbGpid3pic2ZtbWtmb3VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NjEzNjEsImV4cCI6MjA2NjMzNzM2MX0.qbusAEFuwlFovgerxCzZBbkxX2aRVp0lqEGQ3l5mUbc"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);
