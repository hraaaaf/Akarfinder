"""Adversarial fixtures for J2 immutable capture reclassification. No HTTP or DB."""
from __future__ import annotations
import csv
import hashlib
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from zipfile import ZipFile, ZIP_DEFLATED, ZipInfo

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from v7_multisource.feenway_j2_capture_adjudication import (
    AdjudicationRejected, adjudicate, _sha,
)

MUB = 'https://www.mubawab.ma/fr/a/8396353/original-appartement'
MUB_NEW = 'https://www.mubawab.ma/fr/a/8396353/new-office'
MUB_CAT = 'https://www.mubawab.ma/fr/sd/ville/ville-verte/appartements-a-louer'
AVI = 'https://www.avito.ma/fr/casa/studios/studio_58917466.htm'
AG = 'https://agenz.ma/fr/annonces/immo-marrakech/location-appartements/route-de-casablanca/169490'

def html_listing(url=MUB, price=9000, area=130):
    obj = {'@type': 'RealEstateListing', 'url': url, 'offers': {
        'price': price, 'priceCurrency': 'MAD',
        'itemOffered': {'floorSize': {'value': area}}}}
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<html><head><script type="application/ld+json">'
            + json.dumps(obj) + '</script></head><body>Test</body></html>').encode('utf-8')

def ag_html():
    return ('<!DOCTYPE html><html><main><section><h2>Coût mensuel</h2>'
            'Loyer mensuel : 7 500 DH</section><section><h2>Description</h2>'
            'Location longue durée : 7 700 DH / mois</section></main></html>').encode('utf-8')

