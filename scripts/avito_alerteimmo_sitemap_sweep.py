#!/usr/bin/env python3
import argparse, hashlib, json, re, time, urllib.parse, urllib.request, urllib.robotparser
from collections import deque
from pathlib import Path

BASE='https://alerteimmo.ma'
UA='AkarFinder-Audit/1.0 (+https://akarfinder.vercel.app; read-only public-surface audit)'
AVITO_RE=re.compile(r'https?://(?:www\.)?avito\.ma/fr/[^\"\'<>\s]+?_(\d{6,12})\.htm',re.I)
ALLOWED_PREFIXES=('/louer/','/acheter/','/quartiers/')

def fetch(url, timeout=10):
    req=urllib.request.Request(url,headers={'User-Agent':UA,'Accept':'text/html,application/xml;q=0.9,*/*;q=0.8'})
    with urllib.request.urlopen(req,timeout=timeout) as r:
        return r.status,r.headers.get('Content-Type',''),r.read().decode('utf-8','replace')

def normalize(url):
    p=urllib.parse.urlparse(url)
    if p.netloc.lower() not in ('alerteimmo.ma','www.alerteimmo.ma'): return None
    path=p.path.rstrip('/') or '/'
    if path=='/' or path=='/quartiers' or path.startswith(ALLOWED_PREFIXES):
        return urllib.parse.urlunparse(('https','alerteimmo.ma',path,'','',''))
    return None

def shard_for(url,count):
    d=hashlib.sha256(url.encode()).digest()
    return int.from_bytes(d[:8],'big')%count

def sitemap_urls(rp,sleep_s,errors):
    found=set(); todo=deque([BASE+'/sitemap.xml']); seen=set()
    loc_re=re.compile(r'<loc>\s*(.*?)\s*</loc>',re.I|re.S)
    while todo and len(seen)<50:
        u=todo.popleft()
        if u in seen or not rp.can_fetch(UA,u): continue
        seen.add(u)
        try:
            _,_,txt=fetch(u); time.sleep(sleep_s)
        except Exception as e:
            errors.append({'url':u,'stage':'sitemap','error':repr(e)}); continue
        for raw in loc_re.findall(txt):
            loc=raw.strip().replace('&amp;','&')
            if loc.endswith('.xml') and urllib.parse.urlparse(loc).netloc.endswith('alerteimmo.ma'):
                todo.append(loc)
            else:
                n=normalize(loc)
                if n: found.add(n)
    return found

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--baseline',required=True); ap.add_argument('--expected-baseline',type=int,required=True)
    ap.add_argument('--output',required=True); ap.add_argument('--shard-index',type=int,required=True); ap.add_argument('--shard-count',type=int,required=True)
    ap.add_argument('--sleep',type=float,default=.25); ap.add_argument('--time-budget',type=int,default=720)
    args=ap.parse_args()
    out=Path(args.output); out.mkdir(parents=True,exist_ok=True)
    baseline={x.strip() for x in Path(args.baseline).read_text().splitlines() if x.strip()}
    if len(baseline)!=args.expected_baseline: raise SystemExit(f'Expected baseline {args.expected_baseline}, got {len(baseline)}')
    rp=urllib.robotparser.RobotFileParser(); rp.set_url(BASE+'/robots.txt')
    try: rp.read()
    except Exception as e: raise SystemExit(f'robots.txt unavailable; refusing crawl: {e}')
    errors=[]; all_urls=sitemap_urls(rp,args.sleep,errors)
    urls=sorted(u for u in all_urls if shard_for(u,args.shard_count)==args.shard_index)
    records={}; visited=0; blocked=0; started=time.monotonic(); stopped_by='exhausted'
    for url in urls:
        if time.monotonic()-started>=args.time_budget:
            stopped_by='time_budget'; break
        if not rp.can_fetch(UA,url): blocked+=1; continue
        try:
            status,ctype,html=fetch(url); time.sleep(args.sleep)
        except Exception as e:
            errors.append({'url':url,'stage':'page','error':repr(e)}); visited+=1; continue
        visited+=1
        if status!=200 or 'html' not in ctype.lower(): continue
        for m in AVITO_RE.finditer(html):
            aid=m.group(1); r=records.setdefault(aid,{'id':aid,'avito_url':m.group(0),'evidence_pages':[]})
            if url not in r['evidence_pages'] and len(r['evidence_pages'])<5: r['evidence_pages'].append(url)
    ids=set(records); overlap=ids&baseline; net=ids-baseline; union=ids|baseline
    for name,vals in [('alerteimmo_ids.txt',ids),('overlap_ids.txt',overlap),('net_new_ids.txt',net),('union_ids.txt',union)]:
        (out/name).write_text('\n'.join(sorted(vals,key=int))+('\n' if vals else ''),encoding='utf-8')
    with (out/'records.jsonl').open('w',encoding='utf-8') as f:
        for aid in sorted(records,key=int): f.write(json.dumps(records[aid],ensure_ascii=False,sort_keys=True)+'\n')
    complete=(visited+blocked)>=len(urls) and stopped_by=='exhausted'
    summary={'source':'alerteimmo.ma sitemap exhaustive shard','baseline_unique_ids':len(baseline),'alerteimmo_unique_avito_ids':len(ids),'overlap_with_baseline':len(overlap),'net_new_vs_baseline':len(net),'union_unique_ids':len(union),'gain_pct':round(len(net)/len(baseline)*100,4),'sitemap_urls_total':len(all_urls),'shard_urls_total':len(urls),'pages_visited':visited,'blocked_by_robots':blocked,'shard':{'index':args.shard_index,'count':args.shard_count},'limits':{'time_budget_seconds':args.time_budget,'elapsed_seconds':round(time.monotonic()-started,3),'stopped_by':stopped_by,'complete':complete,'sleep_seconds':args.sleep},'safety':{'direct_avito_requests':0,'avito_content_fetched':False},'errors':errors,'exhaustive_claim':'sitemap-only' if complete else False}
    (out/'summary.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False,sort_keys=True)+'\n',encoding='utf-8')
    sums=[]
    for p in sorted(out.iterdir()):
        if p.name!='SHA256SUMS': sums.append(f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.name}')
    (out/'SHA256SUMS').write_text('\n'.join(sums)+'\n',encoding='utf-8')
    print(json.dumps(summary,indent=2,ensure_ascii=False))

if __name__=='__main__': main()
