export type CommonCrawlListingRef = {
  source_id: string;
  detail_family: "a" | "pa";
  url: string;
  timestamp: string | null;
};

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
    if (!byId.has(sourceId)) {
      byId.set(sourceId, {
        source_id: sourceId,
        detail_family: match[1].toLowerCase() as "a" | "pa",
        url: record.url,
        timestamp: record.timestamp ?? null,
      });
    }
  }
  return [...byId.values()].sort((a, b) => a.source_id.localeCompare(b.source_id));
}

export function buildCommonCrawlPrefixQuery(input: {
  index: string;
  detailFamily: "a" | "pa";
  limit: number;
}): string {
  if (!/^CC-MAIN-\d{4}-\d+$/.test(input.index)) throw new Error(`invalid_commoncrawl_index:${input.index}`);
  if (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > 1000) throw new Error(`invalid_commoncrawl_limit:${input.limit}`);
  const endpoint = new URL(`https://index.commoncrawl.org/${input.index}-index`);
  endpoint.searchParams.set("url", `www.mubawab.ma/fr/${input.detailFamily}/`);
  endpoint.searchParams.set("matchType", "prefix");
  endpoint.searchParams.set("output", "json");
  endpoint.searchParams.append("filter", "=status:200");
  endpoint.searchParams.set("fl", "url,timestamp,status");
  endpoint.searchParams.set("limit", String(input.limit));
  return endpoint.toString();
}