class AdjudicationTests(unittest.TestCase):
    def setUp(self):
        d = tempfile.TemporaryDirectory(); self.addCleanup(d.cleanup)
        self.root = Path(d.name); self.archive = self.root / 'source.zip'; self.out = self.root / 'output'
        self.url = MUB; self.final = MUB; self.status = 200
        self.body = html_listing(); self.id = '8396353'; self.price = 9000; self.area = 130
        self.extra = None; self.req_override = None; self.rec_override = None

    def write(self):
        key = hashlib.sha256(self.url.encode()).hexdigest()[:24]
        claim = {'case_key': key, 'source_url': self.url, 'source_offer_id_claim': self.id,
                 'admission_authorized': False}
        case = {'case_key': key, 'source_url': self.url, 'source_offer_id_claim': self.id,
                'source_domain': self.url.split('/')[2], 'http_status': self.status,
                'final_url': self.final, 'claimed_price_mad': self.price,
                'claimed_surface_m2': self.area, 'case_status': 'SOURCE_CONTENT_CONFLICT'}
        if self.req_override: claim.update(self.req_override)
        if self.rec_override: case.update(self.rec_override)
        base = 'dossier/'
        members = {
            base + 'evidence_requests_QUARANTINE.json': json.dumps({'cases': [claim], 'public_admission_authorized': False}),
            base + 'case_register_118.json': json.dumps([case]),
            base + 'audit_summary.json': json.dumps({'cases': 1, 'manual_review_required_total': 0}),
        }
        if self.status == 200:
            members[base + f'evidence/{key}/source.html'] = self.body
            members[base + f'evidence/{key}/source.manifest.json'] = json.dumps({
                'source_url': self.url, 'http_status': 200, 'bytes': len(self.body),
                'html_sha256': _sha(self.body), 'capture_method': 'explicit_single_page_https_get',
                'captured_at_utc': '2026-11-14T10:10:00Z'})
        else:
            members[base + f'response_quarantine/{key}/response.body'] = self.body
            members[base + f'response_quarantine/{key}/response.manifest.json'] = json.dumps({
                'source_url': self.url, 'final_url': self.final, 'http_status': 403,
                'bytes': len(self.body), 'sha256': _sha(self.body),
                'captured_at_utc': '2026-11-14T10:10:00Z'})
        if self.extra: members.update(self.extra)
        with ZipFile(self.archive, 'w', ZIP_DEFLATED) as z:
            for path, content in members.items(): z.writestr(path, content)
        return _sha(self.archive.read_bytes())

    def run_adjudicate(self):
        return adjudicate(self.archive, self.write(), self.out)

    def assert_one(self, category):
        report = self.run_adjudicate()
        self.assertEqual(report['total_cases'], 1)
        self.assertEqual(report['review_category_counts'], {category: 1})
        self.assertEqual(report['manual_review_required_for_admission'], 1)
        self.assertFalse(report['public_admission_authorized'])
        self.assertEqual(report['database_writes'], 0)
        self.assertEqual(report['network_requests'], 0)

    def test_unredirected_listing_matching_claims_still_not_certified(self):
        self.assert_one('CONTENT_ALIGNED_NOT_INDEPENDENTLY_AUTHENTICATED')
    def test_redirect_same_native_id_is_not_category(self):
        self.final = MUB_NEW; self.body = html_listing(MUB_NEW, 10000, 120)
        self.assert_one('REDIRECTED_LISTING_SAME_NATIVE_ID_UNVERIFIED')
    def test_redirect_to_category_has_no_offer(self):
        self.final = MUB_CAT; self.body = b'<html><title>Recherche</title></html>'
        self.assert_one('REDIRECTED_TO_CATEGORY_NO_OFFER')
    def test_unredirected_price_conflict_keeps_raw_claim(self):
        self.body = html_listing(MUB, 9300, 130)
        report = self.run_adjudicate()
        self.assertEqual(report['review_category_counts']['UNREDIRECTED_SOURCE_FIELD_CONFLICT'], 1)
        out = json.loads((self.out / 'cases_REVIEW_ONLY.json').read_text())[0]
        self.assertEqual(out['claimed_price_mad'], 9000)
        self.assertEqual(out['captured_jsonld_price_mad_UNVERIFIED'], 9300)
        self.assertIs(out['manual_review_required_for_admission'], True)
    def test_agenz_scoped_intra_page_conflict(self):
        self.url = self.final = AG; self.id = '169490'; self.price = 7500; self.area = 84
        self.body = ag_html()
        self.assert_one('AGENZ_INTRA_PAGE_PRICE_CONFLICT')
    def test_avito_403_stays_quarantined(self):
        self.url = self.final = AVI; self.id = '58917466'; self.status = 403
        self.body = b'Access denied'
        self.assert_one('ACCESS_BLOCKED_403_NO_SOURCE_PROOF')
    def test_wrong_archive_sha_fails_closed(self):
        self.write()
        with self.assertRaisesRegex(AdjudicationRejected, 'PINNED_ZIP_MISSING_OR_SHA256_MISMATCH'):
            adjudicate(self.archive, '0'*64, self.out)
        self.assertFalse(self.out.exists())
    def test_manifest_hash_tampered_rejected(self):
        pin = self.write()
        files = {}
        with ZipFile(self.archive) as z:
            for n in z.namelist(): files[n] = z.read(n)
        k = hashlib.sha256(self.url.encode()).hexdigest()[:24]
        path = f'dossier/evidence/{k}/source.manifest.json'
        bad = json.loads(files[path]); bad['html_sha256'] = 'f'*64
        files[path] = json.dumps(bad).encode()
        with ZipFile(self.archive, 'w', ZIP_DEFLATED) as z:
            for n, v in files.items(): z.writestr(n, v)
        with self.assertRaisesRegex(AdjudicationRejected, 'BAD_HTML_CAPTURE_INTEGRITY'):
            adjudicate(self.archive, _sha(self.archive.read_bytes()), self.out)
        self.assertFalse(self.out.exists())
    def test_case_key_mismatch_rejected(self):
        self.req_override = {'case_key': 'a'*24}
        with self.assertRaisesRegex(AdjudicationRejected, 'DUPLICATE_OR_UNPINNED_REQUEST'):
            self.run_adjudicate()
        self.assertFalse(self.out.exists())
    def test_registry_claim_id_disagreement_rejected(self):
        self.rec_override = {'source_offer_id_claim': '1111111'}
        with self.assertRaisesRegex(AdjudicationRejected, 'REGISTRY_REQUEST_IDENTITY_MISMATCH'):
            self.run_adjudicate()
    def test_pretended_admission_in_request_rejected(self):
        self.req_override = {'admission_authorized': True}
        with self.assertRaisesRegex(AdjudicationRejected, 'DUPLICATE_OR_UNPINNED_REQUEST'):
            self.run_adjudicate()
    def test_malicious_zip_traversal_rejected(self):
        self.extra = {'../evil.js': 'console.log(1)'}
        with self.assertRaisesRegex(AdjudicationRejected, 'UNSAFE_ZIP_MEMBER|INVALID_ARCHIVE_ROOT'):
            self.run_adjudicate()
    def test_report_must_have_same_count(self):
        self.write()
        files = {}
        with ZipFile(self.archive) as z:
            for n in z.namelist(): files[n] = z.read(n)
        files['dossier/audit_summary.json'] = json.dumps({'cases': 5}).encode()
        with ZipFile(self.archive, 'w', ZIP_DEFLATED) as z:
            for n, v in files.items(): z.writestr(n, v)
        with self.assertRaisesRegex(AdjudicationRejected, 'CASE_SET_DISAGREEMENT'):
            adjudicate(self.archive, _sha(self.archive.read_bytes()), self.out)
    def test_output_under_git_forbidden(self):
        repo = self.root / 'repo'; repo.mkdir(); (repo / '.git').mkdir()
        with self.assertRaisesRegex(AdjudicationRejected, 'OUTPUT_MUST_BE_NEW_AND_OUTSIDE_GIT'):
            adjudicate(self.archive, self.write(), repo / 'quarantine')
    def test_second_output_rejected_not_overwritten(self):
        pin = self.write(); adjudicate(self.archive, pin, self.out)
        with self.assertRaisesRegex(AdjudicationRejected, 'OUTPUT_MUST_BE_NEW_AND_OUTSIDE_GIT'):
            adjudicate(self.archive, pin, self.out)
    def test_declared_native_id_spoof_rejected_even_if_request_matches(self):
        self.id = '9999999'
        with self.assertRaisesRegex(AdjudicationRejected, 'REGISTRY_REQUEST_IDENTITY_MISMATCH'):
            self.run_adjudicate()
    def test_jsonld_redirects_to_different_source_id_stays_in_review(self):
        self.final = 'https://www.mubawab.ma/fr/a/1111111/other-page'
        self.body = html_listing(self.final, 8000, 66)
        self.assert_one('CAPTURE_CONTENT_INCOMPLETE_REVIEW')
    def test_jsonld_url_not_same_as_final_stays_in_review(self):
        self.final = MUB_NEW
        self.body = html_listing(MUB, 9000, 130)
        self.assert_one('CAPTURE_CONTENT_INCOMPLETE_REVIEW')
    def test_matching_listing_never_proves_availability(self):
        self.run_adjudicate()
        item = json.loads((self.out / 'cases_REVIEW_ONLY.json').read_text())[0]
        self.assertFalse(item['current_availability_verified'])
        self.assertFalse(item['independent_source_authenticity_verified'])
        self.assertFalse(item['physical_duplicate_confirmed'])
    def test_utf8_csv_export_has_header_and_case_key(self):
        self.run_adjudicate()
        with (self.out / 'cases_REVIEW_ONLY.csv').open(encoding='utf-8-sig', newline='') as file:
            r = list(csv.DictReader(file))
        self.assertEqual(len(r), 1)
        self.assertEqual(r[0]['corrected_review_category'], 'CONTENT_ALIGNED_NOT_INDEPENDENTLY_AUTHENTICATED')
    def test_no_listing_structured_evidence_is_not_validated(self):
        self.body = b'<html><head><title>Item</title></head></html>'
        self.assert_one('CAPTURE_CONTENT_INCOMPLETE_REVIEW')

if __name__ == '__main__': unittest.main()
