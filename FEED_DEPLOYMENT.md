# Hybrid Feed Algorithm - Deployment Guide

## Prerequisites

- Supabase project with Lovable Cloud integration ✓
- Database migrations applied ✓
- Edge Function deployed (`compute-feed-ranking`)

## Deployment Steps

### 1. Database Setup

The migrations have already been applied. Verify tables exist:

```sql
-- Check timeline_items table
SELECT COUNT(*) FROM timeline_items;

-- Check feed_variant_stats table
SELECT COUNT(*) FROM feed_variant_stats;

-- Verify functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE '%timeline%' OR routine_name LIKE '%ranking%';
```

### 2. Edge Function Deployment

The Edge Function is automatically deployed with your Lovable project. Verify deployment:

```bash
# Check Edge Function logs
# Visit: Lovable Dashboard > Backend > Edge Functions > compute-feed-ranking
```

Test the Edge Function:
```bash
curl -X POST 'https://tohgxyzfrkzpujkviutj.supabase.co/functions/v1/compute-feed-ranking' \
  -H "Authorization: Bearer YOUR_USER_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-uuid",
    "weights": {
      "w1": 0.25,
      "w2": 0.35,
      "w3": 0.30,
      "w4": 0.10
    },
    "limit": 100
  }'
```

### 3. Initial Timeline Population

Populate timelines for existing users:

**Option A: SQL Batch (Recommended for < 1000 users)**
```sql
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT id FROM profiles 
    WHERE created_at > NOW() - INTERVAL '30 days'
    LIMIT 100
  LOOP
    PERFORM populate_timeline_for_user(user_record.id, 100);
    RAISE NOTICE 'Populated timeline for user %', user_record.id;
  END LOOP;
END $$;
```

**Option B: Edge Function (Recommended for > 1000 users)**
Create a cron job or scheduled task to call the Edge Function for active users.

### 4. Scheduled Refresh (Optional)

Set up a cron job to refresh timelines periodically:

**Using Supabase Cron (via pg_cron extension)**
```sql
-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule timeline refresh every 15 minutes for active users
SELECT cron.schedule(
  'refresh-active-user-timelines',
  '*/15 * * * *', -- Every 15 minutes
  $$
    SELECT populate_timeline_for_user(p.id, 100)
    FROM profiles p
    WHERE EXISTS (
      SELECT 1 FROM user_presence up
      WHERE up.user_id = p.id 
        AND up.online = true
    )
    OR EXISTS (
      SELECT 1 FROM posts
      WHERE user_id = p.id
        AND created_at > NOW() - INTERVAL '1 hour'
    )
    LIMIT 50;
  $$
);
```

**Using External Cron (Alternative)**
If pg_cron is not available, use an external service like GitHub Actions or Vercel Cron:

```yaml
# .github/workflows/refresh-timelines.yml
name: Refresh User Timelines
on:
  schedule:
    - cron: '*/15 * * * *' # Every 15 minutes
  workflow_dispatch: # Manual trigger

jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - name: Call Edge Function
        run: |
          curl -X POST '${{ secrets.SUPABASE_URL }}/functions/v1/compute-feed-ranking' \
            -H "Authorization: Bearer ${{ secrets.SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{
              "userId": "batch",
              "limit": 100
            }'
```

### 5. Frontend Integration

Update your Feed component to use the new timeline system:

```typescript
// src/pages/Feed.tsx
import { useTimelineFeed } from '@/hooks/useTimelineFeed';

function Feed() {
  const { user } = useAuth();
  const {
    posts,
    isLoading,
    fetchNextPage,
    hasNextPage,
    computeRankings,
    trackImpression,
    recordEngagement,
    variant,
  } = useTimelineFeed(user?.id);

  // Compute rankings on mount (if timeline is empty)
  useEffect(() => {
    if (posts.length === 0 && !isLoading) {
      computeRankings();
    }
  }, [posts.length, isLoading, computeRankings]);

  // Track impressions when posts are viewed
  useEffect(() => {
    posts.forEach(post => {
      // Use IntersectionObserver for actual visibility
      trackImpression(post.id);
    });
  }, [posts, trackImpression]);

  return (
    <div>
      <div>Feed Mode: {variant}</div>
      {posts.map(post => (
        <PostCard 
          key={post.id} 
          post={post}
          onLike={() => recordEngagement({ 
            postId: post.id, 
            signalType: 'like' 
          })}
          onComment={() => recordEngagement({ 
            postId: post.id, 
            signalType: 'comment' 
          })}
        />
      ))}
      {hasNextPage && (
        <button onClick={() => fetchNextPage()}>
          Load More
        </button>
      )}
    </div>
  );
}
```

### 6. Performance Testing

