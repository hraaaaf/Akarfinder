import fs from 'node:fs/promises';
import path from 'node:path';

const BASE = 'https://kaynly.com';
const OUT_DIR = 'data-ingestion/runs/avito/kaynly-radar';
const MAX_PAGES = Number(process.env.KAYNLY_RADAR_MAX_PAGES ?? 220);
const MAX_IDS = Number(process.env.KAYNLY_RADAR_MAX_IDS ?? 2500);
const DELAY_MS = Number(process.env.KAYNLY_RADAR_DELAY_MS ?? 650);
const TIMEOUT_MS = 12_000;
const RETRIES = 2;
const USER_AGENT = 'AkarFinderCoverageResearch/0.2 (+https://akarfinder.vercel.app)';
const PRIORITY_CITIES = [
  'casablanca', 'marrakech', 'tanger', 'rabat', 'agadir', 'kenitra',
  'meknes', 'temara', 'sale', 'mohammedia', 'bouskoura', 'dar-bouazza',
  'tetouan', 'bouznika', 'fes', 'el-jadida', 'nouaceur', 'oujda',
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function decodeHtml(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&#x2F;', '/')
    .replaceAll('&#47;', '/')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'");
}

async function fetchText(url, { attempts = RETRIES + 1 } = {}) {
  let last = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        headers: {
          'user-agent': USER_AGENT,
          accept: 'text/html,text/plain;q=0.9,*/*;q=0.8',
        },
        redirect: 'follow',
        signal: controller.signal,
      });
      const body = await response.text();
      const result = {
        ok: response.ok,
        status: response.status,
        content_type: response.headers.get('content-type'),
        body,
        attempt,
      };
      if (response.ok || ![429, 500, 502, 503, 504].includes(response.status) || attempt === attempts) {
        return result;
      }
      last = result;
    } catch (error) {
      last = {
        ok: false,
        status: null,
        content_type: null,
        body: '',
        attempt,
        error: error instanceof Error ? error.message : String(error),
      };
      if (attempt === attempts) return last;
    } finally {
      clearTimeout(timeout);
    }
    await sleep(500 * attempt);
  }
  return last;
}

function ruleRegex(pattern) {
  const endAnchored = pattern.endsWith('$');
  const raw = endAnchored ? pattern.slice(0, -1) : pattern;
  const escaped = raw.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replaceAll('*', '.*');
  return new RegExp(`^${escaped}${endAnchored ? '$' : ''}`);
}

function parseRobots(text) {
  const groups = [];
  let current = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (key === 'user-agent') {
      if (!current || current.hasRules) {
        current = { agents: [], rules: [], hasRules: false };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      continue;
    }
    if (!current) continue;
    if (key === 'allow' || key === 'disallow') {
      current.rules.push({ kind: key, value });
      current.hasRules = true;
    }
  }
  return groups;
}

function robotsDecision(groups, pathname) {
  const ua = USER_AGENT.toLowerCase();
  const specific = groups.filter((g) => g.agents.some((a) => a !== '*' && ua.includes(a)));
  const selected = specific.length ? specific : groups.filter((g) => g.agents.includes('*'));
  const matches = [];
  for (const group of selected) {
    for (const rule of group.rules) {
      if (!rule.value) continue;
      if (ruleRegex(rule.value).test(pathname)) matches.push(rule);
    }
  }
  if (!matches.length) return { allowed: true, matched_rule: null };
  matches.sort((a, b) => b.value.length - a.value.length || (a.kind === 'allow' ? -1 : 1));
  const winner = matches[0];
  return { allowed: winner.kind === 'allow', matched_rule: winner };
}

