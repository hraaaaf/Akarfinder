"""SYNTHETIC adversarial tests for read-only calibration; no network or DB."""
from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timedelta, timezone
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
import zipfile

import calibrate_page1 as c


ARCHIVE = Path('/mnt/data/Akarfinder_V646_3shard_live_20261103.zip')
# CI does not carry local artifacts, so tests generate their own complete synthetic canary.
URLS = [
    'https://www.mubawab.ma/fr/st/rabat/appartements-a-vendre',
    'https://www.mubawab.ma/fr/sd/casablanca/ma%C3%A2rif/appartements-a-vendre',
    'https://www.mubawab.ma/fr/sd/agadir/hay-salam/appartements-a-vendre'
]


def sample(shard=0, at=None, count=32, strict=True, code='a'*64):
    at = at or datetime(2026, 11, 4, 23, tzinfo=timezone.utc)
    ids = [str(9000000 + i) for i in range(count)]
    return {
        'mode': 'LIVE_SINGLE_PAGE_V646_CANARY',
        'source_search_url': URLS[shard],
        'generated_at_utc': at.isoformat(),
        'canary_status': 'parsed_quality_pass',
        'response_code': 200,
        'listing_page_navigations': 1,
        'attempts': 1,
        'robots': {'status': 'checked','sha256': 'b'*64},
        'provenance': {'github_sha':'c'*40,'scraper_sha256':code,
                       'browser_fetcher_sha256':'d'*64,'canary_sha256':'e'*64,
                       'quality_baselines_sha256':hashlib.sha256((Path(c.__file__).with_name('quality_baselines_v646_20261103.json')).read_bytes()).hexdigest(),
                       'approved_urls_sha256':hashlib.sha256((Path(c.__file__).with_name('pilot-urls.txt')).read_bytes()).hexdigest()},
        'html_analysis': {
            'quality_accepted':True,'quality_reasons':[],
            'observed_source_ids':ids,
            'observed_source_ids_sha256':hashlib.sha256('\n'.join(ids).encode()).hexdigest(),
            'eligible_cards':count, 'total_cards':count,
            'counts_for_accepted_page_only':{'unique_source_ids':count,'complete_core_with_district':count},
            'quality_contract': {'require_locality': strict, 'baseline_is_provisional':strict,
                                 'baseline_eligible_cards':32 if shard < 2 else 33}
        }
    }


class CalibrationTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name)
        self.manifest=Path(c.__file__).with_name('quality_baselines_v646_20261103.json')

    def write(self, index, data):
        p=self.root / f'observation_{index:02d}.json'
        p.write_text(json.dumps(data), encoding='utf-8')
        return p

    def test_single_valid_pre_p1_observation_is_not_calibration(self):
        p=self.write(1,sample(strict=False))
        r=c.calibrate([p],self.manifest)
        self.assertEqual(r['rejected_reports'],[])
        self.assertFalse(r['all_shards_ready_for_human_review'])
        self.assertEqual(r['shards'][URLS[0]]['historical_pass_observations'],1)
        self.assertEqual(r['shards'][URLS[0]]['strict_p1_pass_observations'],0)
        self.assertIsNone(r['shards'][URLS[0]]['candidate_baseline_for_human_review'])

    def test_five_separated_p1_strict_observations_become_reviewable_not_certified(self):
        t=datetime(2026,11,4,23,tzinfo=timezone.utc)
        counts=[32,31,33,32,30]
        paths=[self.write(i,sample(at=t+timedelta(hours=25*i),count=n)) for i,n in enumerate(counts)]
        r=c.calibrate(paths,self.manifest)
        a=r['shards'][URLS[0]]
        self.assertTrue(a['calibration_ready_for_human_review'])
        self.assertEqual(a['candidate_baseline_for_human_review'],32)
        self.assertEqual(a['status'],'READY_FOR_HUMAN_REVIEW_NOT_CERTIFIED')
        self.assertFalse(r['all_shards_ready_for_human_review'])

    def test_cadence_below_24_hours_blocks_calibration(self):
        t=datetime(2026,11,4,23,tzinfo=timezone.utc)
        paths=[self.write(i,sample(at=t+timedelta(hours=23*i))) for i in range(6)]
        a=c.calibrate(paths,self.manifest)['shards'][URLS[0]]
        self.assertFalse(a['calibration_ready_for_human_review'])
        self.assertTrue(a['cadence_violations'])

    def test_mixed_parser_code_versions_never_calibrate(self):
        t=datetime(2026,11,4,23,tzinfo=timezone.utc)
        paths=[self.write(i,sample(at=t+timedelta(hours=25*i),code=('a' if i<4 else 'f')*64)) for i in range(5)]
        a=c.calibrate(paths,self.manifest)['shards'][URLS[0]]
        self.assertEqual(a['strict_p1_code_versions'],2)
        self.assertFalse(a['calibration_ready_for_human_review'])

    def test_wrong_hash_fails_closed(self):
        d=sample();d['html_analysis']['observed_source_ids_sha256']='b'*64
        r=c.calibrate([self.write(1,d)],self.manifest)
        self.assertEqual(len(r['rejected_reports']),1)
        self.assertIn('hash',r['rejected_reports'][0]['rejected'])

    def test_both_http_denied_and_failed_gate_cannot_establish_coverage(self):
        for i, pair in enumerate([('blocked_or_no_useful_html',403),('parsed_quality_fail',200)]):
            d=sample();d['canary_status'],d['response_code']=pair
            r=c.calibrate([self.write(i,d)],self.manifest)
            self.assertEqual(len(r['rejected_reports']),1)
            self.assertFalse(r['all_shards_ready_for_human_review'])

    def test_untrusted_shard_never_enters_series(self):
        d=sample();d['source_search_url']='https://www.mubawab.ma/fr/st/tanger/appartements-a-vendre'
        r=c.calibrate([self.write(1,d)],self.manifest)
        self.assertEqual(len(r['rejected_reports']),1)
        self.assertEqual(sum(a['historical_pass_observations'] for a in r['shards'].values()),0)

    def test_no_ids_never_becomes_zero_change(self):
        d=sample();d['html_analysis']['observed_source_ids']=[]
        r=c.calibrate([self.write(1,d)],self.manifest)
        self.assertEqual(len(r['rejected_reports']),1)

    def test_missing_timezone_fails_closed(self):
        d=sample();d['generated_at_utc']='2026-11-04T23:00:00'
        r=c.calibrate([self.write(1,d)],self.manifest)
        self.assertIn('timezone',r['rejected_reports'][0]['rejected'])

    def test_repeated_ids_fail(self):
        d=sample();d['html_analysis']['observed_source_ids']=['1','1']
        d['html_analysis']['observed_source_ids_sha256']=hashlib.sha256(b'1\n1').hexdigest()
        r=c.calibrate([self.write(1,d)],self.manifest)
        self.assertIn('sorted and unique',r['rejected_reports'][0]['rejected'])

    def test_denied_attempt_still_consumes_24h_safety_window(self):
        d=sample();d['canary_status']='blocked_or_no_useful_html';d['response_code']=429
        r=c.calibrate([self.write(1,d)],self.manifest)
        shard=r['shards'][URLS[0]]
        self.assertTrue(shard['terminal_access_denial_observed'])
        self.assertEqual(shard['next_eligible_at_utc'],'2026-11-05T23:00:00+00:00')
        self.assertFalse(shard['calibration_ready_for_human_review'])

    def test_tampered_manifest_sha_is_refused(self):
        d=sample();d['provenance']['quality_baselines_sha256']='0'*64
        r=c.calibrate([self.write(1,d)],self.manifest)
        self.assertIn('SHA differs',r['rejected_reports'][0]['rejected'])

    def test_no_file_writes_or_network_side_effects(self):
        r=c.calibrate([],self.manifest)
        self.assertFalse(r['all_shards_ready_for_human_review'])
        self.assertEqual(r['source_paths'],[])
        self.assertEqual(len(list(self.root.iterdir())),0)


if __name__=='__main__':
    unittest.main()