Run k6 load tests to verify performance targets:

```bash
# Install k6
brew install k6  # macOS
# or
sudo apt-get install k6  # Ubuntu

# Run performance test
k6 run \
  --env SUPABASE_URL=https://tohgxyzfrkzpujkviutj.supabase.co \
  --env SUPABASE_ANON_KEY=your-anon-key \
  --env TEST_USER_ID=test-user-uuid \
  k6-tests/feed-performance-test.js
```

**Target Metrics**:
- P50 latency: < 200ms ✓
- P95 latency: < 500ms ✓
- P99 latency: < 1000ms ✓
- Error rate: < 5% ✓

### 7. Monitoring Setup

Set up monitoring for key metrics:

**Database Queries**:
```sql
-- Monitor timeline refresh performance
SELECT 
  user_id,
  COUNT(*) as items_count,
  MAX(updated_at) as last_refresh,
  AVG(ranking_score) as avg_score
FROM timeline_items
GROUP BY user_id
ORDER BY last_refresh DESC
LIMIT 100;

-- Check A/B test distribution
SELECT 
  variant,
  COUNT(DISTINCT user_id) as user_count,
  AVG(ranking_score) as avg_ranking
FROM timeline_items
GROUP BY variant;
```

**Application Monitoring**:
- Track feed load times in your analytics
- Monitor error rates for `get_personalized_timeline` RPC calls
- Set up alerts for P95 latency > 500ms

### 8. Gradual Rollout (Optional)

If you want a phased rollout:

1. **Phase 1** (10% of users): Enable for test users
   ```sql
   UPDATE timeline_items
   SET variant = 'personalized'
   WHERE user_id IN (
     SELECT id FROM profiles 
     ORDER BY random() 
     LIMIT (SELECT COUNT(*) * 0.1 FROM profiles)
   );
   ```

2. **Phase 2** (50% A/B test): Already configured by default

3. **Phase 3** (100% personalized): After validating metrics
   ```sql
   UPDATE timeline_items SET variant = 'personalized';
   ```

## Weight Tuning Process

After deployment, monitor and adjust weights based on metrics:

1. **Week 1**: Use default weights, collect baseline metrics
2. **Week 2**: Analyze engagement patterns, identify issues
3. **Week 3**: Test weight adjustments (see FEED_ALGORITHM_GUIDE.md)
4. **Week 4**: Roll out optimized weights

**A/B Test Comparison Query**:
```sql
SELECT 
  variant,
  COUNT(DISTINCT user_id) as users,
  AVG(impressions) as avg_impressions,
  AVG(clicks) as avg_clicks,
  AVG(time_spent_seconds / 60.0) as avg_minutes,
  AVG(engagement_actions) as avg_actions,
  AVG(clicks::float / NULLIF(impressions, 0)) as ctr
FROM feed_variant_stats
WHERE session_date >= CURRENT_DATE - 7
GROUP BY variant
ORDER BY variant;
```

## Troubleshooting

### Issue: Empty timeline for users
**Solution**: Run `populate_timeline_for_user()` manually or via Edge Function

### Issue: Slow feed load times (> 500ms)
**Solutions**:
- Check if indexes are being used: `EXPLAIN ANALYZE SELECT ...`
- Reduce timeline item count per user
- Increase cache TTL on frontend

### Issue: Stale content in timeline
**Solutions**:
- Increase refresh frequency (cron job)
- Add trigger to auto-populate on new post creation
- Clear old timeline items: `DELETE FROM timeline_items WHERE updated_at < NOW() - INTERVAL '7 days'`

### Issue: A/B test imbalance
**Solution**: Verify assignment logic in `populate_timeline_for_user()`

## Rollback Plan

If critical issues arise:

1. **Disable Edge Function**: Comment out calls to `compute-feed-ranking`
2. **Fall back to old feed**: Use `get_smart_feed` RPC instead
3. **Clear timeline items**: `TRUNCATE timeline_items;`

## Success Metrics

After 2 weeks, evaluate:

- [ ] P50 latency < 200ms achieved
- [ ] User engagement increased (likes, comments, time spent)
- [ ] A/B test shows personalized > chronological
- [ ] No increase in error rates
- [ ] User feedback is positive

## Next Steps

1. ✅ Deploy database migrations
2. ✅ Verify Edge Function works
3. ⏳ Populate initial timelines
4. ⏳ Set up scheduled refresh
5. ⏳ Integrate frontend
6. ⏳ Run performance tests
7. ⏳ Monitor A/B test results
8. ⏳ Tune weights based on data

For detailed algorithm documentation, see [FEED_ALGORITHM_GUIDE.md](./FEED_ALGORITHM_GUIDE.md).