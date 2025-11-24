/**
 * K6 Load Test for Feed Performance
 * 
 * Tests the personalized timeline feed endpoint to ensure:
 * - P50 latency < 200ms
 * - P95 latency < 500ms
 * - No errors under load
 * 
 * Usage:
 * k6 run --env SUPABASE_URL=https://your-project.supabase.co \
 *        --env SUPABASE_ANON_KEY=your-anon-key \
 *        --env TEST_USER_ID=user-uuid \
 *        k6-tests/feed-performance-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const feedLoadTime = new Trend('feed_load_time');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 50 },   // Ramp up to 50 users
    { duration: '2m', target: 100 },  // Maintain 100 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(50)<200', 'p(95)<500', 'p(99)<1000'],
    errors: ['rate<0.05'], // Less than 5% errors
    'feed_load_time': ['p(50)<200', 'p(95)<500'],
  },
};

// Environment variables
const SUPABASE_URL = __ENV.SUPABASE_URL || 'https://tohgxyzfrkzpujkviutj.supabase.co';
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaGd4eXpmcmt6cHVqa3ZpdXRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0MzcyMTUsImV4cCI6MjA3OTAxMzIxNX0.P-hfFLSNjXJaPRP338NBY7nn53JoCYiaZ_LG50xWs0Q';
const TEST_USER_ID = __ENV.TEST_USER_ID;

const BASE_URL = `${SUPABASE_URL}/rest/v1`;

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  };

  // Test 1: Get personalized timeline
  const timelinePayload = JSON.stringify({
    p_user_id: TEST_USER_ID,
    p_limit: 20,
    p_offset: 0,
  });

  const timelineStart = Date.now();
  const timelineRes = http.post(
    `${BASE_URL}/rpc/get_personalized_timeline`,
    timelinePayload,
    { headers }
  );
  const timelineDuration = Date.now() - timelineStart;

  // Record metrics
  feedLoadTime.add(timelineDuration);
  errorRate.add(timelineRes.status !== 200);

  // Verify response
  const timelineChecks = check(timelineRes, {
    'timeline status is 200': (r) => r.status === 200,
    'timeline response time < 200ms': (r) => r.timings.duration < 200,
    'timeline response time < 500ms': (r) => r.timings.duration < 500,
    'timeline has posts': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body) && body.length > 0;
      } catch (e) {
        return false;
      }
    },
  });

  if (!timelineChecks) {
    console.error(`Timeline request failed: ${timelineRes.status} - ${timelineRes.body}`);
  }

  // Test 2: Check timeline items exist
  const itemsRes = http.get(
    `${BASE_URL}/timeline_items?user_id=eq.${TEST_USER_ID}&select=*&limit=20&order=ranking_score.desc`,
    { headers }
  );

  check(itemsRes, {
    'timeline_items status is 200': (r) => r.status === 200,
    'timeline_items has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body) && body.length > 0;
      } catch (e) {
        return false;
      }
    },
  });

  // Simulate user behavior
  sleep(Math.random() * 2 + 1); // Random 1-3 second delay
}

export function handleSummary(data) {
  return {
    'feed-performance-results.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  let output = '\n';
  
  output += `${indent}Feed Performance Test Summary\n`;
  output += `${indent}${'='.repeat(50)}\n\n`;
  
  // HTTP metrics
  const httpMetrics = data.metrics.http_req_duration;
  if (httpMetrics) {
    output += `${indent}HTTP Request Duration:\n`;
    output += `${indent}  P50: ${httpMetrics.values.p50.toFixed(2)}ms\n`;
    output += `${indent}  P95: ${httpMetrics.values.p95.toFixed(2)}ms\n`;
    output += `${indent}  P99: ${httpMetrics.values.p99.toFixed(2)}ms\n`;
    output += `${indent}  Avg: ${httpMetrics.values.avg.toFixed(2)}ms\n\n`;
  }
  
  // Custom metrics
  const feedLoadMetric = data.metrics.feed_load_time;
  if (feedLoadMetric) {
    output += `${indent}Feed Load Time:\n`;
    output += `${indent}  P50: ${feedLoadMetric.values.p50.toFixed(2)}ms\n`;
    output += `${indent}  P95: ${feedLoadMetric.values.p95.toFixed(2)}ms\n`;
    output += `${indent}  P99: ${feedLoadMetric.values.p99.toFixed(2)}ms\n\n`;
  }
  
  // Error rate
  const errorMetric = data.metrics.errors;
  if (errorMetric) {
    output += `${indent}Error Rate: ${(errorMetric.values.rate * 100).toFixed(2)}%\n\n`;
  }
  
  // Checks
  const checks = data.metrics.checks;
  if (checks) {
    const passRate = (checks.values.passes / (checks.values.passes + checks.values.fails) * 100).toFixed(2);
    output += `${indent}Checks Passed: ${passRate}%\n`;
    output += `${indent}  Passed: ${checks.values.passes}\n`;
    output += `${indent}  Failed: ${checks.values.fails}\n\n`;
  }
  
  // Threshold results
  output += `${indent}Thresholds:\n`;
  for (const [name, threshold] of Object.entries(data.thresholds || {})) {
    const status = threshold.ok ? '✓ PASS' : '✗ FAIL';
    output += `${indent}  ${status} - ${name}\n`;
  }
  
  return output;
}