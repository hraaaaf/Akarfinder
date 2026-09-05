#!/usr/bin/env python3
import argparse, hashlib, json
from pathlib import Path

def read_ids(p): return {x.strip() for x in Path(p).read_text(encoding='utf-8').splitlines() if x.strip()}

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--baseline',required=True); ap.add_argument('--expected-baseline',type=int,required=True); ap.add_argument('--shards-dir',required=True); ap.add_argument('--output',required=True); ap.add_argument('--expected-shards',type=int,required=True); args=ap.parse_args()
    out=Path(args.output); out.mkdir(parents=True,exist_ok=True)
    baseline=read_ids(args.baseline)
    if len(baseline)!=args.expected_baseline: raise SystemExit(f'Expected baseline {args.expected_baseline}, got {len(baseline)}')
    summaries=sorted(Path(args.shards_dir).glob('**/summary.json'))
    if len(summaries)!=args.expected_shards: raise SystemExit(f'Expected {args.expected_shards} shard summaries, got {len(summaries)}')
    ids=set(); records={}; idxs=set(); stats=[]; errors=0; complete=True; sitemap_totals=set(); pages=0
    for sp in summaries:
        d=json.loads(sp.read_text(encoding='utf-8')); idx=int(d['shard']['index']); count=int(d['shard']['count'])
        if count!=args.expected_shards or idx in idxs: raise SystemExit(f'Bad shard metadata at {sp}')
        idxs.add(idx)
        if d['safety']['direct_avito_requests']!=0: raise SystemExit(f'Unsafe shard {idx}')
        sid=read_ids(sp.parent/'alerteimmo_ids.txt'); ids|=sid; errors+=len(d.get('errors',[])); pages+=int(d['pages_visited']); complete=complete and bool(d['limits']['complete']); sitemap_totals.add(int(d['sitemap_urls_total']))
        stats.append({'index':idx,'ids':len(sid),'pages_visited':int(d['pages_visited']),'shard_urls_total':int(d['shard_urls_total']),'complete':bool(d['limits']['complete']),'errors':len(d.get('errors',[]))})
        rp=sp.parent/'records.jsonl'
        if rp.exists():
            for line in rp.read_text(encoding='utf-8').splitlines():
                if not line.strip(): continue
                r=json.loads(line); aid=str(r['id']); cur=records.setdefault(aid,{'id':aid,'avito_url':r.get('avito_url'),'evidence_pages':[]})
                for page in r.get('evidence_pages',[]):
                    if page not in cur['evidence_pages'] and len(cur['evidence_pages'])<10: cur['evidence_pages'].append(page)
    if idxs!=set(range(args.expected_shards)): raise SystemExit(f'Incomplete shard indexes: {sorted(idxs)}')
    if len(sitemap_totals)!=1: raise SystemExit(f'Inconsistent sitemap totals: {sorted(sitemap_totals)}')
    overlap=ids&baseline; net=ids-baseline; union=ids|baseline
    for name,vals in [('alerteimmo_ids.txt',ids),('overlap_ids.txt',overlap),('net_new_ids.txt',net),('union_ids.txt',union)]: (out/name).write_text('\n'.join(sorted(vals,key=int))+('\n' if vals else ''),encoding='utf-8')
    with (out/'records.jsonl').open('w',encoding='utf-8') as f:
        for aid in sorted(records,key=int): f.write(json.dumps(records[aid],ensure_ascii=False,sort_keys=True)+'\n')
    summary={'source':'alerteimmo.ma exhaustive public sitemap sweep','baseline_unique_ids':len(baseline),'alerteimmo_unique_avito_ids':len(ids),'overlap_with_baseline':len(overlap),'net_new_vs_baseline':len(net),'union_unique_ids':len(union),'gain_pct':round(len(net)/len(baseline)*100,4),'sitemap_urls_total':next(iter(sitemap_totals)),'pages_visited_total':pages,'shards_expected':args.expected_shards,'shards_received':len(summaries),'all_shards_complete':complete,'errors_total':errors,'shards':sorted(stats,key=lambda x:x['index']),'safety':{'direct_avito_requests':0,'avito_content_fetched':False},'exhaustive_claim':'alerteimmo public sitemap' if complete and errors==0 else False}
    (out/'summary.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False,sort_keys=True)+'\n',encoding='utf-8')
    sums=[]
    for p in sorted(out.iterdir()):
        if p.name!='SHA256SUMS': sums.append(f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.name}')
    (out/'SHA256SUMS').write_text('\n'.join(sums)+'\n',encoding='utf-8')
    print(json.dumps(summary,indent=2,ensure_ascii=False))

if __name__=='__main__': main()
