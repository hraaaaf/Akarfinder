import fs from 'node:fs';
import { URL } from 'node:url';

const targets = [
  { key: 'dabaannonce', base: 'https://dabaannonce.ma' },
  { key: 'sakane', base: 'https://sakane.ma' },
];

const UA = 'AkarFinder-PublicSurfaceAudit/1.0 (+read-only; no detail fetch)';
const out = {
  generated_at: new Date().toISOString(),
  mode: 'read_only_public_surface_probe',
  zero_db_writes: true,
  targets: [],
};

function robotsAllowsRoot(txt) {
  const lines = txt.split(/\r?\n/).map(x => x.trim());
  let applies = false;
  for (const line of lines) {
    if (!line || line.startsWith('#')) continue;
    const [kRaw, ...rest] = line.split(':');
    const k = kRaw.toLowerCase().trim();
    const v = rest.join(':').trim();
    if (k === 'user-agent') applies = v === '*';
    if (applies && k === 'disallow' && v === '/') return false;
  }
  return true;
}

function extractSitemaps(txt) {
  return [...txt.matchAll(/^\s*Sitemap:\s*(https?:\/\/\S+)/gim)].map(m => m[1]);
}

async function get(url) {
  const r = await fetch(url, { headers: { 'user-agent': UA }, redirect: 'follow' });
  return { status: r.status, finalUrl: r.url, text: await r.text() };
}

for (const target of targets) {
  const r = { key: target.key, base: target.base, errors: [], direct_detail_fetches: 0 };
  try {
    const robots = await get(`${target.base}/robots.txt`);
    r.robots_status = robots.status;
    r.root_allowed = robots.status === 200 ? robotsAllowsRoot(robots.text) : null;
    r.robots_sitemaps = robots.status === 200 ? extractSitemaps(robots.text) : [];

    const root = await get(`${target.base}/`);
    r.root_status = root.status;
    r.root_final_url = root.finalUrl;

    const sitemapCandidates = [...new Set([
      ...r.robots_sitemaps,
      `${target.base}/sitemap.xml`,
      `${target.base}/sitemap_index.xml`,
      `${target.base}/sitemap-index.xml`,
    ])];

    const sameHost = new Set();
    let visited = 0;
    for (const sm of sitemapCandidates.slice(0, 8)) {
      try {
        const u = new URL(sm);
        if (u.hostname !== new URL(target.base).hostname) continue;
        const s = await get(sm);
        visited++;
        if (s.status !== 200) continue;
        for (const m of s.text.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)) {
          const loc = m[1].trim();
          try {
            if (new URL(loc).hostname === new URL(target.base).hostname) sameHost.add(loc);
          } catch {}
        }
      } catch (e) {
        r.errors.push(String(e));
      }
    }
    r.sitemaps_visited = visited;
    r.sitemap_urls = sameHost.size;
    const detailish = [...sameHost].filter(u => /(annonce|property|properties|bien|biens|listing|detail|immobilier|vente|location)/i.test(new URL(u).pathname));
    r.listing_like_urls = detailish.length;
    r.sample_listing_like_urls = detailish.slice(0, 12);
  } catch (e) {
    r.errors.push(String(e));
  }
  out.targets.push(r);
}

fs.mkdirSync('data/audits/raw-results', { recursive: true });
fs.writeFileSync('data/audits/raw-results/daba-sakane-surface-probe.json', JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify(out, null, 2));
