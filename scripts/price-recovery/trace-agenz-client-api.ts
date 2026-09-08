import fs from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';

const OUT = process.env.PRICE_RECOVERY_OUT ?? '.tmp/price-recovery';
const PAGE = process.env.AGENZ_TRACE_URL ?? 'https://agenz.ma/en/annonces/immo-agadir/location-appartements/charaf/343686';

function compact(v: string) { return v.replace(/\s+/g, ' ').trim(); }

async function getText(url: string): Promise<{status:number,text:string}> {
  const r = await fetch(url, {
    headers: {
      'user-agent': 'AkarFinder-PriceRecovery/1.0 (+read-only audit)',
      accept: 'text/html,application/javascript,text/javascript,*/*',
      'accept-language': 'fr-FR,fr;q=0.9,en;q=0.7',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(20_000),
  });
  return { status: r.status, text: await r.text() };
}

function snippets(text: string): string[] {
  const out: string[] = [];
  const patterns = [
    /api\.agenz\.ma/ig,
    /https?:\\?\/\\?\/[^"'`\s]{1,220}/ig,
    /(?:fetch|axios|graphql|annonce|listing|property|offer|price|prix)[^\n]{0,260}/ig,
  ];
  for (const p of patterns) {
    let m: RegExpExecArray | null;
    while ((m = p.exec(text)) && out.length < 80) {
      const start = Math.max(0, m.index - 180);
      const end = Math.min(text.length, m.index + m[0].length + 260);
      const s = compact(text.slice(start, end));
      if (s && !out.includes(s)) out.push(s.slice(0, 700));
    }
  }
  return out;
}

async function main() {
  const page = await getText(PAGE);
  if (page.status !== 200) throw new Error(`page http_${page.status}`);
  const $ = cheerio.load(page.text);
  const sources = $('script[src]').toArray()
    .map(el => $(el).attr('src') ?? '')
    .filter(src => src.startsWith('/_astro-v2/'));
  const unique = [...new Set(sources)].slice(0, 30);
  const assets: Array<{url:string,status:number,bytes:number,hints:string[]}> = [];
  for (const src of unique) {
    const url = new URL(src, PAGE).toString();
    try {
      const r = await getText(url);
      const hints = snippets(r.text);
      if (hints.length) assets.push({ url, status:r.status, bytes:r.text.length, hints });
    } catch (e) {
      assets.push({ url, status:0, bytes:0, hints:[e instanceof Error ? e.message : String(e)] });
    }
  }
  const pageHints = snippets(page.text);
  const report = {
    readOnly: true,
    page: PAGE,
    pageStatus: page.status,
    scriptCount: unique.length,
    pageHints,
    assets,
  };
  await fs.mkdir(OUT, { recursive: true });
  await fs.writeFile(path.join(OUT, 'agenz-client-api-trace.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({readOnly:true,page:PAGE,scriptCount:unique.length,assetsWithHints:assets.length,pageHintCount:pageHints.length}, null, 2));
}

main().catch(err => { console.error(err); process.exit(1); });
