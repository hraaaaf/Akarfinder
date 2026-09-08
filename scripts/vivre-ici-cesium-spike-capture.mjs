import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const outDir = 'artifacts/vivre-ici-cesium-spike';
const baseUrl = 'http://127.0.0.1:3000';
const route = '/map/cesium-spike';
const minMapScreenshotBytes = 20000;
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
      if (/arcgisonline|cesium|jsdelivr/i.test(url)) {
        failedRequests.push({ url, error: request.failure()?.errorText ?? 'unknown' });
      }
    });
    page.on('response', (response) => {
      const url = response.url();
      if (/arcgisonline|cesium|jsdelivr/i.test(url) && response.status() >= 400) {
        failedResponses.push({ url, status: response.status() });
      }
    });

    const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const shellLocator = page.locator('[data-cesium-spike]');
    await shellLocator.waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForFunction(() => {
      const shell = document.querySelector('[data-cesium-spike]');
      return shell?.getAttribute('data-cesium-ready') === 'true'
        && shell?.getAttribute('data-cesium-render-state') === 'ready';
    }, null, { timeout: 30000 }).catch(() => {});

    if (vp.width >= 1024) {
      await page.waitForFunction(() => {
        const shell = document.querySelector('[data-cesium-spike]');
        const state = shell?.getAttribute('data-cesium-buildings-state');
        return state === 'available' || state === 'unavailable';
      }, null, { timeout: 15000 }).catch(() => {});
    }

    await page.waitForTimeout(2500);

    const file = path.join(outDir, `cesium-maarif-${vp.name}.png`);
    const mapFile = path.join(outDir, `cesium-map-${vp.name}.png`);
    const mapLocator = page.locator('[data-cesium-map-surface]');
    const mapBox = await mapLocator.boundingBox();
    if (!mapBox || mapBox.width < 1 || mapBox.height < 1) {
      throw new Error(`Cesium map surface has no stable bounding box at ${vp.name}`);
    }
    const clip = {
      x: Math.max(0, mapBox.x),
      y: Math.max(0, mapBox.y),
      width: Math.min(mapBox.width, vp.width - Math.max(0, mapBox.x)),
      height: Math.min(mapBox.height, vp.height - Math.max(0, mapBox.y)),
    };
    await page.screenshot({ path: mapFile, clip, animations: 'disabled' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: file, fullPage: false, animations: 'disabled' });

    const mapStat = await fs.stat(mapFile);
    const shell = await shellLocator.boundingBox().catch(() => null);
    const canvasCount = await page.locator('.cesium-spike-map canvas').count();
    const readyState = await shellLocator.getAttribute('data-cesium-ready');
    const renderState = await shellLocator.getAttribute('data-cesium-render-state');
    const imageryLayerCount = Number(await shellLocator.getAttribute('data-cesium-imagery-layers') ?? '0');
    const boundaryState = await shellLocator.getAttribute('data-cesium-boundary-state');
    const contextState = await shellLocator.getAttribute('data-cesium-context-state');
    const anchorCount = Number(await shellLocator.getAttribute('data-cesium-anchor-count') ?? '0');
    const dayModeState = await shellLocator.getAttribute('data-cesium-day-mode');
    const buildingsState = await shellLocator.getAttribute('data-cesium-buildings-state');
    const requiredFailedResponses = failedResponses.filter((entry) => !/api\.cesium\.com\/v1\/assets\/96188\/endpoint/i.test(entry.url));

    results.push({
      viewport: vp,
      httpStatus: response?.status() ?? null,
      readyState,
      renderState,
      imageryLayerCount,
      boundaryState,
      contextState,
      anchorCount,
      dayModeState,
      buildingsState,
      canvasCount,
      shell,
      mapScreenshotBytes: mapStat.size,
      failedRequests,
      failedResponses,
      requiredFailedResponses,
      screenshot: file,
      mapScreenshot: mapFile,
    });
    await context.close();
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    mode: 'cesium-spike-neighborhood-detail',
    route,
    zeroDbWritesByScript: true,
    zeroDeploymentActionsByScript: true,
    minMapScreenshotBytes,
    results,
  };
  await fs.writeFile(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));

  if (results.some((r) =>
    !r.httpStatus
    || r.httpStatus >= 400
    || r.readyState !== 'true'
    || r.renderState !== 'ready'
    || r.imageryLayerCount < 1
    || r.boundaryState !== 'reference'
    || r.contextState !== 'ready'
    || r.anchorCount < 1
    || r.canvasCount < 1
    || r.mapScreenshotBytes < minMapScreenshotBytes
    || r.requiredFailedResponses.length > 0
    || (r.viewport.width >= 1024 && r.dayModeState !== 'true')
    || (r.viewport.width >= 1024 && r.buildingsState !== 'available')
  )) process.exitCode = 2;
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
