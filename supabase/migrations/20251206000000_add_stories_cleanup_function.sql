-- Stories cleanup system - Scheduled cleanup function
-- This migration adds a function to clean up expired stories automatically

-- Create the cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_stories()
RETURNS TABLE(deleted_count INTEGER, execution_time INTERVAL) AS $$
DECLARE
  start_time TIMESTAMP := clock_timestamp();
  deleted_rows INTEGER := 0;
BEGIN
  -- Delete expired stories (older than 24 hours)
  WITH deleted AS (
    DELETE FROM stories
    WHERE expires_at <= NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_rows FROM deleted;

  -- Return statistics
  RETURN QUERY SELECT
    deleted_rows,
    clock_timestamp() - start_time;

  -- Log the cleanup operation
  RAISE NOTICE '🧹 Stories cleanup completed: % stories deleted in %',
    deleted_rows,
    clock_timestamp() - start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job using pg_cron if available
-- Note: pg_cron needs to be installed separately in Supabase
-- For now, this can be called manually or via external cron

-- Grant execute permission to authenticated users (for admin access)
-- In production, you might want to restrict this to service role only
GRANT EXECUTE ON FUNCTION cleanup_expired_stories() TO authenticated;

-- Comment
COMMENT ON FUNCTION cleanup_expired_stories() IS 'Nettoie automatiquement les stories expirées (plus de 24h) et retourne le nombre supprimé';

-- Optional: Create a view for monitoring expired stories
CREATE OR REPLACE VIEW expired_stories_stats AS
SELECT
  COUNT(*) as total_expired,
  COUNT(*) FILTER (WHERE expires_at <= NOW() - INTERVAL '1 hour') as expired_over_1h,
  COUNT(*) FILTER (WHERE expires_at <= NOW() - INTERVAL '6 hours') as expired_over_6h,
  COUNT(*) FILTER (WHERE expires_at <= NOW() - INTERVAL '24 hours') as expired_over_24h,
  MIN(expires_at) as oldest_expired_at,
  MAX(expires_at) as newest_expired_at
FROM stories
WHERE expires_at <= NOW();

-- Grant access to the view
GRANT SELECT ON expired_stories_stats TO authenticated;

COMMENT ON VIEW expired_stories_stats IS 'Statistiques sur les stories expirées pour monitoring';

-- Test the function (optional - can be removed in production)
-- SELECT * FROM cleanup_expired_stories();
