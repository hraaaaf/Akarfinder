#!/usr/bin/env python3
"""J2 FeenWay V2 private intake: preserve original URL claims; never invent FeenWay IDs.

Offline-only; no portal HTTP, DB, staging, publication, or admission. If an old
FeenWay archive is supplied, join ONLY by unique exact non-URL source fields.
Duplicate fingerprints, unmatched records and unavailable old archives stay
unlinked. Identical fields are not proof of the physical property's identity.
"""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
import gzip
import hashlib
import json
from pathlib import Path
import re
from urllib.parse import urlsplit, parse_qs
import zipfile
from typing import Any


VERSION = 'feenway_v7_j2_dual_identity_quarantine_v1'
NEW_NAMES = frozenset({'annonces_akarfinder_urls_origine.json',
                       'rapport_urls_origine.json', 'LISEZ_MOI_AKARFINDER.txt'})
OLD_NAMES = frozenset({'feenway_annonces_trie_et_complet.json', 'feenway_rapport_final.json', 'README_AKARFINDER_IMPORT.txt'})
FEENWAY = re.compile(r'https://www\.feenway\.com/listings/[1-9][0-9]{0,11}\Z')
KEYS = frozenset({'nom_annonce', 'url', 'ville', 'quartier', 'superficie', 'prix', 'liens_photos'})
FINGERPRINT_KEYS = ('nom_annonce', 'ville', 'quartier', 'superficie', 'prix', 'liens_photos')
HOSTS = frozenset(('www.avito.ma', 'www.mubawab.ma', 'sarouty.ma', 'yakeey.com',
                   'agenz.ma', 'www.masaken.ma', 'immoneuf.avito.ma', 'www.lotti.ma'))
MAX_ZIP = 100_000_000
MAX_JSON = 80_000_000
MAX_ROWS = 120_000
HEX = re.compile(r'[0-9a-f]{64}\Z')
PRICE = re.compile(r'\s*([0-9][0-9\s\u00a0\u202f]*)\s*MAD\s*\Z')
AREA = re.compile(r'\s*([0-9][0-9\s\u00a0\u202f]*)\s*m²\s*\Z')

class IntakeRejected(ValueError):
    pass


