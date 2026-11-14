#!/usr/bin/env python3
"""FeenWay J2: immutable offline evidence reclassification; always NO-GO admission.

Parses only user-supplied, SHA-pinned ZIP bytes. Never requests portal pages,
executes bundled scripts, alters raw evidence or certifies live source provenance.
"""
from __future__ import annotations
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from urllib.parse import urlsplit
import argparse
import csv
import hashlib
import json
import re
import stat
import zipfile

from bs4 import BeautifulSoup

SHA = re.compile(r'[a-f0-9]{64}\Z')
KEY = re.compile(r'[a-f0-9]{24}\Z')
MUBAWAB_PATH = re.compile(r'/fr/a/([0-9]{6,9})(?:/|\Z)')
AVITO_PATH = re.compile(r'_([0-9]{7,9})\.htm\Z')
AGENZ_PATH = re.compile(r'/([0-9]{5,9})\Z')
MAX_ZIP_BYTES = 12_000_000
MAX_MEMBERS = 350
MAX_MEMBER_BYTES = 1_100_000
MAX_TOTAL_BYTES = 40_000_000
MAX_CASES = 200
TAXONOMY = frozenset({
    'ACCESS_BLOCKED_403_NO_SOURCE_PROOF',
    'REDIRECTED_LISTING_SAME_NATIVE_ID_UNVERIFIED',
    'REDIRECTED_TO_CATEGORY_NO_OFFER',
    'UNREDIRECTED_SOURCE_FIELD_CONFLICT',
    'AGENZ_INTRA_PAGE_PRICE_CONFLICT',
    'CONTENT_ALIGNED_NOT_INDEPENDENTLY_AUTHENTICATED',
    'CAPTURE_CONTENT_INCOMPLETE_REVIEW',
})

class AdjudicationRejected(ValueError):
    """Reject tampered, unsafe, or unsupported evidence before creating output."""


