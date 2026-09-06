// Lot 2f certification anchor: force the dedicated visual gate on the final basemap tree.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const outDir = 'artifacts/vivre-ici-after';
const baseUrl = 'http://127.0.0.1:3000';
const threeDLayerId = 'akarfinder-vivre-ici-3d-buildings';
const threeDSourceId = 'akarfinder-vivre-ici-3d-buildings-source';
const scenarios = [
  { name: 'national', path: '/map', expectedView: 'morocco', neighborhoodContext: false, threeDExpected: false },
  { name: 'casablanca-maarif', path: '/map?city=casablanca&district=maarif&layer=explore', expectedView: 'city', neighborhoodContext: true, threeDExpected: true },
];
const viewports = [
  { name: '390x844', width: 390, height: 844 },
  { name: '430x932', width: 430, height: 932 },
  { name: '768x900', width: 768, height: 900 },
  { name: '1280x900', width: 1280, height: 900 },
];

function intersects(a, b) {
  if (!a || !b) return false;
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

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
      if (scenario.threeDExpected) {
        await page.locator('[data-vivre-ici-3d-toggle][aria-pressed="true"]').waitFor({ state: 'visible', timeout: 12000 }).catch(() => {});
        await page.waitForFunction((layerId) => {
          const map = window.__AKARFINDER_NATIONAL_MAP__;
          return Boolean(map?.getLayer(layerId)) && map.getPitch() >= 58 && map.getZoom() >= 15;
        }, threeDLayerId, { timeout: 15000 }).catch(() => {});
        await page.waitForFunction((layerId) => {
          const map = window.__AKARFINDER_NATIONAL_MAP__;
          if (!map?.getLayer(layerId)) return false;
          return map.queryRenderedFeatures({ layers: [layerId] }).length > 0;
        }, threeDLayerId, { timeout: 12000 }).catch(() => {});
      }
      await page.waitForTimeout(1800);

      const filename = scenario.name === 'national'
        ? `map-after-${vp.name}.png`
        : `map-after-${scenario.name}-${vp.name}.png`;
      const file = path.join(outDir, filename);
      await page.screenshot({ path: file, fullPage: true });

      const mapState = await page.evaluate(({ layerId, sourceId }) => {
        const map = window.__AKARFINDER_NATIONAL_MAP__;
        if (!map) return null;
        const layerPresent = Boolean(map.getLayer(layerId));
        return {
          layerPresent,
          sourcePresent: Boolean(map.getSource(sourceId)),
          pitch: map.getPitch(),
          bearing: map.getBearing(),
          zoom: map.getZoom(),
          renderedBuildingCount: layerPresent ? map.queryRenderedFeatures({ layers: [layerId] }).length : 0,
        };
      }, { layerId: threeDLayerId, sourceId: threeDSourceId }).catch(() => null);

      const layoutBox = await page.locator('[data-p4-map-layout]').boundingBox().catch(() => null);
      const canvasBox = await page.locator('[data-p4-map-canvas]').boundingBox().catch(() => null);
      const railBox = await page.locator('[data-p4-map-decision-rail]').boundingBox().catch(() => null);
      const topNavBox = await page.locator('[data-akarfinder-national-map] > section[aria-label="Navigation territoriale nationale"]').boundingBox().catch(() => null);
      const districtSearchBox = scenario.neighborhoodContext
        ? await page.locator('[data-akarfinder-national-neighborhood-overlay] > div:first-child').boundingBox().catch(() => null)
        : null;
      const toggleBox = scenario.threeDExpected
        ? await page.locator('[data-vivre-ici-3d-toggle]').boundingBox().catch(() => null)
        : null;
      const preview = page.locator('[data-akarfinder-neighborhood-preview]');
      const previewCount = await preview.count();
      const previewVisible = previewCount ? await preview.isVisible().catch(() => false) : false;
      const previewBox = previewVisible ? await preview.boundingBox().catch(() => null) : null;

      results.push({
        scenario: scenario.name,
        neighborhoodContext: scenario.neighborhoodContext,
        threeDExpected: scenario.threeDExpected,
        viewport: vp,
        httpStatus: response?.status() ?? null,
        finalUrl: page.url(),
        title: await page.title(),
        hasVivreIciPage: await page.locator('[data-vivre-ici-page]').count(),
        hasDecisionRail: await page.locator('[data-p4-map-decision-rail]').count(),
        hasPremiumContext: await page.locator('[data-vivre-ici-premium-context]').count(),
        vivreIciTextCount: await page.getByText(/Vivre ici/i).count().catch(() => 0),
        nationalView: await page.locator('[data-akarfinder-national-view]').getAttribute('data-akarfinder-national-view').catch(() => null),
        poiControls: await page.locator('[data-neighborhood-context-poi-controls]').count(),
        poiAvailableToggle: await page.locator('[data-neighborhood-context-poi-toggle]').count(),
        poiUnavailable: await page.locator('[data-neighborhood-context-poi-unavailable]').count(),
        poiMarkerCount: await page.locator('[data-neighborhood-context-poi]').count(),
        threeDToggle: await page.locator('[data-vivre-ici-3d-toggle]').count(),
        threeDLayer: mapState?.layerPresent ?? false,
        threeDSource: mapState?.sourcePresent ?? false,
        mapPitch: mapState?.pitch ?? 0,
        mapBearing: mapState?.bearing ?? 0,
        mapZoom: mapState?.zoom ?? 0,
        renderedBuildingCount: mapState?.renderedBuildingCount ?? 0,
        layoutWidth: layoutBox?.width ?? 0,
        mapCanvasWidth: canvasBox?.width ?? 0,
        decisionRailWidth: railBox?.width ?? 0,
        mapWidthShare: layoutBox?.width && canvasBox?.width ? canvasBox.width / layoutBox.width : 0,
        neighborhoodPreviewCount: previewCount,
        neighborhoodPreviewVisible: previewVisible,
        neighborhoodPreviewHeight: previewBox?.height ?? 0,
        topChromeDistrictOverlap: intersects(topNavBox, districtSearchBox),
        topChromeToggleOverlap: intersects(districtSearchBox, toggleBox) || intersects(topNavBox, toggleBox),
        screenshot: file,
      });
      await context.close();
    }
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    mode: 'branch-local-after',
    surface: 'vivre-ici-/map',
    premiumTarget: 'freeze-2026-09-06',
    zeroDbWritesByScript: true,
    zeroDeploymentActionsByScript: true,
    baseUrl,
    scenarios: scenarios.map(({ name, path: scenarioPath, threeDExpected }) => ({ name, path: scenarioPath, threeDExpected })),
    results,
  };
  await fs.writeFile(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));

  if (results.some((r) => !r.httpStatus || r.httpStatus >= 400)) process.exitCode = 2;
  if (results.some((r) => r.hasVivreIciPage !== 1 || r.hasDecisionRail !== 1 || r.hasPremiumContext !== 1 || r.vivreIciTextCount < 1)) process.exitCode = 3;
  if (results.some((r) => r.nationalView !== (r.scenario === 'national' ? 'morocco' : 'city'))) process.exitCode = 4;
  if (results.some((r) => r.neighborhoodContext && (r.poiControls !== 1 || r.poiAvailableToggle + r.poiUnavailable !== 1))) process.exitCode = 5;
  if (results.some((r) => r.threeDExpected && (
    r.threeDToggle !== 1
    || !r.threeDLayer
    || !r.threeDSource
    || r.mapPitch < 58
    || r.mapZoom < 15
    || r.renderedBuildingCount < 1
  ))) process.exitCode = 6;
  if (results.some((r) => r.viewport.width >= 1024 && r.mapWidthShare < 0.68)) process.exitCode = 7;
  if (results.some((r) => r.scenario === 'casablanca-maarif' && r.viewport.width < 1024 && (!r.neighborhoodPreviewVisible || r.neighborhoodPreviewHeight <= 0))) process.exitCode = 8;
  if (results.some((r) => r.scenario === 'casablanca-maarif' && (r.topChromeDistrictOverlap || r.topChromeToggleOverlap))) process.exitCode = 9;
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
