-- ============================================
-- FINAL SQL OPTIMIZATIONS
-- ============================================
-- Fix remaining critical SQL performance issues:
-- 1. Add composite index on friend_requests for multi-column queries
-- 2. Remove deprecated get_smart_friend_suggestions RPC

-- 1. ADD COMPOSITE INDEX ON FRIEND_REQUESTS
-- ============================================
-- This composite index optimizes queries that filter on multiple columns simultaneously
-- Common query pattern: WHERE sender_id = X AND receiver_id = Y AND status = 'accepted'
CREATE INDEX IF NOT EXISTS idx_friend_requests_composite 
ON public.friend_requests(sender_id, receiver_id, status);

-- Also create reverse composite for queries with receiver_id first
CREATE INDEX IF NOT EXISTS idx_friend_requests_composite_reverse 
ON public.friend_requests(receiver_id, sender_id, status);

-- Drop old single-column indexes that are now covered by composite indexes
DROP INDEX IF EXISTS public.idx_friend_requests_sender;
DROP INDEX IF EXISTS public.idx_friend_requests_receiver;
DROP INDEX IF EXISTS public.idx_friend_requests_status;


-- 2. DROP DEPRECATED get_smart_friend_suggestions RPC
-- ============================================
-- This RPC is no longer used in the frontend (replaced by get_batch_friend_suggestions)
-- It uses non-optimized COUNT(*) operations instead of the mutual_friends_cache materialized view
DROP FUNCTION IF EXISTS public.get_smart_friend_suggestions(UUID, INTEGER);


-- 3. ADD COMMENT FOR DOCUMENTATION
-- ============================================
COMMENT ON INDEX public.idx_friend_requests_composite IS 
'Composite index for optimizing friend request queries with multiple filters. Covers (sender_id, receiver_id, status).';

COMMENT ON INDEX public.idx_friend_requests_composite_reverse IS 
'Reverse composite index for queries that filter receiver_id first. Covers (receiver_id, sender_id, status).';