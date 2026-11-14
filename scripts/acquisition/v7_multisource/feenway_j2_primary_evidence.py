#!/usr/bin/env python3
"""FeenWay J2: request and receipt of user-supplied primary HTML evidence.

READ-ONLY / NO NETWORK / NO DB / NO STAGING. A matching HTML hash does NOT
independently authenticate the capture's origin, timestamp or live availability.
"""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
import csv
from datetime import datetime, timezone
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.parse import urlsplit, unquote, parse_qs

PIN = re.compile(r"[a-f0-9]{64}\Z")
CASE = re.compile(r"[a-f0-9]{24}\Z")
FW = re.compile(r"https://www\.feenway\.com/listings/[1-9][0-9]{0,11}\Z")
REVIEW_SCHEMA = 'feenway_j2_primary_evidence_requests_v1'
EVIDENCE_SCHEMA = 'akarfinder-v7-raw-html-evidence-v1'
ALLOWED_HOSTS = frozenset(("www.avito.ma", "www.mubawab.ma", "agenz.ma",
                           "sarouty.ma", "yakeey.com", "www.masaken.ma"))
MAX_REQUESTS = 300
MAX_HTML = 2_000_000
MAX_REQUEST_BYTES = 1_000_000
MAX_MANIFEST = 12_000

class ProofRejected(ValueError):
    pass


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as f:
        for part in iter(lambda: f.read(1<<20), b''):
            h.update(part)
    return h.hexdigest()


def _input_file(path: Path, digest: str, max_bytes: int) -> None:
    if (not isinstance(path, Path) or path.is_symlink() or not path.is_file()
            or path.stat().st_size > max_bytes or not isinstance(digest, str)
            or PIN.fullmatch(digest) is None or sha256(path) != digest):
        raise ProofRejected('UNPINNED_OR_UNSAFE_INPUT')


def _url_key(url: str) -> tuple[str, str]:
    if not isinstance(url, str) or not 25 <= len(url) <= 2048 or any(c in url for c in ('\\','\r','\n','\t')):
        raise ProofRejected('UNSAFE_SOURCE_URL')
    try:
        p = urlsplit(url)
        host = p.hostname
        port = p.port
    except ValueError as e:
        raise ProofRejected('UNSAFE_SOURCE_URL') from e
    if (p.scheme != 'https' or host not in ALLOWED_HOSTS or p.netloc != host
            or p.username or p.password or port is not None or p.fragment
            or not p.path.startswith('/') or p.path.startswith('//') or '//' in p.path):
        raise ProofRejected('UNSUPPORTED_SOURCE_URL')
    path = unquote(p.path).rstrip('/')
    if host == 'www.avito.ma' and not p.query:
        m = re.search(r'_([0-9]{7,12})\.htm\Z', path)
    elif host == 'www.mubawab.ma' and not p.query:
        m = re.fullmatch(r'/fr/a/([0-9]{5,12})(?:/[^/?#]+)?', path)
    elif host == 'agenz.ma' and not p.query:
        m = re.fullmatch(r'/fr/annonces/immo-[^/]+/(?:vente|location)-[^/]+/[^/]+/([0-9]{5,12})', path)
    elif host == 'yakeey.com' and not p.query:
        m = re.fullmatch(r'/fr-ma/[^/]+-([a-z]{2}[0-9]{5,8})', path)
    elif host == 'www.masaken.ma' and not p.query:
        m = re.fullmatch(r'/fr/immobilier-maroc/[^/]+/([0-9]{4,12})', path)
    elif host == 'sarouty.ma' and path == '/property-details':
        if not re.fullmatch(r'listing_id=[0-9]{5,9}', p.query):
            raise ProofRejected('NONSTANDARD_OR_UNSAFE_QUERY')
        return host, p.query.split('=')[1]
    else:
        m = None
    if not m:
        raise ProofRejected('SOURCE_DETAIL_ROUTE_NOT_RECOGNIZED')
    return host, m.group(1)


def _case_key(url: str) -> str:
    return hashlib.sha256(url.encode('utf-8')).hexdigest()[:24]


def _safe_output(path: Path) -> None:
    if path.exists() or path.is_symlink() or path.parent.is_symlink():
        raise ProofRejected('OUTPUT_MUST_BE_NEW_AND_PRIVATE')
    if any((directory/'.git').exists() for directory in (path.parent, *path.parents)):
        raise ProofRejected('OUTPUT_INSIDE_REPOSITORY_FORBIDDEN')


