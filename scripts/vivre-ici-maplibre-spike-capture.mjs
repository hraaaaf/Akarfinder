import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const outDir = 'artifacts/vivre-ici-maplibre-spike';
const baseUrl = 'http://127.0.0.1:3000';
const viewports = [
  { name: '390x844', width: 390, height: 844 },
  { name: '768x900', width: 768, height: 900 },
  { name: '1280x900', width: 1280, height: 900 },
  { name: '1440x900', width: 1440, height: 900 },
];
const isSupabaseUrl = (url) => /supabase\.co|\/rest\/v1(?:\/|\?|$)|\/rpc(?:\/|\?|$)/i.test(url);

await fs.rm(outDir, { recursive: true, force: true });
await fs.mkdir(outDir, { recursive: true });

const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', '3000'], {
  env: { ...process.env, NODE_ENV: 'production' },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let log = '';
const ready = new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`Next server timeout\n${log}`)), 30000);
  const onData = (chunk) => {
    const text = chunk.toString();
    log += text;
    process.stdout.write(text);
    if (/ready|started server|local:/i.test(log)) {
      clearTimeout(timer);
      resolve();
    }
  };
  server.stdout.on('data', onData);
  server.stderr.on('data', onData);
  server.once('exit', (code) => {
    clearTimeout(timer);
    reject(new Error(`Next server exited ${code}\n${log}`));
  });
});

