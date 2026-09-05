#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, re, time, urllib.parse, urllib.request
from collections import defaultdict, Counter
from pathlib import Path
from datetime import datetime, timezone

CDX='https://web.archive.org/cdx/search/cdx'
ID_RE=re.compile(r'_(\d{6,12})\.htm(?:[?#]|$)', re.I)
CATS=('appartements','autre_immobilier','bureaux','chambre','local','maisons','maisons_et_villas','terrains_et_fermes','villas_et_riads')
HOSTS=('www.avito.ma','avito.ma')

def now(): return datetime.now(timezone.utc).isoformat().replace('+00:00','Z')
def sha256(p:Path):
 h=hashlib.sha256();
 with p.open('rb') as f:
  for c in iter(lambda:f.read(1<<20),b''): h.update(c)
 return h.hexdigest()
def get(url, timeout=60, retries=5):
 delay=3
 for i in range(retries):
  try:
   req=urllib.request.Request(url,headers={'User-Agent':'AkarFinder-Avito-Wayback-Radar/1.0','Accept':'text/plain'})
   with urllib.request.urlopen(req,timeout=timeout) as r: return r.read().decode('utf-8','replace')
  except Exception:
   if i==retries-1: raise
   time.sleep(delay); delay*=2

def query_url(host, cat, start, end, limit, resume=None):
 q=[('url',f'{host}/fr/{cat}/*'),('matchType','prefix'),('from',start),('to',end),('fl','original,timestamp,statuscode,mimetype'),('filter','statuscode:200'),('collapse','urlkey'),('output','txt'),('limit',str(limit)),('showResumeKey','true')]
 if resume: q.append(('resumeKey',resume))
 return CDX+'?'+urllib.parse.urlencode(q)

def parse_page(raw):
 lines=raw.splitlines(); resume=None; rows=[]
 if lines:
  # resume key is returned after a blank separator; keep last non-row token conservatively
  for i,l in enumerate(lines):
   if not l.strip():
    tail=[x.strip() for x in lines[i+1:] if x.strip()]
    if tail: resume=tail[-1]
    lines=lines[:i]; break
 for l in lines:
  parts=l.split(' ')
  if len(parts)>=4: rows.append(parts[:4])
 return rows,resume

def main():
 ap=argparse.ArgumentParser(); ap.add_argument('--baseline',required=True,type=Path); ap.add_argument('--output',required=True,type=Path); ap.add_argument('--from-year',default='2025'); ap.add_argument('--to-year',default='2026'); ap.add_argument('--limit',type=int,default=5000); ap.add_argument('--max-pages',type=int,default=20); ap.add_argument('--sleep',type=float,default=1.5); args=ap.parse_args()
 base={x.strip() for x in args.baseline.read_text().splitlines() if x.strip()};
 if len(base)!=6581: raise SystemExit(f'expected certified union 6581, got {len(base)}')
 args.output.mkdir(parents=True,exist_ok=True)
 ev=defaultdict(list); stats=[]; errors=[]; requests=0
 for host in HOSTS:
  for cat in CATS:
   resume=None; pages=0; ids=set(); rows_seen=0; complete=False
   while pages<args.max_pages:
    url=query_url(host,cat,args.from_year,args.to_year,args.limit,resume)
    try: raw=get(url); requests+=1
    except Exception as e:
     errors.append({'host':host,'category':cat,'page':pages,'error':f'{type(e).__name__}: {e}'}); break
    rows,next_resume=parse_page(raw); pages+=1; rows_seen+=len(rows)
    for original,ts,status,mime in rows:
     m=ID_RE.search(original)
     if not m: continue
     lid=m.group(1); ids.add(lid); ev[lid].append({'host':host,'category':cat,'timestamp':ts,'status':status,'mime':mime,'url':original})
    if not next_resume: complete=True; break
    resume=next_resume; time.sleep(args.sleep)
   stats.append({'host':host,'category':cat,'pages':pages,'rows':rows_seen,'unique_ids':len(ids),'complete':complete,'truncated':not complete})
   time.sleep(args.sleep)
 found=set(ev); overlap=found&base; new=found-base; union=base|found
 def writelines(name,s): (args.output/name).write_text(''.join(f'{x}\n' for x in sorted(s,key=int)),encoding='utf-8')
 writelines('baseline_ids.txt',base); writelines('wayback_ids.txt',found); writelines('overlap_ids.txt',overlap); writelines('net_new_ids.txt',new); writelines('union_ids.txt',union)
 with (args.output/'wayback_records.jsonl').open('w',encoding='utf-8') as f:
  for lid in sorted(found,key=int): f.write(json.dumps({'source_id':lid,'in_baseline':lid in base,'evidence':ev[lid]},ensure_ascii=False,sort_keys=True)+'\n')
 bycat=Counter()
 for lid,items in ev.items():
  for c in {i['category'] for i in items}: bycat[c]+=1
 summary={'generated_at':now(),'source':'Internet Archive Wayback CDX','scope':'Avito real estate only','date_window':{'from':args.from_year,'to':args.to_year},'baseline_unique_ids':len(base),'wayback_unique_ids':len(found),'overlap_with_baseline':len(overlap),'net_new_vs_baseline':len(new),'union_unique_ids':len(union),'gain_pct':round(len(new)/len(base)*100,4),'by_category_unique_ids':dict(sorted(bycat.items())),'requests_to_wayback':requests,'query_stats':stats,'errors':errors,'limits':{'max_pages_per_query':args.max_pages,'limit_per_page':args.limit,'truncated':any(s['truncated'] for s in stats),'exhaustive_claim':False},'safety':{'direct_avito_requests':0,'avito_content_fetched':False,'only_wayback_cdx_queried':True}}
 (args.output/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2,sort_keys=True)+'\n',encoding='utf-8')
 files=[p for p in args.output.iterdir() if p.is_file() and p.name!='SHA256SUMS']; (args.output/'SHA256SUMS').write_text(''.join(f'{sha256(p)}  {p.name}\n' for p in sorted(files)),encoding='utf-8')
 print(json.dumps({'baseline':len(base),'wayback':len(found),'overlap':len(overlap),'net_new':len(new),'union':len(union),'truncated':summary['limits']['truncated'],'errors':len(errors)},sort_keys=True))
if __name__=='__main__': main()
