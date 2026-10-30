#!/usr/bin/env python3
"""Independent Mubawab snapshot and offline reconciliation.

Fresh phase NEVER reads a historical archive. Compare phase NEVER fetches the web.
Strict robots, 403/429 stop, no access-control circumvention; no image downloads.
Do not treat robots permission as commercial reproduction authorization.

Usage:
  python fresh_snapshot.py fresh --work ./snapshot-2026-10-30 --max-pages 10 --max-details 20
  python fresh_snapshot.py compare --fresh ./snapshot-2026-10-30/listings.jsonl \
      --historical ./historical.zip --out ./comparison
"""
from __future__ import annotations
import argparse
import csv
import hashlib
import io
import json
import os
import re
import sqlite3
import sys
import time
import zipfile
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote, urljoin, urlparse, urlsplit, urlunsplit
from urllib.robotparser import RobotFileParser
import requests
from bs4 import BeautifulSoup

BASE = 'https://www.mubawab.ma'
UA = 'AkarFinder-audit/0.1 (+https://akarfinder.ma)'
LINK = re.compile(r'^/fr/(?:a|pa)/(\d+)(?:/|$)')
PRICE = re.compile(r'(\d[\d\s\u00a0\u202f.,]*)\s*(DH|MAD)\b', re.I)
AREA = re.compile(r'\b(\d{1,5}(?:[.,]\d+)?)\s*m[²2]\b', re.I)
PHOTO_HOST = 'www.mubawab-media.com'


def now(): return datetime.now(timezone.utc).isoformat()
def sha(data: bytes): return hashlib.sha256(data).hexdigest()


def canonical(url: str, base=BASE):
    try:
        u = urlsplit(urljoin(base, str(url)))
        if u.scheme != 'https' or u.hostname != 'www.mubawab.ma' or u.username or u.password or u.port not in (None,443): return None
        p = unquote(u.path)
        if not p.startswith('/fr') or p.startswith('//') or '\\' in p or '..' in p.split('/'): return None
        # Never generate/query private, pseudo-pagination or encoded equivalents.
        blocked = ('/login', '/cms/', '/ads/b/', '/report-inappropriate')
        if any(t in p.lower() for t in blocked) or ':' in p or u.query: return None
        return urlunsplit(('https', 'www.mubawab.ma', u.path.rstrip('/') or '/', '', ''))
    except (ValueError, TypeError): return None


def listing_id(url):
    try: return (m.group(1) if (m := LINK.match(unquote(urlsplit(url).path))) else None)
    except (ValueError, TypeError): return None


def image_url(raw: str):
    try:
        u = urlsplit(str(raw).strip())
        if u.scheme not in ('https','http') or u.hostname != PHOTO_HOST or u.username or u.password: return None
        if '/assets/' in u.path or '/business/' in u.path: return None
        return urlunsplit(('https', PHOTO_HOST, u.path, '', ''))
    except (ValueError, TypeError): return None


def photos(soup):
    seen, out = set(), []
    for img in soup.find_all('img'):
        vals=[img.get(k) for k in ('src','data-src','data-lazy','data-original','data-image')]
        for name in ('srcset','data-srcset'):
            vals += [x.strip().split(' ')[0] for x in (img.get(name) or '').split(',') if x.strip()]
        for value in vals:
            u=image_url(value)
            if u and u not in seen: out.append(u);seen.add(u)
    og=soup.find('meta',attrs={'property':'og:image'})
    if og:
        u=image_url(og.get('content',''))
        if u and u not in seen:out.insert(0,u)
    return out


def discover(html: str, base: str):
    soup=BeautifulSoup(html,'html.parser');links=[];seen=set()
    for a in soup.select('a[href]'):
        u=canonical(a.get('href',''),base)
        if u and u not in seen:links.append(u);seen.add(u)
    return links


