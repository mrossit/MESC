/**
 * Load Test Configuration for MESC PWA
 *
 * This configuration defines test scenarios for load testing the application.
 * Tests can be run with k6 or with the Node.js-based runner.
 */

export const config = {
  // Base URL for testing
  baseUrl: process.env.LOAD_TEST_URL || 'http://localhost:5000',

  // Test scenarios
  scenarios: {
    // Smoke test - minimal load to verify system works
    smoke: {
      vus: 1,           // Virtual users
      duration: '30s',
      thresholds: {
        http_req_duration: ['p(95)<500'],  // 95% of requests under 500ms
        http_req_failed: ['rate<0.01']      // Less than 1% failure rate
      }
    },

    // Average load - typical usage pattern
    average: {
      vus: 20,          // 20 concurrent users (typical for ~100 ministers)
      duration: '2m',
      thresholds: {
        http_req_duration: ['p(95)<1000'],
        http_req_failed: ['rate<0.05']
      }
    },

    // Stress test - peak load (all ministers at once)
    stress: {
      stages: [
        { duration: '30s', target: 10 },   // Ramp up
        { duration: '1m', target: 50 },    // Stay at 50 users
        { duration: '30s', target: 100 },  // Peak load
        { duration: '1m', target: 100 },   // Sustain peak
        { duration: '30s', target: 0 }     // Ramp down
      ],
      thresholds: {
        http_req_duration: ['p(95)<2000'],
        http_req_failed: ['rate<0.10']
      }
    },

    // Spike test - sudden burst of traffic
    spike: {
      stages: [
        { duration: '10s', target: 5 },
        { duration: '5s', target: 100 },   // Sudden spike
        { duration: '30s', target: 100 },
        { duration: '5s', target: 5 },     // Sudden drop
        { duration: '10s', target: 0 }
      ],
      thresholds: {
        http_req_duration: ['p(95)<3000'],
        http_req_failed: ['rate<0.15']
      }
    }
  },

  // API endpoints to test
  endpoints: {
    // Public endpoints (no auth)
    public: [
      { method: 'GET', path: '/api/health', weight: 10 },
      { method: 'GET', path: '/manifest.json', weight: 5 },
      { method: 'GET', path: '/version.json', weight: 5 }
    ],

    // Authenticated endpoints
    authenticated: [
      { method: 'GET', path: '/api/auth/user', weight: 20 },
      { method: 'GET', path: '/api/users', weight: 15 },
      { method: 'GET', path: '/api/schedules', weight: 25 },
      { method: 'GET', path: '/api/questionnaires', weight: 15 },
      { method: 'GET', path: '/api/notifications', weight: 20 },
      { method: 'GET', path: '/api/substitutions', weight: 10 },
      { method: 'GET', path: '/api/mass-times', weight: 10 }
    ],

    // Heavy endpoints (reports, analytics)
    heavy: [
      { method: 'GET', path: '/api/reports/summary', weight: 10 },
      { method: 'GET', path: '/api/reports/availability', weight: 10 },
      { method: 'GET', path: '/api/reports/trends', weight: 5 },
      { method: 'GET', path: '/api/activity/summary', weight: 5 }
    ]
  },

  // Test user credentials (for authenticated tests)
  testUsers: [
    { email: 'test1@example.com', password: 'test123' },
    { email: 'test2@example.com', password: 'test123' },
    { email: 'test3@example.com', password: 'test123' }
  ]
};

export default config;
