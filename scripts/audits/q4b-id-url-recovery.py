#!/usr/bin/env python3
import argparse, json, os, re, sys, time, urllib.parse, urllib.request, zipfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

UA = 'AkarFinder-Q4B/1.0 exact-id-url-recovery'

def read_jsonl_from_zip(path, member):
    with zipfile.ZipFile(path) as z, z.open(member) as f:
        for line in f:
            if line.strip():
                yield json.loads(line)

def norm_url(u):
    u = str(u or '').strip()
    if not u: return None
    u = re.sub(r'^http://', 'https://', u, flags=re.I)
    u = re.sub(r'^(https://)www\.', r'\1', u, flags=re.I)
    return u

def extract_id(domain, url):
    u = str(url or '')
    if domain == 'mubawab.ma':
        m = re.search(r'mubawab\.ma/(?:fr|ar)/a/(\d+)(?:/|$)', u, re.I)
        return m.group(1) if m else None
    if domain == 'avito.ma':
        m = re.search(r'_(\d+)\.htm(?:$|[?#])', u, re.I)
        return m.group(1) if m else None
    return None

def build_targets(args):
    ids = {'mubawab.ma': {}, 'avito.ma': {}}
    for r in read_jsonl_from_zip(args.q1d, 'manifest-q1d.jsonl'):
        d = r.get('source_domain')
        if d in ids and r.get('identity_kind') == 'id':
            sid = str(r.get('source_identity'))
            feat = r.get('features') or {}
            ids[d][sid] = {
                'source_domain': d, 'source_id': sid,
                'city': feat.get('city'), 'price_mad': feat.get('price_mad'),
                'surface_m2': feat.get('surface_m2'), 'title': feat.get('title')
            }
    known = {'mubawab.ma': {}, 'avito.ma': {}}
    for r in read_jsonl_from_zip(args.public, 'public-dataset-features.jsonl'):
        d = r.get('source_domain'); sid = str(r.get('source_id') or '')
        if d in known and sid in ids[d] and r.get('url'):
            known[d][sid] = norm_url(r['url'])
    for r in read_jsonl_from_zip(args.dbfields, 'db-url-field-evidence.jsonl'):
        u = r.get('url')
        for d in known:
            sid = extract_id(d, u)
            if sid and sid in ids[d]: known[d].setdefault(sid, norm_url(u))
    unresolved = {d: [dict(ids[d][sid], known_url=None) for sid in sorted(ids[d], key=lambda x:int(x)) if sid not in known[d]] for d in ids}
    return ids, known, unresolved

def http_json_lines(url, timeout=30):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            txt = r.read().decode('utf-8', 'replace')
        out=[]
        for line in txt.splitlines():
            try: out.append(json.loads(line))
            except Exception: pass
        return out
    except Exception:
        return []

def get_indexes(n=6):
    req=urllib.request.Request('https://index.commoncrawl.org/collinfo.json',headers={'User-Agent':UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        data=json.load(r)
    return [x['id'] for x in data[:n]]

def cc_query_for_id(domain, sid, indexes):
    if domain=='mubawab.ma':
        patterns=[f'*.mubawab.ma/fr/a/{sid}/*', f'*.mubawab.ma/ar/a/{sid}/*']
    else:
        patterns=[f'*.avito.ma/*_{sid}.htm']
    candidates=[]
    for idx in indexes:
        for pat in patterns:
            q=urllib.parse.urlencode({'url':pat,'output':'json','filter':'status:200','collapse':'urlkey'})
            rows=http_json_lines(f'https://index.commoncrawl.org/{idx}-index?{q}')
            for rec in rows:
                u=rec.get('url')
                if extract_id(domain,u)==sid:
                    candidates.append((rec.get('timestamp') or '', norm_url(u), idx))
        if candidates: break
    if not candidates: return None
    candidates.sort(reverse=True)
    ts,u,idx=candidates[0]
    return {'source_domain':domain,'source_id':sid,'url':u,'cc_index':idx,'cc_timestamp':ts,'match_basis':'commoncrawl_exact_source_id'}

def recover_batch(domain, targets, offset, limit, workers, indexes):
    batch=targets[offset:offset+limit]
    out=[]
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futs={ex.submit(cc_query_for_id,domain,r['source_id'],indexes):r for r in batch}
        for fut in as_completed(futs):
            x=fut.result()
            if x: out.append(x)
    out.sort(key=lambda r:int(r['source_id']))
    return batch,out

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--q1d',required=True); ap.add_argument('--public',required=True); ap.add_argument('--dbfields',required=True)
    ap.add_argument('--out',required=True); ap.add_argument('--source',choices=['mubawab.ma','avito.ma','all'],default='all')
    ap.add_argument('--offset',type=int,default=0); ap.add_argument('--limit',type=int,default=500); ap.add_argument('--workers',type=int,default=16); ap.add_argument('--indexes',type=int,default=6)
    args=ap.parse_args(); Path(args.out).mkdir(parents=True,exist_ok=True)
    ids,known,unresolved=build_targets(args)
    summary={'schemaVersion':'q4b-id-url-recovery-v1','originalIdOnly':{d:len(ids[d]) for d in ids},'knownExactUrlBefore':{d:len(known[d]) for d in known},'unresolvedBefore':{d:len(unresolved[d]) for d in unresolved}}
    Path(args.out,'targets-summary.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n')
    with open(Path(args.out,'unresolved-ids.jsonl'),'w') as f:
        for d in unresolved:
            for r in unresolved[d]: f.write(json.dumps(r,ensure_ascii=False)+'\n')
    sources=['mubawab.ma','avito.ma'] if args.source=='all' else [args.source]
    indexes=get_indexes(args.indexes)
    recovered=[]; scanned={}
    for d in sources:
        batch,out=recover_batch(d,unresolved[d],args.offset,args.limit,args.workers,indexes)
        scanned[d]=len(batch); recovered.extend(out)
    with open(Path(args.out,'recovered-urls.jsonl'),'w') as f:
        for r in recovered:f.write(json.dumps(r,ensure_ascii=False)+'\n')
    summary.update({'indexes':indexes,'offset':args.offset,'limit':args.limit,'scanned':scanned,'recoveredExactUrls':len(recovered),'recoveredBySource':{d:sum(1 for r in recovered if r['source_domain']==d) for d in sources}})
    Path(args.out,'summary.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n')
    print(json.dumps(summary,indent=2,ensure_ascii=False))

if __name__=='__main__': main()
