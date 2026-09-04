const SITEMAP_URL = "https://www.avito.ma/sitemap.xml";
const USER_AGENT = "AkarFinderCoverageBot/0.1 (+https://akarfinder.vercel.app)";
const CONTROL_IDS = [
  "57875516",
  "56777033",
  "57980066",
  "58413694",
];

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 15000);

try {
  const response = await fetch(SITEMAP_URL, {
    headers: {
      "user-agent": USER_AGENT,
      accept: "application/xml,text/xml;q=0.9,*/*;q=0.1",
    },
    redirect: "follow",
    signal: controller.signal,
  });

  const body = await response.text();
  const sitemapIndex = /<sitemapindex\b/i.test(body);
  const urlSet = /<urlset\b/i.test(body);
  const locs = [...body.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((m) => m[1].trim());
  const matchedControlIds = CONTROL_IDS.filter((id) => body.includes(id));

  const report = {
    sitemap_url: SITEMAP_URL,
    user_agent: USER_AGENT,
    status: response.status,
    ok: response.ok,
    content_type: response.headers.get("content-type"),
    bytes: Buffer.byteLength(body),
    structure: sitemapIndex ? "sitemapindex" : urlSet ? "urlset" : "unknown",
    loc_count: locs.length,
    first_locs: locs.slice(0, 20),
    control_ids_checked: CONTROL_IDS,
    matched_control_ids: matchedControlIds,
  };

  console.log(JSON.stringify(report, null, 2));

  if (!response.ok) process.exitCode = 2;
  else if (!sitemapIndex && !urlSet) process.exitCode = 3;
} finally {
  clearTimeout(timeout);
}
