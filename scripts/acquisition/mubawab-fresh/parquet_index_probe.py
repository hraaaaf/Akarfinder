#!/usr/bin/env python3
"""Bounded public Common Crawl Parquet URL index metadata probe.

No Mubawab requests, listing HTML, or media retrieval. Fetches a Common Crawl
manifest and DuckDB footer metadata to find at most N Parquet shards whose
SURT key-range contains Mubawab; reads URL-index rows only in chosen shards.
DO NOT treat archived URL evidence as live listings or publication permission.
"""
from __future__ import annotations

import argparse
import gzip
import json
import re
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit, unquote

ROOT = 'https://data.commoncrawl.org/'
PREFIX_LOW = 'ma,mubawab'
PREFIX_HIGH = 'ma,mubawab\uffff'
CRAWL = re.compile(r'^CC-MAIN-20\d{2}-\d{2}$')
SHARD = re.compile(r'/subset=warc/part-(\d{5})-[a-zA-Z0-9.-]+\.parquet$')
LISTING = re.compile(r'^/fr/(?:a|pa)/(\d{4,15})(?:/|$)', re.I)
UA = 'AkarFinder-CC-public-index-probe/0.1 (+https://akarfinder.ma)'


def utcnow(): return datetime.now(timezone.utc).isoformat()

def parse_manifest(text: str, crawl: str) -> list[str]:
    if not CRAWL.fullmatch(crawl): raise ValueError('invalid crawl ID')
    items = {}
    for name in text.splitlines():
        name = name.strip()
        match = SHARD.search(name)
        if not match: continue
        if f'/crawl={crawl}/' not in name: continue
        number = int(match.group(1))
        if number in items: raise ValueError('duplicate Parquet partition number')
        items[number] = ROOT + name.lstrip('/')
    if len(items) < 2 or len(items) > 400: raise ValueError('unexpected WARC Parquet shard count')
    if set(items) != set(range(len(items))):
        raise ValueError('missing or out-of-order Parquet partition numbers')
    return [items[k] for k in sorted(items)]


def get_manifest(crawl: str) -> list[str]:
    if not CRAWL.fullmatch(crawl): raise ValueError('invalid crawl ID')
    url = ROOT + f'crawl-data/{crawl}/cc-index-table.paths.gz'
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'application/gzip'})
    with urllib.request.urlopen(req, timeout=25) as r:
        data = r.read(2_000_001)
    if len(data) > 2_000_000: raise ValueError('manifest too large')
    return parse_manifest(gzip.decompress(data).decode('utf-8'),crawl)


def normalize_listing(url: str):
    try:
        if not isinstance(url,str) or len(url)>4096: return None
        p=urlsplit(url)
        if p.scheme not in ('http','https') or (p.hostname or '').lower() not in {'www.mubawab.ma','mubawab.ma'}:return None
        if p.username or p.password or p.port not in (None,80,443): return None
        path=unquote(p.path)
        if '\\' in path or '//' in path or '..' in path.split('/'):return None
        m=LISTING.match(path)
        if not m:return None
        return m.group(1), 'https://www.mubawab.ma'+p.path.rstrip('/')
    except (ValueError, TypeError):return None


def make_duckdb():
    import duckdb
    c=duckdb.connect(database=':memory:')
    c.execute('SET threads=2')
    c.execute("SET memory_limit='768MB'")
    c.execute('SET http_retries=1')
    # DuckDB installations usually bundle httpfs. If unavailable, report error;
    # do not silently scan a different URL index or expand budgets.
    try:c.execute('LOAD httpfs')
    except Exception:c.execute('INSTALL httpfs');c.execute('LOAD httpfs')
    return c


def file_surt_range(con, url: str):
    rows=con.execute('''
      SELECT MIN(stats_min_value), MAX(stats_max_value), COUNT(*)
      FROM parquet_metadata(?)
      WHERE path_in_schema='url_surtkey'
    ''',[url]).fetchone()
    if not rows or not rows[0] or not rows[1] or not rows[2]:
        raise ValueError('url_surtkey footer statistics absent — no full scan fallback')
    lo,hi,count=rows
    if lo>hi:raise ValueError('invalid SURT footer bounds')
    return str(lo),str(hi),int(count)


def pick_shards(paths, read_range, *, max_metadata=16, max_shards=2):
    """Binary-search sorted globally by SURT, with strict metadata budget.

    Does not assume any shard belongs to the requested domain without checking
    footer bounds. Raises if range/index behavior cannot be established.
    """
    if len(paths)<2:raise ValueError('too few Parquet paths')
    cache={}
    def get(i):
        if i not in cache:
            if len(cache)>=max_metadata:raise ValueError('metadata budget exceeded')
            cache[i]=read_range(paths[i])
        return cache[i]
    # Find first shard with an upper bound >= the beginning of Mubawab's SURT.
    lo,hi=0,len(paths)
    while lo<hi:
        mid=(lo+hi)//2
        _low,upper,_=get(mid)
        if upper<PREFIX_LOW:lo=mid+1
        else:hi=mid
    first=lo
    selected=[]
    for i in range(first,min(len(paths), first+max_shards+1)):
        low,upper,_=get(i)
        if low>PREFIX_HIGH:break
        if upper>=PREFIX_LOW and low<=PREFIX_HIGH:
            if len(selected)>=max_shards:raise ValueError('shard budget exceeded; manual budget change required')
            selected.append(i)
    return selected,{str(i):{'low':a,'high':b,'row_groups':n} for i,(a,b,n) in cache.items()}


