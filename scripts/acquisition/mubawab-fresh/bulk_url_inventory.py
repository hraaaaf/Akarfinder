#!/usr/bin/env python3
"""Offline, bulk URL inventory for independent (new) source snapshots.

Imports only operator-supplied public URL-index exports/sitemaps. This does NOT
request Mubawab, fetch a listing, download an image, or establish a right to
republish data. Historical reconciliation is a separate downstream operation.

Example:
 python bulk_url_inventory.py --input urls.cdxj export.xml.gz --out ./bulk-run
 python bulk_url_inventory.py --input index.zip --out ./bulk-run --resume
"""
from __future__ import annotations
import argparse
import contextlib
import gzip
import hashlib
import io
import json
import os
import re
import sqlite3
import sys
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit, unquote

PATTERN = re.compile(r"^/fr/(?:a|pa)/(\d{4,15})(?:/|$)", re.I)
HOSTS = {"mubawab.ma", "www.mubawab.ma"}
MAX_ENTRY_BYTES = 250_000_000


def normalized(raw):
    """Return (listing_id, exact canonical URL), or None (strictly same domain)."""
    if not isinstance(raw, str):return None
    raw=raw.strip()
    if not raw or len(raw)>4096:return None
    try:
        p=urlsplit(raw)
        if p.scheme.lower() not in ('http','https') or (p.hostname or '').lower() not in HOSTS:return None
        if p.username or p.password or p.port not in (None,80,443):return None
        path=unquote(p.path)
        if '\\' in path or '//' in path or '..' in path.split('/'):return None
        match=PATTERN.match(path)
        if not match:return None
        return match.group(1), urlunsplit(('https','www.mubawab.ma',p.path.rstrip('/'),'', ''))
    except (ValueError, TypeError):return None


def _urls_json(value):
    """Stream URL fields from CDXJ/JSONL record; no nested whole-content traversal."""
    if isinstance(value,str):
        yield value
    elif isinstance(value,list):
        for x in value:
            if isinstance(x,str):yield x
    elif isinstance(value,dict):
        for key in ('url','original','target_url','loc','uri'):
            if isinstance(value.get(key),str):yield value[key]
        if isinstance(value.get('urls'),list):
            for x in value['urls']:
                if isinstance(x,str):yield x


def iter_lines(reader):
    for raw in reader:
        line=raw.strip()
        if not line or line.startswith('#'):continue
        # CDXJ: urlkey timestamp {"url":"..."}; CDX JSONL and plain URLs.
        left=line.find('{')
        if left>=0:
            try:
                obj=json.loads(line[left:]);yield from _urls_json(obj)
            except (json.JSONDecodeError, UnicodeError):pass
        elif line.startswith('http://') or line.startswith('https://'):
            yield line


def iter_xml(reader):
    # iterparse clears elements as they are processed: constant memory for huge XML.
    for _event,elem in ET.iterparse(reader,events=('end',)):
        if elem.tag.rsplit('}',1)[-1]=='loc' and elem.text:
            yield elem.text.strip()
        elem.clear()


