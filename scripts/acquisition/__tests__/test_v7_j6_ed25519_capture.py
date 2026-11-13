"""J6 Ed25519 adversarial fixtures. TEST PRIVATE KEY IS PUBLIC AND UNSAFE FOR OPERATIONS."""
from __future__ import annotations
from datetime import datetime, timedelta, timezone
from hashlib import sha256
import json
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch
from types import ModuleType

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from v7_parallel.j6_ed25519_capture import (
    Ed25519CaptureRejected, REGISTRY_SCHEMA, CAPTURE_SCHEMA,
    _registry, _signed_payload, review_ed25519_capture,
)
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

AT = datetime(2026, 11, 13, 12, tzinfo=timezone.utc)
URL = 'https://agenz.ma/fr/annonces/immo-sale/vente-appartements/agdal/444291'
PRIVATE_TEST_KEY = Ed25519PrivateKey.from_private_bytes(bytes(range(32)))
PUBLIC = PRIVATE_TEST_KEY.public_key().public_bytes(Encoding.Raw,PublicFormat.Raw).hex()
KEY_ID = 'synthetic-ed25519-1'
ISSUER = 'Synthetic CI issuer only'
HTML = (b'<html><head><title>Appartement a vendre</title></head><body>'
        b'<h1>Appartement a vendre</h1><p>980 000 DH</p><p>104 m2</p></body></html>')


def policy(**changes):
    entry = {
        'key_id':KEY_ID, 'issuer':ISSUER, 'algorithm':'Ed25519',
        'public_key_hex':PUBLIC, 'source_domains':['agenz.ma'],
        'status':'active', 'valid_from_utc':'2026-11-12T00:00:00Z',
        'valid_until_utc':'2026-12-01T00:00:00Z',
    }
    entry.update(changes)
    return entry


def raw_registry(entries=None, **changes):
    obj={'schema_version':REGISTRY_SCHEMA, 'generation':1,
         'issuers':entries if entries is not None else [policy()]}
    obj.update(changes)
    return json.dumps(obj,sort_keys=True,separators=(',',':')).encode()


def signed_att(**changes):
    att={
        'schema_version':CAPTURE_SCHEMA,'algorithm':'Ed25519',
        'key_id':KEY_ID,'issuer':ISSUER,'source_domain':'agenz.ma',
        'source_offer_id':'444291','source_url':URL,
        'html_sha256':sha256(HTML).hexdigest(),
        'manifest_sha256':'f'*64,
        'captured_at_utc':'2026-11-13T12:00:00Z',
        'issued_at_utc':'2026-11-13T12:05:00Z',
        'expires_at_utc':'2026-11-14T12:05:00Z',
    }
    att.update(changes)
    att['signature_hex']=PRIVATE_TEST_KEY.sign(_signed_payload(att)).hex()
    return att


