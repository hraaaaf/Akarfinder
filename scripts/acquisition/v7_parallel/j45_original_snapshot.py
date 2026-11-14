"""J4/J5 evidence gate over actual L8 URL identity and raw HTML L4/V3 replay.
Strictly read-only. An externally supplied SHA pin is not an authenticated registry.
"""
from __future__ import annotations
import json
from pathlib import Path
from html.parser import HTMLParser
import re
import subprocess
import sys

ACQUISITION = Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ACQUISITION))
from v7_multisource.legacy_url_intake import _validate, UrlOnlyContractError
from v7_multisource.snapshot_evidence import verify_evidence, offline_benchmark

LANES={"j4": frozenset(("avito.ma","sarouty.ma")),
       "j5": frozenset(("mubawab.ma","marocannonces.com"))}
CHECKER=Path(__file__).with_name("j45_l8_identity.mjs")
SHA=re.compile(r"^[0-9a-f]{64}$")

class OriginalSnapshotRejected(ValueError):
    pass

class _HeadSourceIdentity(HTMLParser):
    """Only source-document HEAD metadata, never body links or generated URLs."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.in_head = False
        self.canonical = []
        self.og_url = []

    def handle_starttag(self, tag, attrs):
        if tag == "head":
            self.in_head = True
        if not self.in_head:
            return
        values = dict(attrs)
        if tag == "link" and "canonical" in (values.get("rel") or "").lower().split():
            self.canonical.append(values.get("href"))
        if tag == "meta" and (values.get("property") or "").lower() == "og:url":
            self.og_url.append(values.get("content"))

    def handle_endtag(self, tag):
        if tag == "head":
            self.in_head = False


def _check_self_declared_source_url(html: str, expected: str) -> dict:
    """Self-declared canonical corroboration, NOT trusted capture authenticity."""
    parsed = _HeadSourceIdentity()
    try:
        parsed.feed(html)
        parsed.close()
    except (ValueError, TypeError) as exc:
        raise OriginalSnapshotRejected("HTML_SOURCE_METADATA_INVALID") from exc
    if not parsed.canonical:
        raise OriginalSnapshotRejected("HTML_CANONICAL_URL_MISSING")
    all_urls = parsed.canonical + parsed.og_url
    if any(not isinstance(value, str) or value != expected for value in all_urls):
        raise OriginalSnapshotRejected("HTML_SOURCE_URL_CONFLICT")
    return {
        "html_canonical_url_matches_candidate": True,
        "html_og_url_matches_candidate": bool(parsed.og_url),
        "self_declaration_is_independent_proof": False,
    }


def _real_l8_identity(domain:str,url:str)->dict:
    try:
        run=subprocess.run(
            ["node",str(CHECKER)],
            input=json.dumps({"source_domain":domain,"source_url":url}),
            cwd=ACQUISITION.parents[1], text=True,
            capture_output=True, check=False, timeout=10)
    except (OSError,subprocess.TimeoutExpired) as exc:
        raise OriginalSnapshotRejected("L8_OFFLINE_VALIDATOR_UNAVAILABLE") from exc
    if run.returncode!=0 or len(run.stdout)>1500:
        raise OriginalSnapshotRejected("L8_SOURCE_ID_REJECTED")
    try:
        return json.loads(run.stdout)
    except (json.JSONDecodeError,TypeError) as exc:
        raise OriginalSnapshotRejected("L8_RESPONSE_INVALID") from exc

def review_original_snapshot(*,lane:str,candidate:dict,folder:Path,expected_html_sha256:str)->dict:
    """The field comparison can contain nulls and does NOT prove accuracy."""
    if lane not in LANES:
        raise OriginalSnapshotRejected("LANE_NOT_SUPPORTED")
    try:
        domain,offer,url=_validate(candidate)
    except UrlOnlyContractError as exc:
        raise OriginalSnapshotRejected("URL_ONLY_SAFETY_CONTRACT_FAILED") from exc
    if domain not in LANES[lane]:
        raise OriginalSnapshotRejected("LANE_SOURCE_MISMATCH")
    if not isinstance(expected_html_sha256,str) or not SHA.fullmatch(expected_html_sha256):
        raise OriginalSnapshotRejected("EXTERNAL_SHA_PIN_REQUIRED")
    l8=_real_l8_identity(domain,url)
    if (l8.get("source_domain")!=domain or l8.get("source_offer_id")!=offer or
        l8.get("source_url")!=url or l8.get("record_kind")!="url_candidate_only" or
        l8.get("detail_observed") is not False or
        l8.get("eligible_for_private_detail_staging") is not False or
        l8.get("eligible_for_public_admission") is not False):
        raise OriginalSnapshotRejected("SOURCE_URL_ID_CONTRADICTION")
    if not isinstance(folder,Path):
        raise OriginalSnapshotRejected("PRIVATE_FOLDER_REQUIRED")
    evidence=verify_evidence(folder/"source.html",folder/"source.manifest.json")
    manifest=evidence["manifest"]
    if manifest["source_url"]!=url:
        raise OriginalSnapshotRejected("CAPTURE_URL_MISMATCH")
    if manifest["html_sha256"]!=expected_html_sha256:
        raise OriginalSnapshotRejected("CAPTURE_PIN_MISMATCH")
    replay=offline_benchmark(folder/"source.html",folder/"source.manifest.json")
    # A valid offer URL may return a CAPTCHA/challenge/non-listing HTML.
    # Do not infer a detail page from the URL pattern alone.
    reasons=set(replay["l4_classification_reasons"])
    if (replay["l4_page_kind"]!="listing_detail" or
        not reasons.intersection({"structured_listing_type","listing_fact_density"}) or
        replay["v3_quality_status"]=="source_snippet_only"):
        raise OriginalSnapshotRejected("ORIGINAL_HTML_NOT_LISTING_DETAIL")
    self_identity = _check_self_declared_source_url(evidence["raw_html"], url)
    fields=replay["field_comparison"]
    if set(fields)!={"title","price_mad","surface_total_m2","city","district",
                    "property_type","transaction_type"}:
        raise OriginalSnapshotRejected("SEVEN_FIELDS_REQUIRED")
    return {
        "lane":lane, "source_domain":domain,"source_offer_id":offer,"source_url":url,
        "html_sha256_verified":manifest["html_sha256"],"capture_utc":manifest["captured_at_utc"],
        "l8_source_url_identity_matched":True,
        "source_html_self_declaration": self_identity,
        "l4_v3_fields":fields,
        "conflicting_nonempty_fields":replay["conflicting_nonempty_fields"],
        "external_pin_registry_authenticated":False,
        "independent_field_labels_verified":False,
        "physical_uniqueness_verified":False,"source_activity_verified":False,
        "editorial_publication_date_verified":False,"availability_verified":False,
        "eligible_for_private_detail_staging":False,
        "eligible_for_public_admission":False,"source_network_requests":0,"db_writes":0
    }