def read_bytes(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        while part:=f.read(1_048_576):h.update(part)
    return h.hexdigest()


def entries(path):
    """Yield source name and iterator for supported operator-supplied formats."""
    ext=path.name.lower()
    if ext.endswith('.zip'):
        with zipfile.ZipFile(path) as z:
            for member in z.infolist():
                if member.is_dir():continue
                name=member.filename.lower()
                if not name.endswith(('.xml','.xml.gz','.jsonl','.cdxj','.cdx','.txt','.urls','.jsonl.gz','.txt.gz')):continue
                if member.file_size>MAX_ENTRY_BYTES:raise ValueError('zip_member_too_large: '+member.filename)
                with z.open(member) as raw:
                    if name.endswith('.gz'):
                        with gzip.GzipFile(fileobj=raw) as gz:
                            if '.xml' in name:yield member.filename,iter_xml(gz)
                            else:yield member.filename,iter_lines(io.TextIOWrapper(gz,encoding='utf-8-sig',errors='replace'))
                    elif name.endswith('.xml'):yield member.filename,iter_xml(raw)
                    else:yield member.filename,iter_lines(io.TextIOWrapper(raw,encoding='utf-8-sig',errors='replace'))
    elif ext.endswith('.gz'):
        with gzip.open(path,'rb') as raw:
            if ext.endswith('.xml.gz'):yield path.name,iter_xml(raw)
            else:yield path.name,iter_lines(io.TextIOWrapper(raw,encoding='utf-8-sig',errors='replace'))
    elif ext.endswith('.xml'):
        with path.open('rb') as raw:yield path.name,iter_xml(raw)
    elif ext.endswith(('.txt','.jsonl','.cdx','.cdxj','.urls')):
        with path.open('r',encoding='utf-8-sig',errors='replace') as raw:yield path.name,iter_lines(raw)
    else:raise ValueError('unsupported_file_type: '+path.name)


def open_db(path):
    db=sqlite3.connect(path)
    db.execute('PRAGMA journal_mode=WAL')
    db.execute('PRAGMA synchronous=NORMAL')
    db.executescript('''
       CREATE TABLE IF NOT EXISTS sources(filename TEXT PRIMARY KEY, sha256 TEXT NOT NULL, finished INTEGER NOT NULL);
       CREATE TABLE IF NOT EXISTS ids(id TEXT PRIMARY KEY, url TEXT NOT NULL);
       CREATE TABLE IF NOT EXISTS urls(url TEXT PRIMARY KEY, id TEXT NOT NULL);
       CREATE TABLE IF NOT EXISTS provenance(source TEXT NOT NULL, url TEXT NOT NULL, id TEXT NOT NULL,
         PRIMARY KEY(source,url));
    ''')
    return db


def ingest(db,path):
    fingerprint=read_bytes(path)
    source=f'{path.name}@{fingerprint[:16]}'
    row=db.execute('SELECT sha256,finished FROM sources WHERE filename=?',(str(path.resolve()),)).fetchone()
    if row and row==(fingerprint,1):return {'file':path.name,'skipped':'same_sha256'}
    if row and row!=(fingerprint,1):
        # A changed input cannot be silently merged as if an append. Restart explicitly.
        raise ValueError('input_changed_restart_with_new_out: '+str(path))
    seen=accepted=0
    with db:
        for entry,records in entries(path):
            label=source+'/'+entry
            for candidate in records:
                seen+=1
                val=normalized(candidate)
                if not val:continue
                lid,url=val
                accepted+=1
                db.execute('INSERT OR IGNORE INTO ids VALUES (?,?)',(lid,url))
                db.execute('INSERT OR IGNORE INTO urls VALUES (?,?)',(url,lid))
                db.execute('INSERT OR IGNORE INTO provenance VALUES (?,?,?)',(label,url,lid))
        db.execute('INSERT OR REPLACE INTO sources VALUES (?,?,1)',(str(path.resolve()),fingerprint))
    return {'file':path.name,'sha256':fingerprint,'candidates':seen,'accepted':accepted}


def export(db,out,stats):
    with (out/'discovered_listing_links.jsonl').open('w',encoding='utf-8') as f:
        for lid,url in db.execute('SELECT id,url FROM ids ORDER BY id'):
            f.write(json.dumps({'source':'mubawab','id':lid,'url':url,'detail_state':'not_fetched',
              'source_kind':'offline_url_index'},ensure_ascii=False)+'\n')
    with (out/'discovery_provenance.jsonl').open('w',encoding='utf-8') as f:
        for source,url,lid in db.execute('SELECT source,url,id FROM provenance ORDER BY source,url'):
            f.write(json.dumps({'source_file':source,'url':url,'id':lid},ensure_ascii=False)+'\n')
    counts={k:db.execute('SELECT count(*) FROM '+table).fetchone()[0] for k,table in [('unique_ids','ids'),('unique_urls','urls'),('source_edges','provenance'),('input_files','sources')]}
    report={'source':'operator_supplied_offline_indexes','network_requests':0,'detail_pages_fetched':0,'photo_files_downloaded':0,
      'freshness_certified':False,'coverage_certified':False,'historical_used_as_seed':False,
      **counts,'input_stats':stats}
    (out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    return report


def main(argv=None):
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--input',type=Path,nargs='+',required=True,help='Offline URL index, sitemap XML/GZ, CDXJ, ZIP')
    p.add_argument('--out',type=Path,required=True)
    p.add_argument('--resume',action='store_true',help='Continue importing new input files into existing DB; old files are SHA-checked')
    a=p.parse_args(argv)
    if not a.resume and (a.out/'url_index.sqlite').exists():p.error('output already exists: use a new folder or --resume')
    a.out.mkdir(parents=True,exist_ok=True)
    db=open_db(a.out/'url_index.sqlite')
    try:
        stats=[ingest(db,path) for path in a.input]
        print(json.dumps(export(db,a.out,stats),ensure_ascii=False));return 0
    except (ValueError, ET.ParseError, OSError,zipfile.BadZipFile) as e:
        print('Import stopped: '+str(e),file=sys.stderr);return 2
    finally:db.close()

if __name__=='__main__':raise SystemExit(main())