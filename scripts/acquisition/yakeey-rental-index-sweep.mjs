import fs from 'node:fs/promises';

const BASE = 'https://yakeey.com';
const START = '/fr-ma/location/biens/maroc';
const OUT = 'data/audits/raw-results/yakeey-rental-index-sweep.json';
const MAX_PAGES = 80;
const UA = 'AkarFinder-PublicDiscovery/1.0 (+https://github.com/hraaaaf/Akarfinder)';

const sleep = ms => new Promise(r => setTimeout(r, ms));

function parseRobots(text) {
  const groups = [];
  let agents = [];
  let rules = [];
  const flush = () => { if (agents.length) groups.push({agents:[...agents],rules:[...rules]}); agents=[]; rules=[]; };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    if (!line) continue;
    const i = line.indexOf(':'); if (i < 0) continue;
    const k = line.slice(0,i).trim().toLowerCase(), v = line.slice(i+1).trim();
    if (k === 'user-agent') { if (rules.length) flush(); agents.push(v.toLowerCase()); }
    else if ((k === 'allow' || k === 'disallow') && agents.length) rules.push({kind:k,path:v});
  }
  flush();
  return groups;
}

function allowedByRobots(groups, path) {
  const matching = groups.filter(g => g.agents.includes('*'));
  const rules = matching.flatMap(g => g.rules).filter(r => r.path && path.startsWith(r.path));
  if (!rules.length) return true;
  rules.sort((a,b) => b.path.length - a.path.length || (a.kind === 'allow' ? -1 : 1));
  return rules[0].kind === 'allow';
}

function extractListings(html) {
  const found = new Set();
  const decoded = html.replace(/\\u002F/gi,'/').replace(/\\\//g,'/').replace(/&amp;/g,'&');
  const patterns = [
    /https?:\/\/yakeey\.com\/(fr-ma\/louer-[^"'<>\s?#]+-da\d+)/gi,
    /(?:href=["'])\/?(fr-ma\/louer-[^"'<>?#]+-da\d+)(?:[?"'])/gi,
    /\/(fr-ma\/louer-[^"'<>\s?#]+-da\d+)/gi,
    /https?:\/\/yakeey\.com\/(fr-ma\/[^"'<>\s?#]+-da\d+)/gi,
    /\/(fr-ma\/[^"'<>\s?#]+-da\d+)/gi,
  ];
  for (const re of patterns) {
    let m; while ((m = re.exec(decoded))) found.add(`${BASE}/${m[1]}`);
  }
  return found;
}

async function get(url) {
  const res = await fetch(url, {headers:{'user-agent':UA,accept:'text/html,application/xhtml+xml'}});
  const text = await res.text();
  return {status:res.status, finalUrl:res.url, text};
}

const proof = {
  generated_at:new Date().toISOString(),
  source:'yakeey.com',
  transaction:'rental',
  mode:'public_results_pages_only',
  zero_db_writes:true,
  direct_detail_fetches:0,
  robots_status:null,
  results_path_allowed:false,
  pages_requested:0,
  pages_ok:0,
  unique_listing_urls:0,
  unique_listing_ids:0,
  listing_urls:[],
  errors:[],
  stopped_by:null,
};

try {
  const robots = await get(`${BASE}/robots.txt`);
  proof.robots_status = robots.status;
  if (robots.status !== 200) throw new Error(`robots HTTP ${robots.status}`);
  const groups = parseRobots(robots.text);
  proof.results_path_allowed = allowedByRobots(groups, START);
  if (!proof.results_path_allowed) throw new Error(`robots disallows ${START}`);

  const all = new Set();
  let consecutiveNoNew = 0;
  for (let page=1; page<=MAX_PAGES; page++) {
    const path = `${START}?page=${page}`;
    if (!allowedByRobots(groups, START)) { proof.stopped_by='robots'; break; }
    proof.pages_requested++;
    try {
      const r = await get(`${BASE}${path}`);
      if (r.status !== 200) { proof.errors.push({page,status:r.status}); consecutiveNoNew++; }
      else {
        proof.pages_ok++;
        const before = all.size;
        for (const u of extractListings(r.text)) all.add(u);
        const gained = all.size - before;
        consecutiveNoNew = gained === 0 ? consecutiveNoNew + 1 : 0;
      }
    } catch (e) { proof.errors.push({page,error:String(e)}); consecutiveNoNew++; }
    if (page >= 3 && consecutiveNoNew >= 3) { proof.stopped_by='three_consecutive_no_new_pages'; break; }
    await sleep(350);
  }
  if (!proof.stopped_by) proof.stopped_by='max_pages';
  proof.listing_urls = [...all].sort();
  proof.unique_listing_urls = proof.listing_urls.length;
  const ids = new Set(proof.listing_urls.map(u => (u.match(/-da(\d+)(?:$|[/?#])/i)||[])[1]).filter(Boolean));
  proof.unique_listing_ids = ids.size;
} catch (e) {
  proof.errors.push({fatal:String(e)});
  proof.stopped_by = proof.stopped_by || 'fatal';
}

await fs.mkdir('data/audits/raw-results',{recursive:true});
await fs.writeFile(OUT, JSON.stringify(proof,null,2)+'\n');
console.log(JSON.stringify({...proof,listing_urls:undefined},null,2));
if (!proof.zero_db_writes || proof.direct_detail_fetches !== 0) process.exit(2);
if (proof.robots_status !== 200 || !proof.results_path_allowed) process.exit(3);
