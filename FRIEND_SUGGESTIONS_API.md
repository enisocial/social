# Friend Suggestions API - Multi-Signal Algorithm

## Overview

Advanced friend suggestion system using multiple signals:
- **Mutual Friends** (30% weight)
- **Recent Interactions** (20% weight)
- **Location Proximity** (15% weight)
- **Common Groups** (15% weight)
- **Interest Similarity** (20% weight)

## Endpoint

### GET `/functions/v1/friend-suggestions`

Returns personalized friend suggestions with comprehensive scoring.

**Authentication**: Required (Bearer token)

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 20 | Number of suggestions to return |
| `offset` | integer | 0 | Pagination offset |
| `w_mutual_friends` | float | 0.30 | Weight for mutual friends signal |
| `w_interactions` | float | 0.20 | Weight for interaction history |
| `w_location` | float | 0.15 | Weight for location proximity |
| `w_common_groups` | float | 0.15 | Weight for common groups |
| `w_interests` | float | 0.20 | Weight for interest similarity |

**Example Request**:
```bash
curl -X GET 'https://tohgxyzfrkzpujkviutj.supabase.co/functions/v1/friend-suggestions?limit=20&offset=0' \
  -H "Authorization: Bearer YOUR_USER_JWT_TOKEN"
```

**Response Schema**:
```typescript
interface FriendSuggestionsResponse {
  success: boolean;
  suggestions: Array<{
    id: string;
    username: string;
    name: string;
    avatar_url: string | null;
    bio: string | null;
    location: {
      city: string | null;
      region: string | null;
      country: string | null;
    };
    scores: {
      mutual_friends: number;      // Count of mutual friends
      interaction: number;          // 0-1 normalized interaction score
      location: number;             // 0-1 location proximity score
      common_groups: number;        // Count of common groups
      interest_similarity: number;  // 0-1 Jaccard similarity
      final: number;                // 0-1 final weighted score
    };
    reasons: {
      mutual_friends: boolean;
      recent_interactions: boolean;
      same_location: boolean;
      common_groups: boolean;
      shared_interests: boolean;
    };
  }>;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
    nextOffset: number | null;
  };
  weights: {
    mutual_friends: number;
    interactions: number;
    location: number;
    common_groups: number;
    interests: number;
  };
}
```

**Example Response**:
```json
{
  "success": true,
  "suggestions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "johndoe",
      "name": "John Doe",
      "avatar_url": "https://...",
      "bio": "Software engineer passionate about AI",
      "location": {
        "city": "San Francisco",
        "region": "California",
        "country": "USA"
      },
      "scores": {
        "mutual_friends": 5,
        "interaction": 0.72,
        "location": 1.0,
        "common_groups": 2,
        "interest_similarity": 0.45,
        "final": 0.68
      },
      "reasons": {
        "mutual_friends": true,
        "recent_interactions": true,
        "same_location": true,
        "common_groups": true,
        "shared_interests": true
      }
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "hasMore": true,
    "nextOffset": 20
  },
  "weights": {
    "mutual_friends": 0.30,
    "interactions": 0.20,
    "location": 0.15,
    "common_groups": 0.15,
    "interests": 0.20
  }
}
```

## Scoring Algorithm

### Final Score Calculation

```
final_score = 
  w1 * normalize(mutual_friends / 10) +
  w2 * sigmoid(interaction_score) +
  w3 * location_score +
  w4 * normalize(common_groups / 5) +
  w5 * jaccard_similarity(interests)

where:
  w1 = weight for mutual friends (default: 0.30)
  w2 = weight for interactions (default: 0.20)
  w3 = weight for location (default: 0.15)
  w4 = weight for common groups (default: 0.15)
  w5 = weight for interests (default: 0.20)
```

### Signal Descriptions

#### 1. Mutual Friends (0-1 normalized)
- Counts friends in common
- Normalized by dividing by 10 (capped at 1.0)
- Higher mutual friend count = stronger connection

#### 2. Interaction Score (0-1 sigmoid)
- Recent interactions (last 30 days) with time decay
- Weighted by interaction type:
  - Profile view: 1.0
  - Post view: 0.5
  - Post like: 2.0
  - Post comment: 3.0
  - Message: 5.0
- Exponential decay over 7 days
- Normalized using sigmoid function

#### 3. Location Score (0-1 discrete)
- Same city: 1.0
- Same region: 0.6
- Same country: 0.3
- Different country: 0.0

#### 4. Common Groups (0-1 normalized)
- Counts groups in common
- Normalized by dividing by 5 (capped at 1.0)
- Indicates shared community interests

#### 5. Interest Similarity (0-1 Jaccard)
- Jaccard similarity index: `|A ∩ B| / |A ∪ B|`
- Measures overlap in user interests
- 1.0 = identical interests, 0.0 = no overlap

## Filtering Rules

