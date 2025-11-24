# Feed Algorithm Guide - Hybrid Personalization System

## Overview

This guide explains the hybrid feed ranking algorithm implemented for the social media platform, inspired by Facebook's approach to content personalization.

## Architecture

### 1. Timeline Items Table
- **Purpose**: Precomputed feed with ranking scores for fast retrieval
- **Key Fields**:
  - `ranking_score`: Final weighted score (0-1 range)
  - `recency_decay`: Time-based relevance (exponential decay)
  - `engagement_score`: Normalized user engagement
  - `affinity_score`: User-to-author relationship strength
  - `content_type_weight`: Multiplier based on media type
  - `variant`: A/B test group ('personalized' or 'chronological')

### 2. Scoring Formula

```
ranking_score = w1 * recency_decay + w2 * engagement_score + w3 * affinity_score + w4 * content_type_weight
```

**Default Weights** (Facebook-inspired):
- `w1 = 0.25` (25%) - Recency: Time decay
- `w2 = 0.35` (35%) - Engagement: Likes, comments, shares
- `w3 = 0.30` (30%) - Affinity: Friend/interaction history
- `w4 = 0.10` (10%) - Content Type: Video/image boost

## Components Breakdown

### Recency Decay (w1)
- **Half-life**: 24 hours (configurable)
- **Formula**: `e^(-ln(2) * hours / half_life)`
- **Range**: 0 (old) to 1 (new)
- **Purpose**: Ensures fresh content appears first

### Engagement Score (w2)
- **Signals Tracked**:
  - View: 0.1 points
  - Click: 0.5 points
  - Like: 2.0 points
  - Comment: 5.0 points
  - Share: 10.0 points
  - Time spent: 0.1 × seconds
- **Normalization**: Sigmoid function `1 / (1 + e^(-total_score/10))`
- **Timeframe**: Last 7 days of engagement
- **Range**: 0 to 1

### Affinity Score (w3)
- **Friend Relationship**: 1.0 (maximum)
- **Interaction History**: Based on `user_affinity` table (0-1)
- **Factors**:
  - Past likes on user's posts
  - Comments exchanged
  - Shares of user's content
- **Range**: 0 to 1

### Content Type Weight (w4)
- **Video**: 1.5× multiplier
- **Image**: 1.2× multiplier
- **Text**: 1.0× baseline
- **Purpose**: Boost rich media content

## A/B Testing

### Variants
1. **Personalized** (50% of users)
   - Uses full ranking algorithm
   - Sorted by `ranking_score DESC`

2. **Chronological** (50% of users)
   - Traditional time-based feed
   - Sorted by `created_at DESC`

### Tracking
The system tracks per-variant metrics:
- Impressions
- Clicks
- Time spent
- Engagement actions

Query variant performance:
```sql
SELECT 
  variant,
  AVG(engagement_actions) as avg_engagement,
  AVG(time_spent_seconds) as avg_time_spent,
  SUM(clicks)::float / NULLIF(SUM(impressions), 0) as ctr
FROM feed_variant_stats
WHERE session_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY variant;
```

## Weight Tuning Guide

### When to Adjust Weights

#### Increase Recency (w1) if:
- Users complain about seeing old posts
- Breaking news/time-sensitive content is important
- **Recommendation**: Increase to 0.35, decrease engagement to 0.25

#### Increase Engagement (w2) if:
- Goal is to maximize viral content
- Quality over newness is preferred
- **Recommendation**: Increase to 0.45, decrease recency to 0.15

#### Increase Affinity (w3) if:
- Users want more content from friends
- Community building is the priority
- **Recommendation**: Increase to 0.40, decrease engagement to 0.25

#### Increase Content Type (w4) if:
- Promoting video/rich media consumption
- Platform pivoting to video-first strategy
- **Recommendation**: Increase to 0.20, decrease others proportionally

### Example Weight Configurations

#### News Feed (Recency-focused)
```typescript
{
  w1: 0.40,  // High recency
  w2: 0.25,  // Moderate engagement
  w3: 0.25,  // Moderate affinity
  w4: 0.10   // Standard content type
}
```

#### Viral/Discovery Feed
```typescript
{
  w1: 0.15,  // Low recency
  w2: 0.50,  // High engagement
  w3: 0.20,  // Lower affinity (discover new creators)
  w4: 0.15   // Higher for viral video content
}
```

#### Friends-First Feed
```typescript
{
  w1: 0.20,  // Lower recency
  w2: 0.25,  // Moderate engagement
  w3: 0.45,  // High affinity
  w4: 0.10   // Standard content type
}
```

## Usage

### 1. Compute Rankings (Backend/Cron)

