import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const target = process.env.TARGET_URL || 'https://akarfinder.vercel.app/search?city=Casablanca';
const outDir = 'artifacts/search-results-before';
const viewports = [
  { name: '390', width: 390, height: 844 },
  { name: '430', width: 430, height: 932 },
  { name: '768', width: 768, height: 1024 },
  { name: '1280', width: 1280, height: 900 },
];

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

for (const viewport of viewports) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(8_000);

  await page.screenshot({
    path: `${outDir}/${viewport.name}-top.png`,
    fullPage: false,
  });

  const externalHeading = page.getByText('Autres annonces', { exact: true }).first();
  if (await externalHeading.count()) {
    await externalHeading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(750);
    await page.screenshot({
      path: `${outDir}/${viewport.name}-external.png`,
      fullPage: false,
    });
  }

  const bodyText = await page.locator('body').innerText();
  const totalMatch = bodyText.match(/([0-9][0-9\s]*)\s+r[ée]sultats/i);
  console.log(JSON.stringify({ viewport: viewport.name, totalText: totalMatch?.[0] ?? null }));
  await context.close();
}

await browser.close();