Suggestions **exclude**:
- Current user
- Existing friends (accepted or pending)
- Hidden suggestions (user-blocked)
- Admin/moderator accounts
- Inactive accounts

Suggestions **require** at least one positive signal:
- Mutual friends > 0
- Interaction score > 0.1
- Location score > 0
- Common groups > 0
- Interest similarity > 0

## React Hook Usage

```typescript
import { useAdvancedFriendSuggestions } from '@/hooks/useAdvancedFriendSuggestions';

function FriendSuggestionsPage() {
  const {
    suggestions,
    isLoading,
    fetchNextPage,
    hasNextPage,
    hideSuggestion,
    trackInteraction,
  } = useAdvancedFriendSuggestions();

  const handleViewProfile = (userId: string) => {
    trackInteraction(userId, 'profile_view');
  };

  const handleHide = (userId: string) => {
    hideSuggestion(userId);
  };

  return (
    <div>
      {suggestions.map(suggestion => (
        <div key={suggestion.id}>
          <h3>{suggestion.name}</h3>
          <p>Score: {suggestion.scores.final.toFixed(2)}</p>
          <button onClick={() => handleViewProfile(suggestion.id)}>
            View Profile
          </button>
          <button onClick={() => handleHide(suggestion.id)}>
            Hide
          </button>
        </div>
      ))}
      {hasNextPage && (
        <button onClick={() => fetchNextPage()}>Load More</button>
      )}
    </div>
  );
}
```

## Hide/Unhide Suggestions

### Hide a Suggestion

Prevents a user from appearing in future suggestions.

```typescript
const { hideSuggestion } = useAdvancedFriendSuggestions();

// Hide forever
hideSuggestion(userId);
```

**Database Operation**:
```sql
INSERT INTO hidden_friend_suggestions (user_id, hidden_user_id)
VALUES (current_user_id, target_user_id);
```

### Unhide a Suggestion

Removes a user from the hidden list.

```typescript
const { unhideSuggestion } = useAdvancedFriendSuggestions();

unhideSuggestion(userId);
```

**Database Operation**:
```sql
DELETE FROM hidden_friend_suggestions
WHERE user_id = current_user_id
  AND hidden_user_id = target_user_id;
```

## Track Interactions

Improve future suggestions by tracking user interactions.

```typescript
const { trackInteraction } = useAdvancedFriendSuggestions();

// Track profile view
trackInteraction(userId, 'profile_view');

// Track post interaction
trackInteraction(userId, 'post_like');
trackInteraction(userId, 'post_comment');

// Track messaging
trackInteraction(userId, 'message');
```

**Interaction Types**:
- `profile_view`: User viewed suggestion's profile
- `post_view`: User viewed suggestion's post
- `post_like`: User liked suggestion's post
- `post_comment`: User commented on suggestion's post
- `message`: User messaged suggestion

## Manage User Interests

Update user interests to improve similarity matching.

```typescript
const { updateInterest } = useAdvancedFriendSuggestions();

// Add/update interest
updateInterest({ 
  interest: 'machine-learning', 
  weight: 1.5 
});

updateInterest({ 
  interest: 'photography', 
  weight: 1.0 
});
```

**Interest Format**:
- Use lowercase, hyphenated strings
- Examples: `machine-learning`, `web-development`, `photography`, `cooking`
- Weight: 0.1-2.0 (1.0 = normal importance)

## Performance

### Target Metrics
- **Latency**: < 300ms P95
- **Accuracy**: Relevant suggestions in top 20
- **Diversity**: Multiple signal types in results

### Optimization Strategies

1. **Limit Candidate Pool**: Pre-filter to 500 candidates
2. **Index Usage**: Optimized indexes on key lookup fields
3. **Early Filtering**: Exclude non-eligible users before scoring
4. **Batch Processing**: Efficient CTE-based query structure

### Indexes Created
```sql
-- User interests
CREATE INDEX idx_user_interests_user ON user_interests(user_id);
CREATE INDEX idx_user_interests_interest ON user_interests(interest);

-- User interactions
CREATE INDEX idx_user_interactions_user ON user_interactions(user_id, created_at DESC);
CREATE INDEX idx_user_interactions_target ON user_interactions(target_user_id, created_at DESC);
CREATE INDEX idx_user_interactions_type ON user_interactions(user_id, interaction_type, created_at DESC);

-- Hidden suggestions
CREATE INDEX idx_hidden_suggestions_user_hidden ON hidden_friend_suggestions(user_id, hidden_user_id);
```

## Weight Tuning

### Default Configuration (Balanced)
```json
{
  "w_mutual_friends": 0.30,
  "w_interactions": 0.20,
  "w_location": 0.15,
  "w_common_groups": 0.15,
  "w_interests": 0.20
}
```