Call the Edge Function to populate timeline:
```typescript
const { data } = await supabase.functions.invoke('compute-feed-ranking', {
  body: {
    userId: 'user-uuid',
    weights: {
      w1: 0.25,
      w2: 0.35,
      w3: 0.30,
      w4: 0.10,
    },
    limit: 100,
  },
});
```

**Recommended Schedule**:
- Real-time: On new post creation
- Batch: Every 15-30 minutes for all active users
- On-demand: When user opens app after long absence

### 2. Fetch Personalized Feed (Frontend)

```typescript
import { useTimelineFeed } from '@/hooks/useTimelineFeed';

const { 
  posts, 
  isLoading, 
  computeRankings,
  trackImpression,
  recordEngagement,
  variant 
} = useTimelineFeed(userId);

// Track when post is viewed
trackImpression(postId);

// Record engagement
recordEngagement({ postId, signalType: 'like' });
```

### 3. Direct SQL Query

For backend/analytics:
```sql
SELECT * FROM get_personalized_timeline(
  p_user_id := 'user-uuid',
  p_limit := 20,
  p_offset := 0
);
```

## Performance Optimization

### Indexes Created
- `idx_timeline_user_ranking`: Fast ranking-based retrieval
- `idx_timeline_user_updated`: Refresh detection
- `idx_timeline_variant`: A/B test filtering

### Target Latencies
- **P50**: < 200ms (achieved via precomputation)
- **P95**: < 500ms
- **P99**: < 1000ms

### Scaling Tips
1. **Precompute Regularly**: Keep timeline_items fresh
2. **Cache Aggressively**: 2-5 minute TTL on feed results
3. **Lazy Load**: Only compute for active users
4. **Batch Updates**: Process engagement signals in batches

## Monitoring & Metrics

### Key Metrics to Track
1. **Feed Latency**: P50, P95, P99 response times
2. **Engagement Rate**: Actions per impression
3. **Time Spent**: Session duration
4. **Variant Performance**: A/B test results
5. **Coverage**: % of users with fresh timeline

### Sample Queries

**Engagement by Variant**:
```sql
SELECT 
  variant,
  COUNT(DISTINCT user_id) as users,
  AVG(engagement_actions) as avg_actions,
  AVG(time_spent_seconds / 60.0) as avg_minutes
FROM feed_variant_stats
WHERE session_date >= CURRENT_DATE - 7
GROUP BY variant;
```

**Top Performing Posts**:
```sql
SELECT 
  p.id,
  p.content,
  prof.name,
  AVG(ti.ranking_score) as avg_score,
  COUNT(ti.user_id) as users_shown
FROM timeline_items ti
JOIN posts p ON p.id = ti.post_id
JOIN profiles prof ON prof.id = p.user_id
WHERE ti.created_at > NOW() - INTERVAL '24 hours'
GROUP BY p.id, p.content, prof.name
ORDER BY avg_score DESC
LIMIT 20;
```

## Testing

### Manual Testing

1. **Create Test Users**: Different engagement patterns
2. **Seed Posts**: Various content types and ages
3. **Compute Rankings**: Call Edge Function
4. **Verify Top 20**: Check relevance manually

### Load Testing (k6)

```javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 100,
  duration: '30s',
};

export default function() {
  const url = 'YOUR_SUPABASE_URL/rest/v1/rpc/get_personalized_timeline';
  const payload = JSON.stringify({
    p_user_id: 'test-user-id',
    p_limit: 20,
    p_offset: 0,
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'apikey': 'YOUR_ANON_KEY',
    },
  };
  
  const res = http.post(url, payload, params);
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
}
```

## Future Enhancements

1. **ML Model Integration**: Replace manual weights with learned model
2. **Real-time Updates**: WebSocket-based live feed updates
3. **User Preferences**: Allow users to adjust their own weights
4. **Content Diversity**: Ensure varied creators in top results
5. **Time-of-Day Optimization**: Adjust weights based on time/day
6. **Negative Signals**: "Hide" or "Not Interested" actions

## Troubleshooting

### Low Engagement Scores
- Check if engagement signals are being recorded
- Verify 7-day lookback window has data
- Increase w2 weight temporarily

### Too Many Old Posts
- Verify recency_decay calculation
- Check post creation timestamps
- Increase w1 weight

### Same Posts Repeatedly
- Implement impression tracking and filtering
- Add "seen recently" penalty
- Refresh timeline more frequently

### Variant Imbalance
- Check A/B assignment logic
- Verify 50/50 split in database
- Review user creation timestamps

## Support

For issues or questions:
1. Check database functions are running correctly
2. Review Edge Function logs
3. Verify RLS policies allow proper access
4. Monitor performance metrics
5. Adjust weights based on user feedback