def _digest(p: Path) -> str:
    h = hashlib.sha256()
    with p.open('rb') as fh:
        for block in iter(lambda: fh.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def _open_pinned(path: Path, pin: str) -> tuple[zipfile.ZipFile, str]:
    if (not isinstance(path, Path) or not path.is_file() or path.is_symlink()
            or path.stat().st_size > MAX_ZIP_BYTES or not isinstance(pin, str)
            or SHA.fullmatch(pin) is None or _digest(path) != pin):
        raise AdjudicationRejected('PINNED_ZIP_MISSING_OR_SHA256_MISMATCH')
    try:
        z = zipfile.ZipFile(path)
        info = z.infolist()
        if not (5 <= len(info) <= MAX_MEMBERS):
            raise AdjudicationRejected('UNEXPECTED_ZIP_MEMBER_COUNT')
        paths = [v.filename for v in info]
        if len(set(paths)) != len(paths):
            raise AdjudicationRejected('DUPLICATE_ZIP_MEMBER')
        size_total = 0
        for member in info:
            p = PurePosixPath(member.filename)
            if (p.is_absolute() or '..' in p.parts or '\\' in member.filename
                    or member.file_size > MAX_MEMBER_BYTES or member.flag_bits & 0x1):
                raise AdjudicationRejected('UNSAFE_ZIP_MEMBER')
            filemode = member.external_attr >> 16
            if stat.S_IFMT(filemode) == stat.S_IFLNK:
                raise AdjudicationRejected('ZIP_SYMLINK_FORBIDDEN')
            size_total += member.file_size
        if size_total > MAX_TOTAL_BYTES or z.testzip() is not None:
            raise AdjudicationRejected('UNSAFE_ZIP_SIZE_OR_CRC')
        roots = {p.split('/', 1)[0] for p in paths}
        if len(roots) != 1 or '' in roots:
            raise AdjudicationRejected('INVALID_ARCHIVE_ROOT')
        return z, next(iter(roots)) + '/'
    except (OSError, zipfile.BadZipFile, RuntimeError) as exc:
        raise AdjudicationRejected('INVALID_ZIP') from exc


def _json(z: zipfile.ZipFile, member: str) -> object:
    try:
        return json.loads(z.read(member))
    except (KeyError, UnicodeError, ValueError) as exc:
        raise AdjudicationRejected('BAD_OR_MISSING_JSON_MEMBER') from exc


def _sha(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def _utc(value: object) -> bool:
    if not isinstance(value, str) or not value.endswith('Z'):
        return False
    try:
        dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
        return dt.utcoffset() == timezone.utc.utcoffset(dt)
    except ValueError:
        return False


def _mubawab_jsonld(raw: bytes) -> tuple[dict | None, bool]:
    # HTML is treated as data: no script execution, browser, URL fetch or DOM mutation.
    soup = BeautifulSoup(raw.decode('utf-8'), 'html.parser')
    listing = []
    for tag in soup.find_all('script', attrs={'type': 'application/ld+json'}):
        try:
            parsed = json.loads(tag.string or tag.get_text())
        except (TypeError, ValueError):
            continue
        if isinstance(parsed, dict) and parsed.get('@type') == 'RealEstateListing':
            listing.append(parsed)
    return (listing[0] if len(listing) == 1 else None, len(listing) == 1)


def _listing_values(data: dict) -> tuple[float | None, float | None, str | None]:
    offers = data.get('offers')
    if not isinstance(offers, dict):
        return None, None, None
    price = offers.get('price')
    if (isinstance(price, bool) or not isinstance(price, (float, int))
            or price <= 0 or offers.get('priceCurrency') != 'MAD'):
        price = None
    item = offers.get('itemOffered')
    size = item.get('floorSize') if isinstance(item, dict) else None
    area = size.get('value') if isinstance(size, dict) else None
    if (isinstance(area, bool) or not isinstance(area, (int, float)) or area <= 0):
        area = None
    url = data.get('url') if isinstance(data.get('url'), str) else None
    return price, area, url


def _agenz_conflict(raw: bytes) -> tuple[bool, int | None, int | None]:
    soup = BeautifulSoup(raw.decode('utf-8'), 'html.parser')
    mains = soup.find_all('main')
    if len(mains) != 1:
        return False, None, None
    sections = {}
    for tag in mains[0].find_all('h2'):
        heading = ' '.join(tag.get_text(' ', strip=True).split()).casefold()
        sec = tag.find_parent('section')
        if sec:
            sections.setdefault(heading, []).append(sec.get_text(' ', strip=True))
    cost, desc = sections.get('coût mensuel', []), sections.get('description', [])
    if len(cost) != 1 or len(desc) != 1:
        return False, None, None
    money = r'(\d{1,3}(?:[ \u00a0\u202f]\d{3})+|\d{4,8})\s*(?:DH|DHS|MAD)\b'
    c = re.findall(money, cost[0], re.I)
    d = re.findall(r'Location\s+longue\s+dur[ée]e\b[^\d]{0,70}' + money, desc[0], re.I)
    p = {int(re.sub(r'\D', '', x)) for x in c}
    q = {int(re.sub(r'\D', '', x)) for x in d}
    if len(p) != 1 or len(q) != 1:
        return False, None, None
    a, b = next(iter(p)), next(iter(q))
    return a != b, a, b


def _source_id(url: str) -> str | None:
    parsed = urlsplit(url)
    pattern = ({'www.mubawab.ma': MUBAWAB_PATH,
                'www.avito.ma': AVITO_PATH,
                'agenz.ma': AGENZ_PATH}).get(parsed.hostname)
    if pattern is None or parsed.query or parsed.fragment:
        return None
    match = pattern.search(parsed.path)
    return match.group(1) if match else None


def _escape_csv(value: object) -> str:
    s = str(value if value is not None else '').replace('\r', ' ').replace('\n', ' ')[:1300]
    return "'" + s if s.lstrip().startswith(('=', '+', '-', '@', '\t')) else s


def adjudicate(archive: Path, pin: str, output: Path) -> dict:
    """Reclassify every case using ZIP evidence; never change input or certify source."""
    if (output.exists() or output.is_symlink()
            or any(p.is_symlink() or (p / '.git').exists() for p in (output.parent, *output.parents))):
        raise AdjudicationRejected('OUTPUT_MUST_BE_NEW_AND_OUTSIDE_GIT')
    z, prefix = _open_pinned(archive, pin)
    with z:
        requests = _json(z, prefix + 'evidence_requests_QUARANTINE.json')
        registry = _json(z, prefix + 'case_register_118.json')
        provided = _json(z, prefix + 'audit_summary.json')
        if (not isinstance(requests, dict) or requests.get('public_admission_authorized') is not False
                or not isinstance(requests.get('cases'), list)
                or not isinstance(registry, list) or not isinstance(provided, dict)
                or not 1 <= len(registry) == len(requests['cases']) <= MAX_CASES):
            raise AdjudicationRejected('INVALID_REQUESTS_OR_REGISTRY')
        req = {}
        for r in requests['cases']:
            if not isinstance(r, dict):
                raise AdjudicationRejected('MALFORMED_REQUEST')
            k, url = r.get('case_key'), r.get('source_url')
            if (not isinstance(url, str) or not isinstance(k, str) or KEY.fullmatch(k) is None
                    or _sha(url.encode('utf-8'))[:24] != k or k in req
                    or r.get('admission_authorized') is not False):
                raise AdjudicationRejected('DUPLICATE_OR_UNPINNED_REQUEST')
            req[k] = r
        seen = set()
        output_rows = []
        for record in registry:
            if not isinstance(record, dict):
                raise AdjudicationRejected('MALFORMED_REGISTRY')
            k, url = record.get('case_key'), record.get('source_url')
            if (k not in req or k in seen or url != req[k]['source_url']
                    or str(record.get('source_offer_id_claim')) != str(req[k].get('source_offer_id_claim'))
                    or str(record.get('source_offer_id_claim')) != str(_source_id(url))):
                raise AdjudicationRejected('REGISTRY_REQUEST_IDENTITY_MISMATCH')
            seen.add(k)
            status, final = record.get('http_status'), record.get('final_url')
            if not isinstance(final, str) or not final.startswith('https://'):
                raise AdjudicationRejected('UNSAFE_FINAL_SOURCE_URL')
            identity = urlsplit(url).hostname
            if urlsplit(final).hostname != identity or identity not in {'www.mubawab.ma', 'www.avito.ma', 'agenz.ma'}:
                raise AdjudicationRejected('UNEXPECTED_SOURCE_HOST')
            captured_price = captured_area = secondary_price = None
            if status == 403 and identity == 'www.avito.ma':
                key = prefix + f'response_quarantine/{k}/'
                response, meta = z.read(key + 'response.body'), _json(z, key + 'response.manifest.json')
                if (not isinstance(meta, dict) or meta.get('http_status') != 403
                        or meta.get('source_url') != url or meta.get('final_url') != final
                        or meta.get('sha256') != _sha(response) or meta.get('bytes') != len(response)
                        or not _utc(meta.get('captured_at_utc'))):
                    raise AdjudicationRejected('BAD_403_CAPTURE_INTEGRITY')
                reason = 'ACCESS_BLOCKED_403_NO_SOURCE_PROOF'
            elif status == 200 and identity in ('www.mubawab.ma', 'agenz.ma'):
                key = prefix + f'evidence/{k}/'
                raw, meta = z.read(key + 'source.html'), _json(z, key + 'source.manifest.json')
                if (not isinstance(meta, dict) or meta.get('http_status') != 200
                        or meta.get('source_url') != url or meta.get('html_sha256') != _sha(raw)
                        or meta.get('bytes') != len(raw) or not _utc(meta.get('captured_at_utc'))
                        or meta.get('capture_method') != 'explicit_single_page_https_get'):
                    raise AdjudicationRejected('BAD_HTML_CAPTURE_INTEGRITY')
                if identity == 'agenz.ma':
                    mismatch, captured_price, secondary_price = _agenz_conflict(raw)
                    reason = ('AGENZ_INTRA_PAGE_PRICE_CONFLICT' if mismatch
                              else 'CAPTURE_CONTENT_INCOMPLETE_REVIEW')
                else:
                    claim_id = str(record['source_offer_id_claim'])
                    final_match = MUBAWAB_PATH.match(urlsplit(final).path)
                    listing, found = _mubawab_jsonld(raw)
                    if final_match is None:
                        reason = 'REDIRECTED_TO_CATEGORY_NO_OFFER'
                    elif not found:
                        reason = 'CAPTURE_CONTENT_INCOMPLETE_REVIEW'
                    else:
                        captured_price, captured_area, listing_url = _listing_values(listing)
                        listed_match = MUBAWAB_PATH.match(urlsplit(listing_url or '').path)
                        if (final_match.group(1) != claim_id or listed_match is None
                                or listed_match.group(1) != claim_id or listing_url != final):
                            reason = 'CAPTURE_CONTENT_INCOMPLETE_REVIEW'
                        elif final != url:
                            reason = 'REDIRECTED_LISTING_SAME_NATIVE_ID_UNVERIFIED'
                        elif (captured_price != record.get('claimed_price_mad')
                              or captured_area != record.get('claimed_surface_m2')):
                            reason = 'UNREDIRECTED_SOURCE_FIELD_CONFLICT'
                        else:
                            reason = 'CONTENT_ALIGNED_NOT_INDEPENDENTLY_AUTHENTICATED'
            else:
                raise AdjudicationRejected('UNSUPPORTED_HTTP_SOURCE_STATUS')
            if reason not in TAXONOMY:
                raise AdjudicationRejected('UNSUPPORTED_REVIEW_CLASS')
            output_rows.append({
                'case_key': k, 'source_url': url, 'final_url_claim': final,
                'source_offer_id_claim': record['source_offer_id_claim'],
                'source_domain': identity, 'original_report_status': record.get('case_status'),
                'corrected_review_category': reason,
                'claimed_price_mad': record.get('claimed_price_mad'),
                'captured_jsonld_price_mad_UNVERIFIED': captured_price,
                'description_price_mad_UNVERIFIED': secondary_price,
                'claimed_surface_m2': record.get('claimed_surface_m2'),
                'captured_jsonld_surface_m2_UNVERIFIED': captured_area,
                'evidence_bytes_integrity_checked': True,
                'independent_source_authenticity_verified': False,
                'current_availability_verified': False,
                'physical_duplicate_confirmed': False,
                'manual_review_required_for_admission': True,
                'private_staging_authorized': False,
                'public_admission_authorized': False,
                'disposition': 'QUARANTINE_REVIEW_ONLY',
            })
        if set(req) != seen or (provided.get('cases') != len(registry)):
            raise AdjudicationRejected('CASE_SET_DISAGREEMENT')
    counts = Counter(r['corrected_review_category'] for r in output_rows)
    report = {
        'schema_version': 'feenway_j2_capture_review_overlay_v1',
        'mode': 'OFFLINE_INTEGRITY_RECLASSIFICATION_NO_PORTAL_HTTP',
        'input_zip_sha256': pin,
        'total_cases': len(output_rows),
        'review_category_counts': dict(sorted(counts.items())),
        'manual_review_required_for_admission': len(output_rows),
        'old_manual_review_required_total_claim': provided.get('manual_review_required_total'),
        'independently_authenticated_sources': 0,
        'confirmed_current_availability': 0,
        'confirmed_physical_duplicates': 0,
        'network_requests': 0, 'database_writes': 0,
        'public_admission_authorized': False, 'private_staging_authorized': False,
        'input_raw_archive_modified': False,
        'note': 'CRC/hash/manifest equality is not source authenticity or current availability. No automatic price adjudication.',
    }
    output.mkdir(parents=True, mode=0o700)
    try:
        (output / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + '\n', encoding='utf-8')
        with (output / 'cases_REVIEW_ONLY.csv').open('x', newline='', encoding='utf-8-sig') as f:
            w = csv.DictWriter(f, fieldnames=list(output_rows[0]))
            w.writeheader()
            for row in sorted(output_rows, key=lambda r: (r['corrected_review_category'], r['case_key'])):
                w.writerow({k: _escape_csv(v) for k, v in row.items()})
        (output / 'cases_REVIEW_ONLY.json').write_text(json.dumps(output_rows, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    except BaseException:
        for f in output.iterdir():
            f.unlink()
        output.rmdir()
        raise
    return report


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--archive', required=True, type=Path)
    p.add_argument('--sha256', required=True)
    p.add_argument('--output', required=True, type=Path)
    a = p.parse_args()
    print(json.dumps(adjudicate(a.archive, a.sha256, a.output), ensure_ascii=False, sort_keys=True))

if __name__ == '__main__':
    main()
