import { chromium } from "playwright";
import fs from "node:fs/promises";

const output = process.env.AUDIT_OUTPUT_DIR ?? "artifacts/landmark-visual-system";
const base = process.env.BASE_URL ?? "http://127.0.0.1:3218";
const route = "/map?city=casablanca&layer=explore";
const views = [
  ["390x844", 390, 844],
  ["768x900", 768, 900],
  ["1280x900", 1280, 900],
  ["1448x1086", 1448, 1086],
];

await fs.mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const report = [];

for (const [name, width, height] of views) {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));

  await page.goto(base + route, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-akarfinder-national-view="city"]', { timeout: 45000 });
  await page.waitForFunction(
    () => Boolean(window.__AKARFINDER_NATIONAL_MAP__),
    null,
    { timeout: 45000 },
  );

  await page.evaluate(async () => {
    const map = window.__AKARFINDER_NATIONAL_MAP__;
    map.jumpTo({ center: [-7.63, 33.56], zoom: 11.45 });
    await new Promise((resolve) => map.once("idle", resolve));
  });
  await page.waitForTimeout(650);

  const metrics = await page.evaluate(() => {
    const cards = [...document.querySelectorAll("[data-landmark-card]")].map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        id: element.getAttribute("data-landmark-card"),
        tier: element.getAttribute("data-landmark-tier"),
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      };
    });

    let overlaps = 0;
    for (let i = 0; i < cards.length; i += 1) {
      for (let j = i + 1; j < cards.length; j += 1) {
        const a = cards[i];
        const b = cards[j];
        const separated =
          a.x + a.width + 4 <= b.x ||
          b.x + b.width + 4 <= a.x ||
          a.y + a.height + 4 <= b.y ||
          b.y + b.height + 4 <= a.y;
        if (!separated) overlaps += 1;
      }
    }

    const sidebar = document.querySelector("[data-landmark-sidebar]");
    const rail = document.querySelector("[data-landmark-mobile-rail]");
    return {
      cards,
      overlaps,
      sidebarVisible: Boolean(sidebar && getComputedStyle(sidebar).display !== "none"),
      mobileRailVisible: Boolean(rail && getComputedStyle(rail).display !== "none"),
      horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    };
  });

  await page.screenshot({
    path: output + "/after-" + name + ".png",
    fullPage: true,
  });
  report.push({ name, width, height, pageErrors, metrics });
  await page.close();
}

await browser.close();
await fs.writeFile(output + "/report.json", JSON.stringify(report, null, 2));

const failures = report.flatMap((entry) => {
  const items = [];
  if (entry.pageErrors.length) items.push(entry.name + ":pageErrors");
  if (entry.metrics.overlaps > 0) items.push(entry.name + ":overlaps=" + entry.metrics.overlaps);
  if (entry.metrics.horizontalOverflow > 1) items.push(entry.name + ":overflow=" + entry.metrics.horizontalOverflow);
  if (entry.width >= 1024 && !entry.metrics.sidebarVisible) items.push(entry.name + ":sidebar-missing");
  if (entry.width < 1024 && !entry.metrics.mobileRailVisible) items.push(entry.name + ":mobile-rail-missing");
  return items;
});

if (failures.length) {
  console.error(JSON.stringify({ failures, report }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ failures: [], report }, null, 2));
}
