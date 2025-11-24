# Friend Suggestions - Testing & Validation Guide

## Test Scenarios

### 1. Accuracy Testing

Verify that suggestions are relevant and diverse.

#### Test Case: Mutual Friends Signal
```sql
-- Setup: Create test users with mutual friends
DO $$
DECLARE
  user_a UUID;
  user_b UUID;
  user_c UUID;
  mutual_friend UUID;
BEGIN
  -- Get test user IDs (replace with real UUIDs)
  user_a := 'test-user-a-uuid';
  user_b := 'test-user-b-uuid';
  mutual_friend := 'mutual-friend-uuid';
  
  -- Verify user_a and user_b both friends with mutual_friend
  -- Should suggest user_b to user_a
  
  -- Check result
  PERFORM * FROM get_advanced_friend_suggestions(user_a, 20, 0)
  WHERE user_id = user_b;
  
  IF FOUND THEN
    RAISE NOTICE 'PASS: user_b suggested to user_a via mutual friends';
  ELSE
    RAISE NOTICE 'FAIL: user_b NOT suggested despite mutual friend';
  END IF;
END $$;
```

**Expected**: user_b appears in suggestions with `mutual_friends_count > 0`

#### Test Case: Location Signal
```sql
-- Test same city matching
SELECT 
  username,
  city,
  location_score,
  final_score
FROM get_advanced_friend_suggestions('user-uuid', 20, 0)
WHERE location_score > 0
ORDER BY location_score DESC
LIMIT 5;
```

**Expected**: Users from same city have `location_score = 1.0`

#### Test Case: Interest Similarity
```sql
-- Setup: Add interests to users
INSERT INTO user_interests (user_id, interest, weight) VALUES
  ('user-a-uuid', 'machine-learning', 1.5),
  ('user-a-uuid', 'photography', 1.0),
  ('user-b-uuid', 'machine-learning', 1.0),
  ('user-b-uuid', 'photography', 1.0),
  ('user-b-uuid', 'cooking', 1.0);

-- Check similarity
SELECT get_interest_similarity('user-a-uuid', 'user-b-uuid');
-- Expected: 0.67 (2 common / 3 total)
```

### 2. Signal Diversity Test

Ensure suggestions use multiple signal types, not just one.

```sql
WITH suggestions AS (
  SELECT 
    user_id,
    username,
    (CASE WHEN mutual_friends_count > 0 THEN 1 ELSE 0 END +
     CASE WHEN interaction_score > 0.1 THEN 1 ELSE 0 END +
     CASE WHEN location_score > 0 THEN 1 ELSE 0 END +
     CASE WHEN common_groups_count > 0 THEN 1 ELSE 0 END +
     CASE WHEN interest_similarity > 0.1 THEN 1 ELSE 0 END) as signal_count
  FROM get_advanced_friend_suggestions('user-uuid', 20, 0)
)
SELECT 
  signal_count,
  COUNT(*) as suggestion_count
FROM suggestions
GROUP BY signal_count
ORDER BY signal_count DESC;
```

**Expected Distribution**:
- 0-1 signals: < 10% of suggestions
- 2-3 signals: 50-70% of suggestions
- 4-5 signals: 20-40% of suggestions

### 3. Exclusion Rules Test

Verify that ineligible users are properly filtered.

```sql
-- Test: Existing friends excluded
WITH user_friends AS (
  SELECT CASE 
    WHEN sender_id = 'user-uuid' THEN receiver_id
    ELSE sender_id
  END as friend_id
  FROM friend_requests
  WHERE (sender_id = 'user-uuid' OR receiver_id = 'user-uuid')
    AND status = 'accepted'
),
suggestions AS (
  SELECT user_id FROM get_advanced_friend_suggestions('user-uuid', 100, 0)
)
SELECT COUNT(*) as friend_in_suggestions
FROM suggestions s
INNER JOIN user_friends uf ON s.user_id = uf.friend_id;
```

**Expected**: 0 (no existing friends in suggestions)