function extractKaynlyLinks(html) {
  const found = new Set();
  const regex = /href=["']([^"'<>\s]+)["']/gi;
  for (const match of html.matchAll(regex)) {
    const href = decodeHtml(match[1]);
    let url;
    try {
      url = new URL(href, BASE);
    } catch {
      continue;
    }
    if (url.origin !== BASE) continue;
    if (!/^\/(?:vente|location)\//.test(url.pathname)) continue;
    if (url.search || url.hash) continue;
    found.add(`${url.origin}${url.pathname.replace(/\/$/, '')}`);
  }
  return [...found];
}

function extractAvitoLinks(html) {
  const out = [];
  const seen = new Set();
  const regex = /href=["'](https:\/\/(?:www\.)?avito\.ma\/[^"'<>\s]+)["']/gi;
  for (const match of html.matchAll(regex)) {
    const url = decodeHtml(match[1]);
    const idMatch = url.match(/_(\d{6,})\.htm(?:[?#].*)?$/i);
    if (!idMatch) continue;
    const source_id = idMatch[1];
    if (seen.has(source_id)) continue;
    seen.add(source_id);
    out.push({ source_id, url });
  }
  return out;
}

function pageContext(url) {
  const parts = new URL(url).pathname.split('/').filter(Boolean);
  return {
    transaction: parts[0] === 'vente' ? 'sale' : parts[0] === 'location' ? 'rent' : null,
    city_slug: parts[1] ?? null,
    facet_slug: parts[2] ?? null,
    depth: parts.length,
  };
}

function priorityScore(url) {
  const ctx = pageContext(url);
  const cityRank = PRIORITY_CITIES.indexOf(ctx.city_slug);
  const cityScore = cityRank < 0 ? 0 : 10_000 - cityRank * 100;
  const depthScore = ctx.depth === 2 ? 1_000 : 0;
  return cityScore + depthScore;
}

async function main() {
  const generated_at = new Date().toISOString();
  await fs.mkdir(OUT_DIR, { recursive: true });

  const robotsResponse = await fetchText(`${BASE}/robots.txt`, { attempts: 1 });
  let robots = { status: robotsResponse.status, allowed: false, mode: 'fail_closed', groups: 0 };
  let groups = [];

  if (robotsResponse.status === 200) {
    groups = parseRobots(robotsResponse.body);
    const required = ['/villes', '/vente/', '/location/'].map((pathname) => ({
      pathname,
      ...robotsDecision(groups, pathname),
    }));
    robots = {
      status: 200,
      allowed: required.every((r) => r.allowed),
      mode: 'parsed',
      groups: groups.length,
      required,
    };
  } else if (robotsResponse.status === 404) {
    robots = { status: 404, allowed: true, mode: 'not_present', groups: 0 };
  } else {
    robots = {
      status: robotsResponse.status,
      allowed: false,
      mode: 'fail_closed',
      groups: 0,
      error: robotsResponse.error ?? null,
    };
  }

  if (!robots.allowed) {
    const blockedReport = {
      source: 'avito',
      discovery_surface: 'kaynly_public_seo_lattice',
      generated_at,
      status: 'blocked_by_control_surface_robots_qualification',
      robots,
      avito_requests: 0,
    };
    await fs.writeFile(path.join(OUT_DIR, 'report.json'), `${JSON.stringify(blockedReport, null, 2)}\n`, 'utf8');
    console.log(JSON.stringify(blockedReport, null, 2));
    process.exitCode = 2;
    return;
  }

  const rootResponse = await fetchText(`${BASE}/villes`);
  if (!rootResponse.ok) {
    const report = {
      source: 'avito',
      discovery_surface: 'kaynly_public_seo_lattice',
      generated_at,
      status: 'control_surface_root_unavailable',
      robots,
      root_http_status: rootResponse.status,
      avito_requests: 0,
    };
    await fs.writeFile(path.join(OUT_DIR, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = 3;
    return;
  }

  const cityRoots = extractKaynlyLinks(rootResponse.body)
    .filter((url) => pageContext(url).depth === 2)
    .sort((a, b) => priorityScore(b) - priorityScore(a) || a.localeCompare(b));

  const queue = [...cityRoots];
  const queued = new Set(queue);
  const visited = new Set();
  const ids = new Map();
  const pageObservations = [];

  while (queue.length && visited.size < MAX_PAGES && ids.size < MAX_IDS) {
    const url = queue.shift();
    if (!url || visited.has(url)) continue;
    const pathname = new URL(url).pathname;
    const decision = robotsDecision(groups, pathname);
    if (robots.status === 200 && !decision.allowed) {
      pageObservations.push({ url, skipped: 'robots_disallow', matched_rule: decision.matched_rule });
      visited.add(url);
      continue;
    }

    const response = await fetchText(url);
    visited.add(url);
    const ctx = pageContext(url);
    const avitoLinks = response.ok ? extractAvitoLinks(response.body) : [];
    let newIds = 0;

    for (const record of avitoLinks) {
      const existing = ids.get(record.source_id);
      if (!existing) {
        ids.set(record.source_id, {
          source_id: record.source_id,
          avito_url: record.url,
          discovered_via: 'kaynly',
          control_pages: [url],
          transaction: ctx.transaction,
          city_slug: ctx.city_slug,
          first_observed_at: generated_at,
        });
        newIds += 1;
      } else if (!existing.control_pages.includes(url)) {
        existing.control_pages.push(url);
      }
      if (ids.size >= MAX_IDS) break;
    }

    pageObservations.push({
      url,
      http_status: response.status,
      ok: response.ok,
      content_type: response.content_type,
      context: ctx,
      avito_links_on_page: avitoLinks.length,
      new_unique_ids: newIds,
      error: response.error ?? null,
    });

    if (response.ok && ctx.depth === 2) {
      const children = extractKaynlyLinks(response.body)
        .filter((child) => {
          const c = pageContext(child);
          return c.depth === 3 && c.transaction === ctx.transaction && c.city_slug === ctx.city_slug;
        })
        .sort((a, b) => a.localeCompare(b));
      for (const child of children) {
        if (!queued.has(child) && !visited.has(child)) {
          queued.add(child);
          queue.push(child);
        }
      }
    }

    await sleep(DELAY_MS);
  }

  const records = [...ids.values()];
  const byCity = {};
  const byTransaction = { sale: 0, rent: 0, unknown: 0 };
  for (const record of records) {
    const city = record.city_slug ?? 'unknown';
    byCity[city] = (byCity[city] ?? 0) + 1;
    const tx = record.transaction ?? 'unknown';
    byTransaction[tx] = (byTransaction[tx] ?? 0) + 1;
  }

  const report = {
    source: 'avito',
    discovery_surface: 'kaynly_public_seo_lattice',
    generated_at,
    status: 'completed_bounded_pilot',
    safety: {
      avito_requests: 0,
      control_surface_host: 'kaynly.com',
      identifiable_user_agent: USER_AGENT,
      max_pages: MAX_PAGES,
      max_ids: MAX_IDS,
      delay_ms: DELAY_MS,
    },
    robots,
    root_http_status: rootResponse.status,
    discovered_city_transaction_roots: cityRoots.length,
    pages_requested: visited.size,
    pages_ok: pageObservations.filter((p) => p.ok).length,
    pages_failed: pageObservations.filter((p) => p.ok === false).length,
    unique_avito_ids: records.length,
    by_transaction: byTransaction,
    by_city: Object.fromEntries(Object.entries(byCity).sort((a, b) => b[1] - a[1])),
    queue_remaining: queue.length,
    stopped_by: ids.size >= MAX_IDS ? 'max_ids' : visited.size >= MAX_PAGES ? 'max_pages' : 'queue_exhausted',
  };

  await fs.writeFile(path.join(OUT_DIR, 'records.json'), `${JSON.stringify({ ...report, records }, null, 2)}\n`, 'utf8');
  await fs.writeFile(path.join(OUT_DIR, 'pages.json'), `${JSON.stringify({ generated_at, page_observations: pageObservations }, null, 2)}\n`, 'utf8');
  await fs.writeFile(path.join(OUT_DIR, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(report, null, 2));
}

await main();