def parse_listing(html: str, url: str):
    soup=BeautifulSoup(html,'html.parser')
    title=(soup.find('h1') or soup.find('title'))
    txt=' '.join(soup.get_text(' ',strip=True).split())
    price=PRICE.search(txt);area=AREA.search(txt)
    price_int=int(re.sub(r'\D','',''.join(price.group(1).split()))) if price else None
    area_float=float(area.group(1).replace(',','.')) if area else None
    meta=soup.find('meta',attrs={'name':'description'})
    desc=meta.get('content','') if meta else None
    return {'source':'mubawab','id':listing_id(url),'url':url,'title':title.get_text(' ',strip=True) if title else None,
      'price_dh':price_int,'area_m2':area_float,'description_snippet':desc,'photos':photos(soup),'scraped_at':now()}


class Robots:
    """Conservative robots matcher. Unsupported wildcard rules => fail closed."""
    def __init__(self, text: str, agent: str):
        if not text or not re.search(r'^User-agent\s*:',text,re.I|re.M):raise ValueError('robots missing/invalid')
        self.parser=RobotFileParser();self.parser.parse(text.splitlines())
        # urllib.robotparser does not implement * wildcards; retain all matching rules manually.
        groups=[];current=[];rules=[];active=False
        for raw in text.splitlines():
            line=raw.split('#',1)[0].strip()
            if not line: continue
            k,sep,v=line.partition(':');k=k.strip().lower();v=v.strip()
            if not sep:continue
            if k=='user-agent':
                if rules:groups.append((current,rules));current=[];rules=[]
                current.append(v.lower())
            elif k in ('allow','disallow','crawl-delay') and current: rules.append((k,v))
        if current:groups.append((current,rules))
        agent=agent.lower().split('/',1)[0]
        selected=[(names,r) for names,r in groups if any(n!='*' and n in agent for n in names)]
        if not selected:selected=[(names,r) for names,r in groups if '*' in names]
        if not selected:raise ValueError('no matching robots policy')
        self.rules=[i for _,r in selected for i in r]
        self.delay=max([float(v) for k,v in self.rules if k=='crawl-delay' and re.fullmatch(r'\d+(?:\.\d+)?',v)] or [0])
    def allowed(self,url):
        u=canonical(url)
        if not u:return False
        path=unquote(urlsplit(u).path)
        matches=[]
        for k,v in self.rules:
            if k not in ('allow','disallow') or not v:continue
            v=unquote(v)
            # Supported syntax: * wildcard, optional terminal $, path or path+query match.
            if not v.startswith('/'):return False
            ending=v.endswith('$');v=v[:-1] if ending else v
            pat='^'+re.escape(v).replace('\\*','.*')+('$' if ending else '')
            if re.search(pat,path):matches.append((len(v.replace('*','')), k=='allow'))
        if not matches:return True
        return max(matches)[1]


class StopCollect(Exception):pass


class Web:
    def __init__(self,*,session=None,delay=3,agent=UA,sleep=time.sleep):
        self.session=session or requests.Session();self.delay=max(float(delay),2.0);self.agent=agent;self.sleep=sleep
        self.robots=None;self.stopped=None;self.requests=0;self.last=None
        self.session.headers.update({'User-Agent':agent, 'Accept-Language':'fr-FR,fr;q=0.9'})
    def _get(self,url):
        if self.last is not None:
            gap=max(self.delay, self.robots.delay if self.robots else 0)-(time.monotonic()-self.last)
            if gap>0:self.sleep(gap)
        self.last=time.monotonic()
        try:r=self.session.get(url,timeout=20,allow_redirects=False)
        except requests.RequestException as e:raise StopCollect('network_error:'+str(e)[:100]) from e
        self.requests+=1
        if r.status_code in (403,429):raise StopCollect('http_'+str(r.status_code))
        if r.status_code!=200:raise StopCollect('http_'+str(r.status_code))
        if str(r.url)!=url:raise StopCollect('redirect_or_url_changed')
        return r.text
    def prepare(self):
        body=self._get(BASE+'/robots.txt')
        self.robots=Robots(body,self.agent)
        self.delay=max(self.delay,self.robots.delay)
    def fetch(self,url):
        if not self.robots:raise StopCollect('robots_not_checked')
        if not self.robots.allowed(url):raise StopCollect('robots_denied')
        return self._get(url)


def save_html(work: Path, html: str):
    payload=html.encode('utf-8')
    digest=sha(payload)
    dest=work/'html'/(digest+'.html')
    dest.parent.mkdir(parents=True,exist_ok=True)
    if not dest.exists():dest.write_bytes(payload)
    return digest