```sql
-- Test: Hidden users excluded
WITH hidden AS (
  SELECT hidden_user_id FROM hidden_friend_suggestions
  WHERE user_id = 'user-uuid'
),
suggestions AS (
  SELECT user_id FROM get_advanced_friend_suggestions('user-uuid', 100, 0)
)
SELECT COUNT(*) as hidden_in_suggestions
FROM suggestions s
INNER JOIN hidden h ON s.user_id = h.hidden_user_id;
```

**Expected**: 0 (no hidden users in suggestions)

```sql
-- Test: Admin/moderators excluded
WITH admins AS (
  SELECT user_id FROM user_roles WHERE role IN ('admin', 'moderator')
),
suggestions AS (
  SELECT user_id FROM get_advanced_friend_suggestions('user-uuid', 100, 0)
)
SELECT COUNT(*) as admins_in_suggestions
FROM suggestions s
INNER JOIN admins a ON s.user_id = a.user_id;
```

**Expected**: 0 (no admins/moderators in suggestions)

### 4. Performance Benchmark

Measure latency across different scenarios.

```bash
#!/bin/bash
# Run multiple performance tests

echo "Testing default weights..."
time curl -X GET \
  'https://tohgxyzfrkzpujkviutj.supabase.co/functions/v1/friend-suggestions?limit=20&offset=0' \
  -H "Authorization: Bearer $USER_JWT_TOKEN" \
  -w "\nTime: %{time_total}s\n"

echo "\nTesting custom weights..."
time curl -X GET \
  'https://tohgxyzfrkzpujkviutj.supabase.co/functions/v1/friend-suggestions?limit=20&w_mutual_friends=0.5&w_interactions=0.3' \
  -H "Authorization: Bearer $USER_JWT_TOKEN" \
  -w "\nTime: %{time_total}s\n"

echo "\nTesting pagination (page 2)..."
time curl -X GET \
  'https://tohgxyzfrkzpujkviutj.supabase.co/functions/v1/friend-suggestions?limit=20&offset=20' \
  -H "Authorization: Bearer $USER_JWT_TOKEN" \
  -w "\nTime: %{time_total}s\n"
```

**Target Times**:
- First request: < 300ms
- Subsequent requests: < 200ms (cached)

### 5. Scoring Validation

Verify that scoring formula produces expected results.

```sql
-- Create test scenario
DO $$
DECLARE
  test_user UUID := 'test-user-uuid';
  candidate UUID := 'candidate-uuid';
  
  mutual_friends INT;
  interaction_score NUMERIC;
  location_score NUMERIC;
  common_groups INT;
  interest_sim NUMERIC;
  calculated_score NUMERIC;
  expected_score NUMERIC;
BEGIN
  -- Calculate each signal
  mutual_friends := get_mutual_friends_count(test_user, candidate);
  interaction_score := get_interaction_score(test_user, candidate);
  location_score := get_location_score(test_user, candidate);
  common_groups := get_common_groups_count(test_user, candidate);
  interest_sim := get_interest_similarity(test_user, candidate);
  
  -- Calculate expected score
  calculated_score := calculate_ranking_score(
    LEAST(mutual_friends::NUMERIC / 10.0, 1.0),
    interaction_score,
    location_score,
    LEAST(common_groups::NUMERIC / 5.0, 1.0),
    interest_sim,
    0.30, 0.20, 0.15, 0.15, 0.20
  );
  
  -- Get actual score from function
  SELECT final_score INTO expected_score
  FROM get_advanced_friend_suggestions(test_user, 100, 0)
  WHERE user_id = candidate;
  
  -- Compare (allow small floating point difference)
  IF ABS(calculated_score - expected_score) < 0.001 THEN
    RAISE NOTICE 'PASS: Scoring formula correct (calculated: %, actual: %)', 
      calculated_score, expected_score;
  ELSE
    RAISE WARNING 'FAIL: Scoring mismatch (calculated: %, actual: %)', 
      calculated_score, expected_score;
  END IF;
END $$;
```

