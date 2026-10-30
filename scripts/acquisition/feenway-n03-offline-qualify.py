#!/usr/bin/env python3
"""Offline FeenWay N01 evidence reconciliation, no network, DB or parser inference.

Reads exact archived GitHub Action ZIPs; emits aggregate report and optional
URL-only review manifests. No listing is ever promoted to active/eligible.
"""
import argparse
import collections
import hashlib
import json
import re
import sys
import zipfile
from pathlib import Path
from urllib.parse import urlsplit

SCHEMA = 'AKARFINDER_FEENWAY_N01_URL_ONLY_QUALIFICATION_V1'
SOURCE = 'https://www.feenway.com'
RE = re.compile(r'^/listings/([1-9][0-9]{0,11})$')

def sha(data):
    return hashlib.sha256(data).hexdigest()

def strict_id(url):
    if not isinstance(url, str) or len(url) > 160: raise ValueError('invalid_listing_url')
    u = urlsplit(url)
    if u.scheme != 'https' or u.netloc != 'www.feenway.com' or u.query or u.fragment or u.username or u.password or u.path.endswith('/'):
        raise ValueError('invalid_listing_url')
    match = RE.fullmatch(u.path)
    if not match or url != f'{SOURCE}/listings/{match.group(1)}': raise ValueError('invalid_listing_url')
    return match.group(1)

def load_jsonl(raw):
    if not raw or not raw.endswith(b'\n'): raise ValueError('jsonl_not_newline_terminated')
    rows=[]
    for n,line in enumerate(raw.splitlines(),1):
        if not line.strip():raise ValueError(f'empty_jsonl_line_{n}')
        rows.append(json.loads(line))
    return rows

def verified_archive(root, info):
    if not isinstance(info.get('file'),str) or Path(info['file']).name != info['file'] or not info['file'].endswith('.zip'):
        raise ValueError('invalid_archive_filename')
    path=root/info['file']
    if not path.is_file() or path.is_symlink():raise ValueError('archive_missing_'+info['kind'])
    data=path.read_bytes()
    if sha(data)!=info['zip_sha256']:raise ValueError('archive_sha256_mismatch_'+info['kind'])
    with zipfile.ZipFile(path) as z:
        names=z.namelist()
        expected=['discovery.jsonl','sample.jsonl','summary.json'] if info['kind']=='sitemap' else ['report.json','report.jsonl']
        if sorted(names)!=sorted(expected):raise ValueError('unrecognized_archive_content_'+info['kind'])
        if any(i.file_size>20_000_000 for i in z.infolist()):raise ValueError('archive_member_too_large')
        if info['kind']=='sitemap':
            summary=json.loads(z.read('summary.json'))
            rows=load_jsonl(z.read('discovery.jsonl'))
            if summary.get('distinct_urls')!=len(rows) or summary.get('duplicate_entries')!=0 or summary.get('sitemaps')!=6:
                raise ValueError('sitemap_summary_mismatch')
            if sha(z.read('discovery.jsonl'))!=info['manifest_sha256']:raise ValueError('sitemap_manifest_sha256_mismatch')
            for row in rows:
                if strict_id(row.get('url'))!=str(row.get('id')) or row.get('eligible') is not False:raise ValueError('sitemap_identity_or_gate')
            if len({r['url'] for r in rows})!=len(rows):raise ValueError('duplicate_sitemap_url')
            return rows, {'kind':'sitemap','rows':len(rows),'sitemap_manifest_sha256':info['manifest_sha256']}
        report=json.loads(z.read('report.json'))
        raw=z.read('report.jsonl');rows=load_jsonl(raw)
        if not report.get('complete') or report.get('errors') or report.get('db_writes')!=0 or report.get('listing_detail_requests')!=0:
            raise ValueError('incomplete_or_unsafe_report_'+info['kind'])
        if report.get('pages_ok')!=report.get('planned_pages') or report.get('pages_attempted')!=report.get('planned_pages'):
            raise ValueError('page_count_mismatch_'+info['kind'])
        if report.get('outside_manifest_sha256')!=sha(raw) or report.get('not_in_six_count')!=len(rows):
            raise ValueError('manifest_integrity_mismatch_'+info['kind'])
        if report.get('listing_manifest_size',0)<1000:raise ValueError('source_xml_baseline_missing')
        if info['kind']=='batch' and (report.get('batch_number')!=info['batch'] or report.get('mode')!='batch'):
            raise ValueError('wrong_batch')
        if info['kind']=='cities' and report.get('mode')!='cities':raise ValueError('wrong_city_mode')
        if info['kind']=='sample' and report.get('mode')!='sample':raise ValueError('wrong_sample_mode')
        seen=set()
        for row in rows:
            url=row.get('url');strict_id(url)
            if url in seen:raise ValueError('duplicate_url_within_artifact')
            seen.add(url)
            sources=row.get('discovered_on',row.get('landing_pages'))
            if not isinstance(sources,list) or not sources:raise ValueError('missing_provenance')
            for source in sources:
                u=urlsplit(source) if isinstance(source,str) else None
                if not u or u.scheme!='https' or u.netloc!='www.feenway.com' or u.query or u.fragment or u.path.startswith('/listings/'):
                    raise ValueError('invalid_landing_provenance')
        return rows, {'kind':info['kind'],'batch':info.get('batch'),'rows':len(rows),'pages_ok':report['pages_ok'],'source_xml_count':report['listing_manifest_size'],'report_sha256':sha(z.read('report.json')),'manifest_sha256':sha(raw),'landing_urls':[r['url'] for r in report.get('sample_pages',[])]}

