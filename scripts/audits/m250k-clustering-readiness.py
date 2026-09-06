#!/usr/bin/env python3
import csv
import json
import os
import re
from collections import defaultdict
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(os.environ.get('READINESS_ROOT', '.tmp/m250k-readiness-repos'))
OUT = Path(os.environ.get('READINESS_OUT', '.tmp/m250k-clustering-readiness'))

REPOS = [
    ('hakkache/RealEstateBuddy', 'realestatebuddy'),
    ('HichamBenelmahi/analyse-des-tendances-immobili-res-', 'hicham'),
    ('MarwaneMLE/morocco-appartements-price', 'marwane'),
    ('BenTouhami-MR/ApartmentPricePredictionInMorocco', 'bentouhami'),
    ('hassanelq/Agadir-House-Prices-Prediction', 'hassanelq'),
    ('Loubaris/Data-Immo', 'loubaris'),
    ('achrafdigital/Simplon-Python-Challenges', 'achrafdigital'),
    ('ABDELOUAHEDTEX/Rabat_Immobilier_Prediction', 'rabat'),
]

MUB_URL_RE = re.compile(r'https?://(?:www\.)?mubawab\.ma/[^\s\"\'<>]*?/(?:a|pa)/(\d+)(?:/|$|[?#])', re.I)
AVITO_URL_RE = re.compile(r'https?://(?:www\.)?avito\.ma/[^\s\"\'<>]*?(\d{6,})\.htm(?:$|[?#\\\"\'\s,\]])', re.I)

ATTRS = ['title_text','price','area','city','location','latlon','rooms','property_type','phone','date']
ALIASES = {
    'title_text': ('title','titre','description','property_info','name','nom','annonce'),
    'price': ('prix','price','montant','cost'),
    'area': ('surface','area','superficie','surface_habitable','surface_totale'),
    'city': ('city','ville','city_name'),
    'location': ('neighborhood','quartier','location','localisation','address','adresse','district','zone'),
    'rooms': ('chambre','chambres','bedroom','bedrooms','piece','pieces','rooms','nb_chambres','nb_piece'),
    'property_type': ('type_de_bien','type_bien','property_type','propertytype','category','categorie','type'),
    'phone': ('phone','telephone','tel','mobile','phone_number','phone_number1','phone_number2','phone_number3','contact'),
    'date': ('date_annonce','date','published_at','created_at','publication_date','date_posted'),
}
LAT_ALIASES = ('latitude','lat')
LON_ALIASES = ('longitude','lon','lng','long')
URL_KEYS = ('url','url_annonce','link','link-href','href','listing_url','property_url')
ID_KEYS = ('id','property_id','listing_id','annonce_id','ad_id')


def norm_key(k):
    return re.sub(r'[^a-z0-9_]+','_',str(k).strip().lower().replace('é','e').replace('è','e').replace('à','a')).strip('_')


def nonempty(v):
    if v is None: return False
    if isinstance(v, (list, tuple, dict)): return bool(v)
    s = str(v).strip().lower()
    return s not in ('', 'none', 'null', 'nan', 'n/a', 'na', '-', '0.0.0')


def flat_dict(obj, prefix=''):
    out = {}
    if not isinstance(obj, dict): return out
    for k,v in obj.items():
        nk = norm_key(k)
        key = f'{prefix}_{nk}' if prefix else nk
        if isinstance(v, dict):
            out.update(flat_dict(v, key))
        elif not isinstance(v, (list, tuple)):
            out[key] = v
    return out


def find_value(d, aliases):
    for alias in aliases:
        a = norm_key(alias)
        for k,v in d.items():
            nk = norm_key(k)
            if nk == a or nk.endswith('_'+a):
                if nonempty(v): return v
    return None