def open_db(path):
    db=sqlite3.connect(path)
    db.executescript('''
    CREATE TABLE IF NOT EXISTS queue(url TEXT PRIMARY KEY, depth INTEGER NOT NULL, kind TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'todo');
    CREATE TABLE IF NOT EXISTS pages(url TEXT PRIMARY KEY, sha256 TEXT NOT NULL, captured_at TEXT NOT NULL, link_count INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS listings(id TEXT PRIMARY KEY, url TEXT NOT NULL, doc TEXT NOT NULL, html_sha256 TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS errors(url TEXT NOT NULL, reason TEXT NOT NULL);
    ''')
    return db


def do_fresh(work: Path, web: Web, *, max_pages: int, max_details: int, seeds=None):
    work.mkdir(parents=True,exist_ok=True);db=open_db(work/'fresh.sqlite')
    for u in seeds or [BASE+'/fr']:
        cu=canonical(u)
        if cu:db.execute("INSERT OR IGNORE INTO queue(url,depth,kind,state) VALUES (?,0,'page','todo')",(cu,))
    db.commit()
    error=None
    try:
        web.prepare()
        # Only roots discovered during this fresh run can enter this queue.
        pages=0;details=0
        while True:
            row=db.execute("SELECT url,depth,kind FROM queue WHERE state='todo' AND kind='page' ORDER BY depth,url LIMIT 1").fetchone()
            if row is None or pages>=max_pages:break
            url,depth,_=row
            if depth>3:break
            try:html=web.fetch(url)
            except StopCollect as e:
                error=str(e); db.execute('INSERT INTO errors VALUES (?,?)',(url,error));db.commit();break
            html_digest=save_html(work,html)
            links=discover(html,url)
            with db:
                db.execute('INSERT OR REPLACE INTO pages VALUES (?,?,?,?)',(url,html_digest,now(),len(links)))
                db.execute("UPDATE queue SET state='done' WHERE url=?",(url,))
                for target in links:
                    lid=listing_id(target)
                    if lid: db.execute("INSERT OR IGNORE INTO queue(url,depth,kind) VALUES (?,?,'listing')",(target,depth+1))
                    elif depth<3 and (target.startswith(BASE+'/fr/ct/') or target==BASE+'/fr'):
                        db.execute("INSERT OR IGNORE INTO queue(url,depth,kind) VALUES (?,?,'page')",(target,depth+1))
            pages+=1
        while error is None and details<max_details:
            row=db.execute("SELECT url FROM queue WHERE state='todo' AND kind='listing' ORDER BY url LIMIT 1").fetchone()
            if row is None:break
            url=row[0]
            try:html=web.fetch(url)
            except StopCollect as e:
                error=str(e);db.execute('INSERT INTO errors VALUES (?,?)',(url,error));db.commit();break
            html_digest=save_html(work,html)
            rec=parse_listing(html,url)
            with db:
                db.execute('INSERT OR REPLACE INTO listings VALUES (?,?,?,?)',(rec['id'],url,json.dumps(rec,ensure_ascii=False),html_digest))
                db.execute("UPDATE queue SET state='done' WHERE url=?",(url,))
            details+=1
    except (StopCollect,ValueError) as e:
        error=str(e); db.execute('INSERT INTO errors VALUES (?,?)',('robots_or_network',error));db.commit()
    # Every execution, including failure, produces deterministic exports from freshly observed records only.
    with (work/'listings.jsonl').open('w',encoding='utf-8') as f:
        for (doc,) in db.execute('SELECT doc FROM listings ORDER BY id'):f.write(doc+'\n')
    result={'run_at':now(),'state':'blocked' if error else 'bounded_complete','stopped_early':error,
      'pages':db.execute('SELECT count(*) FROM pages').fetchone()[0],
      'details':db.execute('SELECT count(*) FROM listings').fetchone()[0],
      'queued':db.execute("SELECT count(*) FROM queue WHERE state='todo'").fetchone()[0],
      'requests_including_robots_this_run':web.requests, 'coverage_certified':False,
      'photo_urls':sum(len(json.loads(d).get('photos',[])) for (d,) in db.execute('SELECT doc FROM listings')),
      'saved_html_blobs':len(list((work/'html').glob('*.html'))) if (work/'html').exists() else 0}
    (work/'fresh_report.json').write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    db.close();return result


