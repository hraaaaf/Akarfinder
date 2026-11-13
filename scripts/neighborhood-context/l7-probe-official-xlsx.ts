import { createHash } from "node:crypto";
import { INSTITUTIONAL_DATASETS_2026 } from "@/lib/neighborhood-context/institutional-admission";
import { inspectInstitutionalXlsxHeaders } from "@/lib/neighborhood-context/institutional-xlsx-inspector";

const MAX_DOWNLOAD_BYTES = 3 * 1024 * 1024;
const MAX_REDIRECTS = 2;
// Exact official resource link from the MENPS CKAN page (July 2026 edition).
export const MENPS_PRIMARY_2026_RESOURCE_URL =
  "https://data.gov.ma/data/fr/dataset/4de8f7dc-c536-44e8-93a8-3efd2aca2c52/resource/f98bdb47-19a8-4f4d-8407-ae08b56305d5/download/etablissements_publics_primaire_juillet-2026.xlsx";

function permittedOfficialResource(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" &&
      ["data.gov.ma", "www.data.gov.ma"].includes(url.hostname) &&
      url.pathname.startsWith("/data/fr/dataset/") &&
      url.pathname.toLowerCase().endsWith(".xlsx") &&
      !url.username && !url.password;
  } catch {
    return false;
  }
}

async function downloadOfficialXlsx(): Promise<{ bytes: Buffer; finalUrl: string; contentType: string | null }> {
  let url = MENPS_PRIMARY_2026_RESOURCE_URL;
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    if (!permittedOfficialResource(url)) throw new Error("blocked_untrusted_resource_origin");
    const response = await fetch(url, {
      redirect: "manual",
      headers: { Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/octet-stream" },
      signal: AbortSignal.timeout(18_000),
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error("redirect_missing_location");
      url = new URL(location, url).href;
      continue;
    }
    if (!response.ok) throw new Error("http_" + response.status);
    const length = Number(response.headers.get("content-length"));
    if (Number.isFinite(length) && length > MAX_DOWNLOAD_BYTES) throw new Error("source_too_large");
    if (!response.body) throw new Error("response_body_missing");
    const reader = response.body.getReader();
    const chunks: Buffer[] = [];
    let size = 0;
    try {
      for (;;) {
        const result = await reader.read();
        if (result.done) break;
        size += result.value.byteLength;
        if (size > MAX_DOWNLOAD_BYTES) throw new Error("source_too_large");
        chunks.push(Buffer.from(result.value));
      }
    } finally {
      await reader.cancel().catch(() => {});
    }
    const bytes = Buffer.concat(chunks);
    if (bytes.length < 22 || bytes.readUInt32LE(0) !== 0x04034b50) throw new Error("not_a_valid_xlsx_zip");
    return { bytes, finalUrl: url, contentType: response.headers.get("content-type") };
  }
  throw new Error("too_many_redirects");
}

export async function runL7OfficialXlsxHeaderProbe(now = new Date()) {
  const source = INSTITUTIONAL_DATASETS_2026.find((item) => item.id === "menps-primary-2026-07");
  if (!source) throw new Error("catalogue_primary_source_missing");
  const report = {
    schema: "NCI_L7_MENPS_XLSX_HEADER_PROBE_V1",
    generated_at: now.toISOString(),
    executed_only_in_github_actions: process.env.GITHUB_ACTIONS === "true",
    source_id: source.id,
    publisher: source.publisher,
    source_dataset_date: source.dataset_as_of,
    source_portal_modified_date: source.portal_modified_on,
    official_resource_url: MENPS_PRIMARY_2026_RESOURCE_URL,
    download_status: "not_started",
    download_sha256: null as string | null,
    download_bytes: 0,
    content_type: null as string | null,
    final_url: null as string | null,
    header_inspection: null as ReturnType<typeof inspectInstitutionalXlsxHeaders> | null,
    error: null as string | null,
    gps_values_verified: false,
    entity_identity_verified: false,
    entity_observed_at: null,
    accepted_public_pois: 0,
    public_publish_allowed: false,
    note: "This reads XLSX header candidates ONLY. A recent download or column name is never a recent verification of a school or its GPS.",
  };
  if (process.env.GITHUB_ACTIONS !== "true") {
    report.download_status = "disabled_outside_github_actions";
    return report;
  }
  try {
    const downloaded = await downloadOfficialXlsx();
    report.download_bytes = downloaded.bytes.length;
    report.download_sha256 = createHash("sha256").update(downloaded.bytes).digest("hex");
    report.content_type = downloaded.contentType;
    report.final_url = downloaded.finalUrl;
    report.header_inspection = inspectInstitutionalXlsxHeaders(downloaded.bytes);
    report.download_status = "downloaded_and_header_inspected";
  } catch (error) {
    report.download_status = "unavailable_fail_closed";
    report.error = error instanceof Error ? error.message.slice(0, 180) : "unknown_probe_error";
  }
  return report;
}
