#!/usr/bin/env python3
"""Verify a supervised scraper run before exporting reusable state."""
import json, os, sqlite3, sys
from pathlib import Path
from datetime import datetime, timezone, timedelta

def verify():
    reasons=[]
    for name in ('pilot.log','akarfinder_diagnostics.json','akarfinder_data.json','akarfinder.db'):
        if not Path(name).is_file(): reasons.append('missing:'+name)
    if reasons: return {'status':'FAIL','reasons':reasons}
    d=json.loads(Path('akarfinder_diagnostics.json').read_text(encoding='utf-8'))
    rows=json.loads(Path('akarfinder_data.json').read_text(encoding='utf-8'))
    log=Path('pilot.log').read_text(encoding='utf-8')
    pages=d.get('pages',[])
    page=pages[0] if len(pages)==1 else {}
    if len(pages)!=1: reasons.append('not_one_page')
    if page.get('final_status')!='ok' or page.get('quality_accepted') is not True:
        reasons.append('quality_rejected')
    if d.get('summary',{}).get('with_listings')!=1: reasons.append('no_accepted_page')
    eligible=int(page.get('eligible_cards') or 0)
    parsed=int(page.get('parsed_listings') or 0)
    if not 24 <= eligible <= 48: reasons.append('unexpected_eligible_count')
    if parsed!=eligible: reasons.append('not_all_eligible_parsed')
    for k in ('price_coverage','surface_coverage','locality_coverage'):
        if float(page.get(k) or 0)<0.85: reasons.append(k+'_below_85_pct')
    if page.get('quality_reasons'): reasons.append('quality_reasons_nonempty')
    if 'statut: COMPLET' not in log: reasons.append('status_not_complete')
    with sqlite3.connect('akarfinder.db') as conn:
        integrity=conn.execute('PRAGMA integrity_check').fetchone()[0]
        count=conn.execute('SELECT COUNT(*) FROM listings').fetchone()[0]
    if integrity!='ok': reasons.append('db_corrupt')
    if count<parsed: reasons.append('db_count_too_small')
    now=datetime.now(timezone.utc)
    seen=[]
    for row in rows:
        try:
            dt=datetime.fromisoformat(row['last_seen'])
            if dt.tzinfo is None: dt=dt.replace(tzinfo=timezone.utc)
            if now-timedelta(minutes=20)<=dt<=now+timedelta(minutes=1): seen.append(row)
        except (KeyError, TypeError, ValueError): continue
    if len({str(r['id']) for r in seen})!=parsed: reasons.append('recent_export_count_mismatch')
    return {'status':'PASS' if not reasons else 'FAIL','reasons':reasons,
            'run_id':os.getenv('GITHUB_RUN_ID'),'head':os.getenv('GITHUB_SHA'),
            'quality_accepted':page.get('quality_accepted'),
            'eligible_cards':eligible,'parsed':parsed,
            'numeric_prices':sum(r.get('price_mad') is not None for r in seen),
            'price_on_request':sum(r.get('price_source_status')=='on_request' for r in seen),
            'price_coverage':page.get('price_coverage'),
            'surface_coverage':page.get('surface_coverage'),
            'locality_coverage':page.get('locality_coverage'),
            'db_rows':count,'integrity':integrity,
            'state_origin':Path('pilot_state_restore.txt').read_text().strip() if Path('pilot_state_restore.txt').is_file() else 'unknown',
            'generated_at_utc':now.isoformat(timespec='seconds')}

if __name__=='__main__':
    try: result=verify()
    except Exception as exc: result={'status':'FAIL','reasons':[f'{type(exc).__name__}: {exc}']}
    Path('pilot_validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(result,ensure_ascii=False))
    sys.exit(0 if result['status']=='PASS' else 2)