def iter_records(path: Path):
    """Read historical or fresh JSONL, SQLite, ZIP without using their contents as seeds."""
    path=Path(path)
    if path.suffix.lower()=='.zip':
        with zipfile.ZipFile(path) as z:
            # Explicit provenance: skip reports and the raw text, only listing JSONL.
            names=[n for n in z.namelist() if n.endswith('listings.jsonl') or n.endswith('mubawab_casablanca.jsonl')]
            if not names:raise ValueError('zip has no supported listings JSONL')
            if len(names)>1:raise ValueError('zip has multiple listing JSONLs; select one explicitly')
            for ln in io.TextIOWrapper(z.open(names[0]),encoding='utf-8-sig'):
                if ln.strip():yield json.loads(ln)
    elif path.suffix.lower() in ('.db','.sqlite','.sqlite3'):
        db=sqlite3.connect(path)
        try:
            cols={row[1] for row in db.execute('PRAGMA table_info(listings)')}
            if 'doc' in cols:
                for (d,) in db.execute('SELECT doc FROM listings'):yield json.loads(d)
            elif {'id','url','data','photos'}.issubset(cols):
                for lid,url,raw,pics in db.execute('SELECT id,url,data,photos FROM listings'):
                    obj=json.loads(raw or '{}')
                    obj.update({'source':'mubawab','id':str(lid),'url':url,'photos':json.loads(pics or '[]')})
                    yield obj
            else:raise ValueError('unknown listings schema in SQLite')
        finally:db.close()
    elif path.suffix.lower()=='.jsonl':
        with path.open(encoding='utf-8-sig') as f:
            for ln in f:
                if ln.strip():yield json.loads(ln)
    else:raise ValueError('supported formats: .jsonl, .zip, .sqlite')


def norm_id(r):
    source=r.get('source')
    if isinstance(source,dict): source=source.get('name')
    if source and source.lower()!='mubawab':return None
    value = r.get('id') or (source and r.get('source',{}).get('source_id') if isinstance(r.get('source'),dict) else None)
    value=str(value or '').strip()
    if not re.fullmatch(r'\d{4,15}',value):return None
    return value


