import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const outDir = 'artifacts/vivre-ici-after';
const baseUrl = 'http://127.0.0.1:3000';
const n3Route = '/map?city=casablanca&district=maarif&layer=explore';
const expectedSearchHref = '/search?city=Casablanca&district=Ma%C3%A2rif';
const expectedTerritoryBackHref = '/map?layer=explore';
const viewports = [
  { name: '390x844', width: 390, height: 844 },
  { name: '430x932', width: 430, height: 932 },
  { name: '768x900', width: 768, height: 900 },
  { name: '1280x900', width: 1280, height: 900 },
];
const isSupabaseUrl = (url) => /supabase\.co|\/rest\/v1(?:\/|\?|$)|\/rpc(?:\/|\?|$)/i.test(url);

await fs.rm(outDir, { recursive: true, force: true });
await fs.mkdir(outDir, { recursive: true });

const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', '3000'], {
  env: { ...process.env, NODE_ENV: 'production' },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let serverLog = '';
const ready = new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`Next server timeout\n${serverLog}`)), 30000);
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
    reject(new Error(`Next server exited ${code}\n${serverLog}`));
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
    const supabaseRequests = [];
    const pageErrors = [];
    page.on('request', (request) => {
      if (isSupabaseUrl(request.url())) supabaseRequests.push({ method: request.method(), url: request.url() });
    });
    page.on('pageerror', (error) => pageErrors.push(String(error)));

    const response = await page.goto(`${baseUrl}/map`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const premium = page.locator('[data-premium-map]');
    await premium.waitFor({ state: 'visible', timeout: 20000 });
    await page.waitForFunction(() => document.querySelector('[data-premium-map]')?.getAttribute('data-topology-state') === 'ready', null, { timeout: 30000 });
    await page.evaluate(() => window.scrollTo(0, 0));

    const header = page.locator('[data-search-global-header]');
    const headerVisible = await header.isVisible();
    const logoVisible = (await header.locator('img[alt="AkarFinder"]:visible').count()) > 0;
    const headerBox = await header.boundingBox();
    const initialCitySlugs = await page.locator('[data-national-city-label]').evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('data-national-city-label')).filter(Boolean)
    );
    const initialTerritoryZoom = Number(await premium.getAttribute('data-national-territory-zoom') ?? '0');

    const premiumFile = path.join(outDir, `map-after-premium-national-${vp.name}.png`);
    await page.screenshot({ path: premiumFile, fullPage: false, animations: 'disabled' });

    const zoomIn = page.locator('[data-premium-map] section[aria-label="Carte interactive du Maroc"] button[aria-label="Zoomer"]').first();
    for (let index = 0; index < 2; index += 1) {
      await zoomIn.click();
      await page.waitForTimeout(160);
    }
    await page.waitForTimeout(350);
    const zoomedCitySlugs = await page.locator('[data-national-city-label]').evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('data-national-city-label')).filter(Boolean)
    );
    const zoomedTerritoryZoom = Number(await premium.getAttribute('data-national-territory-zoom') ?? '0');
    const zoomedVisibleRegionCount = await page.locator('[data-region-slug]').evaluateAll((nodes) =>
      nodes.filter((node) => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return rect.width > 2
          && rect.height > 2
          && rect.right > 0
          && rect.bottom > 0
          && rect.left < window.innerWidth
          && rect.top < window.innerHeight
          && style.visibility !== 'hidden'
          && style.display !== 'none';
      }).length
    );
    const premiumZoomedFile = path.join(outDir, `map-after-premium-national-zoomed-${vp.name}.png`);
    await page.screenshot({ path: premiumZoomedFile, fullPage: false, animations: 'disabled' });

    results.push({
      scenario: 'premium-national',
      viewport: vp,
      httpStatus: response?.status() ?? null,
      finalUrl: page.url(),
      topologyState: await premium.getAttribute('data-topology-state'),
      dbMode: await premium.getAttribute('data-db-mode'),
      regionCount: await page.locator('[data-region-slug]').count(),
      regionListCount: await page.locator('[data-region-list-slug]').count(),
      initialCityLabelCount: initialCitySlugs.length,
      initialCitySlugs,
      initialTerritoryZoom,
      zoomedCityLabelCount: zoomedCitySlugs.length,
      zoomedCitySlugs,
      zoomedTerritoryZoom,
      zoomedVisibleRegionCount,
      zoomedScreenshot: premiumZoomedFile,
      zoomedScreenshotBytes: (await fs.stat(premiumZoomedFile)).size,
      headerVisible,
      logoVisible,
      headerHeight: headerBox?.height ?? 0,
      horizontalOverflow: await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
      supabaseRequestCount: supabaseRequests.length,
      pageErrors,
      screenshot: premiumFile,
      screenshotBytes: (await fs.stat(premiumFile)).size,
    });

    supabaseRequests.length = 0;
    pageErrors.length = 0;
    const n3Response = await page.goto(`${baseUrl}${n3Route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const maplibre = page.locator('[data-maplibre-spike][data-maplibre-city="casablanca"][data-maplibre-district="maarif"]');
    await maplibre.waitFor({ state: 'visible', timeout: 20000 });
    await page.waitForFunction(() => {
      const shell = document.querySelector('[data-maplibre-spike][data-maplibre-city="casablanca"][data-maplibre-district="maarif"]');
      return shell?.getAttribute('data-maplibre-render-state') === 'ready'
        && shell?.getAttribute('data-maplibre-source-state') === 'available'
        && Number(shell?.getAttribute('data-maplibre-building-count') ?? '0') > 0;
    }, null, { timeout: 30000 });

    const rail = page.locator('[data-p4-map-decision-rail]');
    await rail.waitFor({ state: 'visible', timeout: 15000 });
    const handoff = rail.getByRole('link', { name: /Voir les biens disponibles à Maârif/i });
    const searchHref = await handoff.getAttribute('href');
    const territoryBack = page.getByRole('link', { name: 'Retour à la carte du Maroc' });
    await territoryBack.waitFor({ state: 'visible', timeout: 10000 });
    const territoryBackHref = await territoryBack.getAttribute('href');
    const anchorCount = Number(await maplibre.getAttribute('data-maplibre-anchor-count') ?? '-1');
    const signalGridVisible = await rail.locator('.p4-premium-signal-grid').isVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    const computed = await page.evaluate(() => {
      const shell = document.querySelector('[data-maplibre-spike][data-maplibre-city="casablanca"][data-maplibre-district="maarif"]');
      const canvas = document.querySelector('[data-maplibre-spike] .maplibre-spike-canvas canvas');
      const label = document.querySelector('[data-maplibre-spike] .maplibre-spike-neighborhood-label span');
      const action = document.querySelector('[data-p4-map-decision-rail] .p4-premium-actions > a:first-child');
      const shellStyle = shell ? getComputedStyle(shell) : null;
      return {
        shellDisplay: shellStyle?.display ?? null,
        shellVisibility: shellStyle?.visibility ?? null,
        shellOpacity: shellStyle?.opacity ?? null,
        shellBackground: shellStyle?.backgroundColor ?? null,
        canvasFilter: canvas ? getComputedStyle(canvas).filter : null,
        labelBackground: label ? getComputedStyle(label).backgroundColor : null,
        labelColor: label ? getComputedStyle(label).color : null,
        primaryActionBackground: action ? getComputedStyle(action).backgroundColor : null,
        horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });

    const n3File = path.join(outDir, `map-after-n3-casablanca-maarif-${vp.name}.png`);
    await page.screenshot({ path: n3File, fullPage: false, animations: 'disabled' });
    results.push({
      scenario: 'n3-casablanca-maarif',
      viewport: vp,
      httpStatus: n3Response?.status() ?? null,
      finalUrl: page.url(),
      maplibreReady: await maplibre.getAttribute('data-maplibre-ready'),
      renderState: await maplibre.getAttribute('data-maplibre-render-state'),
      sourceState: await maplibre.getAttribute('data-maplibre-source-state'),
      source: await maplibre.getAttribute('data-maplibre-source'),
      buildingCount: Number(await maplibre.getAttribute('data-maplibre-building-count') ?? '0'),
      anchorCount,
      decisionRailVisible: await rail.isVisible(),
      signalGridVisible,
      searchHref,
      territoryBackVisible: await territoryBack.isVisible(),
      territoryBackHref,
      ...computed,
      supabaseRequestCount: supabaseRequests.length,
      pageErrors,
      screenshot: n3File,
      screenshotBytes: (await fs.stat(n3File)).size,
    });
    await context.close();
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    mode: 'branch-local-after-v2',
    surface: 'vivre-ici-/map',
    premiumTarget: 'premium-national-plus-n3-maplibre-blue-2026-09-15',
    anchor: '#071B33',
    zeroDbWritesByScript: true,
    zeroDeploymentActionsByScript: true,
    results,
  };
  await fs.writeFile(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));

  const invalidPremium = results.filter((r) => r.scenario === 'premium-national').some((r) =>
    !r.httpStatus || r.httpStatus >= 400
    || r.topologyState !== 'ready'
    || r.dbMode !== 'mock-only'
    || r.regionCount !== 12
    || r.regionListCount !== 12
    || r.initialCityLabelCount < 4
    || !['casablanca','rabat','marrakech','tanger','agadir','fes'].every((slug) => r.initialCitySlugs.includes(slug))
    || r.zoomedCityLabelCount <= r.initialCityLabelCount
    || !r.zoomedCitySlugs.includes('kenitra')
    || !r.zoomedCitySlugs.includes('mohammedia')
    || r.zoomedTerritoryZoom <= r.initialTerritoryZoom
    || r.zoomedVisibleRegionCount < 1
    || r.zoomedScreenshotBytes < 30000
    || !r.headerVisible
    || !r.logoVisible
    || r.headerHeight <= 0
    || r.horizontalOverflow > 1
    || r.supabaseRequestCount !== 0
    || r.pageErrors.length > 0
    || r.screenshotBytes < 30000
  );
  const invalidN3 = results.filter((r) => r.scenario === 'n3-casablanca-maarif').some((r) =>
    !r.httpStatus || r.httpStatus >= 400
    || r.maplibreReady !== 'true'
    || r.renderState !== 'ready'
    || r.sourceState !== 'available'
    || r.source !== 'openfreemap-vector'
    || r.buildingCount < 1
    || !r.decisionRailVisible
    || r.searchHref !== expectedSearchHref
    || !r.territoryBackVisible
    || r.territoryBackHref !== expectedTerritoryBackHref
    || (r.anchorCount === 0 && r.signalGridVisible)
    || r.shellDisplay === 'none'
    || r.shellVisibility !== 'visible'
    || Number(r.shellOpacity) <= 0
    || !r.canvasFilter?.includes('hue-rotate(18deg)')
    || r.labelBackground !== 'rgba(7, 27, 51, 0.94)'
    || r.labelColor !== 'rgb(255, 255, 255)'
    || r.primaryActionBackground !== 'rgb(7, 27, 51)'
    || r.horizontalOverflow > 1
    || r.supabaseRequestCount !== 0
    || r.pageErrors.length > 0
    || r.screenshotBytes < 30000
  );
  if (invalidPremium || invalidN3 || results.length !== 8) process.exitCode = 2;
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
