// SEARCH-GATEWAY-MULTISOURCE-REAL-RESULTS-VERIFY-1
// Real API test with Serper provider

import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';

const ENV_PATH = path.join(process.cwd(), '.env.local');
const env = fs.readFileSync(ENV_PATH, 'utf-8')
  .split('\n')
  .filter(line => line && !line.startsWith('#'))
  .reduce((acc, line) => {
    const [key, ...value] = line.split('=');
    acc[key] = value.join('=');
    return acc;
  }, {});

console.log('=== SEARCH GATEWAY REAL RESULTS VERIFICATION ===\n');

// Provider check
console.log('1. PROVIDER VERIFICATION');
console.log('   SEARCH_API_PROVIDER:', env.SEARCH_API_PROVIDER || 'NOT SET');
console.log('   SEARCH_API_ENDPOINT:', env.SEARCH_API_ENDPOINT ? '✓ Configured' : '✗ NOT SET');
console.log('   SEARCH_API_KEY:', env.SEARCH_API_KEY ? '✓ Present' : '✗ NOT SET');
console.log('   NEXT_PUBLIC_SEARCH_GATEWAY_ENABLED:', env.NEXT_PUBLIC_SEARCH_GATEWAY_ENABLED || 'NOT SET');
console.log('');

// Test queries
const testQueries = [
  { q: 'appartement', city: 'Casablanca' },
  { q: 'villa', city: 'Marrakech' },
  { q: 'terrain', city: 'Rabat' },
  { q: 'location', city: 'Tanger' },
];

console.log('2. TESTING REAL ROUTES\n');

const results = [];

for (const query of testQueries) {
  const params = new URLSearchParams({
    q: query.q,
    city: query.city,
  });

  const url = `http://localhost:3000/api/search/gateway?${params}`;
  console.log(`Testing: ${query.q} @ ${query.city}`);
  console.log(`  URL: /api/search/gateway?q=${query.q}&city=${query.city}`);

  try {
    const startTime = Date.now();
    const response = await fetch(url);
    const responseTime = Date.now() - startTime;

    if (response.ok) {
      const data = await response.json();
      console.log(`  ✓ ok: ${data.ok}, degraded: ${data.degraded}`);
      console.log(`  ✓ results_count: ${data.results_count}`);
      console.log(`  ✓ provider: ${data.provider}`);
      console.log(`  ✓ time: ${responseTime}ms`);

      if (data.results && data.results.length > 0) {
        const sourceCount = {};
        data.results.forEach(r => {
          sourceCount[r.source_id] = (sourceCount[r.source_id] || 0) + 1;
        });
        console.log(`  ✓ results by source:`, sourceCount);

        // Show sample results
        console.log(`  Samples:`);
        data.results.slice(0, 2).forEach((r, i) => {
          console.log(`    ${i+1}. [${r.source_name}] ${r.title.substring(0, 60)}...`);
        });
      }

      results.push({
        query: `${query.q} @ ${query.city}`,
        ok: data.ok,
        degraded: data.degraded,
        count: data.results_count,
        time: responseTime,
        error: null,
      });
    } else {
      console.log(`  ✗ HTTP ${response.status}`);
      const text = await response.text();
      results.push({
        query: `${query.q} @ ${query.city}`,
        ok: false,
        degraded: true,
        count: 0,
        time: responseTime,
        error: `HTTP ${response.status}`,
      });
    }
  } catch (err) {
    console.log(`  ✗ Error: ${err.message}`);
    results.push({
      query: `${query.q} @ ${query.city}`,
      ok: false,
      degraded: true,
      count: 0,
      time: 0,
      error: err.message,
    });
  }

  console.log('');
}

// Summary
console.log('3. SUMMARY TABLE\n');
console.log('Query | Results | Time | Status');
console.log('------|---------|------|-------');
results.forEach(r => {
  const status = r.error ? '✗ ERROR' : (r.degraded ? '⚠ DEGRADED' : '✓ OK');
  console.log(`${r.query.padEnd(25)} | ${String(r.count).padEnd(7)} | ${String(r.time + 'ms').padEnd(4)} | ${status}`);
});

console.log('\n4. NOTES');
if (env.SEARCH_API_PROVIDER === 'serper') {
  console.log('   ✓ Serper provider active');
  console.log('   ✓ Site: queries supported');
  console.log('   ✓ Real indexation data expected');
} else {
  console.log('   ⚠ Provider not Serper');
}

if (results.every(r => r.ok)) {
  console.log('   ✓ All routes accessible');
  console.log('   ✓ Provider responding');
} else {
  console.log('   ✗ Some routes failed - check server');
}