def rows_from_shard(con,path,max_rows):
    # Predicate pushdown: exact SURT prefix and host. The LIMIT protects output
    # but not overall scanned bytes; never select more than two shards per run.
    sql='''
      SELECT url, CAST(fetch_time AS VARCHAR) AS archived_at
      FROM read_parquet(?)
      WHERE url_surtkey >= ? AND url_surtkey < ?
        AND url_host_registered_domain = 'mubawab.ma'
        AND url_host_name IN ('mubawab.ma','www.mubawab.ma')
        AND fetch_status = 200
        AND regexp_matches(url_path, '^/fr/(a|pa)/[0-9]{4,15}(/|$)')
      LIMIT ?
    '''
    for url,archived_at in con.execute(sql,[path,PREFIX_LOW,PREFIX_HIGH,max_rows]).fetchall():
        normal=normalize_listing(url)
        if normal:yield normal[0],normal[1],str(archived_at)


def run(crawls,out,max_metadata,max_shards,max_rows):
    out.mkdir(parents=True,exist_ok=True)
    report={'tool':'commoncrawl_parquet_url_index','source':'public Common Crawl URL index',
        'started_at':utcnow(),'limits':{'max_metadata_per_crawl':max_metadata,'max_shards_per_crawl':max_shards,'max_rows_per_shard':max_rows},
        'requests_to_mubawab':0,'listing_pages_downloaded':0,'photos_downloaded':0,
        'coverage_certified':False,'live_availability_certified':False,'crawls':[]}
    distinct={};provenance=[];failures=[]
    con=None
    try:
        con=make_duckdb()
        for crawl in crawls:
            item={'crawl':crawl,'started_at':utcnow()}
            report['crawls'].append(item)
            try:
                paths=get_manifest(crawl)
                item['manifest_shards']=len(paths)
                chosen,metadata=pick_shards(paths,lambda path:file_surt_range(con,path),max_metadata=max_metadata,max_shards=max_shards)
                item['inspected_footer_ranges']=metadata
                item['selected_shard_indices']=chosen
                item['scanned_shards']=[]
                for index in chosen:
                    entry={'shard_index':index,'parquet_url':paths[index]}
                    item['scanned_shards'].append(entry)
                    count=0
                    for lid,url,archived_at in rows_from_shard(con,paths[index],max_rows):
                        distinct.setdefault(lid,url)
                        provenance.append({'id':lid,'url':url,'crawl':crawl,'archived_at':archived_at,'shard_index':index})
                        count+=1
                    entry['accepted_rows']=count
                    entry['output_limit_hit']=count>=max_rows
                    if entry['output_limit_hit']:item['partial_due_to_output_limit']=True
                item['result']='ok'
            except Exception as e:
                item['result']='failed'
                item['error']=type(e).__name__+': '+str(e)[:300]
                failures.append(item['error'])
        report['finished_at']=utcnow()
    except Exception as e:
        report['setup_error']=type(e).__name__+': '+str(e)[:350]
        failures.append(report['setup_error'])
    finally:
        if con is not None:con.close()
    with (out/'parquet_urls.jsonl').open('w',encoding='utf-8') as f:
        for lid,url in sorted(distinct.items()):
            f.write(json.dumps({'id':lid,'url':url,'source':'mubawab','source_kind':'commoncrawl_parquet_index','detail_state':'not_fetched'},ensure_ascii=False)+'\n')
    with (out/'parquet_provenance.jsonl').open('w',encoding='utf-8') as f:
        for row in provenance:f.write(json.dumps(row,ensure_ascii=False)+'\n')
    report.update({'distinct_ids':len(distinct),'provenance_rows':len(provenance),'failures':failures})
    (out/'report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    return 0 if distinct else 2


def main(argv=None):
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--crawl',action='append',required=True)
    p.add_argument('--out',type=Path,required=True)
    p.add_argument('--max-metadata',type=int,default=16)
    p.add_argument('--max-shards',type=int,default=2)
    p.add_argument('--max-rows',type=int,default=30000)
    args=p.parse_args(argv)
    if len(args.crawl)>2 or any(not CRAWL.fullmatch(c) for c in args.crawl):p.error('one or two CC-MAIN crawls required')
    if not 4<=args.max_metadata<=32 or not 1<=args.max_shards<=3 or not 1<=args.max_rows<=30000:p.error('budget exceeded')
    return run(args.crawl,args.out,args.max_metadata,args.max_shards,args.max_rows)

if __name__=='__main__':raise SystemExit(main())