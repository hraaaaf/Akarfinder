#!/usr/bin/env python3
"""Strict identity guard for Avito detail URLs.

A requested ``..._<id>.htm`` URL is not considered a live listing merely because
it has a detail-looking path. Avito can redirect expired/stale detail URLs to a
catalog/search surface. In that case the requested listing identity is no longer
proven and the page must not be parsed as that listing.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, asdict
from urllib.parse import urlparse

AVITO_HOSTS = {"avito.ma", "www.avito.ma"}
AVITO_ID_RE = re.compile(r"_(\d{7,9})\.htm$", re.I)


@dataclass(frozen=True)
class AvitoIdentityVerdict:
    is_avito: bool
    expected_id: str | None
    final_id: str | None
    identity_verified: bool
    reason: str
    requested_url: str
    final_url: str

    def to_dict(self) -> dict[str, object]:
        return asdict(self)


def extract_avito_id(url: str) -> str | None:
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()
    if host not in AVITO_HOSTS:
        return None
    match = AVITO_ID_RE.search(parsed.path)
    return match.group(1) if match else None


def verify_avito_identity(requested_url: str, final_url: str) -> AvitoIdentityVerdict:
    requested = urlparse(requested_url)
    requested_host = (requested.hostname or "").lower()
    if requested_host not in AVITO_HOSTS:
        return AvitoIdentityVerdict(
            is_avito=False,
            expected_id=None,
            final_id=None,
            identity_verified=True,
            reason="not_avito",
            requested_url=requested_url,
            final_url=final_url,
        )

    expected_id = extract_avito_id(requested_url)
    final_id = extract_avito_id(final_url)

    if expected_id is None:
        return AvitoIdentityVerdict(
            is_avito=True,
            expected_id=None,
            final_id=final_id,
            identity_verified=False,
            reason="requested_url_has_no_detail_id",
            requested_url=requested_url,
            final_url=final_url,
        )

    if final_id is None:
        return AvitoIdentityVerdict(
            is_avito=True,
            expected_id=expected_id,
            final_id=None,
            identity_verified=False,
            reason="redirected_away_from_detail_identity",
            requested_url=requested_url,
            final_url=final_url,
        )

    if final_id != expected_id:
        return AvitoIdentityVerdict(
            is_avito=True,
            expected_id=expected_id,
            final_id=final_id,
            identity_verified=False,
            reason="redirected_to_different_listing_id",
            requested_url=requested_url,
            final_url=final_url,
        )

    return AvitoIdentityVerdict(
        is_avito=True,
        expected_id=expected_id,
        final_id=final_id,
        identity_verified=True,
        reason="same_listing_id_after_fetch",
        requested_url=requested_url,
        final_url=final_url,
    )
