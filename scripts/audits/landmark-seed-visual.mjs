import { chromium } from "playwright";
import fs from "node:fs/promises";

const out = process.env.AUDIT_OUTPUT_DIR || "artifacts/landmark-seed-visual";
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
await page.goto((process.env.BASE_URL || "http://127.0.0.1:3218") + "/visual-qa/landmark-seed", { waitUntil: "networkidle" });
await page.screenshot({ path: out + "/casablanca-landmark-seed-1440x1000.png", fullPage: true });
await browser.close();
