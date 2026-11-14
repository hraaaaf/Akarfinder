"""Synthetic single-record WARC tests only. No network, no DB."""
import base64
from datetime import datetime,timezone
import gzip
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from v7_parallel.j5_commoncrawl_warc_evidence import inspect_record, ArchiveRejected,check_index,download_one_warc

URL='https://www.mubawab.ma/fr/a/8205911/appartement-de-106m2-bouskoura-ville-verte'
HTML=b'<!DOCTYPE html><html><head><title>Appartement a vendre</title></head><body><h1>Annonce</h1></body></html>'
BASE_INDEX={'crawl':'CC-MAIN-2026-39','timestamp':'20260905210142','url':URL,
            'status':'200','mime':'text/html','digest':'', 'length':0,'offset':767799442,
            'filename':'crawl-data/CC-MAIN-2026-39/segments/1788492699608.30/warc/CC-MAIN-20260905194534-20260905224534-00967.warc.gz'}

def fixture(html=HTML,url=URL,warc_date='2026-09-05T21:01:42Z',http_status=200,
            repeated_headers=False, duplicate_critical=False):
    sha1=base64.b32encode(hashlib.sha1(html).digest()).decode().rstrip('=')
    extra_http=('Set-Cookie: key=a\r\nSet-Cookie: key=b\r\n' if repeated_headers else '')
    http=(f'HTTP/1.1 {http_status} OK\r\nContent-Type: text/html; charset=UTF-8\r\n'+extra_http+'\r\n').encode()+html
    extra_warc=('WARC-Protocol: h2\r\nWARC-Protocol: tls/1.2\r\n' if repeated_headers else '')
    critical=('WARC-Target-URI: '+url+'\r\n' if duplicate_critical else '')
    warc=(f'WARC/1.1\r\nWARC-Type: response\r\nWARC-Target-URI: {url}\r\n'+critical+extra_warc+
          f'WARC-Date: {warc_date}\r\nWARC-Payload-Digest: sha1:{sha1}\r\n'
          f'Content-Length: {len(http)}\r\nContent-Type: application/http; msgtype=response\r\n\r\n').encode()+http+b'\r\n\r\n'
    compressed=gzip.compress(warc,mtime=0)
    return compressed,dict(BASE_INDEX,length=len(compressed),digest=sha1)

class CommonCrawlSourceTests(unittest.TestCase):
    def test_good_historical_record_never_admitted(self):
        raw,index=fixture()
        report,body=inspect_record(raw,index)
        self.assertEqual(body,HTML)
        self.assertTrue(report['warc_sha1_payload_index_match'])
        self.assertEqual(report['archived_http_status'],200)
        self.assertEqual(report['source_offer_id'],'8205911')
        self.assertEqual(report['archived_at_utc'],'2026-09-05T21:01:42Z')
        self.assertEqual(report['html_sha256'],hashlib.sha256(HTML).hexdigest())
        self.assertFalse(report['independent_current_activity_verified'])
        self.assertFalse(report['eligible_for_private_detail_staging'])
        self.assertFalse(report['eligible_for_public_admission'])
        self.assertEqual(report['db_writes'],0)
    def test_index_url_host_or_id_attack_rejected(self):
        raw,index=fixture()
        for url in (URL.replace('mubawab.ma','evil-mubawab.ma'),
                    URL.replace('8205911','8205912'),URL+'?utm=1','http:'+URL[6:]):
            with self.subTest(url=url):
                with self.assertRaises(ArchiveRejected):
                    inspect_record(raw,dict(index,url=url))
    def test_source_identity_warc_vs_index_rejected(self):
        raw,index=fixture(url=URL.replace('8205911','8205912'))
        with self.assertRaisesRegex(ArchiveRejected,'WARC_SOURCE_IDENTITY_MISMATCH'):
            inspect_record(raw,index)
    def test_index_digest_tampering_rejected(self):
        raw,index=fixture()
        with self.assertRaisesRegex(ArchiveRejected,'WARC_PAYLOAD_DIGEST_MISMATCH'):
            inspect_record(raw,dict(index,digest='A'*32))
    def test_payload_invalid_status_rejected(self):
        raw,index=fixture(http_status=403)
        with self.assertRaisesRegex(ArchiveRejected,'ARCHIVED_HTTP_NOT_200'):
            inspect_record(raw,index)
    def test_wrong_gzip_byte_count_rejected(self):
        raw,index=fixture()
        with self.assertRaisesRegex(ArchiveRejected,'WARC_GZIP_RANGE_MISMATCH'):
            inspect_record(raw[:-1],index)
    def test_invalid_utf8_rejected(self):
        raw,index=fixture(html=b'<!DOCTYPE html><p>\xff</p>')
        with self.assertRaisesRegex(ArchiveRejected,'ARCHIVED_UTF8_INVALID'):
            inspect_record(raw,index)
    def test_html_looks_like_challenge_but_archived_not_detail(self):
        raw,index=fixture(html=b'<!DOCTYPE html><html><title>Captcha</title></html>')
        report,body=inspect_record(raw,index)
        self.assertEqual(body,b'<!DOCTYPE html><html><title>Captcha</title></html>')
        self.assertFalse(report['eligible_for_private_detail_staging'])
    def test_bad_timestamp_does_not_erase_archive_uncertainty(self):
        raw,index=fixture(warc_date='2026-09-06T21:01:42Z')
        with self.assertRaisesRegex(ArchiveRejected,'WARC_CAPTURE_TIME_CONFLICT'):
            inspect_record(raw,index)
    def test_repeated_noncritical_warc_protocol_and_cookies_allowed(self):
        # Real Common Crawl WARC #8205911 repeats WARC-Protocol, and the
        # archived HTTP reply repeats Set-Cookie; neither is identity.
        raw,index=fixture(repeated_headers=True)
        report,body=inspect_record(raw,index)
        self.assertTrue(report['warc_sha1_payload_index_match'])
        self.assertEqual(body,HTML)
        self.assertFalse(report['eligible_for_private_detail_staging'])

    def test_duplicate_critical_warc_target_rejected(self):
        raw,index=fixture(duplicate_critical=True)
        with self.assertRaisesRegex(ArchiveRejected,'WARC_HEADER_DUPLICATE_OR_INVALID'):
            inspect_record(raw,index)

    def test_no_network_without_approval(self):
        raw,index=fixture()
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaisesRegex(ArchiveRejected,'COMMONCRAWL_NETWORK_NOT_APPROVED'):
                download_one_warc(index,Path(tmp)/'no-capture')
    def test_invalid_index_range_cannot_create_external_request(self):
        raw,index=fixture()
        for altered in ({'offset':-1},{'length':900000},
                        {'filename':'../../evil.warc.gz'}, {'mime':'application/json'}):
            with self.subTest(altered=altered):
                with self.assertRaises(ArchiveRejected): check_index(dict(index,**altered))

if __name__=='__main__': unittest.main()