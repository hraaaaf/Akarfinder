#!/usr/bin/env python3
"""J2 FeenWay private evidence triage. No networking, database or admission.

Input is a SHA-pinned quarantine produced by feenway_v2_dual_identity_intake.
Shared source IDs and matched content are review hints, not physical duplicates.
"""
from __future__ import annotations
from collections import Counter, defaultdict
from pathlib import Path
from urllib.parse import urlsplit
import argparse
import csv
import gzip
import hashlib
import json
import re

SHA = re.compile(r'[a-f0-9]{64}\Z')
FW = re.compile(r'https://www\.feenway\.com/listings/[1-9][0-9]{0,11}\Z')
MATCHED = 'UNIQUE_SIX_FIELD_CONTENT_MATCH_NOT_SOURCE_VERIFIED'
AMBIGUOUS = 'AMBIGUOUS_SIX_FIELD_MATCH'
STATES = frozenset((MATCHED, AMBIGUOUS))
STATUS = frozenset(('SOURCE_ROUTE_FORMAT_ONLY','SOURCE_ROUTE_REVIEW','SOURCE_URL_MISSING'))
DECISION = 'QUARANTINE_NO_STAGING_OR_PUBLIC_ADMISSION'
SCHEMA = 'feenway_v7_j2_dual_identity_quarantine_v1'
MAX_GZIP = 30_000_000
MAX_UNZIPPED = 160_000_000
MAX_LINE = 500_000
MAX_RECORDS = 120_000

class TriageRejected(ValueError):
    pass

def file_sha(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda:f.read(1048576),b''):
            h.update(block)
    return h.hexdigest()

def check_row(row, source_urls, feenway_urls):
    if (not isinstance(row,dict) or row.get('decision') != DECISION
            or row.get('identity_link_state') not in STATES
            or row.get('source_url_status') not in STATUS
            or not isinstance(row.get('six_field_fingerprint_sha256'),str)
            or not SHA.fullmatch(row['six_field_fingerprint_sha256'])
            or any(row.get(k) is not False for k in
                ('feenway_identity_independently_verified','source_detail_independently_verified',
                 'availability_verified','physical_uniqueness_verified'))):
        raise TriageRejected('INVALID_QUARANTINE_CONTRACT')
    fw,src=row.get('feenway_url'),row.get('source_url')
    if row['identity_link_state']==MATCHED:
        if not isinstance(fw,str) or not FW.fullmatch(fw) or fw in feenway_urls:
            raise TriageRejected('INVALID_OR_DUPLICATE_FEENWAY_ID')
        feenway_urls.add(fw)
    elif fw is not None:
        raise TriageRejected('AMBIGUOUS_FEENWAY_ID_MUST_BE_NULL')
    if row['source_url_status']=='SOURCE_URL_MISSING':
        if src is not None or row.get('source_offer_id_hint') is not None:
            raise TriageRejected('MISSING_SOURCE_MUST_HAVE_NO_URL_OR_ID')
    else:
        if (not isinstance(src,str) or not src.startswith('https://') or len(src)>2048
                or src in source_urls or any(c in src for c in '\r\n\t\\')):
            raise TriageRejected('INVALID_OR_DUPLICATE_SOURCE_URL')
        source_urls.add(src)
        try:
            url=urlsplit(src)
            port=url.port
        except ValueError as e:
            raise TriageRejected('INVALID_SOURCE_URL') from e
        if (url.scheme!='https' or url.username or url.password
                or port is not None or url.netloc != row.get('source_domain_hint')):
            raise TriageRejected('SOURCE_HOST_MISMATCH')
        if row['source_url_status']=='SOURCE_ROUTE_FORMAT_ONLY':
            if not isinstance(row.get('source_offer_id_hint'),str) or not row['source_offer_id_hint']:
                raise TriageRejected('SOURCE_FORMAT_WITHOUT_ID_HINT')
        elif row.get('source_offer_id_hint') is not None:
            raise TriageRejected('SOURCE_ROUTE_REVIEW_HAS_UNPROVEN_ID')
    for key in ('price_mad_claim','surface_m2_claim'):
        value=row.get(key)
        if value is not None and (isinstance(value,bool) or not isinstance(value,int) or value<0):
            raise TriageRejected('INVALID_NUMERIC_CLAIM')
    if not isinstance(row.get('quality_flags'),list):
        raise TriageRejected('INVALID_FLAGS')

def _csv_value(value):
    s=str(value if value is not None else '')[:1200].replace('\r',' ').replace('\n',' ')
    return "'"+s if s.lstrip().startswith(('=','+','-','@','\t')) else s

def write_csv(path, header, rows):
    with path.open('x',encoding='utf-8',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=header,extrasaction='ignore')
        writer.writeheader()
        for row in rows:
            writer.writerow({k:_csv_value(row.get(k)) for k in header})

