-- Fix search_path for security functions that are missing it
ALTER FUNCTION public.cleanup_old_engagement_signals() SET search_path = public;
ALTER FUNCTION public.cleanup_old_typing_status() SET search_path = public;
ALTER FUNCTION public.publish_scheduled_posts() SET search_path = public;

-- Move pg_trgm extension from public to extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION pg_trgm SET SCHEMA extensions;

-- Update search path for all users to include extensions schema
ALTER DATABASE postgres SET search_path TO public, extensions;