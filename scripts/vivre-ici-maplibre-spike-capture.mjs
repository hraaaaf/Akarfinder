import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const outDir = 'artifacts/vivre-ici-maplibre-spike';
const baseUrl = 'http://127.0.0.1:3000';
const route = '/map/maplibre-spike';
const minMapScreenshotBytes = 20000;
const minDesktopBuildings = 50;
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
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    const failedRequests = [];
    const failedResponses = [];

    page.on('requestfailed', (request) => {
      const url = request.url();
      if (/tiles\.openfreemap\.org|server\.arcgisonline\.com/i.test(url)) {
        failedRequests.push({ url, error: request.failure()?.errorText ?? 'unknown' });
      }
    });
    page.on('response', (response) => {
      const url = response.url();
      if (/tiles\.openfreemap\.org|server\.arcgisonline\.com/i.test(url) && response.status() >= 400) {
        failedResponses.push({ url, status: response.status() });
      }
    });

    const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const shellLocator = page.locator('[data-maplibre-spike]');
    await shellLocator.waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForFunction(() => {
      const shell = document.querySelector('[data-maplibre-spike]');
      return shell?.getAttribute('data-maplibre-ready') === 'true'
        && shell?.getAttribute('data-maplibre-render-state') === 'ready';
    }, null, { timeout: 30000 }).catch(() => {});

    if (vp.width >= 1024) {
      await page.waitForFunction(() => {
        const shell = document.querySelector('[data-maplibre-spike]');
        return shell?.getAttribute('data-maplibre-source-state') === 'available';
      }, null, { timeout: 45000 }).catch(() => {});
    }

    await page.waitForTimeout(2500);

    const file = path.join(outDir, `maplibre-maarif-${vp.name}.png`);
    const mapFile = path.join(outDir, `maplibre-map-${vp.name}.png`);
    const mapLocator = page.locator('[data-maplibre-map-surface]');
    const mapBox = await mapLocator.boundingBox();
    if (!mapBox || mapBox.width < 1 || mapBox.height < 1) throw new Error(`MapLibre map surface has no stable bounding box at ${vp.name}`);
    const clip = {
      x: Math.max(0, mapBox.x), y: Math.max(0, mapBox.y),
      width: Math.min(mapBox.width, vp.width - Math.max(0, mapBox.x)),
      height: Math.min(mapBox.height, vp.height - Math.max(0, mapBox.y)),
    };
    await page.screenshot({ path: mapFile, clip, animations: 'disabled' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: file, fullPage: false, animations: 'disabled' });

    const mapStat = await fs.stat(mapFile);
    const shell = await shellLocator.boundingBox().catch(() => null);
    const canvasCount = await page.locator('.maplibre-spike-map canvas').count();
    const readyState = await shellLocator.getAttribute('data-maplibre-ready');
    const renderState = await shellLocator.getAttribute('data-maplibre-render-state');
    const sourceState = await shellLocator.getAttribute('data-maplibre-source-state');
    const buildingsSource = await shellLocator.getAttribute('data-maplibre-source');
    const buildingsCount = Number(await shellLocator.getAttribute('data-maplibre-building-count') ?? '0');
    const contextState = await shellLocator.getAttribute('data-maplibre-context-state');
    const anchorCount = Number(await shellLocator.getAttribute('data-maplibre-anchor-count') ?? '0');

    results.push({
      viewport: vp,
      httpStatus: response?.status() ?? null,
      readyState, renderState, sourceState, buildingsSource, buildingsCount, contextState, anchorCount,
      canvasCount, shell, mapScreenshotBytes: mapStat.size,
      failedRequests, failedResponses,
      requiredFailedRequests: failedRequests,
      requiredFailedResponses: failedResponses,
      screenshot: file, mapScreenshot: mapFile,
    });
    await context.close();
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    mode: 'maplibre-morocco-3d-spike',
    route,
    zeroDbWritesByScript: true,
    zeroDeploymentActionsByScript: true,
    usesLocalMaarifBuildingAsset: false,
    vectorBuildingSource: 'https://tiles.openfreemap.org/planet',
    minMapScreenshotBytes,
    minDesktopBuildings,
    results,
  };
  await fs.writeFile(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));

  if (results.some((r) =>
    !r.httpStatus || r.httpStatus >= 400
    || r.readyState !== 'true'
    || r.renderState !== 'ready'
    || r.contextState !== 'ready'
    || r.anchorCount < 1
    || r.canvasCount < 1
    || r.mapScreenshotBytes < minMapScreenshotBytes
    || r.requiredFailedRequests.length > 0
    || r.requiredFailedResponses.length > 0
    || (r.viewport.width >= 1024 && r.sourceState !== 'available')
    || (r.viewport.width >= 1024 && r.buildingsSource !== 'openfreemap-vector')
    || (r.viewport.width >= 1024 && r.buildingsCount < minDesktopBuildings)
  )) process.exitCode = 2;
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
