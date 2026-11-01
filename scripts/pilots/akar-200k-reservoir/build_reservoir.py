#!/usr/bin/env python3
"""Read-only Akarfinder URL reservoir; source IDs ≠ fresh/unique properties."""
import hashlib,json,re,sqlite3,sys,zipfile
from pathlib import Path
from urllib.parse import urlsplit,urlunsplit,unquote

SOURCES={'avito':(re.compile(r'_(\d{7,})\.htm$',re.I),'avito.ma'),
         'mubawab':(re.compile(r'/(?:a|pa)/(\d{5,})(?:/|$)',re.I),'mubawab.ma')}
FILES=[
('avito','history','inputs/avito-sept.zip','listing-urls.txt',27053),
('mubawab','history','inputs/mubawab-sept.zip','morocco-web-l8-mubawab-manifest/listing-urls.txt',5195),
('avito','sample','inputs/avito-nov.zip','source-canary-urls.txt',97),
('mubawab','sample','inputs/mubawab-nov.zip','source-canary-urls.txt',313),
]

def parse_key(source,raw):
    pat,domain=SOURCES[source]
    try:
        p=urlsplit(raw.strip())
        if p.scheme!='https' or p.hostname not in (domain,'www.'+domain) or p.username or p.password or p.port not in (None,443):
            return None
        m=pat.search(unquote(p.path))
        if not m:return None
        return (source,m.group(1)),urlunsplit(('https','www.'+domain,p.path,'',''))
    except (ValueError,TypeError):
        return None

def main():
    rows={}
    provenance=[]
    for source,kind,filename,inside,expected in FILES:
        p=Path(filename)
        with zipfile.ZipFile(p) as z:
            lines=[x.strip() for x in z.read(inside).decode('utf-8-sig').splitlines() if x.strip()]
        keys=set()
        for line in lines:
            parsed=parse_key(source,line)
            if not parsed:
                raise RuntimeError('invalid URL in certified artifact: '+source)
            key,url=parsed
            keys.add(key)
            row=rows.setdefault(key,{'url':url,'history':0,'sample':0})
            row[kind]=1
        if len(keys)!=expected:raise RuntimeError(f'archive drift {source}:{kind}: got {len(keys)} expected {expected}')
        provenance.append({'source':source,'kind':kind,'distinct_ids':len(keys),
                           'archive_sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
    if len(rows)!=32460:raise RuntimeError(f'union drift {len(rows)}')
    dest=Path('artifacts/akar-200k-reservoir')
    dest.mkdir(parents=True,exist_ok=True)
    dbpath=dest/'candidates.sqlite'
    if dbpath.exists():raise RuntimeError('refusing to overwrite SQLite')
    with sqlite3.connect(dbpath) as db:
        db.execute("""CREATE TABLE candidates(
            source TEXT NOT NULL, source_id TEXT NOT NULL,canonical_url TEXT NOT NULL,
            historical_snapshot INTEGER NOT NULL,recent_sample INTEGER NOT NULL,
            freshness_status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK(freshness_status='UNVERIFIED'),
            ready_for_use INTEGER NOT NULL DEFAULT 0 CHECK(ready_for_use=0),
            publication_eligible INTEGER NOT NULL DEFAULT 0 CHECK(publication_eligible=0),
            PRIMARY KEY(source,source_id))""")
        db.executemany("""INSERT INTO candidates(
            source,source_id,canonical_url,historical_snapshot,recent_sample)
            VALUES (?,?,?,?,?)""",
            [(a,b,r['url'],r['history'],r['sample']) for (a,b),r in rows.items()])
        result=db.execute("""SELECT source,count(*),
                    sum(historical_snapshot),sum(recent_sample),
                    sum(CASE WHEN recent_sample=1 AND historical_snapshot=0 THEN 1 ELSE 0 END)
                    FROM candidates GROUP BY source""").fetchall()
        integrity=db.execute('PRAGMA integrity_check').fetchone()[0]
        unsafe=db.execute("""SELECT count(*) FROM candidates WHERE
                    ready_for_use!=0 OR publication_eligible!=0 OR freshness_status!='UNVERIFIED'""").fetchone()[0]
    if integrity!='ok' or unsafe:raise RuntimeError('sqlite unsafe or corrupt')
    stats={'stage':'URL_DISCOVERY_ONLY_NOT_FRESHNESS_PROOF','source_scoped_ids':len(rows),
           'fresh_ready_for_use_proven':0,'production_writes':0,'sqlite_integrity':integrity,
           'historical_ids':32248,'sample_ids':410,'sample_not_in_historical':212,
           'gap_to_200k_source_ids':200000-len(rows),
           'properties_deduped_across_sources':False,
           'sources':[{'source':x,'ids':n,'historical':h,'sampled':s,'absent_from_history':delta} for x,n,h,s,delta in result],
           'inputs':provenance}
    (dest/'inventory.json').write_text(json.dumps(stats,ensure_ascii=False,indent=2)+'\n')
    (dest/'SHA256SUMS').write_text(
        hashlib.sha256(dbpath.read_bytes()).hexdigest()+'  candidates.sqlite\n'+
        hashlib.sha256((dest/'inventory.json').read_bytes()).hexdigest()+'  inventory.json\n')
    print(json.dumps(stats,ensure_ascii=False))
    return 0

if __name__=='__main__':sys.exit(main())
