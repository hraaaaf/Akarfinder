export type CommonCrawlListingRef = {
  source_id: string;
  detail_family: "a" | "pa";
  url: string;
  timestamp: string | null;
};

export type CommonCrawlPageCount = {
  blocks: number | null;
  pages: number;
  page_size: number | null;
};

function assertIndex(index: string): void {
  if (!/^CC-MAIN-\d{4}-\d+$/.test(index)) throw new Error(`invalid_commoncrawl_index:${index}`);
}

function assertPageSize(pageSize: number): void {
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 10) {
    throw new Error(`invalid_commoncrawl_page_size:${pageSize}`);
  }
}

function buildCommonCrawlBaseQuery(input: {
  index: string;
  detailFamily: "a" | "pa";
}): URL {
  assertIndex(input.index);
  const endpoint = new URL(`https://index.commoncrawl.org/${input.index}-index`);
  endpoint.searchParams.set("url", `www.mubawab.ma/fr/${input.detailFamily}/`);
  endpoint.searchParams.set("matchType", "prefix");
  endpoint.searchParams.set("output", "json");
  endpoint.searchParams.append("filter", "=status:200");
  endpoint.searchParams.set("fl", "url,timestamp,status");
  return endpoint;
}

export function parseCommonCrawlCdxJsonLines(raw: string): CommonCrawlListingRef[] {
  const byId = new Map<string, CommonCrawlListingRef>();
  for (const line of raw.split(/\r?\n/).map((value) => value.trim()).filter(Boolean)) {
    let record: { url?: string; timestamp?: string; status?: string };
    try {
      record = JSON.parse(line) as { url?: string; timestamp?: string; status?: string };
    } catch {
      continue;
    }
    if (!record.url) continue;
    const match = record.url.match(/^https?:\/\/(?:www\.)?mubawab\.ma\/fr\/(a|pa)\/(\d+)(?:\/|$)/i);
    if (!match) continue;
    const sourceId = match[2];
    const candidate: CommonCrawlListingRef = {
      source_id: sourceId,
      detail_family: match[1].toLowerCase() as "a" | "pa",
      url: record.url,
      timestamp: record.timestamp ?? null,
    };
    const existing = byId.get(sourceId);
    if (!existing || (candidate.timestamp ?? "") > (existing.timestamp ?? "")) {
      byId.set(sourceId, candidate);
    }
  }
  return [...byId.values()].sort((a, b) => a.source_id.localeCompare(b.source_id));
}

export function buildCommonCrawlPrefixQuery(input: {
  index: string;
  detailFamily: "a" | "pa";
  limit: number;
  page?: number;
  pageSize?: number;
}): string {
  if (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > 1000) {
    throw new Error(`invalid_commoncrawl_limit:${input.limit}`);
  }
  if (input.page != null && (!Number.isInteger(input.page) || input.page < 0)) {
    throw new Error(`invalid_commoncrawl_page:${input.page}`);
  }
  if (input.pageSize != null) assertPageSize(input.pageSize);

  const endpoint = buildCommonCrawlBaseQuery(input);
  endpoint.searchParams.set("limit", String(input.limit));
  if (input.page != null) endpoint.searchParams.set("page", String(input.page));
  if (input.pageSize != null) endpoint.searchParams.set("pageSize", String(input.pageSize));
  return endpoint.toString();
}

export function buildCommonCrawlPageCountQuery(input: {
  index: string;
  detailFamily: "a" | "pa";
  pageSize: number;
}): string {
  assertPageSize(input.pageSize);
  const endpoint = buildCommonCrawlBaseQuery(input);
  endpoint.searchParams.set("showNumPages", "true");
  endpoint.searchParams.set("pageSize", String(input.pageSize));
  return endpoint.toString();
}

export function parseCommonCrawlPageCount(raw: string): CommonCrawlPageCount {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("invalid_commoncrawl_page_count_json");
  }

  if (typeof parsed === "number") {
    if (!Number.isInteger(parsed) || parsed < 0) throw new Error("invalid_commoncrawl_page_count");
    return { blocks: null, pages: parsed, page_size: null };
  }

  if (!parsed || typeof parsed !== "object") throw new Error("invalid_commoncrawl_page_count");
  const record = parsed as { blocks?: unknown; pages?: unknown; pageSize?: unknown };
  if (!Number.isInteger(record.pages) || (record.pages as number) < 0) {
    throw new Error("invalid_commoncrawl_page_count");
  }
  if (record.blocks != null && (!Number.isInteger(record.blocks) || (record.blocks as number) < 0)) {
    throw new Error("invalid_commoncrawl_block_count");
  }
  if (record.pageSize != null && (!Number.isInteger(record.pageSize) || (record.pageSize as number) < 1)) {
    throw new Error("invalid_commoncrawl_page_size_response");
  }

  return {
    blocks: record.blocks == null ? null : record.blocks as number,
    pages: record.pages as number,
    page_size: record.pageSize == null ? null : record.pageSize as number,
  };
}

export function selectSpreadPages(totalPages: number, maxPages: number): number[] {
  if (!Number.isInteger(totalPages) || totalPages < 0) throw new Error(`invalid_commoncrawl_total_pages:${totalPages}`);
  if (!Number.isInteger(maxPages) || maxPages < 1) throw new Error(`invalid_commoncrawl_max_pages:${maxPages}`);
  if (totalPages === 0) return [];
  if (totalPages <= maxPages) return Array.from({ length: totalPages }, (_, index) => index);
  if (maxPages === 1) return [0];

  const selected = new Set<number>();
  for (let index = 0; index < maxPages; index += 1) {
    selected.add(Math.round((index * (totalPages - 1)) / (maxPages - 1)));
  }
  return [...selected].sort((a, b) => a - b);
}