def compare(fresh_path: Path, historical_path: Path, output: Path):
    output.mkdir(parents=True,exist_ok=True)
    f_records=list(iter_records(fresh_path));h_records=list(iter_records(historical_path))
    def indexed(records):
        out={};dups=[];invalid=0
        for r in records:
            lid=norm_id(r)
            if lid is None:invalid+=1;continue
            if lid in out:
                dups.append(lid)
                # Keep richest representation, never combine records silently.
                if len(json.dumps(r,ensure_ascii=False))>len(json.dumps(out[lid],ensure_ascii=False)):out[lid]=r
            else:out[lid]=r
        return out,dups,invalid
    new,dups_n,invalid_n=indexed(f_records);old,dups_h,invalid_h=indexed(h_records)
    overlap=sorted(new.keys()&old.keys());only_new=sorted(new.keys()-old.keys());only_old=sorted(old.keys()-new.keys())
    changes=[]
    for lid in overlap:
        a,b=new[lid],old[lid]
        delta={k:{'fresh':a.get(k),'historical':b.get(k)} for k in ('price_dh','area_m2','title') if a.get(k) is not None and b.get(k) is not None and a.get(k)!=b.get(k)}
        if delta:changes.append({'id':lid,'changes':delta})
    oldphoto=defaultdict(set)
    for lid,r in old.items():
        for u in r.get('photos',[]) or []:
            if (pu:=image_url(u)):oldphoto[pu].add(lid)
    # A URL collision across distinct IDs requires manual review; never hard-merge.
    collisions=[]
    urls=defaultdict(set)
    for lid,r in old.items():
        u=r.get('url') or (r.get('source',{}).get('url') if isinstance(r.get('source'),dict) else None)
        if u:urls[u.split('?',1)[0].rstrip('/')].add(lid)
    for lid,r in new.items():
        u=r.get('url') or (r.get('source',{}).get('url') if isinstance(r.get('source'),dict) else None)
        if u:
            for oldid in sorted(urls.get(u.split('?',1)[0].rstrip('/'),set())):
                if oldid != lid:collisions.append({'fresh_id':lid,'historical_id':oldid,'url':u})
    candidates={}
    for lid,r in new.items():
        for u in r.get('photos',[]) or []:
            if (pu:=image_url(u)):
                for other in oldphoto.get(pu,()):
                    if other!=lid:candidates.setdefault((lid,other),set()).add(pu)
    # Image matches are *review candidates*, not authoritative physical dedup.
    review=[{'fresh_id':a,'historical_id':b,'shared_photo_count':len(p)} for (a,b),p in sorted(candidates.items())]
    with (output/'fresh_unique.jsonl').open('w',encoding='utf-8') as f:
        for lid in sorted(new):f.write(json.dumps(new[lid],ensure_ascii=False)+'\n')
    with (output/'fresh_only_ids.txt').open('w') as f:f.write('\n'.join(only_new)+('\n' if only_new else ''))
    with (output/'shared_ids.txt').open('w') as f:f.write('\n'.join(overlap)+('\n' if overlap else ''))
    with (output/'historical_only_ids.txt').open('w') as f:f.write('\n'.join(only_old)+('\n' if only_old else ''))
    (output/'changed_records.json').write_text(json.dumps(changes,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (output/'possible_cross_id_matches.json').write_text(json.dumps(review,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (output/'possible_url_collisions.json').write_text(json.dumps(collisions,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    summary={'fresh_input_records':len(f_records),'fresh_unique_ids':len(new),'historical_input_records':len(h_records),
       'historical_unique_ids':len(old),'exact_id_overlap':len(overlap),'fresh_only_ids':len(only_new),'historical_only_ids':len(only_old),
       'fresh_input_duplicates':len(dups_n),'historical_input_duplicates':len(dups_h),
       'fresh_invalid_ids':invalid_n,'historical_invalid_ids':invalid_h,'changed_record_count':len(changes),
       'possible_cross_id_photo_matches':len(review),'possible_cross_id_url_collisions':len(collisions),'old_only_are_not_proven_deleted':True,'coverage_certified':False,
       'fresh_sha256':sha(fresh_path.read_bytes()),'historical_sha256':sha(historical_path.read_bytes()),'generated_at':now()}
    (output/'comparison.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    return summary


def main(argv=None):
    p=argparse.ArgumentParser(description=__doc__)
    sub=p.add_subparsers(dest='mode',required=True)
    x=sub.add_parser('fresh');x.add_argument('--work',type=Path,required=True);x.add_argument('--max-pages',type=int,default=10);x.add_argument('--max-details',type=int,default=20);x.add_argument('--delay',type=float,default=3);x.add_argument('--resume',action='store_true',help='continue this same fresh run after interruption')
    y=sub.add_parser('compare');y.add_argument('--fresh',type=Path,required=True);y.add_argument('--historical',type=Path,required=True);y.add_argument('--out',type=Path,required=True)
    a=p.parse_args(argv)
    if a.mode=='fresh':
        if a.max_pages not in range(1,101) or a.max_details not in range(1,501) or a.delay<2:p.error('invalid page/detail/delay bounds')
        if (a.work/'fresh.sqlite').exists() and not a.resume:p.error('fresh run directory already exists; use --resume for the same run, otherwise new directory')
        if a.resume and not (a.work/'fresh.sqlite').exists():p.error('--resume requires an existing fresh.sqlite')
        result=do_fresh(a.work,Web(delay=a.delay),max_pages=a.max_pages,max_details=a.max_details)
        print(json.dumps(result,ensure_ascii=False));return 2 if result['stopped_early'] else 0
    # A blocked/empty fresh snapshot cannot be interpreted as deletions.
    if a.fresh.stat().st_size == 0:
        p.error('fresh snapshot empty; comparison skipped (no evidence of deletions)')
    print(json.dumps(compare(a.fresh,a.historical,a.out),ensure_ascii=False));return 0

if __name__=='__main__':raise SystemExit(main())