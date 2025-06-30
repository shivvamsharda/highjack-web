
-- Safe cron job cleanup with proper privileges
-- This will delete the problematic hourly cron job while keeping the working 20-minute job

-- Create a privileged function to safely delete the hourly cron job
CREATE OR REPLACE FUNCTION public.cleanup_hourly_cron_job()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
    deletion_attempts jsonb[] := '{}';
    attempt_result jsonb;
BEGIN
    -- Attempt 1: Try to unschedule by job name
    BEGIN
        PERFORM cron.unschedule('decay-hijack-fees-hourly');
        attempt_result := jsonb_build_object(
            'method', 'unschedule_by_name',
            'success', true,
            'message', 'Successfully unscheduled decay-hijack-fees-hourly'
        );
        deletion_attempts := deletion_attempts || attempt_result;
    EXCEPTION
        WHEN OTHERS THEN
            attempt_result := jsonb_build_object(
                'method', 'unschedule_by_name',
                'success', false,
                'error', SQLERRM
            );
            deletion_attempts := deletion_attempts || attempt_result;
    END;
    
    -- Attempt 2: Try to delete by job ID (1)
    BEGIN
        DELETE FROM cron.job WHERE jobid = 1 AND jobname = 'decay-hijack-fees-hourly';
        IF FOUND THEN
            attempt_result := jsonb_build_object(
                'method', 'delete_by_id',
                'success', true,
                'message', 'Successfully deleted job ID 1'
            );
        ELSE
            attempt_result := jsonb_build_object(
                'method', 'delete_by_id',
                'success', false,
                'message', 'Job ID 1 not found or already deleted'
            );
        END IF;
        deletion_attempts := deletion_attempts || attempt_result;
    EXCEPTION
        WHEN OTHERS THEN
            attempt_result := jsonb_build_object(
                'method', 'delete_by_id',
                'success', false,
                'error', SQLERRM
            );
            deletion_attempts := deletion_attempts || attempt_result;
    END;
    
    -- Attempt 3: Try to delete any job with hourly schedule
    BEGIN
        DELETE FROM cron.job WHERE schedule = '0 * * * *' AND jobname LIKE '%decay%';
        IF FOUND THEN
            attempt_result := jsonb_build_object(
                'method', 'delete_by_schedule',
                'success', true,
                'message', 'Successfully deleted hourly decay jobs'
            );
        ELSE
            attempt_result := jsonb_build_object(
                'method', 'delete_by_schedule',
                'success', false,
                'message', 'No hourly decay jobs found'
            );
        END IF;
        deletion_attempts := deletion_attempts || attempt_result;
    EXCEPTION
        WHEN OTHERS THEN
            attempt_result := jsonb_build_object(
                'method', 'delete_by_schedule',
                'success', false,
                'error', SQLERRM
            );
            deletion_attempts := deletion_attempts || attempt_result;
    END;
    
    -- Build final result
    SELECT jsonb_build_object(
        'success', true,
        'message', 'Cleanup attempts completed',
        'deletion_attempts', deletion_attempts,
        'timestamp', now()
    ) INTO result;
    
    RETURN result;
END;
$$;

-- Execute the cleanup function
SELECT public.cleanup_hourly_cron_job();

-- Verify remaining cron jobs
SELECT 
    jobname,
    schedule,
    active,
    jobid,
    CASE 
        WHEN schedule = '*/20 * * * *' THEN 'KEEP - 20 minute job'
        WHEN schedule = '0 * * * *' THEN 'DELETE - hourly job'
        ELSE 'UNKNOWN'
    END as action_needed
FROM cron.job 
WHERE jobname LIKE '%decay%' OR jobname LIKE '%fee%'
ORDER BY jobid;
