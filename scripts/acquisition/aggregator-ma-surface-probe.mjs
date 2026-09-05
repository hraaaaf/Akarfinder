import fs from 'node:fs/promises';

const targets = [
  { key: 'mitula', base: 'https://immo.mitula.ma' },
  { key: 'trovit', base: 'https://immobilier.trovit.ma' },
];

function parseRobots(text) {
  const lines = text.split(/\r?\n/).map(x => x.trim());
  const groups = [];
  let agents = [];
  let rules = [];
  const flush = () => {
    if (agents.length) groups.push({ agents, rules });
    agents = [];
    rules = [];
  };
  for (const line of lines) {
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf(':');
    if (i < 0) continue;
    const k = line.slice(0, i).trim().toLowerCase();
    const v = line.slice(i + 1).trim();
    if (k === 'user-agent') {
      if (rules.length) flush();
      agents.push(v.toLowerCase());
    } else if (k === 'allow' || k === 'disallow') {
      rules.push({ type: k, path: v });
    }
  }
  flush();
  const applicable = groups.filter(g => g.agents.includes('*')).flatMap(g => g.rules);
  const sitemaps = lines.filter(l => /^sitemap\s*:/i.test(l)).map(l => l.slice(l.indexOf(':') + 1).trim()).filter(Boolean);
  return { applicable, sitemaps };
}

function robotsAllowed(path, rules) {
  const matches = rules.filter(r => r.path && path.startsWith(r.path));
  if (!matches.length) return true;
  matches.sort((a,b) => b.path.length - a.path.length);
  return matches[0].type === 'allow';
}

async function fetchText(url) {
  const res = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'AkarFinder-Public-Surface-Probe/1.0' } });
  return { status: res.status, url: res.url, text: await res.text() };
}

function xmlLocs(text) {
  return [...text.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map(m => m[1].trim());
}

function listingLike(url) {
  const p = new URL(url).pathname.toLowerCase();
  return /(?:annonce|property|properties|immobilier|logement|vente|location|maison|villa|appartement|terrain)/.test(p);
}

const out = { generated_at: new Date().toISOString(), mode: 'read_only_public_surface_probe', zero_db_writes: true, targets: [] };

for (const target of targets) {
  const t = { key: target.key, base: target.base, errors: [], direct_detail_fetches: 0 };
  try {
    const robots = await fetchText(`${target.base}/robots.txt`);
    t.robots_status = robots.status;
    const parsed = parseRobots(robots.text);
    t.root_allowed = robotsAllowed('/', parsed.applicable);
    t.robots_sitemaps = parsed.sitemaps;

    if (t.root_allowed) {
      const root = await fetchText(`${target.base}/`);
      t.root_status = root.status;
      t.root_final_url = root.url;
    }

    const seeds = [...new Set([...parsed.sitemaps, `${target.base}/sitemap.xml`, `${target.base}/sitemap_index.xml`])];
    const queue = seeds.slice(0, 20);
    const seen = new Set();
    const urls = new Set();
    while (queue.length && seen.size < 20) {
      const u = queue.shift();
      if (seen.has(u)) continue;
      seen.add(u);
      let pathname = '/';
      try { pathname = new URL(u).pathname; } catch {}
      if (!robotsAllowed(pathname, parsed.applicable)) continue;
      try {
        const r = await fetchText(u);
        if (r.status !== 200) continue;
        const locs = xmlLocs(r.text);
        for (const loc of locs) {
          let x; try { x = new URL(loc); } catch { continue; }
          if (x.origin !== new URL(target.base).origin) continue;
          if (/\.xml(?:\.gz)?$/i.test(x.pathname) && queue.length < 100) queue.push(x.href);
          else urls.add(x.href);
        }
      } catch (e) { t.errors.push(String(e)); }
    }
    t.sitemaps_visited = seen.size;
    t.sitemap_urls = urls.size;
    t.listing_like_urls = [...urls].filter(listingLike).length;
  } catch (e) { t.errors.push(String(e)); }
  out.targets.push(t);
}

await fs.mkdir('data/audits/raw-results', { recursive: true });
await fs.writeFile('data/audits/raw-results/aggregator-ma-surface-probe.json', JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify(out, null, 2));
