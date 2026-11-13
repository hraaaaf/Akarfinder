#!/usr/bin/env python3
"""H1 append-only Supabase Storage backend; only an RLS-restricted Auth user.

Never use service_role, Supabase S3 admin credentials, signed public URLs, or
the application's production tables. No sensitive HTTP responses are logged.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import time
from urllib import request, error, parse
from typing import Any

PROJECT_REF = "mgqsckxsqdqbzqwkgvwo"
BUCKET = "h1-historical-evidence"
OBJECT_PREFIX = "akarfinder/h1/"
MAX_OBJECT_BYTES = 10 * 1024**2
MAX_RUN_BYTES = 650 * 1024**2  # 1-GiB Free quota shared across the organization.


def need(condition: bool, code: str) -> None:
    if not condition:
        raise RuntimeError(code)


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


class SupabasePrivateStore:
    """JWT-based Storage REST: GET + POST only, never PUT, PATCH or DELETE.

    A dedicated confirmed Auth user must have app_metadata.h1_storage='enabled'
    and be constrained by explicit storage.objects SELECT/INSERT RLS policies.
    """

    def __init__(self, project_ref: str, bucket: str, publishable_key: str,
                 email: str, password: str, user_id: str):
        need(project_ref == PROJECT_REF and bucket == BUCKET, "H1_SUPABASE_TARGET_MISMATCH")
        need(publishable_key.startswith("sb_publishable_") and bool(email and password),
             "H1_SUPABASE_CREDENTIALS_MISSING")
        need(re.fullmatch(r"[0-9a-f-]{36}", user_id) is not None,
             "H1_SUPABASE_USER_ID_INVALID")
        self.origin = f"https://{project_ref}.supabase.co"
        self.bucket = bucket
        self.apikey = publishable_key
        self.email = email
        self.password = password
        self.user_id = user_id
        self._token = ""
        self._expires = 0.0
        self.bytes_used = 0

    def _auth(self) -> str:
        if self._token and time.time() < self._expires - 300:
            return self._token
        url = self.origin + "/auth/v1/token?grant_type=password"
        payload = json.dumps({"email": self.email, "password": self.password},
                             separators=(",", ":")).encode("utf-8")
        try:
            req = request.Request(url, data=payload,
                                  headers={"apikey": self.apikey, "Content-Type": "application/json"},
                                  method="POST")
            with request.urlopen(req, timeout=30) as resp:
                result = json.loads(resp.read())
        except Exception:
            raise RuntimeError("H1_SUPABASE_AUTH_FAILED") from None
        user = result.get("user") or {}
        need(user.get("id") == self.user_id
             and (user.get("app_metadata") or {}).get("h1_storage") == "enabled",
             "H1_SUPABASE_DEDICATED_USER_NOT_AUTHORIZED")
        token, ttl = result.get("access_token", ""), int(result.get("expires_in", 0))
        need(bool(token) and ttl >= 300, "H1_SUPABASE_AUTH_TOKEN_INVALID")
        self._token, self._expires = token, time.time() + ttl
        return token

    def _url(self, key: str, *, upload: bool = False) -> str:
        path = PurePosixPath(key)
        need(key.startswith(OBJECT_PREFIX) and not path.is_absolute()
             and ".." not in path.parts and key == path.as_posix(),
             "H1_SUPABASE_KEY_INVALID")
        endpoint = "object" if upload else "object/authenticated"
        return f"{self.origin}/storage/v1/{endpoint}/{self.bucket}/{parse.quote(key, safe='/')}"

    def _call(self, method: str, url: str, body: bytes | None = None) -> tuple[int, bytes]:
        need(method in ("GET", "POST") and url.startswith(self.origin + "/storage/v1/"),
             "H1_SUPABASE_METHOD_FORBIDDEN")
        headers = {"apikey": self.apikey, "Authorization": "Bearer " + self._auth()}
        if body is not None:
            headers.update({"Content-Type": "application/octet-stream", "x-upsert": "false"})
        try:
            req = request.Request(url, data=body, headers=headers, method=method)
            with request.urlopen(req, timeout=120) as resp:
                return resp.status, resp.read()
        except error.HTTPError as exc:
            # Never serialize an exception: it may expose account URLs or tokens.
            if exc.code in (404, 409):
                return exc.code, b""
            raise RuntimeError("H1_SUPABASE_STORAGE_HTTP_FAILURE") from None
        except Exception:
            raise RuntimeError("H1_SUPABASE_STORAGE_TRANSPORT_FAILURE") from None

    def _get(self, key: str) -> bytes | None:
        status, body = self._call("GET", self._url(key))
        if status == 404:
            return None
        need(status == 200, "H1_SUPABASE_STORAGE_READ_FAILED")
        return body

    def exists(self, key: str) -> bool:
        return self._get(key) is not None

    def verify_object(self, item: dict[str, Any]) -> None:
        data = self._get(item["key"])
        need(data is not None and len(data) == int(item["size"])
             and sha(data) == item["sha256"], "H1_SUPABASE_REMOTE_SHA_MISMATCH")

    def put_file(self, path: Path, key: str) -> dict[str, Any]:
        need(path.stat().st_size <= MAX_OBJECT_BYTES, "H1_SUPABASE_OBJECT_TOO_LARGE")
        data = path.read_bytes()
        size, digest = len(data), sha(data)
        item = {"key": key, "sha256": digest, "size": size}
        existing = self._get(key)
        if existing is not None:
            need(len(existing) == size and sha(existing) == digest,
                 "H1_SUPABASE_APPEND_ONLY_CONFLICT")
            return item
        need(self.bytes_used + size <= MAX_RUN_BYTES, "H1_SUPABASE_FREE_QUOTA_GUARD")
        status, _ = self._call("POST", self._url(key, upload=True), data)
        need(status in (200, 201, 409), "H1_SUPABASE_STORAGE_UPLOAD_FAILED")
        self.verify_object(item)
        if status != 409:
            self.bytes_used += size
        return item

    def put_bytes(self, data: bytes, key: str, temp_root: Path) -> dict[str, Any]:
        filename = "object-" + sha(key.encode("utf-8"))[:16]
        path = temp_root / filename
        path.write_bytes(data)
        return self.put_file(path, key)

    def download(self, key: str, path: Path, expected_sha: str | None = None) -> bytes:
        data = self._get(key)
        need(data is not None, "H1_SUPABASE_OBJECT_MISSING")
        if expected_sha is not None:
            need(sha(data) == expected_sha, "H1_SUPABASE_DOWNLOAD_SHA_MISMATCH")
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return data

    def put_manifest(self, manifest: dict[str, Any], key: str, temp_root: Path) -> dict[str, Any]:
        payload = (json.dumps(manifest, sort_keys=True, ensure_ascii=False,
                              separators=(",", ":")) + "\n").encode("utf-8")
        return self.put_bytes(payload, key, temp_root)

    def get_manifest(self, key: str, temp_root: Path) -> tuple[dict[str, Any], str] | None:
        data = self._get(key)
        if data is None:
            return None
        try:
            manifest = json.loads(data)
            need(isinstance(manifest, dict), "H1_SUPABASE_MANIFEST_INVALID")
        except Exception:
            raise RuntimeError("H1_SUPABASE_MANIFEST_INVALID") from None
        return manifest, sha(data)
