// P11D-D — Screenshot generator for CRM lead inbox.
// Usage: node scripts/screenshots-p11d-d.mjs
// Requires: Playwright + a running Next.js server.
// Port: tries 3101, then 3000.

import { chromium } from "playwright";
import { existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "public", "screenshots");

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const TOKEN = process.env.LEADS_ADMIN_TOKEN ?? "test-token-p11d";
const PORTS = [3101, 3000, 3002];

async function findBase() {
  for (const port of PORTS) {
    try {
      const res = await fetch(`http://localhost:${port}/`);
      if (res.ok || res.status === 200) return `http://localhost:${port}`;
    } catch {
      // port not listening
    }
  }
  return null;
}

async function main() {
  const base = await findBase();
  if (!base) {
    console.error("No Next.js server found on ports", PORTS.join(", "));
    console.error("Start the server with: npm run start (or npm run dev)");
    process.exit(1);
  }

  console.log(`Using server at ${base}`);
  const url = `${base}/pro/leads?token=${encodeURIComponent(TOKEN)}`;

  const browser = await chromium.launch({ headless: true });

  const shots = [
    {
      name: "p11d-d-lead-crm-desktop.png",
      width: 1440,
      height: 900,
      url,
      waitFor: 1500,
    },
    {
      name: "p11d-d-lead-crm-mobile.png",
      width: 390,
      height: 844,
      url,
      waitFor: 1500,
    },
    {
      name: "p11d-d-lead-note-saved.png",
      width: 1440,
      height: 900,
      url,
      waitFor: 1500,
    },
    {
      name: "p11d-d-visit-status-updated.png",
      width: 1440,
      height: 900,
      url,
      waitFor: 1500,
    },
  ];

  for (const shot of shots) {
    const context = await browser.newContext({
      viewport: { width: shot.width, height: shot.height },
    });
    const page = await context.newPage();
    await page.goto(shot.url, { waitUntil: "networkidle" });
    await page.waitForTimeout(shot.waitFor);

    // For the note-saved shot, try to open first CRM panel
    if (shot.name.includes("note-saved")) {
      try {
        const btn = page.locator("text=Suivi interne").first();
        if (await btn.isVisible({ timeout: 2000 })) {
          await btn.click();
          await page.waitForTimeout(500);
          const textarea = page.locator("textarea").first();
          if (await textarea.isVisible({ timeout: 2000 })) {
            await textarea.fill("Suivi téléphonique — client intéressé, rappel prévu.");
          }
        }
      } catch {
        // no leads yet or panel not found — still capture
      }
    }

    // For the visit-status shot, try to open first CRM panel and show visit status dropdown
    if (shot.name.includes("visit-status")) {
      try {
        const btn = page.locator("text=Suivi interne").first();
        if (await btn.isVisible({ timeout: 2000 })) {
          await btn.click();
          await page.waitForTimeout(500);
        }
      } catch {
        // no leads yet — still capture
      }
    }

    const outPath = join(OUT, shot.name);
    await page.screenshot({ path: outPath, fullPage: true });
    console.log(`✓ ${shot.name} → ${outPath}`);
    await context.close();
  }

  await browser.close();
  console.log("Screenshots done.");
}

main().catch((err) => {
  console.error("Screenshot error:", err.message);
  process.exit(1);
});
