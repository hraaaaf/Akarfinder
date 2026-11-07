"""Measure extraction coverage and observed yield; discovered URLs are not fresh listings."""
import json
import sqlite3
from collections import Counter, defaultdict
from datetime import datetime, timezone
from urllib.parse import urlsplit

from pipeline import ROOT, atomic_json, sieve


def main():
    out = ROOT / 'data' / 'annonces-fraiches'
    groups = defaultdict(list)
    db = sqlite3.connect(out / 'checkpoint.sqlite')
    try:
        for url, payload in db.execute('SELECT url,payload FROM observations'):
            groups[urlsplit(url).hostname].append(json.loads(payload))
    finally:
        db.close()
    now = datetime.now(timezone.utc)
    sources = []
    fields = ('ville', 'quartier', 'superficie', 'prix', 'type', 'date_publication')
    for origin, rows in groups.items():
        missing = Counter(field for row in rows for field in fields if not row.get(field))
        reasons = Counter(reason for row in rows for reason in sieve(row, now))
        accepted = sum(not sieve(row, now) for row in rows)
        sources.append({'domain': origin, 'observed': len(rows), 'accepted': accepted,
                        'yield_percent': round(100 * accepted / len(rows), 2),
                        'missing_extracted_fields': dict(missing), 'rejection_reasons': dict(reasons)})
    sources.sort(key=lambda source: source['accepted'], reverse=True)
    report = {'generated_at': now.isoformat(), 'freshness_days': 30,
              'sources': sources, 'target': 200000,
              'total_observed': sum(s['observed'] for s in sources),
              'total_accepted': sum(s['accepted'] for s in sources),
              'interpretation': 'Missing extraction requires review; source absence is not established. No national stock estimate or extrapolation from samples.'}
    atomic_json(out / 'source-capacity.json', report)
    print(json.dumps(report, ensure_ascii=True, indent=2))


if __name__ == '__main__':
    main()