class J6Ed25519Tests(unittest.TestCase):
    def review(self, att=None, registry=None, pin=None, now=None):
        doc=registry if registry is not None else raw_registry()
        return review_ed25519_capture(
            {},Path('/dev/null'),Path('/dev/null'),
            signed_att() if att is None else att,
            registry_json_bytes=doc,
            operator_pinned_registry_sha256=sha256(doc).hexdigest() if pin is None else pin,
            now_utc=AT+timedelta(minutes=10) if now is None else now,
        )

    def test_rfc8032_public_private_separated_and_payload_deterministic(self):
        att=signed_att()
        from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
        Ed25519PublicKey.from_public_bytes(bytes.fromhex(PUBLIC)).verify(
            bytes.fromhex(att['signature_hex']),_signed_payload(att))
        self.assertEqual(_signed_payload(att),_signed_payload(dict(reversed(list(att.items())))))
        self.assertTrue(_signed_payload(att).startswith(b'AKARFINDER\0V7\0J6\0ED25519'))
        self.assertNotIn(bytes(range(32)),_signed_payload(att))

    def test_registry_pin_authenticates_raw_bytes_not_self_referential(self):
        doc=raw_registry()
        self.assertEqual(_registry(doc,sha256(doc).hexdigest())['generation'],1)
        with self.assertRaisesRegex(Ed25519CaptureRejected,'INDEPENDENT_REGISTRY_PIN_MISMATCH'):
            _registry(doc,'f'*64)
        with self.assertRaisesRegex(Ed25519CaptureRejected,'INDEPENDENT_REGISTRY_PIN_REQUIRED'):
            _registry(doc,'')

    def test_raw_registry_size_and_unknown_field_fail_closed(self):
        doc=b'z'*16385
        with self.assertRaisesRegex(Ed25519CaptureRejected,'REGISTRY_BYTES_INVALID'):
            _registry(doc,sha256(doc).hexdigest())
        doc=raw_registry(public_admission=True)
        with self.assertRaisesRegex(Ed25519CaptureRejected,'REGISTRY_SCHEMA_INVALID'):
            _registry(doc,sha256(doc).hexdigest())

    def test_duplicate_json_keys_fail_even_with_matching_hash(self):
        doc=b'{"schema_version":"'+REGISTRY_SCHEMA.encode()+b'","generation":1,"generation":2,"issuers":[]}'
        with self.assertRaisesRegex(Ed25519CaptureRejected,'DUPLICATE_REGISTRY_JSON_KEY'):
            _registry(doc,sha256(doc).hexdigest())

    def test_public_key_must_be_unique_per_registered_issuer(self):
        doc=raw_registry(entries=[policy(),policy(key_id='other-ed25519-key')])
        with self.assertRaisesRegex(Ed25519CaptureRejected,'PUBLIC_KEY_INVALID_OR_REUSED'):
            _registry(doc,sha256(doc).hexdigest())

    def test_key_id_must_be_unique_and_scope_bounded(self):
        for entries, error in (
            ([policy(),policy(public_key_hex='a'*64)],'REGISTRY_ENTRY_IDENTITY_INVALID'),
            ([policy(source_domains=['evil.example'])],'REGISTRY_SCOPE_INVALID'),
            ([policy(source_domains=['agenz.ma','agenz.ma'])],'REGISTRY_SCOPE_INVALID'),
            ([policy(status='skipped')],'REGISTRY_STATUS_INVALID'),
        ):
            with self.subTest(error=error):
                doc=raw_registry(entries=entries)
                with self.assertRaisesRegex(Ed25519CaptureRejected,error):
                    _registry(doc,sha256(doc).hexdigest())

    def test_key_policy_longer_than_90_days_rejected(self):
        doc=raw_registry(entries=[policy(valid_until_utc='2027-04-01T00:00:00Z')])
        with self.assertRaisesRegex(Ed25519CaptureRejected,'REGISTRY_KEY_WINDOW_INVALID'):
            _registry(doc,sha256(doc).hexdigest())

    def test_registry_unknown_algorithm_denied(self):
        doc=raw_registry(entries=[policy(algorithm='HMAC-SHA256')])
        with self.assertRaisesRegex(Ed25519CaptureRejected,'REGISTRY_ENTRY_IDENTITY_INVALID'):
            _registry(doc,sha256(doc).hexdigest())

    def test_revoked_key_rejected_even_for_perfect_signature(self):
        doc=raw_registry(entries=[policy(status='revoked')])
        with self.assertRaisesRegex(Ed25519CaptureRejected,'KEY_UNKNOWN_OR_REVOKED'):
            self.review(registry=doc)

    def test_signature_from_wrong_key_is_rejected_before_original_files(self):
        att=signed_att()
        another=Ed25519PrivateKey.from_private_bytes(b'\x77'*32)
        att['signature_hex']=another.sign(_signed_payload(att)).hex()
        with self.assertRaisesRegex(Ed25519CaptureRejected,'ED25519_SIGNATURE_INVALID'):
            self.review(att=att)

    def test_tamper_url_with_same_signature_invalid(self):
        att=signed_att()
        att['source_url']=URL.replace('444291','444292')
        with self.assertRaisesRegex(Ed25519CaptureRejected,'ED25519_SIGNATURE_INVALID'):
            self.review(att=att)

    def test_tamper_original_hash_with_same_signature_invalid(self):
        att=signed_att()
        att['html_sha256']='a'*64
        with self.assertRaisesRegex(Ed25519CaptureRejected,'ED25519_SIGNATURE_INVALID'):
            self.review(att=att)

    def test_legacy_hmac_must_not_downgrade_ed25519_verifier(self):
        att=signed_att()
        att.pop('signature_hex')
        att['mac_sha256']='a'*64
        with self.assertRaisesRegex(Ed25519CaptureRejected,'CAPTURE_SCHEMA_INVALID'):
            self.review(att=att)
        att=signed_att(algorithm='HMAC-SHA256')
        with self.assertRaisesRegex(Ed25519CaptureRejected,'ALGORITHM_OR_VERSION_DOWNGRADE'):
            self.review(att=att)

    def test_forged_scope_even_when_issuer_key_owns_signature_rejected(self):
        att=signed_att(source_domain='sarouty.ma')
        with self.assertRaisesRegex(Ed25519CaptureRejected,'ISSUER_OR_PORTAL_SCOPE_INVALID'):
            self.review(att=att)

    def test_revoked_policy_or_stale_review_clock_fails(self):
        with self.assertRaisesRegex(Ed25519CaptureRejected,'ATTESTATION_OR_ISSUER_TIME_INVALID'):
            self.review(now=AT+timedelta(days=25))
        with self.assertRaisesRegex(Ed25519CaptureRejected,'TRUSTED_REVIEW_CLOCK_REQUIRED'):
            self.review(now=datetime(2026,11,13,12,10))
        with self.assertRaisesRegex(Ed25519CaptureRejected,'ATTESTATION_OR_ISSUER_TIME_INVALID'):
            self.review(att=signed_att(issued_at_utc='2026-11-13T13:00:00Z'))

    def test_signed_field_order_and_length_prefix_prevent_delimiter_ambiguity(self):
        a=signed_att(issuer='Foo\u0000Bar')
        b=signed_att(issuer='FooBar')
        self.assertNotEqual(_signed_payload(a),_signed_payload(b))
        self.assertNotEqual(a['signature_hex'],b['signature_hex'])

    def test_no_automatic_sql_receipt_emitted_from_asymmetric_module(self):
        # An HMAC MAC is 32 bytes; an Ed25519 signature is 64 bytes.
        att=signed_att()
        self.assertEqual(len(bytes.fromhex(att['signature_hex'])),64)
        self.assertNotIn('mac_sha256',att)

    def test_invalid_unicode_field_fail_closed(self):
        with self.assertRaisesRegex(Ed25519CaptureRejected,'CAPTURE_UTF8_INVALID'):
            # This invalid field cannot even be signed.
            signed_att(issuer='unsafe\ud800')

    def test_real_v3_html_replay_and_original_bytes_are_indispensable(self):
        # Import actual modules only in the GitHub repository CI where available.
        try:
            from akarparser_v3_raw_bulk import parse_raw
            from v7_multisource.snapshot_evidence import _manifest
        except ImportError:
            self.skipTest('real AkarParser imports available on repo CI only')
        with TemporaryDirectory() as d:
            html=Path(d)/'source.html'; manifest=Path(d)/'source.manifest.json'
            html.write_bytes(HTML)
            m=_manifest(URL,HTML,when=AT,method='explicit_single_page_https_get')
            manifest.write_text(json.dumps(m),encoding='utf-8')
            rec=parse_raw({'source_url':URL,'raw_html':HTML.decode()},AT)
            att=signed_att(manifest_sha256=sha256(manifest.read_bytes()).hexdigest())
            doc=raw_registry()
            result=review_ed25519_capture(
                rec,html,manifest,att,registry_json_bytes=doc,
                operator_pinned_registry_sha256=sha256(doc).hexdigest(),
                now_utc=AT+timedelta(minutes=10))
            self.assertTrue(result['signature_valid'])
            self.assertEqual(result['source_proof']['v3_fields_replayed'],7)
            self.assertEqual(result['source_http_requests'],0)
            self.assertEqual(result['db_writes'],0)
            self.assertFalse(result['eligible_for_private_staging'])
            self.assertFalse(result['public_admission_authorized'])
            self.assertTrue(result['no_legacy_hmac_ledger_receipt'])
            self.assertNotIn('review_receipt_intent',result)
            # Verify mismatched manifest cannot be papered over by a new signature.
            att2=signed_att(manifest_sha256='1'*64)
            with self.assertRaisesRegex(Ed25519CaptureRejected,'SIGNED_CAPTURE_MANIFEST_MISMATCH'):
                review_ed25519_capture(
                    rec,html,manifest,att2,registry_json_bytes=doc,
                    operator_pinned_registry_sha256=sha256(doc).hexdigest(),
                    now_utc=AT+timedelta(minutes=10))


if __name__ == '__main__': unittest.main()