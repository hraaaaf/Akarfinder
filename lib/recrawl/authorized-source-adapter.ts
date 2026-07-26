import { createHash } from "node:crypto";

export type SourceAdapterPolicy = {
  sourceKey: string;
  allowedHosts: string[];
  allowedPathPatterns: RegExp[];
  userAgent: string;
  maxResponseBytes: number;
  timeoutMs: number;
};

export type AuthorizedFetchResult = {
  sourceKey: string;
  url: string;
  fetchedAt: string;
  httpStatus: number;
  contentType: string | null;
  title: string | null;
  displayedPrice: number | null;
  currency: string | null;
  surfaceM2: number | null;
  sourceStatus: "active" | "removed" | "unavailable";
  titleFingerprint: string | null;
  contentFingerprint: string;
  bytesRead: number;
};

function normalizeHost(host: string): string {
  return host.toLowerCase().replace(/^www\./, "");
}

export function assertUrlAllowed(urlValue: string, policy: SourceAdapterPolicy): URL {
  const url = new URL(urlValue);
  if (url.protocol !== "https:") throw new Error("source_adapter_https_required");
  if (!policy.allowedHosts.map(normalizeHost).includes(normalizeHost(url.hostname))) {
    throw new Error("source_adapter_host_not_allowed");
  }
  if (!policy.allowedPathPatterns.some((pattern) => pattern.test(url.pathname))) {
    throw new Error("source_adapter_path_not_allowed");
  }
  if (url.username || url.password) throw new Error("source_adapter_credentials_forbidden");
  return url;
}

function textContent(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function meta(html: string, key: string): string | null {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

function parseNumber(value: string | null): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[^0-9.,]/g, "").replace(/\s/g, "");
  if (!cleaned) return null;
  const normalized = cleaned.includes(",") && !cleaned.includes(".") ? cleaned.replace(",", ".") : cleaned.replace(/,/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function titleFromHtml(html: string): string | null {
  const candidate = meta(html, "og:title") ?? html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? null;
  return candidate ? candidate.replace(/\s+/g, " ").trim() : null;
}

export function parseAuthorizedHtml(input: {
  policy: SourceAdapterPolicy;
  url: string;
  fetchedAt: string;
  httpStatus: number;
  contentType: string | null;
  html: string;
}): AuthorizedFetchResult {
  assertUrlAllowed(input.url, input.policy);
  const bytesRead = Buffer.byteLength(input.html, "utf8");
  if (bytesRead > input.policy.maxResponseBytes) throw new Error("source_adapter_response_too_large");

  const title = titleFromHtml(input.html);
  const visible = textContent(input.html);
  const status = input.httpStatus === 404 || input.httpStatus === 410 ? "removed" : input.httpStatus >= 400 ? "unavailable" : "active";
  const price = parseNumber(meta(input.html, "product:price:amount") ?? meta(input.html, "og:price:amount"));
  const currency = meta(input.html, "product:price:currency") ?? meta(input.html, "og:price:currency");
  const surfaceMatch = visible.match(/(?:surface|superficie)[^0-9]{0,20}([0-9][0-9 .,'’]*)\s*m(?:²|2)(?!\w)/i)
    ?? visible.match(/([0-9][0-9 .,'’]*)\s*m(?:²|2)(?!\w)/i);
  const surfaceM2 = parseNumber(surfaceMatch?.[1] ?? null);
  const canonicalPayload = JSON.stringify({ title, price, currency, surfaceM2, status, visible: visible.slice(0, 50_000) });

  return {
    sourceKey: input.policy.sourceKey,
    url: input.url,
    fetchedAt: input.fetchedAt,
    httpStatus: input.httpStatus,
    contentType: input.contentType,
    title,
    displayedPrice: price,
    currency,
    surfaceM2,
    sourceStatus: status,
    titleFingerprint: title ? createHash("sha256").update(title).digest("hex") : null,
    contentFingerprint: createHash("sha256").update(canonicalPayload).digest("hex"),
    bytesRead,
  };
}

export async function fetchAuthorizedSource(input: {
  policy: SourceAdapterPolicy;
  url: string;
  now?: () => Date;
  fetchImpl?: typeof fetch;
}): Promise<AuthorizedFetchResult> {
  const url = assertUrlAllowed(input.url, input.policy);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), input.policy.timeoutMs);
  try {
    const response = await (input.fetchImpl ?? fetch)(url, {
      method: "GET",
      redirect: "error",
      headers: { "user-agent": input.policy.userAgent, accept: "text/html,application/xhtml+xml" },
      signal: controller.signal,
    });
    const contentLength = Number(response.headers.get("content-length") ?? "0");
    if (contentLength > input.policy.maxResponseBytes) throw new Error("source_adapter_response_too_large");
    const html = await response.text();
    return parseAuthorizedHtml({
      policy: input.policy,
      url: url.toString(),
      fetchedAt: (input.now ?? (() => new Date()))().toISOString(),
      httpStatus: response.status,
      contentType: response.headers.get("content-type"),
      html,
    });
  } finally {
    clearTimeout(timer);
  }
}

export const MUBAWAB_CONTROLLED_POLICY: SourceAdapterPolicy = {
  sourceKey: "mubawab",
  allowedHosts: ["mubawab.ma", "www.mubawab.ma"],
  allowedPathPatterns: [/^\/fr\/a\/\d+\//],
  userAgent: "AkarFinderBot/1.0 (+https://akarfinder.ma/bot)",
  maxResponseBytes: 2_000_000,
  timeoutMs: 20_000,
};
