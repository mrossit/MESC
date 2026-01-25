/**
 * Node.js Load Test Runner for MESC PWA
 *
 * A lightweight load testing tool that doesn't require external dependencies.
 * Run with: npx tsx test/load/runner.ts
 */

interface TestResult {
  endpoint: string;
  method: string;
  statusCode: number;
  duration: number;
  success: boolean;
  error?: string;
}

interface TestSummary {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
  requestsPerSecond: number;
  errorRate: number;
}

interface EndpointSummary {
  endpoint: string;
  requests: number;
  avgDuration: number;
  errorRate: number;
}

const BASE_URL = process.env.LOAD_TEST_URL || 'http://localhost:5000';

// Test configuration
const CONFIG = {
  // Number of virtual users (concurrent requests)
  concurrentUsers: 20,
  // Test duration in seconds
  duration: 60,
  // Delay between requests per user (ms)
  requestDelay: 500,
  // Endpoints to test
  endpoints: [
    { method: 'GET', path: '/api/health', weight: 20 },
    { method: 'GET', path: '/manifest.json', weight: 10 },
    { method: 'GET', path: '/api/schedules', weight: 15 },
    { method: 'GET', path: '/api/questionnaires', weight: 15 },
    { method: 'GET', path: '/api/notifications', weight: 15 },
    { method: 'GET', path: '/api/mass-times', weight: 10 },
    { method: 'GET', path: '/api/substitutions', weight: 10 },
    { method: 'GET', path: '/api/reports/summary', weight: 5 },
  ],
};

// Results storage
const results: TestResult[] = [];
let isRunning = true;

// Select random endpoint based on weights
function selectEndpoint(): { method: string; path: string } {
  const totalWeight = CONFIG.endpoints.reduce((sum, e) => sum + e.weight, 0);
  let random = Math.random() * totalWeight;

  for (const endpoint of CONFIG.endpoints) {
    random -= endpoint.weight;
    if (random <= 0) {
      return endpoint;
    }
  }

  return CONFIG.endpoints[0];
}

// Make a single request
async function makeRequest(endpoint: { method: string; path: string }): Promise<TestResult> {
  const url = `${BASE_URL}${endpoint.path}`;
  const startTime = performance.now();

  try {
    const response = await fetch(url, {
      method: endpoint.method,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'MESC-LoadTest/1.0',
      },
    });

    const duration = performance.now() - startTime;

    // Success = server responded (even 401/403/404 means server is working)
    // Failure = server error (5xx) or connection error
    const isServerError = response.status >= 500;

    return {
      endpoint: endpoint.path,
      method: endpoint.method,
      statusCode: response.status,
      duration,
      success: !isServerError,
    };
  } catch (error: any) {
    const duration = performance.now() - startTime;

    return {
      endpoint: endpoint.path,
      method: endpoint.method,
      statusCode: 0,
      duration,
      success: false,
      error: error.message,
    };
  }
}

