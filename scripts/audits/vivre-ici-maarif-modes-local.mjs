import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const base = process.env.BASE_URL || "http://127.0.0.1:3210";
const dir = path.resolve("artifacts/vivre-ici-local-maarif/modes-after");
const viewports = [
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 900 },
  { width: 1280, height: 900 },
];
await fs.mkdir(dir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const vp of viewports) {
    const context = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    const result = { viewport: String(vp.width), ok: false, errors, failure: null };
    try {
      await page.goto(base + "/map?city=casablanca&district=maarif&layer=explore", { waitUntil: "domcontentloaded", timeout: 60000 });
      const root = page.locator('[data-l3-maarif-pilot="true"]');
      await root.waitFor({ state: "visible", timeout: 30000 });
      await page.waitForFunction(() => document.querySelector('[data-l3-maarif-pilot="true"]')?.getAttribute("data-maplibre-ready") === "true", null, { timeout: 30000 });
      const getView = () => root.getAttribute("data-l3-maarif-view");
      if (await getView() !== "quartier") throw new Error("initial view not quartier");
      if (await root.getAttribute("data-l3-admin-boundary") !== "unavailable") throw new Error("unlicensed admin geometry exposed");
      if (await page.locator("[data-l3-admin-unavailable]").count() !== 0) throw new Error("admin panel shown by default");
      await page.locator("[data-l3-go-admin]").click();
      if (await getView() !== "limites") throw new Error("admin action failed");
      const panel = page.locator("[data-l3-admin-unavailable]");
      await panel.waitFor({ state: "visible", timeout: 5000 });
      const content = await panel.innerText();
      if (!content.includes("Limites non disponibles") || !content.includes("arrondissement") || !content.includes("pas sa frontière")) throw new Error("boundary disclaimer incomplete");
      await page.screenshot({ path: path.join(dir, "admin-" + vp.width + "x" + vp.height + ".png"), animations: "disabled" });
      const bounds = await page.locator("[data-l3-go-admin]").boundingBox();
      if (!bounds || bounds.height < 44 || bounds.width < 44) throw new Error("admin touch target too small");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (overflow > 0) throw new Error("horizontal overflow " + overflow);
      await page.locator("[data-l3-admin-return]").click();
      if (await getView() !== "quartier" || await panel.count()) throw new Error("return action failed");
      await page.locator("[data-l3-go-street]").click();
      await page.waitForFunction(() => {
        const el = document.querySelector("[data-l3-maarif-pilot]");
        return el?.getAttribute("data-l3-maarif-view") === "rue" && Number(el?.getAttribute("data-l3-camera-zoom")) >= 16.5;
      }, null, { timeout: 10000 });
      await page.screenshot({ path: path.join(dir, "street-" + vp.width + "x" + vp.height + ".png"), animations: "disabled" });
      await page.locator("[data-l3-go-quarter]").click();
      await page.waitForFunction(() => document.querySelector("[data-l3-maarif-pilot]")?.getAttribute("data-l3-maarif-view") === "quartier", null, { timeout: 5000 });
      const href = await page.locator("[data-p4-map-decision-rail] a[href^='/search']").first().getAttribute("href");
      if (href !== "/search?city=Casablanca&district=Ma%C3%A2rif") throw new Error("search handoff changed: " + href);
      result.ok = true;
      result.boundaryStatus = await root.getAttribute("data-l3-admin-boundary");
      result.source = await root.getAttribute("data-maplibre-source");
      result.touched = Math.round(bounds.height) + "px";
      result.overflow = overflow;
      result.handoff = href;
    } catch (error) {
      result.failure = String(error);
    }
    results.push(result);
    await context.close();
  }
} finally {
  await browser.close();
}
await fs.writeFile(path.join(dir, "report.json"), JSON.stringify(results, null, 2));
console.log(JSON.stringify({ ok: results.every((r) => r.ok), cases: results }));
if (!results.every((r) => r.ok)) process.exitCode = 1;
