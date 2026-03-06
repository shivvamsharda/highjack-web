
-- Drop the existing hourly cron job
SELECT cron.unschedule('decay-hijack-fees-hourly');

-- Create new cron job to decay hijack fees every 20 minutes
SELECT cron.schedule(
  'decay-hijack-fees-20min',
  '*/20 * * * *', -- At every 20th minute
  $$
  SELECT
    net.http_post(
        url:='https://bosqcsckprecaqpqsxlx.supabase.co/functions/v1/decay-hijack-fees',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvc3Fjc2NrcHJlY2FxcHFzeGx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NTU0MjEsImV4cCI6MjA4ODEzMTQyMX0.UhjEoSuo9oVbVM1KkqrOFl9zhhR1wX5EnEEuYnMBtx8"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);
