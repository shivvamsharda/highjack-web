
-- Step 1: Set fee to 0.3 SOL and update last_hijack_at to current time
UPDATE public.hijack_pricing 
SET 
    current_fee_sol = 0.3,
    last_hijack_at = now(),
    last_fee_update_at = now()
WHERE id = (
    SELECT id 
    FROM public.hijack_pricing 
    ORDER BY created_at DESC 
    LIMIT 1
);

-- Step 2: Safely clean up redundant cron jobs using DO blocks
DO $$
BEGIN
    -- Try to unschedule each job, ignore errors if they don't exist
    BEGIN
        PERFORM cron.unschedule('decay-hijack-fees-hourly');
    EXCEPTION
        WHEN OTHERS THEN
            -- Job doesn't exist, continue
            NULL;
    END;
    
    BEGIN
        PERFORM cron.unschedule('decay-hijack-fees-20min');
    EXCEPTION
        WHEN OTHERS THEN
            -- Job doesn't exist, continue
            NULL;
    END;
    
    BEGIN
        PERFORM cron.unschedule('decay-hijack-fees-emergency-fix');
    EXCEPTION
        WHEN OTHERS THEN
            -- Job doesn't exist, continue
            NULL;
    END;
    
    BEGIN
        PERFORM cron.unschedule('decay-hijack-fees-20min-fixed');
    EXCEPTION
        WHEN OTHERS THEN
            -- Job doesn't exist, continue
            NULL;
    END;
END $$;

-- Step 3: Verify the remaining cron job status
SELECT 
    jobname,
    schedule,
    active,
    jobid
FROM cron.job 
WHERE jobname = 'fee-decay-working';
