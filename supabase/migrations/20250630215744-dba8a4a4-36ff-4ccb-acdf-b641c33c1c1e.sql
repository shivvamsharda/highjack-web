
-- Emergency fix for stuck fee decay system
-- Step 1: Clean up all existing broken cron jobs
DO $$
BEGIN
    -- Safely unschedule all existing fee decay cron jobs
    PERFORM cron.unschedule('decay-hijack-fees-hourly');
    PERFORM cron.unschedule('decay-hijack-fees-20min');
    PERFORM cron.unschedule('decay-hijack-fees-20min-fixed');
    PERFORM cron.unschedule('decay-hijack-fees-emergency-fix');
EXCEPTION
    WHEN OTHERS THEN
        -- Continue if jobs don't exist
        NULL;
END $$;

-- Step 2: Manually reset fee to minimum (0.1 SOL) since it's been stuck
UPDATE public.hijack_pricing 
SET 
    current_fee_sol = 0.1,
    last_fee_update_at = now()
WHERE id = (
    SELECT id 
    FROM public.hijack_pricing 
    ORDER BY created_at DESC 
    LIMIT 1
);

-- Step 3: Create database-level decay function as backup
CREATE OR REPLACE FUNCTION public.decay_fee_direct()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_pricing RECORD;
    new_fee DECIMAL;
    result jsonb;
BEGIN
    -- Get current pricing
    SELECT * INTO current_pricing
    FROM public.hijack_pricing
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Check if decay is needed
    IF current_pricing.last_hijack_at IS NULL OR 
       (EXTRACT(EPOCH FROM (now() - current_pricing.last_hijack_at)) / 60) >= 20 THEN
        
        -- Calculate new fee
        new_fee := GREATEST(0.1, current_pricing.current_fee_sol - 0.1);
        
        -- Update fee if it changed
        IF new_fee != current_pricing.current_fee_sol THEN
            UPDATE public.hijack_pricing
            SET 
                current_fee_sol = new_fee,
                last_fee_update_at = now()
            WHERE id = current_pricing.id;
            
            SELECT jsonb_build_object(
                'success', true,
                'decayed', true,
                'old_fee', current_pricing.current_fee_sol,
                'new_fee', new_fee,
                'message', 'Fee decayed successfully'
            ) INTO result;
        ELSE
            SELECT jsonb_build_object(
                'success', true,
                'decayed', false,
                'current_fee', current_pricing.current_fee_sol,
                'message', 'Fee already at minimum'
            ) INTO result;
        END IF;
    ELSE
        SELECT jsonb_build_object(
            'success', true,
            'decayed', false,
            'current_fee', current_pricing.current_fee_sol,
            'message', 'Not enough time passed since last hijack'
        ) INTO result;
    END IF;
    
    RETURN result;
END;
$$;

-- Step 4: Create new working cron job with proper configuration
SELECT cron.schedule(
    'fee-decay-working',
    '*/20 * * * *', -- Every 20 minutes
    $$
    SELECT public.decay_fee_direct();
    $$
);

-- Step 5: Add monitoring function
CREATE OR REPLACE FUNCTION public.get_cron_job_status()
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
        j.jobname::text,
        j.schedule::text,
        j.active,
        j.jobid
    FROM cron.job j
    WHERE j.jobname LIKE '%fee%' OR j.jobname LIKE '%decay%';
END;
$$;