## Sample Data Generator

Create test data to validate suggestion quality.

```sql
-- Generate sample users, friends, interactions
DO $$
DECLARE
  i INT;
  user_uuid UUID;
  friend_uuid UUID;
BEGIN
  -- Create 100 test users
  FOR i IN 1..100 LOOP
    INSERT INTO profiles (id, username, name, city, region, country)
    VALUES (
      gen_random_uuid(),
      'testuser' || i,
      'Test User ' || i,
      CASE (random() * 3)::INT
        WHEN 0 THEN 'San Francisco'
        WHEN 1 THEN 'New York'
        WHEN 2 THEN 'London'
        ELSE 'Paris'
      END,
      'CA',
      'USA'
    );
  END LOOP;
  
  RAISE NOTICE 'Created 100 test users';
  
  -- Create random friendships
  FOR i IN 1..200 LOOP
    SELECT id INTO user_uuid FROM profiles ORDER BY random() LIMIT 1;
    SELECT id INTO friend_uuid FROM profiles WHERE id != user_uuid ORDER BY random() LIMIT 1;
    
    INSERT INTO friend_requests (sender_id, receiver_id, status)
    VALUES (user_uuid, friend_uuid, 'accepted')
    ON CONFLICT DO NOTHING;
  END LOOP;
  
  RAISE NOTICE 'Created 200 friendships';
  
  -- Add interests
  FOR i IN 1..500 LOOP
    SELECT id INTO user_uuid FROM profiles ORDER BY random() LIMIT 1;
    
    INSERT INTO user_interests (user_id, interest, weight)
    VALUES (
      user_uuid,
      (ARRAY['technology', 'sports', 'music', 'art', 'travel', 'food', 'photography'])[floor(random() * 7 + 1)],
      random() * 1.5 + 0.5
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
  
  RAISE NOTICE 'Added 500 interests';
END $$;
```

## Manual Validation Checklist

Before deploying to production:

- [ ] **Signal Coverage**: All 5 signals appear in top 20 suggestions
- [ ] **Exclusions Work**: No friends, hidden users, or admins in results
- [ ] **Scores Reasonable**: Final scores between 0.05 and 1.0
- [ ] **Diversity Present**: At least 3 different primary signals in top 20
- [ ] **Latency Target**: P95 < 300ms under load
- [ ] **No Errors**: 0% error rate in k6 tests
- [ ] **Pagination Works**: Offset returns different results
- [ ] **Hide Feature**: Hidden users never reappear
- [ ] **Weight Adjustment**: Custom weights change ranking order
- [ ] **Empty States**: Graceful handling when no suggestions available

## Sample Validation

Run this query to get a sample of suggestions with full detail:

```sql
SELECT 
  username,
  name,
  mutual_friends_count as mutual,
  ROUND(interaction_score::NUMERIC, 2) as interact,
  ROUND(location_score::NUMERIC, 2) as location,
  common_groups_count as groups,
  ROUND(interest_similarity::NUMERIC, 2) as interests,
  ROUND(final_score::NUMERIC, 3) as final,
  suggestion_reasons as reasons
FROM get_advanced_friend_suggestions('YOUR_USER_UUID', 20, 0)
ORDER BY final_score DESC;
```

**Manual Review**:
1. Check if top 5 suggestions make sense intuitively
2. Verify that each suggestion has at least one strong signal
3. Confirm no obvious missing connections
4. Validate location/interest data matches profiles

## Acceptance Criteria Checklist

### Functional Requirements
- [x] Multi-signal scoring implemented (5 signals)
- [x] Endpoint returns paginated results
- [x] Hide/unhide functionality working
- [x] Excludes existing friends
- [x] Excludes admin/moderator accounts

### Performance Requirements
- [ ] P50 latency < 200ms
- [ ] P95 latency < 300ms
- [ ] Error rate < 1%
- [ ] Handles 50 concurrent users

