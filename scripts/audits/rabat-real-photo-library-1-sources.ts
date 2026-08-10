import { mkdir, writeFile } from "node:fs/promises";
import { RABAT_REAL_PHOTO_ASSETS } from "../../lib/contextual-illustrations/rabat-real-photo-library";

const OUTPUT_DIR = "data/audits/rabat-real-photo-library-1";
const USER_AGENT = "AkarFinder/1.0 (real-photo-license-validation; https://akarfinder.vercel.app)";
const LICENSE_PATTERN = /Creative Commons Attribution|CC[- ]BY|CC[- ]BY-SA/i;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url: string, init: RequestInit = {}, attempts = 3): Promise<Response> {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        redirect: "follow",
        headers: { "user-agent": USER_AGENT, ...(init.headers ?? {}) },
        signal: AbortSignal.timeout(20_000),
      });
      if (response.status !== 429 && response.status < 500) return response;
      lastError = new Error(`${response.status} ${response.statusText}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(600 * attempt);
  }
  throw lastError instanceof Error ? lastError : new Error(`Failed to fetch ${url}`);
}

async function verifyAsset(asset: (typeof RABAT_REAL_PHOTO_ASSETS)[number]) {
  const sourceResponse = await fetchWithRetry(asset.sourcePage);
  if (!sourceResponse.ok) throw new Error(`${asset.id}: source page returned ${sourceResponse.status}`);
  const html = await sourceResponse.text();
  if (!LICENSE_PATTERN.test(html)) throw new Error(`${asset.id}: no Creative Commons attribution license found`);

  const imageResponse = await fetchWithRetry(asset.asset);
  const contentType = imageResponse.headers.get("content-type") ?? "";
  if (!imageResponse.ok || !contentType.toLowerCase().startsWith("image/")) {
    await imageResponse.body?.cancel();
    throw new Error(`${asset.id}: asset is not a reachable image (${imageResponse.status}, ${contentType || "no content-type"})`);
  }
  await imageResponse.body?.cancel();

  return {
    id: asset.id,
    district: asset.district,
    source_page: asset.sourcePage,
    final_image_url: imageResponse.url,
    content_type: contentType,
    creative_commons_license_detected: true,
  };
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const results: Awaited<ReturnType<typeof verifyAsset>>[] = [];
  const failures: string[] = [];
  const queue = [...RABAT_REAL_PHOTO_ASSETS];

  async function worker() {
    while (queue.length > 0) {
      const asset = queue.shift();
      if (!asset) return;
      try {
        results.push(await verifyAsset(asset));
      } catch (error) {
        failures.push(error instanceof Error ? error.message : String(error));
      }
    }
  }

  await Promise.all(Array.from({ length: 4 }, () => worker()));
  results.sort((a, b) => a.id.localeCompare(b.id));
  failures.sort();

  const report = {
    generated_at: new Date().toISOString(),
    expected: 40,
    verified: results.length,
    failures,
    results,
  };
  await writeFile(`${OUTPUT_DIR}/source-check.json`, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  if (results.length !== 40 || failures.length > 0) {
    throw new Error(`Rabat real-photo source validation failed: ${results.length}/40 verified; ${failures.join(" | ")}`);
  }

  console.log(`Rabat real-photo sources verified: ${results.length}/40`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