def identities_from_record(d, text_fallback='', source_hint=''):
    identities = set()
    strings = []
    for k,v in d.items():
        if isinstance(v, str): strings.append(v)
    strings.append(text_fallback)
    text = ' '.join(strings).replace('\\/','/')
    for m in MUB_URL_RE.finditer(text): identities.add(('mubawab',m.group(1)))
    for m in AVITO_URL_RE.finditer(text): identities.add(('avito',m.group(1)))

    # Explicit IDs are accepted only when the structured dataset source is unambiguous.
    hint = source_hint.lower()
    explicit = find_value(d, ID_KEYS)
    if explicit is not None:
        sid = re.sub(r'\D','',str(explicit))
        if sid:
            if 'avito' in hint: identities.add(('avito',sid))
            elif 'mubawab' in hint or 'realestatebuddy' in hint: identities.add(('mubawab',sid))
    return identities


def attrs_from_record(d):
    attrs = set()
    for attr, aliases in ALIASES.items():
        if find_value(d, aliases) is not None: attrs.add(attr)
    lat = find_value(d, LAT_ALIASES)
    lon = find_value(d, LON_ALIASES)
    if lat is not None and lon is not None: attrs.add('latlon')
    return attrs


def classify(attrs):
    n = len(attrs)
    has_geo = 'latlon' in attrs
    has_phone = 'phone' in attrs
    core = len(attrs & {'price','area','city','location','rooms','property_type','title_text'})
    strong = (
        (has_phone and core >= 3) or
        (has_geo and core >= 3) or
        ({'price','area','city','property_type'} <= attrs and ('location' in attrs or 'title_text' in attrs))
    )
    if strong: return 'strong_cluster_ready'
    if core >= 4 or (n >= 5 and ('city' in attrs or 'location' in attrs)):
        return 'medium_cluster_ready'
    return 'identity_only'


def iter_csv(path):
    # Try common encodings/dialects; skip malformed rows rather than inventing them.
    for enc in ('utf-8-sig','utf-8','latin-1'):
        try:
            with path.open('r',encoding=enc,errors='strict',newline='') as f:
                sample=f.read(8192); f.seek(0)
                try: dialect=csv.Sniffer().sniff(sample, delimiters=',;\t|')
                except Exception: dialect=csv.excel
                reader=csv.DictReader(f,dialect=dialect)
                if not reader.fieldnames: return
                for row in reader:
                    if isinstance(row,dict): yield row
            return
        except Exception:
            continue


def walk_json(obj):
    if isinstance(obj, dict):
        # Yield dicts that look record-like, then recurse into containers.
        if len(obj) >= 2: yield obj
        for v in obj.values():
            if isinstance(v,(dict,list)): yield from walk_json(v)
    elif isinstance(obj, list):
        for v in obj: yield from walk_json(v)


def iter_json(path):
    try:
        obj=json.loads(path.read_text(encoding='utf-8',errors='ignore'))
    except Exception:
        return
    yield from walk_json(obj)