### Social Network Focus
Prioritize existing social connections:
```json
{
  "w_mutual_friends": 0.45,
  "w_interactions": 0.10,
  "w_location": 0.10,
  "w_common_groups": 0.25,
  "w_interests": 0.10
}
```

### Interest-Based Discovery
Find people with similar interests:
```json
{
  "w_mutual_friends": 0.15,
  "w_interactions": 0.15,
  "w_location": 0.10,
  "w_common_groups": 0.20,
  "w_interests": 0.40
}
```

### Local Community
Connect with nearby users:
```json
{
  "w_mutual_friends": 0.20,
  "w_interactions": 0.15,
  "w_location": 0.40,
  "w_common_groups": 0.15,
  "w_interests": 0.10
}
```

## Testing

### Manual Testing Queries

**Check suggestion quality**:
```sql
SELECT 
  username,
  name,
  mutual_friends_count,
  interaction_score,
  location_score,
  common_groups_count,
  interest_similarity,
  final_score
FROM get_advanced_friend_suggestions('user-uuid', 20, 0)
ORDER BY final_score DESC;
```

**Verify signal diversity**:
```sql
SELECT 
  CASE 
    WHEN mutual_friends_count > 0 THEN 'mutual_friends'
    WHEN interaction_score > 0.1 THEN 'interactions'
    WHEN location_score > 0 THEN 'location'
    WHEN common_groups_count > 0 THEN 'common_groups'
    WHEN interest_similarity > 0.1 THEN 'interests'
  END as primary_signal,
  COUNT(*) as suggestion_count
FROM get_advanced_friend_suggestions('user-uuid', 100, 0)
GROUP BY primary_signal
ORDER BY suggestion_count DESC;
```

**Check hidden suggestions**:
```sql
SELECT COUNT(*) as hidden_count
FROM hidden_friend_suggestions
WHERE user_id = 'user-uuid';
```

### Load Testing

Test endpoint latency:
```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Run 100 requests with 10 concurrent
ab -n 100 -c 10 -H "Authorization: Bearer YOUR_TOKEN" \
  "https://tohgxyzfrkzpujkviutj.supabase.co/functions/v1/friend-suggestions?limit=20"
```

Expected results:
- 95% of requests < 300ms
- 99% of requests < 500ms
- 0% error rate

## Troubleshooting

### No Suggestions Returned

**Possible Causes**:
1. User has no eligible candidates (all friends or hidden)
2. No positive signals for any candidate
3. Score threshold too high (minimum: 0.05)

**Solution**:
```sql
-- Check eligible candidates
SELECT COUNT(*) FROM profiles p
WHERE p.id != 'user-uuid'
  AND p.id NOT IN (
    SELECT CASE WHEN sender_id = 'user-uuid' THEN receiver_id ELSE sender_id END
    FROM friend_requests
    WHERE (sender_id = 'user-uuid' OR receiver_id = 'user-uuid')
      AND status IN ('accepted', 'pending')
  );
```

### Low-Quality Suggestions

**Indicators**:
- Final scores all < 0.2
- No diversity in signal types
- Suggestions don't match user preferences

**Solutions**:
1. Add more user interests
2. Track more interactions
3. Adjust weights to prioritize valuable signals
4. Check if user has sufficient data (friends, groups, interests)

### Slow Performance (> 500ms)

**Diagnosis**:
```sql
EXPLAIN ANALYZE
SELECT * FROM get_advanced_friend_suggestions('user-uuid', 20, 0);
```

**Common Issues**:
- Missing indexes → Verify index creation
- Large candidate pool → Reduce from 500 to 200
- Complex scoring functions → Consider caching

**Solutions**:
- Precompute mutual friends in materialized view
- Cache suggestion results with 5-minute TTL
- Batch-compute suggestions for active users

## Related Functions

### Get Hidden Suggestions
```sql
SELECT * FROM hidden_friend_suggestions
WHERE user_id = 'user-uuid';
```

### Get User Interests
```sql
SELECT * FROM user_interests
WHERE user_id = 'user-uuid'
ORDER BY weight DESC;
```

### Get Recent Interactions
```sql
SELECT * FROM user_interactions
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC
LIMIT 100;
```

## Migration & Setup

All database migrations are automatically applied. No manual setup required.

Tables created:
- `user_interests` - User interest tags
- `user_interactions` - Interaction tracking
- `hidden_friend_suggestions` - Hidden users (pre-existing)

Functions created:
- `get_mutual_friends_count()`
- `get_interaction_score()`
- `get_location_score()`
- `get_common_groups_count()`
- `get_interest_similarity()`
- `get_advanced_friend_suggestions()`

## Support

For issues or questions:
1. Check Edge Function logs in backend dashboard
2. Verify database indexes are present
3. Test RPC function directly via SQL
4. Review user's data quality (friends, interactions, interests)
5. Adjust weights based on user feedback