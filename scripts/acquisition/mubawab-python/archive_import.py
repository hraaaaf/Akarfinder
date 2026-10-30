#!/usr/bin/env python3
"""Offline, deterministic importer for already-held Mubawab HTML and local images.

No HTTP, no browser, no robots override. The operator supplies the input files.
Outputs SQLite, listing JSONL, photo URL manifest, local-image manifest and proof report.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import urlparse

from bs4 import BeautifulSoup

from mubawab_full import HOST, db_open, listing_id, parse_detail, parse_page, run_export, clean_photos

IMAGE_EXTS = {'.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'}


def digest_file(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def iter_files(folder, allowed, max_files):
    if folder is None:
        return []
    base = Path(folder)
    if not base.is_dir():
        raise ValueError(f'Folder does not exist: {base}')
    paths = sorted(p for p in base.rglob('*') if p.is_file() and not p.is_symlink()
                   and p.suffix.lower() in allowed)
    if len(paths) > max_files:
        raise ValueError(f'Input budget exceeded: {len(paths)} > {max_files} ({base})')
    return paths


def detail_identity(html, filename, db):
    """Only trust a canonical/OG URL from this page or an existing numeric ID filename."""
    soup = BeautifulSoup(html, 'html.parser')
    urls = []
    for link in soup.select('link[rel~=canonical][href]'):
        urls.append(link.get('href', ''))
    for meta in soup.select('meta[property="og:url"][content]'):
        urls.append(meta.get('content', ''))
    for url in urls:
        p = urlparse(url)
        lid = listing_id(url)
        if p.scheme == 'https' and p.hostname == HOST and lid:
            return lid, url
    numeric = re.match(r'^(\d{4,})(?:\D|$)', filename.stem)
    if numeric:
        lid = numeric.group(1)
        existing = db.execute('SELECT url FROM listings WHERE id=?', (lid,)).fetchone()
        if existing and existing[0]:
            return lid, existing[0]
    return None, None


def merge_unique(current, more):
    return list(dict.fromkeys(current + more))


def import_archive(*, list_dir=None, detail_dir=None, photos_dir=None, jsonl_dir=None,
                   db_path='mubawab_offline.db', out_dir='mubawab_archive',
                   max_files=100000, max_html_bytes=8 * 1024 * 1024):
    if not (list_dir or detail_dir or photos_dir or jsonl_dir):
        raise ValueError('At least one local input directory is mandatory')
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    db = db_open(str(db_path))
    db.executescript('''
        CREATE TABLE IF NOT EXISTS archive_evidence (
          id TEXT NOT NULL, kind TEXT NOT NULL, filepath TEXT NOT NULL,
          sha256 TEXT NOT NULL, PRIMARY KEY(id,kind,filepath,sha256)
        );
        CREATE TABLE IF NOT EXISTS archive_files (
          kind TEXT NOT NULL, filepath TEXT NOT NULL, sha256 TEXT NOT NULL,
          record_count INTEGER NOT NULL,
          PRIMARY KEY(kind,filepath,sha256)
        );
    ''')
    counts = {'list_html_seen': 0, 'detail_html_seen': 0, 'jsonl_seen': 0, 'jsonl_imported': 0,
              'list_html_imported': 0, 'detail_html_imported': 0,
              'listings_inserted': 0, 'listings_updated': 0,
              'duplicate_files': 0, 'unresolved_detail_pages': 0,
              'local_photo_files': 0, 'local_photo_bytes': 0}
    errors = []

    def html_file(path):
        if path.stat().st_size > max_html_bytes:
            errors.append({'file': str(path), 'reason': 'html_size_limit'})
            return None
        try:
            return path.read_text(encoding='utf-8', errors='replace')
        except OSError as e:
            errors.append({'file': str(path), 'reason': 'read_error', 'error': str(e)})
            return None

    def already(kind, path, sha):
        return db.execute('SELECT 1 FROM archive_files WHERE kind=? AND filepath=? AND sha256=?',
                          (kind, str(path), sha)).fetchone() is not None

    try:
        for path in iter_files(list_dir, {'.htm', '.html'}, max_files):
            counts['list_html_seen'] += 1
            sha = digest_file(path)
            if already('list', path, sha):
                counts['duplicate_files'] += 1
                continue
            html = html_file(path)
            if html is None:
                continue
            rows = parse_page(html)
            if not rows:
                errors.append({'file': str(path), 'reason': 'no_listing_cards'})
                continue
            with db:
                for row in rows:
                    lid = row['id']
                    photos = row.pop('photos')
                    previous = db.execute('SELECT data,photos FROM listings WHERE id=?', (lid,)).fetchone()
                    if previous is None:
                        db.execute('INSERT INTO listings(id,url,data,photos) VALUES(?,?,?,?)',
                                   (lid, row['url'], json.dumps(row, ensure_ascii=False),
                                    json.dumps(photos, ensure_ascii=False)))
                        counts['listings_inserted'] += 1
                    else:
                        previous_data = json.loads(previous[0]) if previous[0] else {}
                        previous_photos = json.loads(previous[1]) if previous[1] else []
                        merged = {k: (previous_data.get(k) if previous_data.get(k) is not None else v)
                                  for k, v in row.items()}
                        merged.update({k: v for k, v in previous_data.items() if k not in merged})
                        all_photos = merge_unique(previous_photos, photos)
                        db.execute('UPDATE listings SET url=?,data=?,photos=? WHERE id=?',
                                   (row['url'], json.dumps(merged, ensure_ascii=False),
                                    json.dumps(all_photos, ensure_ascii=False), lid))
                        counts['listings_updated'] += 1
                    db.execute('INSERT OR IGNORE INTO archive_evidence VALUES(?,?,?,?)',
                               (lid, 'list', str(path), sha))
                db.execute('INSERT INTO archive_files VALUES(?,?,?,?)',
                           ('list', str(path), sha, len(rows)))
            counts['list_html_imported'] += 1

        # Import already-held, line-oriented listing exports. No network I/O.
        # Per-file transactions protect the previous state if a record is invalid.
        for path in iter_files(jsonl_dir, {'.jsonl'}, max_files):
            counts['jsonl_seen'] += 1
            sha = digest_file(path)
            if already('jsonl', path, sha):
                counts['duplicate_files'] += 1
                continue
            if path.stat().st_size > max_files * max_html_bytes:
                errors.append({'file': str(path), 'reason': 'jsonl_size_limit'})
                continue
            try:
                records = []
                with path.open(encoding='utf-8-sig') as source:
                    for line_no, line in enumerate(source, 1):
                        if not line.strip():
                            continue
                        r = json.loads(line)
                        if not isinstance(r, dict):
                            raise ValueError(f'line {line_no}: object required')
                        lid = str(r.get('id') or '')
                        url = str(r.get('url') or '')
                        parsed = urlparse(url)
                        if (r.get('source') != 'mubawab' or not lid.isdigit() or
                                parsed.scheme != 'https' or parsed.hostname != HOST or
                                listing_id(url) != lid):
                            raise ValueError(f'line {line_no}: source, ID or URL invalid')
                        imgs = r.pop('photos', [])
                        if not isinstance(imgs, list) or not all(isinstance(i, str) for i in imgs):
                            raise ValueError(f'line {line_no}: photos must be a list of URLs')
                        imgs = clean_photos(imgs)
                        for field in ('price_dh', 'rooms', 'bedrooms', 'bathrooms'):
                            if r.get(field) is not None:
                                r[field] = int(r[field])
                        if r.get('area_m2') is not None:
                            r['area_m2'] = float(r['area_m2'])
                        records.append((lid, url, r, imgs))
            except (OSError, UnicodeError, ValueError, TypeError, json.JSONDecodeError) as exc:
                errors.append({'file': str(path), 'reason': 'invalid_jsonl', 'error': str(exc)[:300]})
                continue
            if not records:
                errors.append({'file': str(path), 'reason': 'empty_jsonl'})
                continue
            with db:
                for lid, url, data, photos in records:
                    prev = db.execute('SELECT data,photos FROM listings WHERE id=?', (lid,)).fetchone()
                    if prev is None:
                        db.execute('INSERT INTO listings(id,url,data,photos) VALUES(?,?,?,?)',
                                   (lid, url, json.dumps(data, ensure_ascii=False),
                                    json.dumps(photos, ensure_ascii=False)))
                        counts['listings_inserted'] += 1
                    else:
                        old_data = json.loads(prev[0]) if prev[0] else {}
                        old_photos = json.loads(prev[1]) if prev[1] else []
                        # Prefer existing nonempty fields and accumulate all photo URL references.
                        merged = dict(data)
                        merged.update({k: v for k, v in old_data.items() if v is not None})
                        db.execute('UPDATE listings SET url=?,data=?,photos=? WHERE id=?',
                                   (url, json.dumps(merged, ensure_ascii=False),
                                    json.dumps(merge_unique(old_photos, photos), ensure_ascii=False), lid))
                        counts['listings_updated'] += 1
                    db.execute('INSERT OR IGNORE INTO archive_evidence VALUES(?,?,?,?)',
                               (lid, 'jsonl', str(path), sha))
                db.execute('INSERT INTO archive_files VALUES(?,?,?,?)',
                           ('jsonl', str(path), sha, len(records)))
            counts['jsonl_imported'] += 1

        for path in iter_files(detail_dir, {'.htm', '.html'}, max_files):
            counts['detail_html_seen'] += 1
            sha = digest_file(path)
            if already('detail', path, sha):
                counts['duplicate_files'] += 1
                continue
            html = html_file(path)
            if html is None:
                continue
            lid, url = detail_identity(html, path, db)
            if lid is None:
                counts['unresolved_detail_pages'] += 1
                errors.append({'file': str(path), 'reason': 'no_verified_detail_id'})
                continue
            detail = parse_detail(html)
            with db:
                row = db.execute('SELECT photos,detail FROM listings WHERE id=?', (lid,)).fetchone()
                if row is None:
                    db.execute('INSERT INTO listings(id,url,photos,detail,detail_done) VALUES(?,?,?,?,1)',
                               (lid, url, json.dumps(detail.pop('photos'), ensure_ascii=False),
                                json.dumps(detail, ensure_ascii=False)))
                    counts['listings_inserted'] += 1
                else:
                    photos = merge_unique(json.loads(row[0] or '[]'), detail.pop('photos'))
                    old_detail = json.loads(row[1]) if row[1] else {}
                    merged = {**detail, **{k: v for k, v in old_detail.items() if v is not None}}
                    db.execute('UPDATE listings SET photos=?,detail=?,detail_done=1 WHERE id=?',
                               (json.dumps(photos, ensure_ascii=False),
                                json.dumps(merged, ensure_ascii=False), lid))
                    counts['listings_updated'] += 1
                db.execute('INSERT OR IGNORE INTO archive_evidence VALUES(?,?,?,?)',
                           (lid, 'detail', str(path), sha))
                db.execute('INSERT INTO archive_files VALUES(?,?,?,1)', ('detail', str(path), sha))
            counts['detail_html_imported'] += 1

        listing_out = out / 'listings.jsonl'
        run_export(db, str(listing_out))
        with (out / 'photo_urls.csv').open('w', encoding='utf-8', newline='') as file:
            w = csv.writer(file)
            w.writerow(['listing_id', 'position', 'photo_url'])
            for lid, photos in db.execute('SELECT id,photos FROM listings ORDER BY id'):
                for index, url in enumerate(json.loads(photos or '[]'), 1):
                    w.writerow([lid, index, url])

        with (out / 'provenance.csv').open('w', encoding='utf-8', newline='') as file:
            w = csv.writer(file)
            w.writerow(['listing_id', 'kind', 'source_file', 'sha256'])
            w.writerows(db.execute('SELECT id,kind,filepath,sha256 FROM archive_evidence ORDER BY id,kind,filepath'))

        with (out / 'local_images.csv').open('w', encoding='utf-8', newline='') as file:
            w = csv.writer(file)
            w.writerow(['listing_id', 'local_path', 'bytes', 'sha256'])
            for path in iter_files(photos_dir, IMAGE_EXTS, max_files):
                lid = path.parent.name
                if not lid.isdigit():
                    errors.append({'file': str(path), 'reason': 'image_not_under_numeric_listing_id'})
                    continue
                size = path.stat().st_size
                w.writerow([lid, str(path), size, digest_file(path)])
                counts['local_photo_files'] += 1
                counts['local_photo_bytes'] += size

        n_listings = db.execute('SELECT COUNT(*) FROM listings').fetchone()[0]
        n_urls = sum(len(json.loads(r[0] or '[]'))
                     for r in db.execute('SELECT photos FROM listings'))
        n_details = db.execute('SELECT COUNT(*) FROM listings WHERE detail_done=1').fetchone()[0]
        report = {
            'mode': 'offline_supplied_files_only',
            'coverage_certified': False,
            'site_crawl_performed': False,
            'listing_count': n_listings,
            'detail_count': n_details,
            'photo_url_references': n_urls,
            **counts,
            'errors': errors[:500],
            'error_total': len(errors),
        }
        for filename in ['listings.jsonl','photo_urls.csv','provenance.csv','local_images.csv']:
            report[filename + '_sha256'] = digest_file(out / filename)
        (out / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2),
                                         encoding='utf-8')
        return report
    finally:
        db.close()


def main(argv=None):
    p = argparse.ArgumentParser(description='Offline archive import (does not make HTTP requests)')
    p.add_argument('--list-dir', type=Path)
    p.add_argument('--jsonl-dir', type=Path, help='Directory containing previous listing JSONL exports')
    p.add_argument('--detail-dir', type=Path)
    p.add_argument('--photos-dir', type=Path)
    p.add_argument('--db', default='mubawab_offline.db')
    p.add_argument('--out-dir', default='mubawab_archive')
    p.add_argument('--max-files', type=int, default=100000)
    p.add_argument('--max-html-bytes', type=int, default=8*1024*1024)
    a = p.parse_args(argv)
    if a.max_files <= 0 or a.max_html_bytes <= 0:
        p.error('budgets must be positive')
    try:
        result = import_archive(list_dir=a.list_dir, detail_dir=a.detail_dir,
                                jsonl_dir=a.jsonl_dir,
                                photos_dir=a.photos_dir, db_path=a.db,
                                out_dir=a.out_dir, max_files=a.max_files,
                                max_html_bytes=a.max_html_bytes)
    except ValueError as exc:
        p.error(str(exc))
    print(json.dumps({k: result[k] for k in ('listing_count','detail_count','photo_url_references',
                                          'local_photo_files','error_total')}, ensure_ascii=False))
    return 0 if result['error_total'] == 0 else 2

if __name__ == '__main__':
    raise SystemExit(main())