def triage(gzip_path:Path, pin:str, report_path:Path, output:Path):
    if (not isinstance(gzip_path,Path) or not gzip_path.is_file() or gzip_path.is_symlink()
            or gzip_path.stat().st_size>MAX_GZIP
            or not isinstance(pin,str) or not SHA.fullmatch(pin) or file_sha(gzip_path)!=pin):
        raise TriageRejected('PIN_OR_QUARANTINE_GZIP_INVALID')
    if (not isinstance(report_path,Path) or not report_path.is_file() or report_path.is_symlink()
            or report_path.stat().st_size>100000):
        raise TriageRejected('REPORT_FILE_INVALID')
    try:
        report=json.loads(report_path.read_text(encoding='utf-8'))
    except (OSError,ValueError,UnicodeError) as e:
        raise TriageRejected('REPORT_BAD_JSON') from e
    rows=[]; total_bytes=0
    source_urls=set();fw_urls=set()
    try:
        with gzip.open(gzip_path,'rb') as inp:
            while line:=inp.readline(MAX_LINE+1):
                total_bytes+=len(line)
                if (len(line)>MAX_LINE or total_bytes>MAX_UNZIPPED
                        or len(rows)>=MAX_RECORDS):
                    raise TriageRejected('QUARANTINE_DECOMPRESSION_LIMIT')
                try:
                    item=json.loads(line)
                except (ValueError,UnicodeError) as e:
                    raise TriageRejected('INVALID_QUARANTINE_JSONL') from e
                check_row(item,source_urls,fw_urls)
                rows.append(item)
    except (OSError,EOFError) as e:
        raise TriageRejected('INVALID_GZIP') from e
    status=dict(Counter(r['source_url_status'] for r in rows))
    identity=dict(Counter(r['identity_link_state'] for r in rows))
    ambiguous=defaultdict(list);sourceids=defaultdict(list);gaps=[]
    for row in rows:
        if row['identity_link_state']==AMBIGUOUS:
            ambiguous[row['six_field_fingerprint_sha256']].append(row)
        if row['source_url_status']=='SOURCE_ROUTE_FORMAT_ONLY':
            sourceids[(row['source_domain_hint'],row['source_offer_id_hint'])].append(row)
        else:
            gaps.append(row)
    if (not isinstance(report,dict) or report.get('schema_version')!=SCHEMA
            or report.get('records_processed')!=len(rows)
            or report.get('identity_link_counts')!=identity
            or report.get('source_status_counts')!=status
            or report.get('content_fingerprint_ambiguous_groups')!=len(ambiguous)
            or report.get('content_fingerprint_ambiguous_rows')!=sum(map(len,ambiguous.values()))
            or report.get('private_staging_authorized') is not False
            or report.get('public_admission_authorized') is not False
            or not isinstance(report.get('old_archive_sha256'),str)
            or not SHA.fullmatch(report['old_archive_sha256'])
            or not isinstance(report.get('new_archive_sha256'),str)
            or not SHA.fullmatch(report['new_archive_sha256'])):
        raise TriageRejected('INTAKE_REPORT_DISAGREES_WITH_ROWS')
    if (output.exists() or output.is_symlink() or output.parent.is_symlink()
            or any((p/'.git').exists() for p in (output.parent,*output.parents))):
        raise TriageRejected('PRIVATE_NEW_OUTPUT_OUTSIDE_GIT_REQUIRED')
    amb_rows=[];amb_kinds=Counter()
    for fp,members in sorted(ambiguous.items()):
        claims={(r['source_domain_hint'],r['source_offer_id_hint']) for r in members
                if r['source_offer_id_hint'] is not None}
        hosts={r['source_domain_hint'] for r in members if r['source_domain_hint']}
        kind=('MULTIPORTAL_CONTENT_COLLISION' if len(hosts)>1
              else 'MULTIPLE_SOURCE_ID_HINTS' if len(claims)>1
              else 'SAME_SOURCE_ID_HINT_MULTIPLE_URLS' if len(claims)==1
              else 'NO_SOURCE_ID_PROOF')
        amb_kinds[kind]+=1
        for r in members:
            amb_rows.append(dict(
                fingerprint_sha256=fp,group_size=len(members),review_category=kind,
                source_url=r['source_url'],source_domain=r['source_domain_hint'],
                source_offer_id_hint=r['source_offer_id_hint'],
                source_url_status=r['source_url_status'],city_claim=r['city_claim'],
                district_claim=r['district_claim'],price_mad_claim=r['price_mad_claim'],
                surface_m2_claim=r['surface_m2_claim'],
                decision='AMBIGUOUS_NO_FEENWAY_ID_OR_ADMISSION'))
    conflict=Counter();collisions=[];touching=0
    for (host,offer_id),members in sorted(sourceids.items()):
        if len(members)<2: continue
        risk={name+'_conflict':len({r[field] for r in members})>1
              for name,field in (('price','price_mad_claim'),('surface','surface_m2_claim'),
                                 ('city','city_claim'),('district','district_claim'))}
        conflict.update({k:int(v) for k,v in risk.items()})
        n_amb=sum(r['identity_link_state']==AMBIGUOUS for r in members)
        touching+=int(n_amb>0)
        collisions.append(dict(
            source_domain=host,source_offer_id_hint=offer_id,candidate_count=len(members),
            distinct_source_urls=len({r['source_url'] for r in members}),**risk,
            ambiguous_identity_rows=n_amb,
            price_claims=' | '.join(map(str,sorted({r['price_mad_claim'] for r in members if r['price_mad_claim'] is not None})))[:400],
            surface_claims=' | '.join(map(str,sorted({r['surface_m2_claim'] for r in members if r['surface_m2_claim'] is not None})))[:400],
            sample_source_urls=' | '.join(sorted({r['source_url'] for r in members})[:3])[:1200],
            decision='SOURCE_ID_COLLISION_REVIEW_NOT_PHYSICAL_DUPLICATE'))
    collisions.sort(key=lambda x:(
        -int(x['city_conflict']),-int(x['price_conflict']),-int(x['surface_conflict']),
        -int(x['district_conflict']),-x['candidate_count'],
        x['source_domain'],x['source_offer_id_hint']))
    gap_rows=[dict(
        source_url_status=r['source_url_status'],feenway_url_claim=r['feenway_url'],
        source_url=r['source_url'],identity_link_state=r['identity_link_state'],
        city_claim=r['city_claim'],district_claim=r['district_claim'],
        price_mad_claim=r['price_mad_claim'],surface_m2_claim=r['surface_m2_claim'],
        decision='SOURCE_URL_REVIEW_NOT_ADMITTED') for r in gaps]
    gap_rows.sort(key=lambda r:(r['source_url_status'],r['source_url'] or '',str(r['city_claim'])))
    summary=dict(
        schema_version='feenway_j2_private_evidence_triage_v1',
        mode='OFFLINE_PRIVATE_REVIEW_ONLY',input_quarantine_sha256=pin,
        new_source_zip_sha256=report['new_archive_sha256'],
        old_feenway_zip_sha256=report['old_archive_sha256'],
        records=len(rows),unique_content_links_not_independently_verified=identity.get(MATCHED,0),
        ambiguous_identity_rows=len(amb_rows),ambiguous_identity_groups=len(ambiguous),
        ambiguous_group_categories=dict(sorted(amb_kinds.items())),
        source_id_collision_groups=len(collisions),
        source_id_collision_rows=sum(x['candidate_count'] for x in collisions),
        source_id_collision_group_conflicts=dict(sorted(conflict.items())),
        source_id_collision_groups_touching_ambiguity=touching,
        source_url_gap_rows=len(gap_rows),
        source_url_gap_status_counts=dict(sorted(Counter(x['source_url_status'] for x in gap_rows).items())),
        prioritized_source_id_review_groups=min(50,len(collisions)),
        verified_live_original_sources=0,confirmed_physical_duplicates=0,
        published_listings=0,private_staging_authorized=False,
        public_admission_authorized=False,network_requests=0,database_writes=0,
        note='Source-ID and six-field matches are review hints, not provenance or physical dedup proof.'
    )
    output.mkdir(mode=0o700,parents=True)
    try:
        for filename,rows,default_header in (
            ('ambiguous_identity_rows_QUARANTINE.csv',amb_rows,['fingerprint_sha256','source_url','decision']),
            ('source_id_collision_groups_REVIEW_ONLY.csv',collisions,['source_domain','source_offer_id_hint','decision']),
            ('source_url_gaps_REVIEW_ONLY.csv',gap_rows,['source_url_status','source_url','decision']),
            ('priority_source_groups_REVIEW_ONLY.csv',collisions[:50],['source_domain','source_offer_id_hint','decision'])):
            write_csv(output/filename,list(rows[0]) if rows else default_header,rows)
        (output/'triage_report.json').write_text(
            json.dumps(summary,ensure_ascii=False,sort_keys=True,indent=2)+'\n',encoding='utf-8')
    except BaseException:
        for f in output.iterdir():
            if f.is_file(): f.unlink()
        output.rmdir()
        raise
    return summary

def main():
    p=argparse.ArgumentParser(description='J2 FeenWay offline private triage')
    p.add_argument('--input-gzip',type=Path,required=True)
    p.add_argument('--input-sha256',required=True)
    p.add_argument('--intake-report',type=Path,required=True)
    p.add_argument('--output',type=Path,required=True)
    a=p.parse_args()
    print(json.dumps(triage(a.input_gzip,a.input_sha256,a.intake_report,a.output),
                     ensure_ascii=False,sort_keys=True))

if __name__=='__main__':
    main()