def qualify(root,inventory):
    if inventory.get('schema')!='FEENWAY_N01_LOCAL_ARCHIVE_INVENTORY_V1':raise ValueError('invalid_inventory_schema')
    items=inventory['archives'];kinds=collections.Counter(x['kind'] for x in items)
    if kinds != {'sitemap':1,'batch':35,'cities':2,'sample':2}:raise ValueError('required_artifacts_missing')
    if sorted(x['batch'] for x in items if x['kind']=='batch') != list(range(1,36)):raise ValueError('missing_or_duplicate_batches')
    data={};proofs=[]
    for i in items:
        rows,meta=verified_archive(root,i)
        key=('batch'+str(i['batch'])) if i['kind']=='batch' else i['label']
        if key in data:raise ValueError('duplicate_archive_key')
        data[key]=rows
        meta={k:v for k,v in meta.items() if k!='landing_urls'}
        proofs.append({'source':key,'artifact_id':i['artifact_id'],'archive_sha256':i['zip_sha256'],**meta})
    sitemap=data['sitemap'];base={r['url'] for r in sitemap}
    selected=set(base); all_seen=set(base);provenance=collections.defaultdict(set); sources=collections.defaultdict(set)

    for i in items:
        if i['kind']=='sitemap':continue
        key=('batch'+str(i['batch'])) if i['kind']=='batch' else i['label']
        rows=data[key]
        for row in rows:
            url=row['url']
            sources[url].add(key)
            provenance[url].update(row.get('discovered_on',row.get('landing_pages',[])))
            all_seen.add(url)
            if i.get('included_in_primary_cohort',True): selected.add(url)
    # Landing uniqueness from raw signed reports was checked by source-level metadata; independently recompute below.
    landings=[]
    for i in items:
        if i['kind']=='batch':
            with zipfile.ZipFile(root/i['file']) as z:
                rep=json.loads(z.read('report.json'))
                landings.extend(x['url'] for x in rep.get('sample_pages',[]))
    if len(landings)!=1736 or len(set(landings))!=1736:raise ValueError('duplicate_or_missing_1736_landings')
    selected_ids={strict_id(url) for url in selected};all_ids={strict_id(url) for url in all_seen}
    if len(selected_ids)!=len(selected) or len(all_ids)!=len(all_seen):raise ValueError('id_collision')
    # Deliberately no inference of city/price/surface/freshness from an opaque listing ID.
    older_only=all_seen-selected
    official_expected=inventory.get('historical_reported_url_count')
    result={
       'schema':SCHEMA,'source_snapshot_date':'2026-10-30','mode':'offline_only_no_live_requests',
       'evidence':{'archives_verified':len(items),'sitemap_urls':len(base),'batch_count':35,'landing_pages_audited_unique':len(landings),
                   'url_only_primary_cohort':len(selected),'url_only_all_observed_archives':len(all_seen),
                   'reported_n01_count_not_reverified_by_canonical_manifest':official_expected,
                   'reported_minus_primary_cohort':official_expected-len(selected),
                   'all_observed_minus_reported':len(all_seen)-official_expected,
                   'reported_n01_count_matches_primary_cohort':len(selected)==official_expected,
                   'historical_only_outside_primary_count':len(older_only),
                   'all_observations_outside_xml':len(all_seen-base),
                   'primary_cohort_outside_xml':len(selected-base),
                   'primary_cohort_unique_source_ids':len(selected_ids),'all_unique_source_ids':len(all_ids),
                   'candidate_urls_with_any_landing_provenance':len(provenance),
                   'current_xml_overlap_in_historical_outside_xml_artifacts':len(base & sources.keys()),
                   'source_artifacts':proofs},
       'qualification':{'url_and_source_id_syntax_valid_primary':len(selected),'url_and_source_id_syntax_valid_all_archives':len(all_seen),
                        'fields_present_via_url_only':{'city':0,'district':0,'price_mad':0,'surface_m2':0},
                        'five_fields_certified_from_these_url_only_artifacts':0,
                        'active_verified':0,'commercial_availability_verified':0,'physically_unique_verified':0,'reuse_rights_verified':0,
                        'eligible_for_DB':0,'status':'REVIEW_URL_ONLY_NO_PROMOTION'},
       'limitations':['The reported 73,710 is not reproducible from the presently recovered snapshot cohorts; the original canonical merged manifest remains unverified.',
                      'Current XML and some historical batch reports use different snapshot sizes; historic off-XML can overlap the current XML.',
                      'Historical-only URLs are discovery candidates, not evidence of current availability.',
                      'No source HTML, price, area, city, district, date, physical uniqueness, reuse rights or market availability can be certified from URL-only inputs.'],
       'safety':{'http_requests':0,'db_reads':0,'db_writes':0,'publication':0,'deployments':0}
    }
    return result,selected,all_seen,older_only,sources

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--root',type=Path,required=True)
    p.add_argument('--inventory',type=Path,required=True)
    p.add_argument('--out',type=Path,required=True)
    p.add_argument('--export-review',action='store_true')
    x=p.parse_args()
    inv=json.loads(x.inventory.read_text())
    result,selected,all_seen,older_only,sources=qualify(x.root,inv)
    x.out.mkdir(parents=True,exist_ok=True)
    report=x.out/'feenway-n01-qualification-report.json'
    report.write_text(json.dumps(result,ensure_ascii=False,sort_keys=True,indent=2)+'\n')
    if x.export_review:
        for suffix,urls in [('primary-cohort',selected),('all-observed',all_seen)]:
            file=x.out/f'feenway-n01-{suffix}-review.jsonl'
            with file.open('w') as f:
                for url in sorted(urls,key=lambda u:int(strict_id(u))):
                    obj={'url':url,'source':'feenway','source_id':strict_id(url),
                        'source_artifacts':sorted(sources.get(url,{'sitemap'})),
                        'status':'review_url_only','city':None,'district':None,'price_mad':None,'surface_m2':None,
                        'active_verified':False,'availability_verified':False,'physical_unique_verified':False,'reuse_rights_verified':False,'eligible':False}
                    f.write(json.dumps(obj,separators=(',',':'))+'\n')
            result['evidence'][suffix.replace('-','_')+'_review_manifest_sha256']=sha(file.read_bytes())
            result['evidence'][suffix.replace('-','_')+'_review_rows']=len(urls)
        report.write_text(json.dumps(result,ensure_ascii=False,sort_keys=True,indent=2)+'\n')
    print(json.dumps({'selected':len(selected),'all_observed':len(all_seen),'historical_only':len(older_only),'url_only':True,'eligible':0,'out':str(report)}))

if __name__=='__main__':
    try:main()
    except (ValueError,KeyError,FileNotFoundError,zipfile.BadZipFile,json.JSONDecodeError) as e:
        print('FEENWAY_N01_OFFLINE_FAILED:'+str(e),file=sys.stderr);sys.exit(1)
