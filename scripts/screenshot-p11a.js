// P11A — Screenshot generator for Pro landing page
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const BASE_URL = "http://localhost:3010";
const OUTPUT_DIR = path.join(__dirname, "../public/screenshots");
const PRO_URL = "/pro";

async function run() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  // Desktop
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE_URL + PRO_URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUTPUT_DIR, "p11a-pro-landing-desktop.png") });
    console.log("Saved: p11a-pro-landing-desktop.png");
    await ctx.close();
  }

  // Mobile
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto(BASE_URL + PRO_URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUTPUT_DIR, "p11a-pro-landing-mobile.png") });
    console.log("Saved: p11a-pro-landing-mobile.png");
    await ctx.close();
  }

  await browser.close();
  console.log("Screenshots done.");
}

run().catch((err) => { console.error(err); process.exit(1); });
