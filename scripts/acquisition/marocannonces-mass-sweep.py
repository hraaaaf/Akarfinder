#!/usr/bin/env python3
import argparse,json,re,time,urllib.request,urllib.robotparser,urllib.parse
from pathlib import Path
from datetime import datetime,timezone

BASE='https://www.marocannonces.com'
START='/categorie/16/Immobilier-vente.html'
UA='AkarFinder-Audit/1.0 (+https://akarfinder.vercel.app; read-only public-surface audit)'
ANN_RE=re.compile(r'href=["\']([^"\']*/annonce/(\d+)/[^"\']+)["\']',re.I)
COUNT_RE=re.compile(r'Vous consultez les\s+([0-9\s]+)\s+(?:petites\s+)?annonces',re.I)


def get(url,timeout=12):
    req=urllib.request.Request(url,headers={'User-Agent':UA,'Accept':'text/html,*/*;q=0.8'})
    with urllib.request.urlopen(req,timeout=timeout) as r:
        return r.status,r.read().decode('utf-8','replace')

def page_url(page):
    if page==1: return BASE+START
    return f'{BASE}/categorie/16/Immobilier-vente/{page}.html'

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--shard-index',type=int,required=True)
    ap.add_argument('--shard-count',type=int,default=8)
    ap.add_argument('--max-page',type=int,default=2200)
    ap.add_argument('--sleep',type=float,default=0.18)
    ap.add_argument('--time-budget-seconds',type=int,default=720)
    args=ap.parse_args()
    if not 0 <= args.shard_index < args.shard_count: raise SystemExit('bad shard')

    rp=urllib.robotparser.RobotFileParser(); rp.set_url(BASE+'/robots.txt'); rp.read()
    out=Path(f'artifacts/marocannonces-mass-sweep/shard-{args.shard_index}'); out.mkdir(parents=True,exist_ok=True)
    ids={}; errors=[]; pages=[]; started=time.monotonic(); advertised=None; consecutive_empty=0
    for p in range(1,args.max_page+1):
        if (p-1)%args.shard_count != args.shard_index: continue
        if time.monotonic()-started >= args.time_budget_seconds: break
        u=page_url(p)
        if not rp.can_fetch(UA,u):
            errors.append({'page':p,'url':u,'error':'robots_disallowed'}); continue
        try:
            st,html=get(u)
            if p==1:
                m=COUNT_RE.search(html)
                if m:
                    try: advertised=int(re.sub(r'\D','',m.group(1)))
                    except: pass
            found=0
            for href,idv in ANN_RE.findall(html):
                full=urllib.parse.urljoin(BASE+'/',href)
                if urllib.parse.urlparse(full).netloc.lower() not in {'www.marocannonces.com','marocannonces.com'}: continue
                ids[idv]=full; found+=1
            pages.append({'page':p,'status':st,'found_refs':found})
            consecutive_empty = consecutive_empty+1 if found==0 else 0
            if consecutive_empty>=8: break
        except Exception as e:
            errors.append({'page':p,'url':u,'error':repr(e)})
        time.sleep(args.sleep)

    elapsed=round(time.monotonic()-started,2)
    summary={
      'generated_at':datetime.now(timezone.utc).isoformat(),
      'source':'marocannonces.com','shard_index':args.shard_index,'shard_count':args.shard_count,
      'zero_db_writes':True,'direct_public_pages_only':True,'advertised_count_observed':advertised,
      'pages_visited':len(pages),'unique_listing_ids':len(ids),'errors':errors,
      'elapsed_seconds':elapsed,'time_budget_seconds':args.time_budget_seconds,
      'max_page':args.max_page,'truncated':elapsed>=args.time_budget_seconds
    }
    (out/'summary.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n')
    (out/'listing_ids.txt').write_text('\n'.join(sorted(ids))+'\n')
    (out/'records.jsonl').write_text(''.join(json.dumps({'id':k,'url':v},ensure_ascii=False)+'\n' for k,v in sorted(ids.items())))
    print(json.dumps(summary,indent=2,ensure_ascii=False))
if __name__=='__main__': main()