def main():
    OUT.mkdir(parents=True,exist_ok=True)
    identities = {}  # (source,id) -> merged attrs
    identity_repos = defaultdict(set)
    file_stats=[]
    repo_stats=[]

    for repo_name,slug in REPOS:
        repo_dir=ROOT/slug
        if not repo_dir.exists():
            repo_stats.append({'repo':repo_name,'slug':slug,'status':'missing','structured_files':0,'records_scanned':0,'identities_seen':0})
            continue
        before=set(identities)
        records_scanned=0; structured_files=0; matched_records=0
        candidates=[]
        for p in repo_dir.rglob('*'):
            if not p.is_file() or p.stat().st_size > 100*1024*1024: continue
            if p.suffix.lower() not in ('.csv','.json'): continue
            structured_files += 1
            rel=str(p.relative_to(repo_dir))
            source_hint=f'{repo_name} {rel}'
            iterator = iter_csv(p) if p.suffix.lower()=='.csv' else iter_json(p)
            file_records=0; file_matches=0; file_ids=set()
            try:
                for raw in iterator or []:
                    if not isinstance(raw,dict): continue
                    file_records += 1; records_scanned += 1
                    d=flat_dict(raw)
                    ids=identities_from_record(d, json.dumps(raw,ensure_ascii=False,default=str)[:20000], source_hint)
                    if not ids: continue
                    file_matches += 1; matched_records += 1
                    attrs=attrs_from_record(d)
                    for ident in ids:
                        identities.setdefault(ident,set()).update(attrs)
                        identity_repos[ident].add(slug)
                        file_ids.add(ident)
            except Exception as e:
                candidates.append({'file':rel,'error':type(e).__name__})
                continue
            if file_ids:
                file_stats.append({'repo':repo_name,'file':rel,'records':file_records,'matched_records':file_matches,'distinct_identities':len(file_ids)})
        after=set(identities)
        repo_stats.append({'repo':repo_name,'slug':slug,'status':'ok','structured_files':structured_files,'records_scanned':records_scanned,'matched_records':matched_records,'new_distinct_identities':len(after-before),'union_identities_after':len(after),'errors':candidates})

    classes=defaultdict(int); source_classes=defaultdict(lambda:defaultdict(int)); attr_counts=defaultdict(int)
    rows=[]
    for ident,attrs in identities.items():
        c=classify(attrs); classes[c]+=1; source_classes[ident[0]][c]+=1
        for a in attrs: attr_counts[a]+=1
        rows.append((ident[0],ident[1],c,';'.join(sorted(attrs)),';'.join(sorted(identity_repos[ident]))))

    total=len(identities)
    cluster_ready=classes['strong_cluster_ready']+classes['medium_cluster_ready']
    summary={
        'generatedAt':datetime.now(timezone.utc).isoformat(),
        'canonicalRepresentations':253372,
        'scope':'PUBLIC_GITHUB_ATTRIBUTE_BEARING_SUBSET_ONLY',
        'exactIdentitiesObserved':total,
        'strongClusterReady':classes['strong_cluster_ready'],
        'mediumClusterReady':classes['medium_cluster_ready'],
        'identityOnly':classes['identity_only'],
        'clusterReadyUnion':cluster_ready,
        'clusterReadyPctOfObserved':round(cluster_ready*100/total,2) if total else 0,
        'coveragePctOfCanonicalByExactIdentity':round(total*100/253372,2),
        'attributeCoverage':{a:{'count':attr_counts[a],'pctOfObserved':round(attr_counts[a]*100/total,2) if total else 0} for a in ATTRS},
        'bySource':{src:dict(v) for src,v in source_classes.items()},
        'repos':repo_stats,
        'databaseWrites':0,
        'sourceSiteFetches':0,
        'publicGithubRepoFetches':len(REPOS),
        'readOnly':True,
        'caveat':'This is not a full 253,372-property clustering result. It measures only exact identities with structured attributes recoverable from selected public GitHub datasets.'
    }
    (OUT/'summary.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    with (OUT/'coverage-matrix.csv').open('w',encoding='utf-8',newline='') as f:
        w=csv.writer(f); w.writerow(['source','source_id','readiness','attributes','repos']); w.writerows(sorted(rows))
    with (OUT/'file-coverage.csv').open('w',encoding='utf-8',newline='') as f:
        w=csv.DictWriter(f,fieldnames=['repo','file','records','matched_records','distinct_identities']); w.writeheader(); w.writerows(file_stats)
    report=[
        '# M250K clustering readiness audit','',
        f'- Canonical representations: **253,372**',
        f'- Exact identities observed with structured public-data evidence: **{total:,}**',
        f'- Strong cluster-ready: **{classes["strong_cluster_ready"]:,}**',
        f'- Medium cluster-ready: **{classes["medium_cluster_ready"]:,}**',
        f'- Identity-only: **{classes["identity_only"]:,}**',
        f'- Cluster-ready union: **{cluster_ready:,}** ({summary["clusterReadyPctOfObserved"]} % of observed subset)',
        f'- Coverage of canonical representations by this exact-identity subset: **{summary["coveragePctOfCanonicalByExactIdentity"]} %**','',
        '> This audit does not claim a probable-unique total for all 253,372 representations. It only measures readiness of the selected public structured-data subset.',''
    ]
    (OUT/'report.md').write_text('\n'.join(report),encoding='utf-8')
    print(json.dumps(summary,indent=2,ensure_ascii=False))

if __name__=='__main__': main()