let browser;
try {
  await ready;
  browser = await chromium.launch({ headless: true });
  const results = [];

  for (const vp of viewports) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, colorScheme: 'light' });
    const page = await context.newPage();
    const failedRequests = [];
    const supabaseRequests = [];
    page.on('request', (request) => {
      if (isSupabaseUrl(request.url())) supabaseRequests.push({ method: request.method(), url: request.url() });
    });
    page.on('requestfailed', (request) => failedRequests.push({ url: request.url(), error: request.failure()?.errorText ?? 'unknown' }));

    const response = await page.goto(`${baseUrl}/map`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const shell = page.locator('[data-premium-map]');
    await shell.waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForFunction(() => document.querySelector('[data-premium-map]')?.getAttribute('data-topology-state') !== 'loading', null, { timeout: 30000 });
    await page.evaluate(() => window.scrollTo(0, 0));

    const topologyState = await shell.getAttribute('data-topology-state');
    const dbMode = await shell.getAttribute('data-db-mode');
    const regionCount = await page.locator('[data-region-slug]').count();
    const regionListCount = await page.locator('[data-region-list-slug]').count();
    const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

    const nationalFile = path.join(outDir, `premium-map-national-${vp.name}.png`);
    await page.screenshot({ path: nationalFile, fullPage: false, animations: 'disabled' });

    await page.locator('[data-region-list-slug="casablanca-settat"]').click();
    await page.waitForFunction(() => document.querySelector('[data-premium-map]')?.getAttribute('data-map-level') === 'region');
    const casablancaButton = page.locator('[data-city-list-slug="casablanca"]');
    await casablancaButton.waitFor({ state: 'visible' });
    const cityListCount = await page.locator('[data-city-list-slug]').count();
    await page.evaluate(() => window.scrollTo(0, 0));

    const regionFile = path.join(outDir, `premium-map-region-casablanca-settat-${vp.name}.png`);
    await page.screenshot({ path: regionFile, fullPage: false, animations: 'disabled' });

    await casablancaButton.click();
    await page.waitForFunction(() => document.querySelector('[data-premium-map]')?.getAttribute('data-map-level') === 'city');
    await page.locator('[data-neighborhood-schematic]').waitFor({ state: 'visible' });
    const explorer = page.locator('[data-explorer-link="maarif"]');
    const explorerHref = await explorer.getAttribute('href');
    const selectedHref = await page.locator('[data-explorer-selected]').getAttribute('href');
    const quartierCards = await page.locator('[data-explorer-link]').count();
    const inactivePolygonFill = await page.locator('[data-neighborhood-schematic] polygon').nth(1).evaluate((node) => getComputedStyle(node).fill);
    const schematicPrimaryTextFill = await page.locator('[data-neighborhood-schematic] text').first().evaluate((node) => getComputedStyle(node).fill);
    await page.evaluate(() => window.scrollTo(0, 0));

    const cityFile = path.join(outDir, `premium-map-city-casablanca-${vp.name}.png`);
    await page.screenshot({ path: cityFile, fullPage: false, animations: 'disabled' });

    const files = [nationalFile, regionFile, cityFile];
    const screenshotBytes = Object.fromEntries(await Promise.all(files.map(async (file) => [path.basename(file), (await fs.stat(file)).size])));

    results.push({
      viewport: vp,
      httpStatus: response?.status() ?? null,
      topologyState,
      dbMode,
      regionCount,
      regionListCount,
      cityListCount,
      quartierCards,
      explorerHref,
      selectedHref,
      horizontalOverflow,
      inactivePolygonFill,
      schematicPrimaryTextFill,
      supabaseRequestCount: supabaseRequests.length,
      supabaseRequests,
      failedRequests: failedRequests.filter(({ url }) => /geoboundaries|githubusercontent/i.test(url)),
      screenshots: files,
      screenshotBytes,
    });
    await context.close();
  }

  const darkContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark' });
  const darkPage = await darkContext.newPage();
  const darkSupabaseRequests = [];
  darkPage.on('request', (request) => {
    if (isSupabaseUrl(request.url())) darkSupabaseRequests.push({ method: request.method(), url: request.url() });
  });
  await darkPage.addInitScript(() => localStorage.setItem('akarfinder-theme', 'dark'));
  await darkPage.goto(`${baseUrl}/map`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await darkPage.locator('[data-premium-map]').waitFor({ state: 'visible' });
  await darkPage.waitForFunction(() => document.querySelector('[data-premium-map]')?.getAttribute('data-topology-state') === 'ready', null, { timeout: 30000 });
  await darkPage.evaluate(() => window.scrollTo(0, 0));
  const darkFile = path.join(outDir, 'premium-map-national-dark-1280x900.png');
  await darkPage.screenshot({ path: darkFile, fullPage: false, animations: 'disabled' });
  const darkTheme = await darkPage.evaluate(() => document.documentElement.dataset.theme ?? null);
  const darkEyebrowColor = await darkPage.locator('[data-map-side-panel] p').first().evaluate((node) => getComputedStyle(node).color);
  await darkContext.close();

  const summary = {
    generatedAt: new Date().toISOString(),
    mode: 'premium-map-three-level-mock-only-final-gate',
    route: '/map',
    zeroDbWritesByScript: true,
    zeroDeploymentActionsByScript: true,
    darkTheme,
    darkEyebrowColor,
    darkSupabaseRequestCount: darkSupabaseRequests.length,
    darkSupabaseRequests,
    darkScreenshot: darkFile,
    results,
  };
  await fs.writeFile(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));

  const badPaint = (value) => !value || value === 'none' || /rgba?\(0,\s*0,\s*0(?:,\s*1)?\)/.test(value);
  const invalid = results.some((item) =>
    !item.httpStatus || item.httpStatus >= 400
    || item.topologyState !== 'ready'
    || item.dbMode !== 'mock-only'
    || item.regionCount !== 12
    || item.regionListCount !== 12
    || item.cityListCount < 1
    || item.quartierCards !== 10
    || item.explorerHref !== '/immobilier/casablanca/maarif'
    || item.selectedHref !== '/immobilier/casablanca/maarif'
    || item.horizontalOverflow > 1
    || item.supabaseRequestCount !== 0
    || badPaint(item.inactivePolygonFill)
    || badPaint(item.schematicPrimaryTextFill)
    || item.failedRequests.length > 0
    || Object.values(item.screenshotBytes).some((bytes) => bytes < 20000)
  );
  if (invalid || darkTheme !== 'dark' || darkSupabaseRequests.length !== 0 || darkEyebrowColor === 'rgb(7, 27, 51)') process.exitCode = 2;
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
