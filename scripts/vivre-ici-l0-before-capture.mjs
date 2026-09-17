import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.AKARFINDER_LIVE_URL || 'https://akarfinder.vercel.app';
const targetUrl = `${baseUrl.replace(/\/$/, '')}/map`;
const outDir = 'artifacts/vivre-ici-l0-before';

const viewports = [
  { name: '390x844', width: 390, height: 844 },
  { name: '430x932', width: 430, height: 932 },
  { name: '768x900', width: 768, height: 900 },
  { name: '1280x900', width: 1280, height: 900 },
];

await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const vp of viewports) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    const response = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2500);

    const finalUrl = page.url();
    const title = await page.title();
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const file = path.join(outDir, `map-before-${vp.name}.png`);
    await page.screenshot({ path: file, fullPage: true });

    results.push({
      viewport: vp,
      requestedUrl: targetUrl,
      finalUrl,
      httpStatus: response?.status() ?? null,
      title,
      bodyTextLength: bodyText.length,
      screenshot: file,
    });
    await context.close();
  }
} finally {
  await browser.close();
}

const summary = {
  generatedAt: new Date().toISOString(),
  mode: 'read-only-live-before',
  surface: 'vivre-ici-foundation-/map',
  zeroDbWritesByScript: true,
  zeroDeploymentActionsByScript: true,
  targetUrl,
  results,
};

await fs.writeFile(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));

if (results.some((r) => r.httpStatus && r.httpStatus >= 400)) process.exit(2);
if (results.some((r) => !r.screenshot)) process.exit(3);
