import fs from 'node:fs/promises';
import path from 'node:path';

const ORIGIN = 'https://www.avito.ma';
const UA = 'Mozilla/5.0 (compatible; AkarFinderPublicSurfaceMap/1.0; +https://akarfinder.ma)';
const OUT = 'artifacts/avito-public-surface-map';

function normalize(raw, base = ORIGIN) {
  try {
    const u = new URL(raw, base);
    if (u.protocol !== 'https:' || !['www.avito.ma', 'avito.ma'].includes(u.hostname)) return null;
    u.hash = '';
    return u.href;
  } catch { return null; }
}

function stripHtml(s='') {
  return String(s).replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
}

async function fetchText(url) {
  const r = await fetch(url, {
    redirect: 'follow',
    headers: {
      'user-agent': UA,
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'accept-language': 'fr-MA,fr;q=0.9,en;q=0.5'
    }
  });
  return { status: r.status, finalUrl: r.url, contentType: r.headers.get('content-type') || '', text: await r.text() };
}

const res = await fetchText(`${ORIGIN}/`);
const html = res.text;
const links = new Map();
for (const m of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
  const url = normalize(m[1], res.finalUrl || ORIGIN);
  if (!url) continue;
  if (!links.has(url)) links.set(url, { url, anchor: stripHtml(m[2]).slice(0,180) });
}
const scripts = [];
for (const m of html.matchAll(/<script\b[^>]*src=["']([^"']+)["'][^>]*>/gi)) {
  try {
    const u = new URL(m[1], res.finalUrl || ORIGIN);
    scripts.push(u.href);
  } catch {}
}
const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g,' ').trim() || null;
const nextData = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i)?.[1] || null;
const likelyRealEstate = [...links.values()].filter(x => /(immobilier|appartement|villa|maison|terrain|bureau|local|commerce|location|vente|louer|vendre|شقة|عقار|منزل|فيلا|كراء|بيع)/i.test(`${x.url} ${x.anchor}`));
const report = {
  fetchedAt: new Date().toISOString(),
  status: res.status,
  finalUrl: res.finalUrl,
  contentType: res.contentType,
  htmlBytes: Buffer.byteLength(html),
  title,
  sameOriginLinks: [...links.values()],
  sameOriginLinkCount: links.size,
  likelyRealEstateLinks: likelyRealEstate,
  likelyRealEstateLinkCount: likelyRealEstate.length,
  scriptSrcs: [...new Set(scripts)],
  scriptSrcCount: new Set(scripts).size,
  nextDataPresent: Boolean(nextData),
  nextDataBytes: nextData ? Buffer.byteLength(nextData) : 0,
};
await fs.mkdir(OUT, { recursive: true });
await fs.writeFile(path.join(OUT,'report.json'), JSON.stringify(report,null,2));
const md = [
  '# Avito public homepage surface map',
  '',
  `- HTTP: ${report.status}`,
  `- Final URL: ${report.finalUrl}`,
  `- HTML bytes: ${report.htmlBytes}`,
  `- Title: ${report.title || 'n/a'}`,
  `- Same-origin links: ${report.sameOriginLinkCount}`,
  `- Likely real-estate links: ${report.likelyRealEstateLinkCount}`,
  `- Script srcs: ${report.scriptSrcCount}`,
  `- __NEXT_DATA__: ${report.nextDataPresent ? `yes (${report.nextDataBytes} bytes)` : 'no'}`,
  '',
  '## Likely real-estate links',
  ...report.likelyRealEstateLinks.slice(0,100).map(x => `- ${x.url} — ${x.anchor || '(no anchor text)'}`),
  '',
  '## Same-origin links',
  ...report.sameOriginLinks.slice(0,200).map(x => `- ${x.url} — ${x.anchor || '(no anchor text)'}`),
].join('\n');
await fs.writeFile(path.join(OUT,'report.md'), md);
console.log(JSON.stringify({
  status: report.status,
  htmlBytes: report.htmlBytes,
  sameOriginLinkCount: report.sameOriginLinkCount,
  likelyRealEstateLinkCount: report.likelyRealEstateLinkCount,
  scriptSrcCount: report.scriptSrcCount,
  nextDataPresent: report.nextDataPresent,
}, null, 2));
