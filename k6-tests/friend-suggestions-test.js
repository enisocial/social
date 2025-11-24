/**
 * K6 Load Test for Friend Suggestions Endpoint
 * 
 * Tests the multi-signal friend suggestions to ensure:
 * - P50 latency < 200ms
 * - P95 latency < 300ms
 * - Returns diverse suggestions with multiple signals
 * - No errors under load
 * 
 * Usage:
 * k6 run --env SUPABASE_URL=https://your-project.supabase.co \
 *        --env USER_JWT_TOKEN=your-user-token \
 *        k6-tests/friend-suggestions-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const suggestionLoadTime = new Trend('suggestion_load_time');
const suggestionsReturned = new Counter('suggestions_returned');
const diversityScore = new Trend('signal_diversity');

// Test configuration
export const options = {
  stages: [
    { duration: '20s', target: 10 },  // Warm up
    { duration: '1m', target: 30 },   // Ramp to 30 users
    { duration: '2m', target: 50 },   // Peak load
    { duration: '20s', target: 0 },   // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(50)<200', 'p(95)<300', 'p(99)<500'],
    errors: ['rate<0.01'], // Less than 1% errors
    'suggestion_load_time': ['p(50)<200', 'p(95)<300'],
  },
};

const SUPABASE_URL = __ENV.SUPABASE_URL || 'https://tohgxyzfrkzpujkviutj.supabase.co';
const USER_JWT_TOKEN = __ENV.USER_JWT_TOKEN;

if (!USER_JWT_TOKEN) {
  throw new Error('USER_JWT_TOKEN environment variable is required');
}

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/friend-suggestions`;

export default function () {
  const headers = {
    'Authorization': `Bearer ${USER_JWT_TOKEN}`,
    'Content-Type': 'application/json',
  };

  // Test 1: Default suggestions
  const params = new URLSearchParams({
    limit: '20',
    offset: '0',
  });

  const startTime = Date.now();
  const res = http.get(`${FUNCTION_URL}?${params}`, { headers });
  const duration = Date.now() - startTime;

  suggestionLoadTime.add(duration);
  errorRate.add(res.status !== 200);

  const checks = check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
    'response time < 300ms': (r) => r.timings.duration < 300,
    'has suggestions': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success && Array.isArray(body.suggestions);
      } catch (e) {
        return false;
      }
    },
  });

  if (res.status === 200) {
    try {
      const body = JSON.parse(res.body);
      const suggestions = body.suggestions || [];
      
      suggestionsReturned.add(suggestions.length);

      // Check signal diversity
      if (suggestions.length > 0) {
        const signalTypes = new Set();
        suggestions.forEach(s => {
          if (s.reasons.mutual_friends) signalTypes.add('mutual_friends');
          if (s.reasons.recent_interactions) signalTypes.add('interactions');
          if (s.reasons.same_location) signalTypes.add('location');
          if (s.reasons.common_groups) signalTypes.add('common_groups');
          if (s.reasons.shared_interests) signalTypes.add('interests');
        });
        
        diversityScore.add(signalTypes.size);

        // Verify data quality
        check(suggestions[0], {
          'has user_id': (s) => !!s.id,
          'has username': (s) => !!s.username,
          'has name': (s) => !!s.name,
          'has scores': (s) => !!s.scores && typeof s.scores.final === 'number',
          'has reasons': (s) => !!s.reasons,
          'final_score in range': (s) => s.scores.final >= 0 && s.scores.final <= 1,
        });
      }
    } catch (e) {
      console.error('Failed to parse response:', e);
    }
  } else {
    console.error(`Request failed: ${res.status} - ${res.body}`);
  }

  // Test 2: Custom weights (10% of requests)
  if (Math.random() < 0.1) {
    const customParams = new URLSearchParams({
      limit: '20',
      offset: '0',
      w_mutual_friends: '0.40',
      w_interactions: '0.30',
      w_location: '0.10',
      w_common_groups: '0.10',
      w_interests: '0.10',
    });

    const customRes = http.get(`${FUNCTION_URL}?${customParams}`, { headers });
    
    check(customRes, {
      'custom weights: status is 200': (r) => r.status === 200,
      'custom weights: has suggestions': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success;
        } catch (e) {
          return false;
        }
      },
    });
  }

  // Test 3: Pagination (5% of requests)
  if (Math.random() < 0.05) {
    const paginationParams = new URLSearchParams({
      limit: '10',
      offset: '10',
    });

    const paginatedRes = http.get(`${FUNCTION_URL}?${paginationParams}`, { headers });
    
    check(paginatedRes, {
      'pagination: status is 200': (r) => r.status === 200,
      'pagination: returns correct limit': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.suggestions.length <= 10;
        } catch (e) {
          return false;
        }
      },
    });
  }

  sleep(Math.random() * 1.5 + 0.5); // Random 0.5-2s delay
}

export function handleSummary(data) {
  const summary = {
    test_name: 'Friend Suggestions Load Test',
    timestamp: new Date().toISOString(),
    duration: data.state.testRunDurationMs / 1000,
    metrics: {
      http_reqs: data.metrics.http_reqs?.values.count || 0,
      http_req_duration_p50: data.metrics.http_req_duration?.values.p50 || 0,
      http_req_duration_p95: data.metrics.http_req_duration?.values.p95 || 0,
      http_req_duration_p99: data.metrics.http_req_duration?.values.p99 || 0,
      error_rate: data.metrics.errors?.values.rate || 0,
      suggestions_returned: data.metrics.suggestions_returned?.values.count || 0,
      avg_diversity: data.metrics.signal_diversity?.values.avg || 0,
    },
    thresholds_passed: Object.entries(data.thresholds || {}).every(([_, v]) => v.ok),
  };

  console.log('\n' + '='.repeat(60));
  console.log('Friend Suggestions Load Test Results');
  console.log('='.repeat(60));
  console.log(`Total Requests: ${summary.metrics.http_reqs}`);
  console.log(`P50 Latency: ${summary.metrics.http_req_duration_p50.toFixed(2)}ms`);
  console.log(`P95 Latency: ${summary.metrics.http_req_duration_p95.toFixed(2)}ms`);
  console.log(`P99 Latency: ${summary.metrics.http_req_duration_p99.toFixed(2)}ms`);
  console.log(`Error Rate: ${(summary.metrics.error_rate * 100).toFixed(2)}%`);
  console.log(`Suggestions Returned: ${summary.metrics.suggestions_returned}`);
  console.log(`Avg Signal Diversity: ${summary.metrics.avg_diversity.toFixed(1)} signals/suggestion`);
  console.log(`All Thresholds Passed: ${summary.thresholds_passed ? '✓ YES' : '✗ NO'}`);
  console.log('='.repeat(60) + '\n');

  return {
    'friend-suggestions-results.json': JSON.stringify(summary, null, 2),
    stdout: '', // Empty to avoid duplicate console output
  };
}