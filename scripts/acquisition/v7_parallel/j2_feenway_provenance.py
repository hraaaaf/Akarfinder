"""J2 FeenWay mirror provenance — OFFLINE source evidence contract.

A mirror ID is NOT the original portal ID. A source badge is NOT an
upstream hyperlink. We accept only a single explicit original-page link,
never certify it as a fetched/current page, and never stage or publish.
"""
from __future__ import annotations
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote_to_bytes
import re

SCHEMA = "akarfinder-v7-parallel-source-v1"
MIRROR_RE = re.compile(r"/listings/([0-9]{3,12})/?\Z")
ORIGINS = frozenset(("mubawab.ma", "avito.ma", "sarouty.ma", "agenz.ma"))
CTA_RE = re.compile(r"(?:visiter|voir)\s+(?:le\s+)?(?:site\s+de\s+l['’]annonce|l['’]annonce\s+originale)|voir\s+sur\s+(?:mubawab|avito|sarouty|agenz)", re.I)


class ProvenanceError(ValueError):
    pass


class _Links(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.links = []
        self.current = None

    def handle_starttag(self, tag, attrs):
        if tag == "a":
            self.current = {"href": dict(attrs).get("href", ""), "text": ""}

    def handle_data(self, data):
        if self.current is not None:
            self.current["text"] += data

    def handle_endtag(self, tag):
        if tag == "a" and self.current is not None:
            self.links.append(self.current)
            self.current = None


def _url(value: str, hosts: frozenset[str]) -> tuple[str, str, str]:
    if not isinstance(value, str) or not 20 <= len(value) <= 2048:
        raise ProvenanceError("URL_INVALID")
    try:
        p = urlsplit(value)
        port = p.port
    except ValueError as exc:
        raise ProvenanceError("URL_INVALID") from exc
    host = p.hostname or ""
    bare = host[4:] if host.startswith("www.") else host
    if (p.scheme != "https" or bare not in hosts
        or p.username or p.password or port is not None or p.fragment
        or not p.path.startswith("/") or "//" in p.path
        or "\\" in p.path
        or p.netloc not in (host,) or p.query):
        raise ProvenanceError("URL_UNSAFE")
    # FeenWay links contain percent-encoded UTF-8 accents; prevent encoded
    # ASCII slashes, controls and percent-escape ambiguity.
    if re.search(r"%(?![0-9a-fA-F]{2})", p.path):
        raise ProvenanceError("BAD_PERCENT_ESCAPE")
    for part in re.findall(r"%([0-9a-fA-F]{2})", p.path):
        if int(part, 16) < 0x80:
            raise ProvenanceError("ENCODED_ASCII_BLOCKED")
    try:
        decoded = unquote_to_bytes(p.path).decode("utf-8")
    except UnicodeError as exc:
        raise ProvenanceError("BAD_UTF8_URL") from exc
    if any(ord(c) < 32 for c in decoded) or "\\" in decoded:
        raise ProvenanceError("URL_UNSAFE")
    return bare, p.path.rstrip("/"), value


def _original_identity(url: str) -> tuple[str, str] | None:
    try:
        domain, path, _ = _url(url, ORIGINS)
    except ProvenanceError:
        return None
    pats = {
        "mubawab.ma": r"/fr/(?:a|pa)/([0-9]{5,12})(?:/[^/]*)?",
        "avito.ma": r"/fr/[^/]+/(?:appartements|villas_et_riads|maisons|terrains_et_fermes|bureaux)/[^/]*_([0-9]{7,9})\.htm",
        "sarouty.ma": r"/fr/plp/(?:acheter|louer)/[^/]*-([0-9]{5,9})(?:\.html)?",
        "agenz.ma": r"/fr/annonces/immo-[a-z0-9-]+/(?:vente|location)-[^/]+/[^/]+/([0-9]{5,12})",
    }
    m = re.fullmatch(pats[domain], path, flags=re.I)
    if domain == "agenz.ma" and not m:
        m = re.fullmatch(
            r"/(?:fr/)?annonces-achat/appartement/[a-z0-9-]+/[a-z0-9-]+/[a-z0-9-]+/appartement-a-vendre-([0-9]{5,12})",
            path,
        )
    return (domain, m.group(1)) if m else None


def analyze_feenway_mirror(mirror_url: str, supplied_html: str) -> dict:
    domain, path, _ = _url(mirror_url, frozenset(("feenway.com",)))
    mid = MIRROR_RE.fullmatch(path)
    if domain != "feenway.com" or mid is None:
        raise ProvenanceError("INDIVIDUAL_MIRROR_REQUIRED")
    if not isinstance(supplied_html, str) or not supplied_html.lstrip().startswith("<") or len(supplied_html) > 2_000_000:
        raise ProvenanceError("HTML_REQUIRED")
    links = _Links()
    links.feed(supplied_html)
    ctas = [x["href"] for x in links.links if CTA_RE.search(x["text"])]
    identities = {}
    for candidate in ctas:
        origin = _original_identity(candidate)
        if origin is not None:
            identities.setdefault(origin, set()).add(candidate)
    unique = len(identities) == 1 and len(ctas) >= 1 and len(identities[next(iter(identities))]) == 1
    resolved = next(iter(identities)) if unique else None
    candidate_url = next(iter(identities[resolved])) if resolved else None
    return {
        "schema_version": SCHEMA,
        "mirror_source": "feenway.com",
        "mirror_id": mid.group(1),
        "mirror_url": mirror_url,
        "origin_portal": resolved[0] if resolved else None,
        "origin_offer_id": resolved[1] if resolved else None,
        "origin_url_claimed_by_mirror": candidate_url,
        "link_appears_in_supplied_html": bool(candidate_url),
        "origin_page_independently_verified": False,
        "physical_uniqueness_verified": False,
        "eligible_for_private_detail_staging": False,
        "eligible_for_public_admission": False,
        "mirror_is_new_property": False,
        "status": "origin_link_observed_unverified" if resolved else
                  ("ambiguous_origin" if len(identities) > 1 else "origin_not_proven"),
        "source_network_requests": 0,
        "db_writes": 0,
    }
