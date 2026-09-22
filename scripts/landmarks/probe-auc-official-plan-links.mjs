import { writeFile, mkdir } from "node:fs/promises";

const pages = [
  { id: "anfa", url: "https://www.auc.ma/e-services-2/e-documents/?IdP=1095" },
  { id: "maarif", url: "https://www.auc.ma/e-services-2/e-documents/?IdP=1075" },
];

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; AkarFinder-Landmark-Factory/1.0)",
      "Accept": "text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
  });
  const text = await res.text();
  return { status: res.status, url: res.url, text, contentType: res.headers.get("content-type") };
}

function absolute(base, href) {
  try { return new URL(href, base).toString(); } catch { return null; }
}

function extractLinks(base, html) {
  const links = [];
  const re = /<a\b[^>]*href\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html))) {
    const url = absolute(base, m[2]);
    if (!url) continue;
    const label = m[3].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    links.push({ url, label });
  }
  return links;
}

const result = {
  schema_version: 1,
  evidence_role: "AUC_OFFICIAL_PLAN_LINK_DISCOVERY_ONLY",
  activation_allowed: false,
  geometry_promotion_allowed: false,
  pages: [],
};

for (const page of pages) {
  const fetched = await fetchText(page.url);
  const links = extractLinks(fetched.url, fetched.text);
  const candidates = links.filter((link) =>
    /\.pdf(?:$|\?)/i.test(link.url) ||
    /plan|amenagement|anfa|maarif|maârif/i.test(link.label + " " + link.url)
  );
  result.pages.push({
    id: page.id,
    requested_url: page.url,
    final_url: fetched.url,
    status: fetched.status,
    content_type: fetched.contentType,
    html_length: fetched.text.length,
    challenge_detected: /checking your browser|request is being verified|cf-chl|cloudflare/i.test(fetched.text),
    candidate_links: candidates,
    all_pdf_links: links.filter((link) => /\.pdf(?:$|\?)/i.test(link.url)),
  });
}

await mkdir("artifacts", { recursive: true });
await writeFile("artifacts/auc-official-plan-links.json", JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));
