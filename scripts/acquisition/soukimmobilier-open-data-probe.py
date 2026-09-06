#!/usr/bin/env python3
import csv, io, json, re, urllib.request, urllib.robotparser
from pathlib import Path
from datetime import datetime, timezone

BASE='https://www.soukimmobilier.com'
ROBOTS=BASE+'/robots.txt'
CSV_URL=BASE+'/fr/prix-m2/csv'
UA='AkarFinder-Audit/1.0 (+https://akarfinder.vercel.app; read-only public-surface audit)'
OUT=Path('artifacts/soukimmobilier-open-data-probe'); OUT.mkdir(parents=True, exist_ok=True)
summary={'generated_at':datetime.now(timezone.utc).isoformat(),'source':'soukimmobilier.com','mode':'read_only_open_data_probe','zero_db_writes':True,'direct_detail_fetches':0,'csv_url':CSV_URL}
try:
    rp=urllib.robotparser.RobotFileParser(); rp.set_url(ROBOTS); rp.read()
    allowed=rp.can_fetch(UA, CSV_URL); summary['robots_allowed']=allowed
    if not allowed:
        summary['error']='robots_disallow'; print(json.dumps(summary,indent=2)); (OUT/'summary.json').write_text(json.dumps(summary,indent=2)+'\n'); raise SystemExit(2)
    req=urllib.request.Request(CSV_URL, headers={'User-Agent':UA,'Accept':'text/csv,*/*;q=0.5'})
    with urllib.request.urlopen(req, timeout=30) as r:
        body=r.read().decode('utf-8-sig','replace'); summary['http_status']=r.status; summary['content_type']=r.headers.get('Content-Type','')
    rows=list(csv.DictReader(io.StringIO(body)))
    summary['row_count']=len(rows); summary['columns']=list(rows[0].keys()) if rows else []
    url_cols=[c for c in summary['columns'] if re.search(r'url|link|href', c, re.I)]
    id_cols=[c for c in summary['columns'] if re.search(r'(^|_)id($|_)|reference|ref', c, re.I)]
    summary['url_columns']=url_cols; summary['id_columns']=id_cols
    detail_urls=set(); ids=set()
    for row in rows:
        for c in url_cols:
            v=(row.get(c) or '').strip()
            if v.startswith('http'): detail_urls.add(v)
        for c in id_cols:
            v=(row.get(c) or '').strip()
            if v: ids.add(v)
    summary['unique_urls']=len(detail_urls); summary['unique_ids']=len(ids)
    (OUT/'summary.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    (OUT/'urls.txt').write_text('\n'.join(sorted(detail_urls))+('\n' if detail_urls else ''),encoding='utf-8')
    print(json.dumps(summary,indent=2,ensure_ascii=False))
except SystemExit: raise
except Exception as e:
    summary['error']=repr(e); (OUT/'summary.json').write_text(json.dumps(summary,indent=2)+'\n'); print(json.dumps(summary,indent=2)); raise
