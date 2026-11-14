import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { INSTITUTIONAL_DATASETS_2026 } from "@/lib/neighborhood-context/institutional-admission";
import { inspectInstitutionalXlsxHeaders, scanInstitutionalSchoolTextCandidates } from "@/lib/neighborhood-context/institutional-xlsx-inspector";

const MAX_DOWNLOAD_BYTES = 3 * 1024 * 1024;
const MAX_REDIRECTS = 2;
// Exact official resource link from the MENPS CKAN page (July 2026 edition).
export const MENPS_PRIMARY_2026_RESOURCE_URL =
  "https://data.gov.ma/data/fr/dataset/4de8f7dc-c536-44e8-93a8-3efd2aca2c52/resource/f98bdb47-19a8-4f4d-8407-ae08b56305d5/download/etablissements_publics_primaire_juillet-2026.xlsx";

export function permittedOfficialResource(raw: string): boolean {
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


/**
 * cURL honors the GitHub runner's managed HTTPS proxy, whereas Node's bare
 * fetch may not. No shell, no redirects, no credential override, no --insecure.
 * Headers/rows are never retained in the CI artifact; only a SHA and schema.
 */
export function officialCurlArguments(raw: string): string[] {
  if (!permittedOfficialResource(raw)) throw new Error("blocked_untrusted_resource_origin");
  return [
    "--silent", "--show-error", "--fail", "--retry", "0",
    "--proto", "=https", "--max-time", "18", "--connect-timeout", "8",
    "--max-filesize", String(MAX_DOWNLOAD_BYTES),
    "--output", "-",
    "--write-out", "%{stderr}NCI_CURL_HTTP=%{http_code};NCI_CURL_TYPE=%{content_type}\n",
    "--header", "Accept: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/octet-stream",
    raw,
  ];
}

function fetchCauseCode(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  const cause = (error as Error & { cause?: { code?: unknown } }).cause;
  const code = cause?.code;
  return typeof code === "string" && /^[A-Z][A-Z0-9_]{1,63}$/.test(code) ? code : null;
}

type OfficialDownload = { bytes: Buffer; finalUrl: string; contentType: string | null };
async function downloadWithCurl(raw: string): Promise<OfficialDownload> {
  const args = officialCurlArguments(raw);
  return await new Promise<OfficialDownload>((resolve, reject) => {
    const child = spawn("curl", args, { shell: false, stdio: ["ignore", "pipe", "pipe"] });
    const chunks: Buffer[] = [];
    let total = 0;
    let stderr = "";
    let overLimit = false;
    child.stdout.on("data", (part: Buffer) => {
      total += part.length;
      if (total > MAX_DOWNLOAD_BYTES) {
        overLimit = true;
        child.kill("SIGTERM");
      } else {
        chunks.push(part);
      }
    });
    child.stderr.on("data", (part: Buffer) => {
      stderr = (stderr + String(part)).slice(-4096);
    });
    child.once("error", (error: NodeJS.ErrnoException) => {
      reject(new Error("curl_spawn_" + (error.code ?? "unknown")));
    });
    child.once("close", (code) => {
      if (overLimit) { reject(new Error("curl_source_too_large")); return; }
      const status = Number(stderr.match(/NCI_CURL_HTTP=(\d{3})/)?.[1] ?? "0");
      const type = stderr.match(/NCI_CURL_TYPE=([^\r\n;]+)/)?.[1] ?? null;
      if (code !== 0) {
        reject(new Error("curl_exit_" + String(code) + (status ? "_http_" + status : "")));
        return;
      }
      if (status < 200 || status >= 300) {
        reject(new Error("curl_http_" + status + "_redirect_not_followed"));
        return;
      }
      const bytes = Buffer.concat(chunks);
      if (bytes.length < 22 || bytes.readUInt32LE(0) !== 0x04034b50) {
        reject(new Error("curl_non_xlsx_zip_http_" + status));
        return;
      }
      resolve({ bytes, finalUrl: raw, contentType: type });
    });
  });
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
    download_transport: null as "node_fetch" | "curl_proxy_aware" | null,
    node_fetch_cause_code: null as string | null,
    curl_fallback_attempted: false,
    curl_fallback_error: null as string | null,
    download_sha256: null as string | null,
    download_bytes: 0,
    content_type: null as string | null,
    final_url: null as string | null,
    header_inspection: null as ReturnType<typeof inspectInstitutionalXlsxHeaders> | null,
    identity_text_candidates: null as ReturnType<typeof scanInstitutionalSchoolTextCandidates> | null,
    identity_text_scan_error: null as string | null,
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
    let downloaded: OfficialDownload;
    try {
      downloaded = await downloadOfficialXlsx();
      report.download_transport = "node_fetch";
    } catch (fetchError) {
      report.node_fetch_cause_code = fetchCauseCode(fetchError);
      // A transport failure only. Do not bypass HTTP denial, ZIP/size checks,
      // unexpected redirects or an untrusted origin.
      if (!(fetchError instanceof TypeError) || fetchError.message !== "fetch failed") {
        throw fetchError;
      }
      report.curl_fallback_attempted = true;
      try {
        downloaded = await downloadWithCurl(MENPS_PRIMARY_2026_RESOURCE_URL);
        report.download_transport = "curl_proxy_aware";
      } catch (curlError) {
        report.curl_fallback_error = curlError instanceof Error
          ? curlError.message.slice(0, 120) : "unknown_curl_error";
        throw new Error("both_official_transports_failed");
      }
    }
    report.download_bytes = downloaded.bytes.length;
    report.download_sha256 = createHash("sha256").update(downloaded.bytes).digest("hex");
    report.content_type = downloaded.contentType;
    report.final_url = downloaded.finalUrl;
    report.header_inspection = inspectInstitutionalXlsxHeaders(downloaded.bytes);
    // Independent staging projection only: bounded text samples, no GPS or
    // territorial acceptance. Never affects the public NCI read-model.
    try {
      report.identity_text_candidates = scanInstitutionalSchoolTextCandidates(downloaded.bytes);
    } catch (scanError) {
      report.identity_text_scan_error = scanError instanceof Error
        ? scanError.message.slice(0, 140) : "unknown_identity_scan_error";
    }
    report.download_status = "downloaded_and_header_inspected";
  } catch (error) {
    report.download_status = "unavailable_fail_closed";
    report.error = error instanceof Error ? error.message.slice(0, 180) : "unknown_probe_error";
  }
  return report;
}
