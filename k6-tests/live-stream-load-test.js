import { check } from 'k6';
import ws from 'k6/ws';
import { Counter, Trend } from 'k6/metrics';

// Custom metrics
const chatLatency = new Trend('chat_latency_ms');
const giftLatency = new Trend('gift_latency_ms');
const connectionErrors = new Counter('connection_errors');
const messagesReceived = new Counter('messages_received');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 100 },   // Ramp up to 100 viewers
    { duration: '2m', target: 1000 },   // Scale to 1k viewers
    { duration: '3m', target: 1000 },   // Hold at 1k
    { duration: '1m', target: 5000 },   // Spike to 5k
    { duration: '2m', target: 5000 },   // Hold at 5k
    { duration: '1m', target: 0 },      // Ramp down
  ],
  thresholds: {
    'chat_latency_ms': ['p(50)<300', 'p(95)<1000'],  // P50 < 300ms, P95 < 1s
    'gift_latency_ms': ['p(50)<500', 'p(95)<1500'],  // P50 < 500ms
    'connection_errors': ['count<10'],               // Less than 10 errors
  },
};

const SUPABASE_URL = __ENV.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_KEY = __ENV.SUPABASE_KEY;
const STREAM_ID = __ENV.STREAM_ID || 'test-stream-id';

export default function () {
  const url = `${SUPABASE_URL}/realtime/v1/websocket?apikey=${SUPABASE_KEY}&vsn=1.0.0`;
  
  const params = {
    tags: { name: 'LiveStreamViewer' },
  };

  ws.connect(url, params, function (socket) {
    socket.on('open', () => {
      console.log('WebSocket connected');

      // Subscribe to stream channel
      socket.send(JSON.stringify({
        topic: `stream:${STREAM_ID}`,
        event: 'phx_join',
        payload: {},
        ref: '1',
      }));

      // Simulate viewer sending chat message
      const chatStart = Date.now();
      socket.send(JSON.stringify({
        topic: `stream:${STREAM_ID}`,
        event: 'chat-message',
        payload: { message: `Hello from VU ${__VU}` },
        ref: '2',
      }));

      // Simulate sending a gift (10% of viewers)
      if (Math.random() < 0.1) {
        const giftStart = Date.now();
        socket.send(JSON.stringify({
          topic: `stream:${STREAM_ID}`,
          event: 'gift',
          payload: { giftTypeId: 'rose', quantity: 1 },
          ref: '3',
        }));
      }
    });

    socket.on('message', (data) => {
      const msg = JSON.parse(data);
      messagesReceived.add(1);

      if (msg.event === 'chat-message') {
        const latency = Date.now() - new Date(msg.payload.timestamp).getTime();
        chatLatency.add(latency);
      }

      if (msg.event === 'gift') {
        const latency = Date.now() - new Date(msg.payload.timestamp).getTime();
        giftLatency.add(latency);
      }
    });

    socket.on('error', (e) => {
      console.error('WebSocket error:', e);
      connectionErrors.add(1);
    });

    socket.on('close', () => {
      console.log('WebSocket closed');
    });

    // Keep connection alive for duration of stage
    socket.setTimeout(() => {
      socket.close();
    }, 180000); // 3 minutes
  });
}

export function handleSummary(data) {
  return {
    'summary.json': JSON.stringify(data, null, 2),
    stdout: `
Live Stream Load Test Summary
==============================
Total VUs: ${data.metrics.vus_max.values.max}
Chat Messages Received: ${data.metrics.messages_received.values.count}
Connection Errors: ${data.metrics.connection_errors.values.count}

Chat Latency:
  - P50: ${data.metrics.chat_latency_ms.values['p(50)']}ms
  - P95: ${data.metrics.chat_latency_ms.values['p(95)']}ms
  - P99: ${data.metrics.chat_latency_ms.values['p(99)']}ms

Gift Latency:
  - P50: ${data.metrics.gift_latency_ms?.values['p(50)'] || 'N/A'}ms
  - P95: ${data.metrics.gift_latency_ms?.values['p(95)'] || 'N/A'}ms
  - P99: ${data.metrics.gift_latency_ms?.values['p(99)'] || 'N/A'}ms

Status: ${
  data.metrics.chat_latency_ms.values['p(50)'] < 300 &&
  data.metrics.connection_errors.values.count < 10
    ? '✅ PASSED'
    : '❌ FAILED'
}
    `,
  };
}