def prepare(safe_review_jsonl: Path, safe_sha256: str, priority_csv: Path,
            priority_sha256: str, output: Path, max_groups: int = 50) -> dict:
    """Offline evidence request list for top groups + pinned Agenz 169490."""
    import gzip
    _input_file(safe_review_jsonl, safe_sha256, 25_000_000)
    _input_file(priority_csv, priority_sha256, 200_000)
    if not isinstance(max_groups, int) or not 1 <= max_groups <= 50:
        raise ProofRejected('INVALID_PRIORITY_SIZE')
    _safe_output(output)
    groups=[]
    with priority_csv.open(encoding='utf-8', newline='') as f:
        for row in csv.DictReader(f):
            if len(groups) >= max_groups: break
            host, sid=row.get('source_domain'),row.get('source_offer_id_hint')
            if not host or not sid or host not in ALLOWED_HOSTS:
                raise ProofRejected('PRIORITY_SOURCE_ID_INVALID')
            groups.append((host,sid))
    if len(groups) != max_groups or len(set(groups)) != len(groups):
        raise ProofRejected('PRIORITY_GROUP_COUNT_OR_DUPLICATES')
    selected=set(groups)
    found=defaultdict(list)
    agenz_key=('agenz.ma','169490')
    with gzip.open(safe_review_jsonl,'rt',encoding='utf-8') as f:
        for line in f:
            if len(line)>100000:
                raise ProofRejected('SOURCE_LINE_TOO_LONG')
            row=json.loads(line)
            if (row.get('decision')!='REVIEW_ONLY_NO_ADMISSION'
                    or row.get('original_source_verified') is not False
                    or row.get('public_admission_authorized') is not False):
                raise ProofRejected('UNSAFE_REVIEW_INPUT')
            url=row.get('source_url_claim')
            if url and (row.get('source_domain_hint'),row.get('source_offer_id_hint')) in selected:
                # Legacy safe review output has no source_domain_hint; normalize from URL.
                pass
            if not url or row.get('source_offer_id_hint') is None: continue
            try:
                host,ident=_url_key(url)
            except ProofRejected:
                continue
            key=(host,ident)
            if key in selected or key == agenz_key:
                if ident != row['source_offer_id_hint']:
                    raise ProofRejected('SOURCE_ID_CLAIM_MISMATCH')
                found[key].append(row)
    if any(len(found[g])<2 for g in groups):
        raise ProofRejected('PRIORITY_GROUP_NOT_RECONCILED_WITH_INPUT')
    if not found.get(agenz_key):
        raise ProofRejected('AGENZ_HISTORIC_CASE_NOT_IN_INPUT')
    cases=[];seen=set()
    for rank,key in enumerate(groups+[agenz_key],start=1):
        for row in found[key]:
            url=row['source_url_claim']
            if url in seen: raise ProofRejected('DUPLICATE_SOURCE_URL')
            seen.add(url)
            fw=row.get('feenway_url_claim')
            if fw is not None and (not isinstance(fw,str) or not FW.fullmatch(fw)):
                raise ProofRejected('BAD_FEENWAY_CLAIM')
            if len(cases) >= MAX_REQUESTS: raise ProofRejected('TOO_MANY_SOURCE_CASES')
            cases.append(dict(case_key=_case_key(url),rank=rank,group_type=(
                'AGENZ_RENT_CONFLICT' if key==agenz_key else 'SOURCE_ID_CLAIM_COLLISION'),
                source_url=url,source_domain=key[0],source_offer_id_claim=key[1],
                feenway_url_claim=fw,
                price_mad_claim=row['raw_claims_unchanged'].get('price_mad'),
                surface_m2_claim=row['raw_claims_unchanged'].get('surface_m2'),
                required_files=['source.html','source.manifest.json'],
                original_source_authenticated=False,source_active_verified=False,
                admission_authorized=False))
    packet=dict(schema_version=REVIEW_SCHEMA,mode='PRIVATE_OFFLINE_EVIDENCE_REQUEST_ONLY',
                source_input_sha256=safe_sha256,priority_csv_sha256=priority_sha256,
                priority_groups=max_groups,agenz_historic_case_included=True,
                source_evidence_supplied=0,public_admission_authorized=False,cases=cases)
    output.mkdir(mode=0o700,parents=True)
    (output/'evidence_requests_QUARANTINE.json').write_text(json.dumps(packet,ensure_ascii=False,indent=2,sort_keys=True)+'\n')
    readme=('FeenWay J2 — preuves primaires à fournir par voie autorisée.\n'
            'Pour chaque case_key, créer evidence/<case_key>/source.html et source.manifest.json.\n'
            'Ne pas utiliser de navigation contournant robots/403 ni de capture inventée.\n'
            'Manifest compatible akarfinder-v7-raw-html-evidence-v1 : source_url, '
            'captured_at_utc en Z, http_status=200, content_type text/html; charset=utf-8, '
            'html_sha256, bytes, capture_method=explicit_single_page_https_get, schema_version.\n'
            'Les empreintes et horodatages fournis ne prouvent PAS indépendamment '
            'la provenance, la disponibilité ou le prix actuel.\n'
            'Une capture manquante ou incohérente n’autorise jamais l’admission.\n')
    (output/'README_PREUVES_J2.txt').write_text(readme,encoding='utf-8')
    report=dict(total_requested_cases=len(cases),priority_groups=max_groups,
                agenz_cases=len(found[agenz_key]),evidence_received=0,
                cases_without_proofs=len(cases),admitted=0,
                source_network_requests=0,database_writes=0,private_staging_authorized=False,
                public_admission_authorized=False)
    (output/'preflight_report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2,sort_keys=True)+'\n')
    return report


class _HeadIdentity(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.in_head=False
        self.canonical=[];self.og=[]
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if tag=='head':self.in_head=True
        if not self.in_head:return
        if tag=='link' and 'canonical' in (attrs.get('rel') or '').lower().split():
            self.canonical.append(attrs.get('href'))
        if tag=='meta' and (attrs.get('property') or '').lower()=='og:url':
            self.og.append(attrs.get('content'))
    def handle_endtag(self,tag):
        if tag=='head':self.in_head=False


def _observed_identity(expected_url:str, raw:str) -> str:
    parser=_HeadIdentity();parser.feed(raw);parser.close()
    values=parser.canonical+parser.og
    if not values:return 'SOURCE_CANONICAL_NOT_SUPPLIED'
    if any(x!=expected_url for x in values) or len(set(values))>1:
        return 'SOURCE_CANONICAL_CONFLICT_REQUIRES_REVIEW'
    return 'SOURCE_CANONICAL_SELF_CLAIM_MATCH_NOT_AUTHENTICATED'


def _evaluate_capture(folder:Path,expected_url:str) -> dict:
    if folder.is_symlink():return dict(status='UNSAFE_EVIDENCE_FOLDER')
    html=folder/'source.html';manifest=folder/'source.manifest.json'
    if not folder.exists():return dict(status='SOURCE_CAPTURE_NOT_SUPPLIED')
    if not folder.is_dir():return dict(status='EVIDENCE_FOLDER_NOT_DIRECTORY')
    if html.is_symlink() or manifest.is_symlink():return dict(status='EVIDENCE_SYMLINK_REJECTED')
    if not html.is_file() or not manifest.is_file():return dict(status='INCOMPLETE_SOURCE_CAPTURE')
    if html.stat().st_size > MAX_HTML or manifest.stat().st_size > MAX_MANIFEST:
        return dict(status='OVERSIZE_CAPTURE_REJECTED')
    try:
        raw=html.read_bytes()
        m=json.loads(manifest.read_text(encoding='utf-8'))
        required={'schema_version','source_url','captured_at_utc','http_status',
                  'content_type','html_sha256','bytes','capture_method'}
        if not isinstance(m,dict) or set(m)!=required:
            raise ProofRejected('BAD_SOURCE_MANIFEST_FIELDS')
        dt=datetime.fromisoformat(str(m['captured_at_utc']).replace('Z','+00:00'))
        if (m['schema_version']!=EVIDENCE_SCHEMA or m['source_url']!=expected_url
                or m['http_status']!=200 or m['capture_method']!='explicit_single_page_https_get'
                or not isinstance(m['content_type'],str) or not m['content_type'].lower().startswith('text/html')
                or not isinstance(m['bytes'],int) or isinstance(m['bytes'],bool)
                or m['bytes']!=len(raw) or not isinstance(m['html_sha256'],str)
                or not PIN.fullmatch(m['html_sha256'])
                or hashlib.sha256(raw).hexdigest()!=m['html_sha256']
                or not str(m['captured_at_utc']).endswith('Z')
                or dt.utcoffset()!=timezone.utc.utcoffset(dt)
                or not raw.startswith((b'<!doctype html',b'<!DOCTYPE html',b'<html',b'<HTML'))):
            raise ProofRejected('CAPTURE_INTEGRITY_OR_IDENTITY_MISMATCH')
        decoded=raw.decode('utf-8',errors='strict')
        status=_observed_identity(expected_url,decoded)
        return dict(status=status,submitted_html_sha256=m['html_sha256'],
                    capture_time_utc_claim=m['captured_at_utc'],
                    supplied_bytes_integrity_verified=True)
    except (ValueError, UnicodeError, OSError, TypeError, OverflowError) as exc:
        return dict(status='INVALID_CAPTURE_REQUIRES_REVIEW',error_class=type(exc).__name__)


def audit(requests:Path,request_sha256:str,evidence_root:Path,output:Path) -> dict:
    _input_file(requests,request_sha256,MAX_REQUEST_BYTES)
    if evidence_root.is_symlink() or not evidence_root.is_dir():
        raise ProofRejected('EVIDENCE_ROOT_NOT_DIRECTORY')
    _safe_output(output)
    packet=json.loads(requests.read_text(encoding='utf-8'))
    if (not isinstance(packet,dict) or packet.get('schema_version')!=REVIEW_SCHEMA
            or packet.get('public_admission_authorized') is not False
            or not isinstance(packet.get('cases'),list)
            or not 1<=len(packet['cases'])<=MAX_REQUESTS):
        raise ProofRejected('INVALID_REQUEST_PACKET')
    seen=set();reports=[]
    for case in packet['cases']:
        if not isinstance(case,dict) or case.get('admission_authorized') is not False:
            raise ProofRejected('CASE_NOT_QUARANTINED')
        url=case.get('source_url')
        host,claimed=_url_key(url)
        key=case.get('case_key')
        if (not isinstance(key,str) or not CASE.fullmatch(key) or key!=_case_key(url)
                or key in seen or case.get('source_domain')!=host
                or case.get('source_offer_id_claim')!=claimed):
            raise ProofRejected('INVALID_OR_DUPLICATE_CASE_IDENTITY')
        seen.add(key)
        result=_evaluate_capture(evidence_root/key,url)
        reports.append(dict(case_key=key,source_url=url,feenway_url_claim=case.get('feenway_url_claim'),
                            **result,independently_authenticated_original_source=False,
                            source_price_verified=False,source_availability_verified=False,
                            physical_duplicate_verified=False,private_staging_authorized=False,
                            public_admission_authorized=False))
    counts=Counter(x['status'] for x in reports)
    summary=dict(schema_version='feenway_j2_primary_evidence_receipt_v1',
                 request_packet_sha256=request_sha256,requested_cases=len(reports),
                 statuses=dict(sorted(counts.items())),source_network_requests=0,database_writes=0,
                 source_prices_independently_verified=0,source_availabilities_verified=0,
                 confirmed_physical_duplicates=0,admitted=0,
                 private_staging_authorized=False,public_admission_authorized=False,
                 note='Manifest and HTML hash are self-declared integrity checks, not independent authenticity.')
    output.mkdir(mode=0o700,parents=True)
    (output/'receipt_QUARANTINE.json').write_text(json.dumps(dict(summary=summary,cases=reports),ensure_ascii=False,indent=2,sort_keys=True)+'\n')
    return summary


def main():
    p=argparse.ArgumentParser(description='FeenWay J2 offline primary-source evidence review')
    sub=p.add_subparsers(dest='op',required=True)
    prep=sub.add_parser('prepare')
    prep.add_argument('--input-jsonl',type=Path,required=True)
    prep.add_argument('--input-sha256',required=True)
    prep.add_argument('--priority-csv',type=Path,required=True)
    prep.add_argument('--priority-sha256',required=True)
    prep.add_argument('--output',type=Path,required=True)
    prep.add_argument('--max-groups',type=int,default=50)
    check=sub.add_parser('audit')
    check.add_argument('--requests',type=Path,required=True)
    check.add_argument('--request-sha256',required=True)
    check.add_argument('--evidence-root',type=Path,required=True)
    check.add_argument('--output',type=Path,required=True)
    a=p.parse_args()
    r=(prepare(a.input_jsonl,a.input_sha256,a.priority_csv,a.priority_sha256,a.output,a.max_groups)
       if a.op=='prepare' else audit(a.requests,a.request_sha256,a.evidence_root,a.output))
    print(json.dumps(r,ensure_ascii=False,sort_keys=True))

if __name__=='__main__':main()