// Virtual user simulation
async function virtualUser(userId: number): Promise<void> {
  console.log(`[User ${userId}] Started`);

  while (isRunning) {
    const endpoint = selectEndpoint();
    const result = await makeRequest(endpoint);
    results.push(result);

    // Add some jitter to request timing
    const delay = CONFIG.requestDelay + Math.random() * 200;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  console.log(`[User ${userId}] Stopped`);
}

// Calculate percentile
function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

// Calculate summary statistics
function calculateSummary(testDuration: number): TestSummary {
  const durations = results.map((r) => r.duration);
  const successCount = results.filter((r) => r.success).length;

  return {
    totalRequests: results.length,
    successfulRequests: successCount,
    failedRequests: results.length - successCount,
    avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
    minDuration: Math.min(...durations),
    maxDuration: Math.max(...durations),
    p50Duration: percentile(durations, 50),
    p95Duration: percentile(durations, 95),
    p99Duration: percentile(durations, 99),
    requestsPerSecond: results.length / testDuration,
    errorRate: ((results.length - successCount) / results.length) * 100,
  };
}

// Calculate per-endpoint summary
function calculateEndpointSummary(): EndpointSummary[] {
  const endpointMap = new Map<string, TestResult[]>();

  for (const result of results) {
    const key = result.endpoint;
    if (!endpointMap.has(key)) {
      endpointMap.set(key, []);
    }
    endpointMap.get(key)!.push(result);
  }

  return Array.from(endpointMap.entries()).map(([endpoint, endpointResults]) => {
    const avgDuration =
      endpointResults.reduce((sum, r) => sum + r.duration, 0) / endpointResults.length;
    // Only count 5xx and connection errors as failures
    const serverErrorCount = endpointResults.filter((r) => !r.success).length;

    return {
      endpoint,
      requests: endpointResults.length,
      avgDuration,
      errorRate: (serverErrorCount / endpointResults.length) * 100,
    };
  });
}

// Print results
function printResults(summary: TestSummary, endpointSummaries: EndpointSummary[]): void {
  console.log('\n' + '='.repeat(70));
  console.log('                    LOAD TEST RESULTS');
  console.log('='.repeat(70));

  console.log('\n📊 OVERALL SUMMARY');
  console.log('-'.repeat(40));
  console.log(`Total Requests:      ${summary.totalRequests}`);
  console.log(`Successful:          ${summary.successfulRequests} (${((summary.successfulRequests / summary.totalRequests) * 100).toFixed(1)}%)`);
  console.log(`Failed:              ${summary.failedRequests} (${summary.errorRate.toFixed(1)}%)`);
  console.log(`Requests/sec:        ${summary.requestsPerSecond.toFixed(2)}`);

  console.log('\n⏱️  RESPONSE TIMES (ms)');
  console.log('-'.repeat(40));
  console.log(`Average:             ${summary.avgDuration.toFixed(2)}`);
  console.log(`Min:                 ${summary.minDuration.toFixed(2)}`);
  console.log(`Max:                 ${summary.maxDuration.toFixed(2)}`);
  console.log(`Median (p50):        ${summary.p50Duration.toFixed(2)}`);
  console.log(`95th Percentile:     ${summary.p95Duration.toFixed(2)}`);
  console.log(`99th Percentile:     ${summary.p99Duration.toFixed(2)}`);

  console.log('\n📍 PER-ENDPOINT BREAKDOWN');
  console.log('-'.repeat(70));
  console.log('Endpoint'.padEnd(35) + 'Requests'.padEnd(12) + 'Avg (ms)'.padEnd(12) + 'Errors');
  console.log('-'.repeat(70));

  endpointSummaries
    .sort((a, b) => b.requests - a.requests)
    .forEach((ep) => {
      console.log(
        ep.endpoint.padEnd(35) +
          ep.requests.toString().padEnd(12) +
          ep.avgDuration.toFixed(1).padEnd(12) +
          `${ep.errorRate.toFixed(1)}%`
      );
    });

  // Thresholds check
  console.log('\n✅ THRESHOLD CHECKS');
  console.log('-'.repeat(40));

  const checks = [
    {
      name: 'p95 < 1000ms',
      passed: summary.p95Duration < 1000,
      value: summary.p95Duration.toFixed(0),
    },
    {
      name: 'Error rate < 5%',
      passed: summary.errorRate < 5,
      value: `${summary.errorRate.toFixed(1)}%`,
    },
    {
      name: 'Avg response < 500ms',
      passed: summary.avgDuration < 500,
      value: summary.avgDuration.toFixed(0),
    },
  ];

  checks.forEach((check) => {
    const status = check.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`${status}  ${check.name}: ${check.value}`);
  });

  const allPassed = checks.every((c) => c.passed);
  console.log('\n' + '='.repeat(70));
  console.log(allPassed ? '🎉 ALL THRESHOLDS PASSED!' : '⚠️  SOME THRESHOLDS FAILED');
  console.log('='.repeat(70) + '\n');
}

// Main function
async function main(): Promise<void> {
  console.log('🚀 MESC PWA Load Test');
  console.log('='.repeat(40));
  console.log(`Base URL:            ${BASE_URL}`);
  console.log(`Concurrent Users:    ${CONFIG.concurrentUsers}`);
  console.log(`Duration:            ${CONFIG.duration}s`);
  console.log(`Request Delay:       ${CONFIG.requestDelay}ms`);
  console.log('='.repeat(40));

  // Check if server is reachable
  console.log('\n🔍 Checking server availability...');
  try {
    const healthCheck = await fetch(`${BASE_URL}/api/health`);
    if (healthCheck.ok) {
      console.log('✓ Server is up and running\n');
    } else {
      console.log(`⚠️  Server returned status ${healthCheck.status}\n`);
    }
  } catch (error) {
    console.error('✗ Server is not reachable!');
    console.error('  Make sure the server is running at', BASE_URL);
    process.exit(1);
  }

  console.log('🏃 Starting load test...\n');

  const startTime = Date.now();

  // Start virtual users
  const users = Array.from({ length: CONFIG.concurrentUsers }, (_, i) => virtualUser(i + 1));

  // Progress reporting
  const progressInterval = setInterval(() => {
    const elapsed = (Date.now() - startTime) / 1000;
    const remaining = CONFIG.duration - elapsed;
    console.log(
      `⏳ Progress: ${elapsed.toFixed(0)}s / ${CONFIG.duration}s | ` +
        `Requests: ${results.length} | ` +
        `RPS: ${(results.length / elapsed).toFixed(1)}`
    );
  }, 5000);

  // Stop after duration
  await new Promise((resolve) => setTimeout(resolve, CONFIG.duration * 1000));
  isRunning = false;

  clearInterval(progressInterval);

  // Wait for all users to finish
  await Promise.all(users);

  const testDuration = (Date.now() - startTime) / 1000;

  // Calculate and print results
  const summary = calculateSummary(testDuration);
  const endpointSummaries = calculateEndpointSummary();
  printResults(summary, endpointSummaries);
}

// Run the load test
main().catch(console.error);
