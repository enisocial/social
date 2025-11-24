-- ============================================================================
-- MIGRATION: Fix Security Issues from Optimization
-- Description: Fix search_path and secure materialized view
-- ============================================================================

-- Fix search_path for cleanup functions
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM notifications
  WHERE read = true
    AND created_at < NOW() - INTERVAL '30 days';
END;
$$;

CREATE OR REPLACE FUNCTION cleanup_old_engagement_signals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM engagement_signals
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

CREATE OR REPLACE FUNCTION cleanup_old_typing_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM typing_status
  WHERE updated_at < NOW() - INTERVAL '1 minute';
END;
$$;

-- Fix refresh function
CREATE OR REPLACE FUNCTION refresh_user_stats_mv()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_stats_mv;
END;
$$;

-- Fix get_table_sizes function
CREATE OR REPLACE FUNCTION get_table_sizes()
RETURNS TABLE(
  table_name text,
  row_count bigint,
  total_size text,
  index_size text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    schemaname || '.' || tablename as table_name,
    n_live_tup as row_count,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$;

-- Secure materialized view with RLS
ALTER MATERIALIZED VIEW user_stats_mv OWNER TO postgres;

-- Revoke public access to materialized view
REVOKE ALL ON user_stats_mv FROM PUBLIC;
REVOKE ALL ON user_stats_mv FROM anon;
REVOKE ALL ON user_stats_mv FROM authenticated;

-- Grant only necessary permissions
GRANT SELECT ON user_stats_mv TO service_role;