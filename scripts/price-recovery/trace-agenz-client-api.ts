import fs from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';

const OUT = process.env.PRICE_RECOVERY_OUT ?? '.tmp/price-recovery';
const PAGE = process.env.AGENZ_TRACE_URL ?? 'https://agenz.ma/en/annonces/immo-agadir/location-appartements/charaf/343686';
const MAX_ASSETS = 120;

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
    /(?:fetch|axios|graphql|annonce|listing|property|offer|price|prix|avis\/listing|favoris|signalements)[^\n]{0,260}/ig,
    /["'`]\/?(?:api|annonce|annonces|listing|listings|property|properties|offer|offers)[^"'`\s]{0,180}["'`]/ig,
  ];
  for (const p of patterns) {
    let m: RegExpExecArray | null;
    while ((m = p.exec(text)) && out.length < 120) {
      const start = Math.max(0, m.index - 220);
      const end = Math.min(text.length, m.index + m[0].length + 320);
      const s = compact(text.slice(start, end));
      if (s && !out.includes(s)) out.push(s.slice(0, 900));
    }
  }
  return out;
}

function importedAssets(text: string, baseUrl: string): string[] {
  const found = new Set<string>();
  const regexes = [
    /(?:from\s*|import\s*\(|import\s*)["'`]([^"'`]+\.js)["'`]/g,
    /["'`]([^"'`]*_astro-v2\/[^"'`]+\.js)["'`]/g,
    /["'`]([^"'`]+\.DTSOPU6-\.js)["'`]/g,
  ];
  for (const re of regexes) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      try {
        const u = new URL(m[1], baseUrl);
        if (u.hostname === new URL(PAGE).hostname) found.add(u.toString());
      } catch { /* ignore malformed */ }
    }
  }
  return [...found];
}

async function main() {
  const page = await getText(PAGE);
  if (page.status !== 200) throw new Error(`page http_${page.status}`);
  const $ = cheerio.load(page.text);
  const initial = $('script[src]').toArray()
    .map(el => $(el).attr('src') ?? '')
    .filter(src => src.startsWith('/_astro-v2/'))
    .map(src => new URL(src, PAGE).toString());

  const queue = [...new Set(initial)];
  const seen = new Set<string>();
  const assets: Array<{url:string,status:number,bytes:number,hints:string[],imports:string[]}> = [];

  while (queue.length && seen.size < MAX_ASSETS) {
    const url = queue.shift()!;
    if (seen.has(url)) continue;
    seen.add(url);
    try {
      const r = await getText(url);
      const hints = snippets(r.text);
      const imports = importedAssets(r.text, url);
      for (const imported of imports) if (!seen.has(imported) && !queue.includes(imported)) queue.push(imported);
      if (hints.length || /api_call|ListingsStore|InsideAnnonce|annonce|listing|property/i.test(r.text)) {
        assets.push({ url, status:r.status, bytes:r.text.length, hints, imports: imports.slice(0, 80) });
      }
    } catch (e) {
      assets.push({ url, status:0, bytes:0, hints:[e instanceof Error ? e.message : String(e)], imports:[] });
    }
  }

  const pageHints = snippets(page.text);
  const routeCandidates = [...new Set(assets.flatMap(a => a.hints)
    .flatMap(h => h.match(/https?:\\?\/\\?\/api\.agenz\.ma[^"'`\s)]+|["'`]\/?(?:annonce|annonces|listing|listings|property|properties|offer|offers)[^"'`\s]{0,180}["'`]/ig) ?? [])
    .map(x => compact(x.replace(/^["'`]|["'`]$/g, ''))))].slice(0, 200);

  const report = {
    readOnly: true,
    page: PAGE,
    pageStatus: page.status,
    initialScriptCount: initial.length,
    crawledAssetCount: seen.size,
    pageHints,
    routeCandidates,
    assets,
  };
  await fs.mkdir(OUT, { recursive: true });
  await fs.writeFile(path.join(OUT, 'agenz-client-api-trace.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({
    readOnly:true,
    page:PAGE,
    initialScriptCount:initial.length,
    crawledAssetCount:seen.size,
    assetsWithEvidence:assets.length,
    routeCandidateCount:routeCandidates.length,
    routeCandidates:routeCandidates.slice(0,40),
  }, null, 2));
}

main().catch(err => { console.error(err); process.exit(1); });
