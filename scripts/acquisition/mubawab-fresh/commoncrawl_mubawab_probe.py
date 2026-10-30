#!/usr/bin/env python3
"""Bounded read-only probe of Common Crawl's independent URL index.

It never calls Mubawab, has no listing/photo downloader and does not use
historical AkarFinder data to discover links. Archived URLs are candidates,
NOT proof of currently active properties or rights to republish content.
"""
from __future__ import annotations
import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from bulk_url_inventory import normalized

INDEX_HOST = 'index.commoncrawl.org'
CRAWL_RE = re.compile(r'^CC-MAIN-20\d{2}-\d{2}$')
AGENT = 'AkarFinder-CommonCrawl-URL-audit/0.1 (+https://akarfinder.ma)'


def index_url(crawl: str, kind: str, page_size: int, prefix: str = '') -> str:
    if not CRAWL_RE.fullmatch(crawl): raise ValueError('invalid_crawl_id')
    if kind not in ('a', 'pa'): raise ValueError('invalid_listing_kind')
    if page_size not in range(1, 1001): raise ValueError('invalid_page_size')
    if prefix and (kind != 'a' or not re.fullmatch(r'[0-9]{1,4}',prefix)):
        raise ValueError('invalid_numeric_prefix')
    query=urllib.parse.urlencode({
        'url':f'www.mubawab.ma/fr/{kind}/{prefix}*',
        'output':'json','filter':'status:200',
        'page':0,'pageSize':page_size,
    })
    return f'https://{INDEX_HOST}/{crawl}-index?{query}'


def fetch_rows(url: str, *, open_url=urllib.request.urlopen, limit=500, timeout=25):
    request=urllib.request.Request(url, headers={'User-Agent':AGENT,'Accept':'application/x-ndjson,application/json,text/plain'})
    consumed=0;rows=[];limited=False
    with open_url(request,timeout=timeout) as response:
        for raw in response:
            consumed+=len(raw)
            if consumed>3_000_000:raise ValueError('response_byte_budget_exceeded')
            if not raw.strip():continue
            try:obj=json.loads(raw)
            except (ValueError, UnicodeDecodeError) as exc:raise ValueError('invalid_index_json') from exc
            if not isinstance(obj,dict):raise ValueError('unexpected_index_record')
            rows.append(obj)
            if len(rows)>=limit:
                limited=True;break
    return rows,limited


def indexed_records(rows: list[dict], crawl: str, index_endpoint: str):
    results=[]
    for obj in rows:
        if str(obj.get('status'))!='200':continue
        url=obj.get('url')
        val=normalized(url)
        if not val:continue
        lid,canon=val
        results.append({'source':'mubawab','id':lid,'url':canon,
            'original_url':url,'archive_timestamp':str(obj.get('timestamp') or ''),
            'archive_crawl':crawl,'index_endpoint':index_endpoint,
            'detail_state':'not_fetched','source_kind':'commoncrawl_archived_url_index'})
    return results


def run(crawls: list[str], out: Path, *, max_rows=500, pause_seconds=1, fetch=fetch_rows, a_prefixes=None):
    out.mkdir(parents=True,exist_ok=True)
    seen=set(); records=[]; attempts=[]
    targets=[('a',p) for p in (a_prefixes or [''])]+[('pa','')]
    for crawl in crawls:
        for kind,prefix in targets:
            url=index_url(crawl,kind,max_rows,prefix)
            item={'crawl':crawl,'kind':kind,'id_prefix':prefix or None,'query_url':url}
            try:
                raw, limited=fetch(url,limit=max_rows)
                valid=indexed_records(raw,crawl,url)
                item.update({'status':'ok','index_rows':len(raw),'valid_listing_rows':len(valid),'response_limited':limited})
                for rec in valid:
                    # Historical duplicates in Common Crawl are expected; preserve
                    # one URL per listing ID, keeping the newest archive timestamp.
                    key=(rec['id'],rec['url'])
                    if key not in seen:seen.add(key);records.append(rec)
            except (urllib.error.HTTPError,urllib.error.URLError,TimeoutError,ValueError,OSError) as e:
                item.update({'status':'error','error_type':type(e).__name__,'error':str(e)[:160]})
            attempts.append(item)
            if pause_seconds:time.sleep(pause_seconds)
    with (out/'commoncrawl_candidate_urls.jsonl').open('w',encoding='utf-8') as f:
        for item in sorted(records,key=lambda r:(r['id'],r['url'])):
            f.write(json.dumps(item,ensure_ascii=False)+'\n')
    report={'strategy':'public_archived_url_index_only',
        'a_prefix_scopes':list(a_prefixes or []),
        'commoncrawl_queries':len(attempts),'queries_ok':sum(x['status']=='ok' for x in attempts),
        'queries_failed':sum(x['status']=='error' for x in attempts),
        'candidate_unique_urls':len(records),'candidate_unique_ids':len({r['id'] for r in records}),
        'truncated_queries':sum(bool(x.get('response_limited')) for x in attempts),
        'source_newly_crawled':False,'listing_details_downloaded':0,'image_files_downloaded':0,
        'historical_used_as_seed':False,'live_active_status_verified':False,'coverage_certified':False,
        'commercial_reuse_permission_verified':False,'queries':attempts}
    (out/'commoncrawl_report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    return report


def main(argv=None):
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--crawl',action='append',required=True)
    p.add_argument('--out',type=Path,required=True)
    p.add_argument('--max-rows',type=int,default=500)
    p.add_argument('--a-prefix',action='append',default=[],help='Optional digit prefix (1-4 digits) to narrow fr/a/ queries on HTTP 504; not an exhaustive index.')
    p.add_argument('--pause',type=float,default=1)
    a=p.parse_args(argv)
    if a.max_rows<1 or a.max_rows>1000 or a.pause<1:
        p.error('--max-rows 1-1000 and --pause >=1 required')
    if not all(CRAWL_RE.fullmatch(c) for c in a.crawl):p.error('invalid crawl ID')
    if len(a.a_prefix)>5 or any(not re.fullmatch(r'[0-9]{1,4}',x) for x in a.a_prefix):p.error('up to five numeric prefixes of 1-4 digits allowed')
    report=run(a.crawl,a.out,max_rows=a.max_rows,pause_seconds=a.pause,a_prefixes=list(dict.fromkeys(a.a_prefix)))
    print(json.dumps({k:v for k,v in report.items() if k!='queries'},ensure_ascii=False))
    return 0 if report['candidate_unique_ids']>0 else 2

if __name__=='__main__':raise SystemExit(main())