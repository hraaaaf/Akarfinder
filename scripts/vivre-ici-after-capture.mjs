import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const outDir = 'artifacts/vivre-ici-after';
const baseUrl = 'http://127.0.0.1:3000';
const scenarios = [
  { name: 'national', path: '/map', expectedView: 'morocco', neighborhoodContext: false },
  { name: 'casablanca-maarif', path: '/map?city=casablanca&district=maarif&layer=explore', expectedView: 'city', neighborhoodContext: true },
];
const viewports = [
  { name: '390x844', width: 390, height: 844 },
  { name: '430x932', width: 430, height: 932 },
  { name: '768x900', width: 768, height: 900 },
  { name: '1280x900', width: 1280, height: 900 },
];

await fs.mkdir(outDir, { recursive: true });
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', '3000'], {
  env: { ...process.env, NODE_ENV: 'production' },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let serverLog = '';
const ready = new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`Next server did not become ready.\n${serverLog}`)), 30000);
  const onData = (chunk) => {
    const text = chunk.toString();
    serverLog += text;
    process.stdout.write(text);
    if (/ready|started server|local:/i.test(serverLog)) {
      clearTimeout(timer);
      resolve();
    }
  };
  server.stdout.on('data', onData);
  server.stderr.on('data', onData);
  server.once('exit', (code) => {
    clearTimeout(timer);
    reject(new Error(`Next server exited early with code ${code}.\n${serverLog}`));
  });
});

let browser;
try {
  await ready;
  browser = await chromium.launch({ headless: true });
  const results = [];

  for (const scenario of scenarios) {
    for (const vp of viewports) {
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await context.newPage();
      const targetUrl = `${baseUrl}${scenario.path}`;
      const response = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
      await page.locator(`[data-akarfinder-national-view="${scenario.expectedView}"]`).waitFor({ state: 'attached', timeout: 10000 }).catch(() => {});
      if (scenario.neighborhoodContext) {
        await page.locator('[data-neighborhood-context-poi-controls]').waitFor({ state: 'attached', timeout: 8000 }).catch(() => {});
      }
      await page.waitForTimeout(2200);

      const filename = scenario.name === 'national'
        ? `map-after-${vp.name}.png`
        : `map-after-${scenario.name}-${vp.name}.png`;
      const file = path.join(outDir, filename);
      await page.screenshot({ path: file, fullPage: true });

      results.push({
        scenario: scenario.name,
        neighborhoodContext: scenario.neighborhoodContext,
        viewport: vp,
        httpStatus: response?.status() ?? null,
        finalUrl: page.url(),
        title: await page.title(),
        hasVivreIciPage: await page.locator('[data-vivre-ici-page]').count(),
        hasDecisionRail: await page.locator('[data-p4-map-decision-rail]').count(),
        vivreIciTextCount: await page.getByText(/Vivre ici/i).count().catch(() => 0),
        nationalView: await page.locator('[data-akarfinder-national-view]').getAttribute('data-akarfinder-national-view').catch(() => null),
        poiControls: await page.locator('[data-neighborhood-context-poi-controls]').count(),
        poiAvailableToggle: await page.locator('[data-neighborhood-context-poi-toggle]').count(),
        poiUnavailable: await page.locator('[data-neighborhood-context-poi-unavailable]').count(),
        poiMarkerCount: await page.locator('[data-neighborhood-context-poi]').count(),
        screenshot: file,
      });
      await context.close();
    }
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    mode: 'branch-local-after',
    surface: 'vivre-ici-/map',
    zeroDbWritesByScript: true,
    zeroDeploymentActionsByScript: true,
    baseUrl,
    scenarios: scenarios.map(({ name, path: scenarioPath }) => ({ name, path: scenarioPath })),
    results,
  };
  await fs.writeFile(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));

  if (results.some((r) => !r.httpStatus || r.httpStatus >= 400)) process.exitCode = 2;
  if (results.some((r) => r.hasVivreIciPage !== 1 || r.hasDecisionRail !== 1 || r.vivreIciTextCount < 1)) process.exitCode = 3;
  if (results.some((r) => r.nationalView !== (r.scenario === 'national' ? 'morocco' : 'city'))) process.exitCode = 4;
  if (results.some((r) => r.neighborhoodContext && (r.poiControls !== 1 || r.poiAvailableToggle + r.poiUnavailable !== 1))) process.exitCode = 5;
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
