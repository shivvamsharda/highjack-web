
-- Create a function to execute SQL commands (needed for cron job cleanup)
CREATE OR REPLACE FUNCTION public.sql(query text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result text;
BEGIN
    -- Execute the query and capture any result
    EXECUTE query;
    RETURN 'Query executed successfully';
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'Error: ' || SQLERRM;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.sql(text) TO service_role;
