import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.SEARCH_UX_FAST_BASE_URL ?? "http://127.0.0.1:3000";
const outputDir = "data/audits/search-ux-fast-1";
const route = "/search?q=appartement%20rabat";
const viewports = [
  { name: "mobile-360x800", width: 360, height: 800 },
  { name: "mobile-390x844", width: 390, height: 844 },
  { name: "desktop-1280x800", width: 1280, height: 800 },
  { name: "desktop-1440x900", width: 1440, height: 900 },
];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    const response = await page.goto(`${baseUrl}${route}`, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });

    if (!response || response.status() >= 400) {
      throw new Error(`${viewport.name}: search route returned ${response?.status() ?? "no response"}`);
    }

    await page.waitForSelector("#property-search", { timeout: 20_000 });
    await page.waitForTimeout(1_500);

    const firstResult = page.locator('article[data-property-active], a.group.flex.flex-col').first();
    const firstResultCount = await firstResult.count();
    if (firstResultCount === 0) {
      throw new Error(`${viewport.name}: no result card found`);
    }

    const metrics = await page.evaluate(() => {
      const first = document.querySelector('article[data-property-active], a.group.flex.flex-col');
      const search = document.querySelector("#property-search");
      const sort = document.querySelector('select[aria-label="Trier les résultats"]');
      const bodyText = document.body.innerText;
      const rect = first?.getBoundingClientRect();
      return {
        first_result_top: rect ? Math.round(rect.top) : null,
        first_result_visible_in_initial_viewport: rect ? rect.top < window.innerHeight : false,
        search_top: search ? Math.round(search.getBoundingClientRect().top) : null,
        sort_top: sort ? Math.round(sort.getBoundingClientRect().top) : null,
        viewport_height: window.innerHeight,
        viewport_width: window.innerWidth,
        client_width: document.documentElement.clientWidth,
        scroll_width: document.documentElement.scrollWidth,
        horizontal_overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        old_hero_present: bodyText.includes("Trouvez votre bien au Maroc"),
        old_ranking_explanation_present: bodyText.includes("Ordre strict : promoteurs premium"),
        old_project_prompt_present: bodyText.includes("Besoin de clarifier vos priorités"),
      };
    });

    if (metrics.horizontal_overflow) {
      throw new Error(`${viewport.name}: horizontal overflow ${metrics.scroll_width}/${metrics.client_width}`);
    }
    if (metrics.old_hero_present || metrics.old_ranking_explanation_present || metrics.old_project_prompt_present) {
      throw new Error(`${viewport.name}: pre-result noise regression detected`);
    }
    if (!metrics.first_result_visible_in_initial_viewport) {
      throw new Error(`${viewport.name}: first result starts below initial viewport at ${metrics.first_result_top}px`);
    }

    await page.screenshot({
      path: `${outputDir}/${viewport.name}.png`,
      fullPage: true,
    });

    results.push({ name: viewport.name, ...metrics });
    await page.close();
  }
} finally {
  await browser.close();
}

await writeFile(
  `${outputDir}/metrics.json`,
  `${JSON.stringify({ route, generated_at: new Date().toISOString(), results }, null, 2)}\n`,
  "utf8",
);

console.log(JSON.stringify(results, null, 2));
