import fs from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';
import { extractDetailPrice } from './extract-detail-price';

const OUT = process.env.PRICE_RECOVERY_OUT ?? '.tmp/price-recovery';
const targets = [
  { id: 'avito-56452893', source: 'avito.ma', url: 'https://avito.ma/fr/hassan/villas_et_riads/Location_villa_4_chambres_avec_jardin_Hassan_Rabat_56452893.htm', intent: 'rent' },
  { id: 'mubawab-8217268', source: 'mubawab.ma', url: 'https://mubawab.ma/fr/a/8217268/rabat-hassan-%C3%A0-vendre-villa-exceptionnelle', intent: 'sale' },
  { id: 'mubawab-8050503', source: 'mubawab.ma', url: 'https://www.mubawab.ma/fr/a/8050503/superbe-villa-%C3%A0-louer-%C3%A0-hassan-superficie-400-m%C2%B2', intent: 'rent' },
  { id: 'mubawab-8375704', source: 'mubawab.ma', url: 'https://www.mubawab.ma/fr/a/8375704/villa-spacieuse-de-800-m%C2%B2-hassane', intent: 'rent' },
  { id: 'mubawab-8381852', source: 'mubawab.ma', url: 'https://www.mubawab.ma/fr/a/8381852/villa-de-800m%C2%B2-en-location-%C3%A0-hassan-rabat', intent: 'rent' },
  { id: 'sarouty-886289', source: 'sarouty.ma', url: 'https://sarouty.ma/plp/acheter/villa-a-vendre-rabat-hassan-886289.html', intent: 'sale' },
] as const;

function compact(s: string) { return s.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim(); }
function moneyContexts(html: string) {
  const $ = cheerio.load(html);
  const out: string[] = [];
  $('body *').each((_, el) => {
    if (out.length >= 30) return;
    const t = compact($(el).clone().children().remove().end().text());
    if (t && t.length <= 260 && /(?:\d[\d\s,.]{1,14})\s*(?:DH|DHS|MAD|dirhams?)/i.test(t)) out.push(t);
  });
  return [...new Set(out)];
}
function structured(html: string) {
  const $ = cheerio.load(html);
  const attrs: any[] = [];
  $('*').each((_, el) => {
    if (attrs.length >= 100 || !el || el.type !== 'tag') return;
    const a = Object.fromEntries(Object.entries(el.attribs ?? {}).filter(([k,v]) => /price|prix|surface|area|quartier|district|location|transaction/i.test(k) && typeof v === 'string'));
    if (Object.keys(a).length) attrs.push({ tag: el.tagName, attrs: a });
  });
  const jsonScripts = $('script[type*="json" i], script[id*="next" i], script[id*="astro" i]').toArray().map(el => compact($(el).html() ?? '')).filter(Boolean).slice(0, 20).map(s => s.slice(0, 12000));
  return { attrs, jsonScripts };
}

async function main() {
  const results = [];
  for (const t of targets) {
    const r = await fetch(t.url, {
      headers: { 'user-agent': 'AkarFinder-ResidualAudit/1.0 (+read-only audit)', accept: 'text/html,application/xhtml+xml', 'accept-language': 'fr-FR,fr;q=0.9,en;q=0.7' },
      redirect: 'follow', signal: AbortSignal.timeout(25000),
    });
    const html = await r.text();
    const $ = cheerio.load(html);
    const finalUrl = r.url;
    const title = compact($('title').first().text());
    const h1 = $('h1').toArray().map(el => compact($(el).text())).filter(Boolean).slice(0, 5);
    const categoryRedirect = !finalUrl.includes('/a/') && !finalUrl.includes('886289') && !finalUrl.includes('56452893');
    const extraction = t.source === 'mubawab.ma' ? extractDetailPrice('mubawab.ma', html, t.intent) : null;
    results.push({
      ...t, httpStatus: r.status, finalUrl, redirected: finalUrl !== t.url, categoryRedirect,
      title, h1, extraction, moneyContexts: moneyContexts(html), structured: structured(html), htmlBytes: html.length,
    });
    await new Promise(resolve => setTimeout(resolve, 1200));
  }
  await fs.mkdir(OUT, { recursive: true });
  const out = { readOnly: true, databaseWrites: 0, results };
  await fs.writeFile(path.join(OUT, 'hassan-residual-audit.json'), JSON.stringify(out, null, 2) + '\n');
  console.log(JSON.stringify(out, null, 2));
}
main().catch(err => { console.error(err); process.exit(1); });
