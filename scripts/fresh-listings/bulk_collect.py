"""Collect distinct sources concurrently, with one worker per origin and isolated checkpoints."""
import argparse
import json
import sqlite3
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit

from pipeline import ROOT, atomic_json, date, export


def merge_checkpoint(destination, source):
    """Keep the newest actual observation for each URL; never upgrade verification."""
    count = 0
    with closing(sqlite3.connect(source)) as worker:
        for url, payload in worker.execute('SELECT url,payload FROM observations'):
            row = json.loads(payload)
            previous = destination.execute('SELECT payload FROM observations WHERE url=?', (url,)).fetchone()
            if previous:
                old = json.loads(previous[0])
                old_time, new_time = date(old.get('verifie_le')), date(row.get('verifie_le'))
                if old_time and (not new_time or old_time > new_time):
                    continue
            destination.execute('INSERT OR REPLACE INTO observations VALUES (?,?)', (url, payload))
            count += 1
    destination.commit()
    return count


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--max-details', type=int, default=500)
    parser.add_argument('--workers', type=int, default=4)
    args = parser.parse_args()
    if args.max_details < 1 or not 1 <= args.workers <= 4:
        parser.error('positive detail limit and 1-4 workers required')
    out = ROOT / 'data' / 'annonces-fraiches'
    batch = out / '.bulk' / datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    batch.mkdir(parents=True)
    scripts = Path(__file__).resolve().parent
    configs = [
        {'origin': 'https://agenz.ma', 'enabled': True, 'detail_pattern': r'^/fr/annonces/.+/\d+$', 'catalogues': ['https://agenz.ma/fr/acheter']},
        {'origin': 'https://1immo.ma', 'enabled': True, 'detail_pattern': r'^/[^/]+-\d+$', 'catalogues': ['https://1immo.ma/']},
        {'origin': 'https://www.marocimmo.com', 'enabled': True, 'detail_pattern': r'^/fr/annonces/[^/]+-\d+$', 'catalogues': ['https://www.marocimmo.com/fr/vente', 'https://www.marocimmo.com/fr/location']},
        {'origin': 'https://daragadir.com', 'enabled': True, 'detail_pattern': r'^/annonces/annonces-immobilieres/.+\.html$'},
    ]
    jobs = []
    for config in configs:
        origin = config['origin']
        folder = batch / urlsplit(origin).hostname
        folder.mkdir()
        config_path = folder / 'sources.json'
        atomic_json(config_path, [config])
        jobs.append((origin, folder, [sys.executable, str(scripts / 'pipeline.py'), '--sources', str(config_path), '--output', str(folder), '--max-details', str(args.max_details), '--skip-verified']))
    for origin, script in [('https://sawim.ma', 'sawim_feed.py'), ('https://limmobiliersansfrontieres.com', 'wordpress_feed.py')]:
        folder = batch / urlsplit(origin).hostname
        folder.mkdir()
        jobs.append((origin, folder, [sys.executable, str(scripts / script), '--output', str(folder)]))
    origin = 'https://www.soukimmobilier.com'
    folder = batch / urlsplit(origin).hostname
    folder.mkdir()
    jobs.append((origin, folder, [sys.executable, str(scripts / 'soukimmobilier_feed.py'), '--output', str(folder), '--max-details', str(args.max_details), '--only-unseen']))
    # Seed each worker with only its own source to retain resumability.
    with closing(sqlite3.connect(out / 'checkpoint.sqlite')) as db:
        initial = export(db, out, datetime.now(timezone.utc), 200000, {'channel': 'bulk-baseline'})['accepted']
        for origin, folder, _ in jobs:
            with closing(sqlite3.connect(folder / 'checkpoint.sqlite')) as worker:
                worker.execute('CREATE TABLE observations (url TEXT PRIMARY KEY,payload TEXT NOT NULL)')
                for url, payload in db.execute('SELECT url,payload FROM observations'):
                    if urlsplit(url).netloc == urlsplit(origin).netloc:
                        worker.execute('INSERT INTO observations VALUES (?,?)', (url, payload))
                worker.commit()
    def run(job):
        origin, folder, command = job
        with (folder / 'worker.log').open('w', encoding='utf-8') as log:
            result = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT)
        report_path = folder / 'rapport.json'
        report = json.loads(report_path.read_text(encoding='utf-8')) if report_path.exists() else {'errors': ['worker_failed_before_report']}
        return {'origin': origin, 'exit_code': result.returncode, 'report': report, 'folder': str(folder)}
    completed = []
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = [pool.submit(run, job) for job in jobs]
        for future in as_completed(futures):
            item = future.result()
            completed.append(item)
            with closing(sqlite3.connect(out / 'checkpoint.sqlite')) as db:
                merge_checkpoint(db, Path(item['folder']) / 'checkpoint.sqlite')
                report = export(db, out, datetime.now(timezone.utc), 200000, {'channel': 'bulk-multi-source', 'sources': completed, 'accepted_before_batch': initial})
            atomic_json(out / 'bulk-report.json', {'batch': str(batch), 'accepted_before': initial, 'accepted_after': report['accepted'], 'sources': completed})
            print(json.dumps({'origin': item['origin'], 'accepted_source': item['report'].get('accepted'), 'accepted_total': report['accepted'], 'sources_completed': len(completed)}, ensure_ascii=True), flush=True)
    print(json.dumps({'accepted_before': initial, 'accepted_after': report['accepted'], 'net_gain': report['accepted'] - initial, 'batch': str(batch)}), flush=True)


if __name__ == '__main__':
    main()

