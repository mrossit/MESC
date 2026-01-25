/**
 * API Load Test for MESC PWA
 *
 * This script tests API endpoints under load using k6.
 * Run with: k6 run test/load/api-load.test.js
 *
 * Or use the Node.js runner: npm run test:load
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiDuration = new Trend('api_duration');

// Test configuration
export const options = {
  scenarios: {
    // Scenario 1: Constant load test
    constant_load: {
      executor: 'constant-vus',
      vus: 20,
      duration: '2m',
      gracefulStop: '30s',
    },
    // Scenario 2: Ramping load test
    ramping_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 30 },
        { duration: '30s', target: 50 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '30s',
      startTime: '2m30s', // Start after constant_load
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% of requests should be below 1s
    http_req_failed: ['rate<0.05'],     // Error rate should be below 5%
    errors: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

// Simulated session token (in real tests, get from login)
let sessionToken = null;

// Setup function - runs once before tests
export function setup() {
  console.log(`Starting load test against ${BASE_URL}`);

  // Test health endpoint
  const healthRes = http.get(`${BASE_URL}/api/health`);
  if (healthRes.status !== 200) {
    console.error('Health check failed! Server may be down.');
  }

  return { baseUrl: BASE_URL };
}

// Main test function - runs for each virtual user
export default function (data) {
  const baseUrl = data.baseUrl;

  // Group 1: Public endpoints (no auth required)
  group('Public Endpoints', function () {
    // Health check
    let res = http.get(`${baseUrl}/api/health`);
    check(res, {
      'health status 200': (r) => r.status === 200,
      'health response time OK': (r) => r.timings.duration < 200,
    });
    apiDuration.add(res.timings.duration);
    errorRate.add(res.status !== 200);

    // Manifest (PWA)
    res = http.get(`${baseUrl}/manifest.json`);
    check(res, {
      'manifest status 200': (r) => r.status === 200,
    });

    // Version check
    res = http.get(`${baseUrl}/version.json`);
    check(res, {
      'version accessible': (r) => r.status === 200 || r.status === 404,
    });

    sleep(0.5);
  });

  // Group 2: Static assets (PWA resources)
  group('Static Assets', function () {
    const assets = [
      '/images/icon-192.png',
      '/images/icon-512.png',
    ];

    assets.forEach((asset) => {
      const res = http.get(`${baseUrl}${asset}`);
      check(res, {
        [`${asset} accessible`]: (r) => r.status === 200 || r.status === 304,
      });
    });

    sleep(0.3);
  });

  // Group 3: API endpoints (simulating authenticated user)
  group('API Endpoints', function () {
    const headers = {
      'Content-Type': 'application/json',
      // In real test, add: 'Cookie': `session_token=${sessionToken}`
    };

    // These will return 401 without auth, but we're testing server capacity
    const endpoints = [
      '/api/schedules',
      '/api/questionnaires',
      '/api/notifications',
      '/api/mass-times',
    ];

    endpoints.forEach((endpoint) => {
      const res = http.get(`${baseUrl}${endpoint}`, { headers });
      apiDuration.add(res.timings.duration);

      check(res, {
        [`${endpoint} responds`]: (r) => r.status < 500,
        [`${endpoint} fast enough`]: (r) => r.timings.duration < 1000,
      });

      errorRate.add(res.status >= 500);
    });

    sleep(1);
  });

  // Group 4: Heavy endpoints (reports)
  group('Report Endpoints', function () {
    const reportEndpoints = [
      '/api/reports/summary',
      '/api/reports/availability',
    ];

    reportEndpoints.forEach((endpoint) => {
      const res = http.get(`${baseUrl}${endpoint}`);
      apiDuration.add(res.timings.duration);

      check(res, {
        [`${endpoint} responds`]: (r) => r.status < 500,
        // Reports can be slower
        [`${endpoint} acceptable time`]: (r) => r.timings.duration < 3000,
      });

      errorRate.add(res.status >= 500);
    });

    sleep(0.5);
  });

  // Random sleep to simulate real user behavior
  sleep(Math.random() * 2 + 1);
}

// Teardown function - runs once after all tests
export function teardown(data) {
  console.log('Load test completed');
}
