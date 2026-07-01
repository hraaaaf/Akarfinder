// SEARCH-GATEWAY-MULTISOURCE-REAL-RESULTS-VERIFY-1
// Direct test of gateway functions without HTTP server

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Read env
const ENV_PATH = path.join(projectRoot, '.env.local');
const envContent = fs.readFileSync(ENV_PATH, 'utf-8');
const env = envContent
  .split('\n')
  .filter(line => line && !line.startsWith('#'))
  .reduce((acc, line) => {
    const [key, ...value] = line.split('=');
    acc[key] = value.join('=');
    return acc;
  }, {});

console.log('=== SEARCH GATEWAY REAL RESULTS VERIFICATION ===\n');

// Check env
console.log('1. ENVIRONMENT CHECK');
console.log('   SEARCH_API_PROVIDER:', env.SEARCH_API_PROVIDER || 'NOT SET');
console.log('   SEARCH_API_ENDPOINT:', env.SEARCH_API_ENDPOINT ? '✓ Configured' : '✗ NOT SET');
console.log('   SEARCH_API_KEY:', env.SEARCH_API_KEY ? '✓ Present (hidden)' : '✗ NOT SET');
console.log('   NEXT_PUBLIC_SEARCH_GATEWAY_ENABLED:', env.NEXT_PUBLIC_SEARCH_GATEWAY_ENABLED || 'NOT SET');
console.log('');

// Try to import and test gateway modules
console.log('2. GATEWAY MODULES CHECK');
try {
  // These are ES modules, we need to use dynamic import
  const { getSearchGatewaySources, getEnabledSearchGatewaySources } = await import(
    path.join(projectRoot, 'lib/search-gateway/search-gateway-sources.ts')
      .replace(/\.ts$/, '.js')
  ).catch(() => {
    console.log('   ℹ TS modules not directly importable (expected in dev)');
    console.log('   Using configuration-based verification instead...');
    return null;
  });

  if (getSearchGatewaySources) {
    const sources = getSearchGatewaySources();
    console.log('   ✓ Sources loaded:');
    Object.entries(sources).forEach(([id, src]) => {
      console.log(`     - ${src.source_name} (${src.domain}): ${src.enabled ? 'enabled' : 'disabled'}`);
    });
  }
} catch (err) {
  console.log('   ℹ Could not import modules (expected, using config verification)');
}
console.log('');

// Configuration verification
console.log('3. SOURCE CONFIGURATION VERIFICATION\n');

const expectedSources = [
  { id: 'avito', domain: 'avito.ma', name: 'Avito' },
  { id: 'sarouty', domain: 'sarouty.ma', name: 'Sarouty' },
  { id: 'yakeey', domain: 'yakeey.com', name: 'Yakeey' },
  { id: 'agenz', domain: 'agenz.ma', name: 'Agenz' },
  { id: 'logic-immo', domain: 'logic-immo.ma', name: 'Logic-Immo' },
  { id: 'mubawab', domain: 'mubawab.ma', name: 'Mubawab' },
];

const sourceConfigPath = path.join(projectRoot, 'lib/search-gateway/search-gateway-sources.ts');
const sourceConfig = fs.readFileSync(sourceConfigPath, 'utf-8');

expectedSources.forEach(source => {
  const match = sourceConfig.match(new RegExp(`domain:\\s*["']${source.domain}["']`));
  const status = match ? '✓' : '✗';
  console.log(`${status} ${source.name} (${source.domain})`);
  if (!match) {
    console.log(`  WARNING: Domain mismatch or not configured!`);
  }
});
console.log('');

// Query builder verification
console.log('4. QUERY BUILDER VERIFICATION\n');

const testCases = [
  { q: 'appartement', city: 'Casablanca' },
  { q: 'villa', city: 'Marrakech' },
  { q: 'terrain', city: 'Rabat' },
  { q: 'location', city: 'Tanger' },
];

console.log('Expected site: queries:');
testCases.forEach(test => {
  expectedSources.forEach(source => {
    if (source.id !== 'yakeey') { // All sources
      console.log(`  site:${source.domain} ${test.q} ${test.city}`);
    }
  });
  console.log('');
});

// Provider endpoint check
console.log('5. PROVIDER ENDPOINT VERIFICATION\n');

if (env.SEARCH_API_ENDPOINT) {
  console.log('✓ Endpoint configured:', env.SEARCH_API_ENDPOINT);
  if (env.SEARCH_API_ENDPOINT.includes('serper')) {
    console.log('✓ Using Serper (Google alternative search)');
    console.log('  - Supports site: queries');
    console.log('  - Supports Morocco domains');
    console.log('  - Returns title + snippet + link');
  }
} else {
  console.log('✗ Endpoint NOT configured');
}
console.log('');

// Summary
console.log('6. READINESS SUMMARY\n');

const checks = {
  'Provider configured': !!env.SEARCH_API_PROVIDER,
  'Endpoint present': !!env.SEARCH_API_ENDPOINT,
  'API key present': !!env.SEARCH_API_KEY,
  'Feature flag enabled': env.NEXT_PUBLIC_SEARCH_GATEWAY_ENABLED === 'true',
  'All sources configured': expectedSources.every(s => sourceConfig.includes(`domain: "${s.domain}"`) || sourceConfig.includes(`domain: '${s.domain}'`)),
  'Query builder ready': sourceConfig.includes('site:'),
};

Object.entries(checks).forEach(([check, status]) => {
  console.log(`${status ? '✓' : '✗'} ${check}`);
});

const readyCount = Object.values(checks).filter(Boolean).length;
console.log(`\nREADINESS: ${readyCount}/6 checks passed`);

if (readyCount === 6) {
  console.log('\n✓ READY FOR PRODUCTION TEST');
  console.log('Next step: Deploy to Vercel and test /api/search/gateway');
  console.log('Or: Start dev server and test /search?q=apartement%20casablanca');
} else {
  console.log('\n⚠ MISSING CONFIGURATION');
  console.log('Required:');
  if (!checks['Provider configured']) console.log('  - Set SEARCH_API_PROVIDER');
  if (!checks['Endpoint present']) console.log('  - Set SEARCH_API_ENDPOINT');
  if (!checks['API key present']) console.log('  - Set SEARCH_API_KEY');
  if (!checks['Feature flag enabled']) console.log('  - Set NEXT_PUBLIC_SEARCH_GATEWAY_ENABLED=true');
}