### Quality Requirements
- [ ] Top 20 show signal diversity
- [ ] At least 3 different signal types in top 20
- [ ] No duplicate suggestions
- [ ] No self-suggestions

### Data Requirements
- [ ] User interests tracked
- [ ] Interactions logged
- [ ] Hidden suggestions persisted
- [ ] Location data present

## Monitoring in Production

### Key Metrics to Track

```sql
-- Suggestion quality over time
SELECT 
  DATE(created_at) as date,
  COUNT(DISTINCT user_id) as users_with_suggestions,
  AVG(final_score) as avg_quality_score,
  COUNT(*) as total_suggestions
FROM timeline_items
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

```sql
-- Hidden suggestion trends
SELECT 
  DATE(hidden_at) as date,
  COUNT(*) as hidden_count
FROM hidden_friend_suggestions
WHERE hidden_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(hidden_at)
ORDER BY date DESC;
```

```sql
-- Interaction tracking
SELECT 
  interaction_type,
  COUNT(*) as count,
  COUNT(DISTINCT user_id) as unique_users
FROM user_interactions
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY interaction_type
ORDER BY count DESC;
```

## Common Issues & Solutions

### Issue: All suggestions have low scores (< 0.2)

**Diagnosis**:
```sql
-- Check data availability
SELECT 
  (SELECT COUNT(*) FROM friend_requests WHERE status = 'accepted') as total_friendships,
  (SELECT COUNT(*) FROM user_interests) as total_interests,
  (SELECT COUNT(*) FROM group_members) as total_group_memberships,
  (SELECT COUNT(*) FROM user_interactions) as total_interactions;
```

**Solutions**:
1. Seed more initial data
2. Lower minimum score threshold from 0.05 to 0.01
3. Adjust weights to prioritize available signals

### Issue: Same suggestions for everyone

**Diagnosis**:
```sql
-- Check personalization
SELECT 
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) as total_suggestions,
  COUNT(*) / COUNT(DISTINCT user_id)::FLOAT as avg_per_user
FROM timeline_items;
```

**Solutions**:
1. Verify user affinity data exists
2. Track more interactions
3. Add more user interests
4. Increase interaction weight

### Issue: Performance degradation (> 500ms)

**Diagnosis**:
```sql
-- Check candidate pool size
EXPLAIN ANALYZE
SELECT * FROM get_advanced_friend_suggestions('user-uuid', 20, 0);
```

**Solutions**:
1. Reduce candidate limit from 500 to 200
2. Add indexes on slow joins
3. Cache suggestions for 5 minutes
4. Precompute mutual friends

## Production Readiness Checklist

Before going live:

- [ ] Run all test scenarios above
- [ ] Verify < 300ms P95 latency in staging
- [ ] Confirm signal diversity in results
- [ ] Test with 1000+ user database
- [ ] Load test with 100 concurrent users
- [ ] Verify hide/unhide works correctly
- [ ] Check RLS policies prevent unauthorized access
- [ ] Review Edge Function logs for errors
- [ ] Set up monitoring alerts
- [ ] Document weight tuning for your use case

## Success Metrics (Week 1)

Track these KPIs after deployment:

1. **Engagement Rate**: % of suggestions that lead to friend requests
   - Target: > 10%

2. **Hide Rate**: % of suggestions hidden by users
   - Target: < 20%

3. **Average Score**: Quality of suggestions shown
   - Target: > 0.35

4. **Signal Coverage**: % of suggestions with 2+ signals
   - Target: > 70%

5. **Latency**: Median response time
   - Target: < 200ms

```sql
-- Calculate Week 1 metrics
SELECT 
  COUNT(DISTINCT hs.user_id) as users_hiding,
  COUNT(hs.id) as total_hidden,
  (COUNT(hs.id)::FLOAT / (SELECT COUNT(*) FROM timeline_items) * 100) as hide_rate_pct
FROM hidden_friend_suggestions hs
WHERE hs.hidden_at > NOW() - INTERVAL '7 days';
```