def file_sha(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def _rows_new(path: Path, pin: str) -> tuple[list[dict], dict, str]:
    if (not isinstance(path, Path) or not path.is_file() or path.is_symlink()
            or path.stat().st_size > MAX_ZIP or not isinstance(pin, str)
            or not HEX.fullmatch(pin) or file_sha(path) != pin):
        raise IntakeRejected('NEW_ARCHIVE_PIN_OR_FILE_INVALID')
    try:
        with zipfile.ZipFile(path) as z:
            infos = z.infolist()
            if (len(infos) != len(NEW_NAMES) or {x.filename for x in infos} != NEW_NAMES
                    or any(x.is_dir() or x.file_size > MAX_JSON for x in infos)
                    or z.testzip() is not None):
                raise IntakeRejected('NEW_ARCHIVE_UNEXPECTED_CONTENT')
            rows = json.loads(z.read('annonces_akarfinder_urls_origine.json'))
            report = json.loads(z.read('rapport_urls_origine.json'))
    except (OSError, zipfile.BadZipFile, UnicodeError, ValueError) as exc:
        if isinstance(exc, IntakeRejected):
            raise
        raise IntakeRejected('NEW_ARCHIVE_BAD_JSON_OR_ZIP') from exc
    if (not isinstance(rows, list) or not 0 < len(rows) <= MAX_ROWS
            or not isinstance(report, dict) or report.get('annonces_total') != len(rows)):
        raise IntakeRejected('NEW_REPORT_COUNT_INVALID')
    return rows, report, pin


def _validate(row: Any) -> None:
    if not isinstance(row, dict) or set(row) != KEYS:
        raise IntakeRejected('V2_ROW_KEYS_INVALID')
    if any(not isinstance(row[k], str) or len(row[k]) > 6000 for k in KEYS - {'liens_photos'}):
        raise IntakeRejected('V2_ROW_TEXT_INVALID')
    if (not isinstance(row['liens_photos'], list) or len(row['liens_photos']) > 100
            or any(not isinstance(x, str) or len(x) > 2048 for x in row['liens_photos'])):
        raise IntakeRejected('V2_PHOTOS_INVALID')


def fingerprint(row: dict) -> str:
    """Exact six-field fingerprint; NOT a stable listing ID or property ID."""
    _validate(row)
    b = json.dumps([row[k] for k in FINGERPRINT_KEYS], ensure_ascii=False,
                   separators=(',', ':')).encode('utf-8')
    return hashlib.sha256(b'feenway-j2-join-fields-v1:' + b).hexdigest()


def _number(text: str, pattern: re.Pattern) -> int | None:
    m = pattern.fullmatch(text)
    return int(re.sub(r'\D', '', m.group(1))) if m else None


def source_claim(url: str) -> tuple[str, str | None, str | None]:
    """Strict URL *format* only. Never follows links or proves a live source."""
    if not url:
        return 'SOURCE_URL_MISSING', None, None
    if len(url) > 2048 or any(c in url for c in '\\ \t\r\n'):
        return 'SOURCE_URL_UNSAFE', None, None
    try:
        p = urlsplit(url)
        if (p.scheme != 'https' or p.netloc not in HOSTS or p.username
                or p.password or p.port is not None or p.fragment
                or not p.path.startswith('/') or '//' in p.path):
            return 'SOURCE_URL_UNSAFE_OR_UNSUPPORTED_HOST', None, None
    except ValueError:
        return 'SOURCE_URL_UNSAFE', None, None
    host = p.netloc
    path = p.path
    offer_id = None
    if host == 'www.avito.ma' and not p.query:
        m = re.fullmatch(r'/fr/.+_([0-9]{7,12})\.htm', path)
        offer_id = m.group(1) if m else None
    elif host == 'www.mubawab.ma' and not p.query:
        m = re.fullmatch(r'/fr/a/([0-9]{5,12})(?:/[^?#]+)?/?', path)
        offer_id = m.group(1) if m else None
    elif host == 'agenz.ma' and not p.query:
        m = re.fullmatch(r'/fr/annonces/immo-[^/]+/(?:vente|location)-[^/]+/[^/]+/([0-9]{5,12})/?', path)
        offer_id = m.group(1) if m else None
    elif host == 'yakeey.com' and not p.query:
        m = re.fullmatch(r'/fr-ma/[^/?#]+-([a-z]{2}[0-9]{5,8})/?', path)
        offer_id = m.group(1) if m else None
    elif host == 'sarouty.ma':
        qs = parse_qs(p.query, strict_parsing=False)
        if path.rstrip('/') == '/property-details' and len(qs) == 1 and 'listing_id' in qs:
            val = qs['listing_id']
            offer_id = val[0] if len(val) == 1 and re.fullmatch(r'[0-9]{5,9}', val[0]) else None
    elif host == 'www.masaken.ma' and not p.query:
        m = re.fullmatch(r'/fr/immobilier-maroc/[^/]+/([0-9]{4,12})/?', path)
        offer_id = m.group(1) if m else None
    return ('SOURCE_ROUTE_FORMAT_ONLY' if offer_id else 'SOURCE_ROUTE_REVIEW',
            host, offer_id)


def _old_index(old_archive: Path | None, old_sha: str | None) -> tuple[dict[str, list[str]], str | None]:
    if old_archive is None:
        if old_sha is not None:
            raise IntakeRejected('OLD_ARCHIVE_AND_PIN_REQUIRED_TOGETHER')
        return {}, None
    if not isinstance(old_sha, str) or not HEX.fullmatch(old_sha) or file_sha(old_archive) != old_sha:
        raise IntakeRejected('OLD_ARCHIVE_PIN_INVALID')
    if not old_archive.is_file() or old_archive.is_symlink() or old_archive.stat().st_size > MAX_ZIP:
        raise IntakeRejected('OLD_ARCHIVE_INVALID')
    try:
        with zipfile.ZipFile(old_archive) as z:
            infos = z.infolist()
            if (len(infos) != 3 or {v.filename for v in infos} != OLD_NAMES
                    or any(v.is_dir() or v.file_size > MAX_JSON for v in infos)
                    or z.testzip() is not None):
                raise IntakeRejected('OLD_ARCHIVE_UNSAFE_MEMBERS')
            rows = json.loads(z.read('feenway_annonces_trie_et_complet.json'))
    except (OSError, zipfile.BadZipFile, UnicodeError, ValueError) as exc:
        if isinstance(exc, IntakeRejected):
            raise
        raise IntakeRejected('OLD_ARCHIVE_BAD_ZIP_OR_JSON') from exc
    if not isinstance(rows, list) or not 0 < len(rows) <= MAX_ROWS:
        raise IntakeRejected('OLD_ARCHIVE_RECORD_COUNT_INVALID')
    digest = old_sha
    old: dict[str, list[str]] = defaultdict(list)
    urls = set()
    for row in rows:
        _validate(row)
        value = row['url']
        if not FEENWAY.fullmatch(value) or value in urls:
            raise IntakeRejected('OLD_FEENWAY_ID_INVALID_OR_DUPLICATE')
        urls.add(value)
        old[fingerprint(row)].append(value)
    return old, digest


def intake(new_archive: Path, new_sha: str, out: Path, *, old_archive: Path | None = None,
           old_sha: str | None = None, limit: int | None = None) -> dict:
    """Produce private gzip JSONL + summary outside git, never a V3-ready record."""
    rows, report, digest = _rows_new(new_archive, new_sha)
    old, old_digest = _old_index(old_archive, old_sha)
    if limit is not None and (not isinstance(limit, int) or limit < 1):
        raise IntakeRejected('INVALID_LIMIT')
    if (out.exists() or out.is_symlink() or out.parent.is_symlink()
            or any((p / '.git').exists() for p in (out.parent, *out.parents))):
        raise IntakeRejected('PRIVATE_NEW_OUTPUT_OUTSIDE_GIT_REQUIRED')
    counts: Counter[str] = Counter()
    by_host: Counter[str] = Counter()
    source_urls = set()
    fingerprints = Counter(fingerprint(r) for r in rows)
    out.mkdir(parents=True, mode=0o700)
    try:
        with gzip.open(out / 'dual_identity_QUARANTINE.jsonl.gz', 'wt', encoding='utf-8') as f:
            for i, row in enumerate(rows):
                if limit is not None and i >= limit:
                    break
                _validate(row)
                fp = fingerprint(row)
                status, host, offer_id = source_claim(row['url'])
                if row['url']:
                    if row['url'] in source_urls:
                        raise IntakeRejected('NEW_DUPLICATE_SOURCE_URL')
                    source_urls.add(row['url'])
                if host:
                    by_host[host] += 1
                counts[status] += 1
                if fp in old and len(old[fp]) == 1 and fingerprints[fp] == 1:
                    feenway_url = old[fp][0]
                    link_state = 'UNIQUE_SIX_FIELD_CONTENT_MATCH_NOT_SOURCE_VERIFIED'
                elif fp in old:
                    feenway_url = None
                    link_state = 'AMBIGUOUS_SIX_FIELD_MATCH'
                elif old_archive is None:
                    feenway_url = None
                    link_state = 'OLD_FEENWAY_ARCHIVE_NOT_SUPPLIED'
                else:
                    feenway_url = None
                    link_state = 'NO_EXACT_SIX_FIELD_MATCH'
                counts[link_state] += 1
                flags = []
                if row['ville'].strip().isdigit() or row['ville'].strip().upper() == 'N/A':
                    flags.append('CITY_UNRELIABLE')
                if row['quartier'].strip().upper() in ('', 'N/A'):
                    flags.append('DISTRICT_MISSING')
                if _number(row['prix'], PRICE) is None:
                    flags.append('PRICE_FORMAT_UNVERIFIED')
                if _number(row['superficie'], AREA) is None:
                    flags.append('AREA_FORMAT_UNVERIFIED')
                if fingerprints[fp] > 1:
                    flags.append('AMBIGUOUS_CONTENT_FINGERPRINT')
                data = {
                    'feenway_url': feenway_url,
                    'source_url': row['url'] if status in ('SOURCE_ROUTE_FORMAT_ONLY', 'SOURCE_ROUTE_REVIEW') else None,
                    'source_domain_hint': host,
                    'source_offer_id_hint': offer_id,
                    'source_url_status': status,
                    'identity_link_state': link_state,
                    'six_field_fingerprint_sha256': fp,
                    'feenway_identity_independently_verified': False,
                    'source_detail_independently_verified': False,
                    'availability_verified': False,
                    'physical_uniqueness_verified': False,
                    'price_mad_claim': _number(row['prix'], PRICE),
                    'surface_m2_claim': _number(row['superficie'], AREA),
                    'title_claim': row['nom_annonce'],
                    'city_claim': row['ville'],
                    'district_claim': row['quartier'],
                    'photo_urls_claim': row['liens_photos'],
                    'quality_flags': flags,
                    'decision': 'QUARANTINE_NO_STAGING_OR_PUBLIC_ADMISSION',
                }
                f.write(json.dumps(data, ensure_ascii=False, sort_keys=True, separators=(',', ':')) + '\n')
        # Must check global source counts on the full archive, not partial previews.
        if limit is None:
            actual_urls = sum(v for k, v in counts.items() if k.startswith('SOURCE_')) - counts['SOURCE_URL_MISSING']
            if (actual_urls != report.get('url_origine_trouvee')
                    or counts['SOURCE_URL_MISSING'] != report.get('url_origine_absente')
                    or dict(by_host) != report.get('domaines_sources')):
                raise IntakeRejected('SOURCE_REPORT_DISAGREES_WITH_ROWS')
        result = {
            'schema_version': VERSION, 'new_archive_sha256': digest,
            'old_archive_sha256': old_digest,
            'records_processed': sum(counts[k] for k in ('SOURCE_URL_MISSING', 'SOURCE_URL_UNSAFE',
                'SOURCE_URL_UNSAFE_OR_UNSUPPORTED_HOST', 'SOURCE_ROUTE_REVIEW', 'SOURCE_ROUTE_FORMAT_ONLY')),
            'source_status_counts': {k:v for k,v in sorted(counts.items()) if k.startswith('SOURCE_')},
            'identity_link_counts': {k:v for k,v in sorted(counts.items()) if not k.startswith('SOURCE_')},
            'content_fingerprint_ambiguous_groups': sum(1 for n in fingerprints.values() if n > 1),
            'content_fingerprint_ambiguous_rows': sum(n for n in fingerprints.values() if n > 1),
            'source_original_html_snapshots_provided': 0,
            'confirmed_physical_duplicates': 0,
            'network_requests': 0, 'database_writes': 0,
            'private_staging_authorized': False, 'public_admission_authorized': False,
            'note': 'Claimed source URL and exact six-field match are not independent provenance or physical-uniqueness evidence.',
        }
        (out / 'report.json').write_text(json.dumps(result, indent=2, sort_keys=True) + '\n', encoding='utf-8')
        return result
    except BaseException:
        # Never leave an apparently successful partial quarantine artifact on a failed audit.
        for name in ('dual_identity_QUARANTINE.jsonl.gz', 'report.json'):
            (out / name).unlink(missing_ok=True)
        try:
            out.rmdir()
        except OSError:
            pass
        raise


def main() -> None:
    a = argparse.ArgumentParser(description='J2 FeenWay V2 offline source URL intake, NO ADMISSION')
    a.add_argument('--new-zip', type=Path, required=True)
    a.add_argument('--new-sha256', required=True)
    a.add_argument('--old-zip', type=Path)
    a.add_argument('--old-sha256')
    a.add_argument('--out', type=Path, required=True)
    a.add_argument('--limit', type=int)
    args = a.parse_args()
    result = intake(args.new_zip, args.new_sha256, args.out,
                    old_archive=args.old_zip, old_sha=args.old_sha256, limit=args.limit)
    print(json.dumps(result, sort_keys=True))

if __name__ == '__main__':
    main()