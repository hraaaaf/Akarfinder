import { mkdir, writeFile } from "node:fs/promises";
import { RABAT_REAL_PHOTO_ASSETS } from "../../lib/contextual-illustrations/rabat-real-photo-library";

const OUTPUT_DIR = "data/audits/rabat-real-photo-library-1";
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const USER_AGENT = "AkarFinder/1.0 (real-photo-license-validation; https://akarfinder.vercel.app)";
const ATTRIBUTION_LICENSE_PATTERN = /^CC BY(?:-SA)?(?: |$)/i;
const CC0_PATTERN = /^CC0(?: |$)/i;

type CommonsExtMetadata = {
  LicenseShortName?: { value?: string };
  LicenseUrl?: { value?: string };
  Artist?: { value?: string };
  Credit?: { value?: string };
};

type CommonsImageInfo = {
  url?: string;
  thumburl?: string;
  mime?: string;
  extmetadata?: CommonsExtMetadata;
};

type CommonsPage = {
  pageid?: number;
  title?: string;
  missing?: boolean;
  imageinfo?: CommonsImageInfo[];
};

type CommonsApiResponse = {
  query?: {
    pages?: CommonsPage[];
  };
};

function normalizeTitle(value: string): string {
  return value
    .normalize("NFC")
    .replace(/_/g, " ")
    .trim()
    .toLocaleLowerCase("en-US");
}

function isCompatibleCommonsLicense(license: string, licenseUrl: string): boolean {
  const normalizedUrl = licenseUrl.replace(/^http:/i, "https:");
  if (ATTRIBUTION_LICENSE_PATTERN.test(license)) {
    return normalizedUrl.startsWith("https://creativecommons.org/licenses/");
  }
  if (CC0_PATTERN.test(license)) {
    return normalizedUrl.startsWith("https://creativecommons.org/publicdomain/zero/");
  }
  return false;
}

async function fetchCommonsMetadata(): Promise<CommonsPage[]> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    prop: "imageinfo",
    iiprop: "url|mime|extmetadata",
    iiurlwidth: "960",
    redirects: "1",
    titles: RABAT_REAL_PHOTO_ASSETS.map((asset) => `File:${asset.fileName}`).join("|"),
  });

  const response = await fetch(COMMONS_API, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
      "user-agent": USER_AGENT,
    },
    body: params,
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`Commons API returned ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as CommonsApiResponse;
  return payload.query?.pages ?? [];
}

function stripHtml(value?: string): string | null {
  if (!value) return null;
  return value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim() || null;
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const pages = await fetchCommonsMetadata();
  const byTitle = new Map(
    pages
      .filter((page) => page.title)
      .map((page) => [normalizeTitle(page.title!), page] as const),
  );

  const results: Array<Record<string, unknown>> = [];
  const failures: string[] = [];

  for (const asset of RABAT_REAL_PHOTO_ASSETS) {
    const expectedTitle = `File:${asset.fileName}`;
    const page = byTitle.get(normalizeTitle(expectedTitle));
    if (!page || page.missing || !page.pageid) {
      failures.push(`${asset.id}: Commons file does not exist (${expectedTitle})`);
      continue;
    }

    const imageInfo = page.imageinfo?.[0];
    const license = imageInfo?.extmetadata?.LicenseShortName?.value?.trim() ?? "";
    const licenseUrl = imageInfo?.extmetadata?.LicenseUrl?.value?.trim() ?? "";
    const canonicalImageUrl = imageInfo?.thumburl ?? imageInfo?.url ?? "";
    const mime = imageInfo?.mime ?? "";

    if (!isCompatibleCommonsLicense(license, licenseUrl)) {
      failures.push(`${asset.id}: incompatible or missing reusable Commons license (${license || "none"})`);
      continue;
    }
    if (!canonicalImageUrl.startsWith("https://upload.wikimedia.org/") || !mime.startsWith("image/")) {
      failures.push(`${asset.id}: Commons API returned no canonical image URL`);
      continue;
    }

    results.push({
      id: asset.id,
      district: asset.district,
      file_name: asset.fileName,
      source_page: asset.sourcePage,
      canonical_image_url: canonicalImageUrl,
      mime,
      license,
      license_url: licenseUrl,
      creator: stripHtml(imageInfo?.extmetadata?.Artist?.value),
      credit: stripHtml(imageInfo?.extmetadata?.Credit?.value),
    });
  }

  const report = {
    generated_at: new Date().toISOString(),
    validation_method: "single MediaWiki imageinfo/extmetadata batch query",
    accepted_licenses: ["CC BY", "CC BY-SA", "CC0"],
    expected: 40,
    verified: results.length,
    failures,
    results,
  };
  await writeFile(`${OUTPUT_DIR}/source-check.json`, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  if (results.length !== 40 || failures.length > 0) {
    throw new Error(`Rabat real-photo source validation failed: ${results.length}/40 verified; ${failures.join(" | ")}`);
  }

  console.log(`Rabat real-photo Commons metadata verified: ${results.length}/40`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
