"""Offline only: genuine snapshot verifier imported from V7 at CI time."""
import hashlib
import html
import json
from pathlib import Path
import sys
import tempfile
import unittest

ACQUISITION = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ACQUISITION))
from v7_multisource.feenway_snapshot_links import review_feenway_snapshot, LinkEvidenceRejected

FEENWAY = 'https://www.feenway.com/listings/239051'
MUBAWAB = 'https://www.mubawab.ma/fr/a/8421954/villa-de-luxe-%C3%A0-vendre'
AVITO = 'https://www.avito.ma/fr/anfa/bureaux/Bureau_luxueux_58688662.htm'


def fixture(root, *, feenway=FEENWAY, upstream=MUBAWAB, label='Mubawab',
            canonical=None, extra='', og=None):
    if canonical is None:
        canonical = feenway
    if og is None:
        og = feenway
    s = (f'<!doctype html><html><head><link rel="canonical" href="{html.escape(canonical, quote=True)}">'
         f'<meta property="og:url" content="{html.escape(og, quote=True)}"></head>'
         f'<body><a href="{html.escape(upstream, quote=True)}"><span>Voir sur</span> {label}</a>{extra}</body></html>')
    b = s.encode('utf-8')
    folder = root / 'evidence'
    folder.mkdir()
    (folder / 'source.html').write_bytes(b)
    sha = hashlib.sha256(b).hexdigest()
    manifest = dict(schema_version='akarfinder-v7-raw-html-evidence-v1',
                    source_url=feenway, captured_at_utc='2026-11-13T11:01:00Z',
                    http_status=200, content_type='text/html; charset=utf-8',
                    html_sha256=sha, bytes=len(b), capture_method='explicit_single_page_https_get')
    (folder / 'source.manifest.json').write_text(json.dumps(manifest), encoding='utf-8')
    return folder, sha


class FeenwaySnapshotLinksTest(unittest.TestCase):
    def with_fixture(self, **kwargs):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        return fixture(Path(tmp.name), **kwargs)

    def test_mubawab_link_remains_quarantine(self):
        folder, sha = self.with_fixture()
        r = review_feenway_snapshot(folder=folder, expected_html_sha256=sha)
        self.assertEqual((r['feenway_offer_id'], r['upstream_offer_id_hint']), ('239051', '8421954'))
        self.assertEqual(r['upstream_domain_hint'], 'mubawab.ma')
        self.assertFalse(r['eligible_for_public_admission'])
        self.assertFalse(r['upstream_detail_checked'])
        self.assertEqual(r['db_writes'], 0)
        self.assertEqual(r['network_requests'], 0)

    def test_avito_link(self):
        folder, sha = self.with_fixture(upstream=AVITO, label='Avito')
        self.assertEqual(review_feenway_snapshot(folder=folder, expected_html_sha256=sha)['upstream_offer_id_hint'], '58688662')

    def test_canonical_from_other_listing_rejected(self):
        folder, sha = self.with_fixture(canonical='https://www.feenway.com/listings/239052')
        with self.assertRaisesRegex(LinkEvidenceRejected, 'CANONICAL_MISMATCH'):
            review_feenway_snapshot(folder=folder, expected_html_sha256=sha)

    def test_og_from_other_listing_rejected(self):
        folder, sha = self.with_fixture(og='https://www.feenway.com/listings/239052')
        with self.assertRaisesRegex(LinkEvidenceRejected, 'CANONICAL_MISMATCH'):
            review_feenway_snapshot(folder=folder, expected_html_sha256=sha)

    def test_wrong_sha_rejected(self):
        folder, sha = self.with_fixture()
        with self.assertRaisesRegex(LinkEvidenceRejected, 'PIN_MISMATCH'):
            review_feenway_snapshot(folder=folder, expected_html_sha256='a'*64)

    def test_two_source_links_rejected(self):
        folder, sha = self.with_fixture(extra=f'<a href="{AVITO}">Voir sur Avito</a>')
        with self.assertRaisesRegex(LinkEvidenceRejected, 'UNIQUE_ORIGINAL_ANCHOR'):
            review_feenway_snapshot(folder=folder, expected_html_sha256=sha)

    def test_brand_mismatch_rejected(self):
        folder, sha = self.with_fixture(label='Avito')
        with self.assertRaisesRegex(LinkEvidenceRejected, 'LABEL_HOST_CONFLICT'):
            review_feenway_snapshot(folder=folder, expected_html_sha256=sha)

    def test_host_spoof_rejected(self):
        folder, sha = self.with_fixture(upstream='https://mubawab.ma.attacker.com/fr/a/8421954/x')
        with self.assertRaisesRegex(LinkEvidenceRejected, 'UNSAFE_UPSTREAM_URL'):
            review_feenway_snapshot(folder=folder, expected_html_sha256=sha)

    def test_sarouty_query_parameters_rejected(self):
        folder, sha = self.with_fixture(upstream='https://sarouty.ma/property-details/?listing_id=896796&x=1', label='Sarouty')
        with self.assertRaisesRegex(LinkEvidenceRejected, 'UNSAFE_UPSTREAM_QUERY'):
            review_feenway_snapshot(folder=folder, expected_html_sha256=sha)

    def test_sarouty_single_id_query_remains_quarantine(self):
        folder, sha = self.with_fixture(upstream='https://sarouty.ma/property-details/?listing_id=896796', label='Sarouty')
        r = review_feenway_snapshot(folder=folder, expected_html_sha256=sha)
        self.assertEqual(r['upstream_offer_id_hint'], '896796')
        self.assertFalse(r['eligible_for_radar10_private_staging'])

    def test_masaken_source_period_not_proven(self):
        folder, sha = self.with_fixture(upstream='https://www.masaken.ma/fr/immobilier-maroc/location-villa-marrakech/14564', label='Masaken')
        r = review_feenway_snapshot(folder=folder, expected_html_sha256=sha)
        self.assertEqual(r['upstream_offer_id_hint'], '14564')
        self.assertFalse(r['upstream_price_or_period_verified'])

    def test_agenz_rent_is_not_admitted(self):
        folder, sha = self.with_fixture(upstream='https://agenz.ma/fr/annonces/immo-marrakech/location-appartements/route-de-casablanca/169490', label='Agenz')
        r = review_feenway_snapshot(folder=folder, expected_html_sha256=sha)
        self.assertEqual(r['upstream_domain_hint'], 'agenz.ma')
        self.assertFalse(r['eligible_for_public_admission'])


if __name__ == '__main__':
    unittest.main()
