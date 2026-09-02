import unittest
from unittest.mock import patch
from urllib.error import HTTPError

from scripts.acquisition.bounded_production_ingestion import (
    MAX_BATCH_LIMIT,
    apply_plan,
    assert_live_write_guard,
    plan_batch,
    rollback_manifest,
)


def candidate(i=1, host="example.ma"):
    return {
        "provider": "web-discovery",
        "discovery_query": "appartement casablanca",
        "source_url": f"https://{host}/annonce/{i}",
        "canonical_url": f"https://{host}/annonce/{i}",
        "title": f"Annonce {i}",
    }


def live_env(hosts="example.ma"):
    return {
        "THIRD_PARTY_DB_INGESTION_ENABLED": "true",
        "THIRD_PARTY_DB_INGESTION_ALLOWED_HOSTS": hosts,
        "DATABASE_PROVIDER": "supabase",
        "SUPABASE_URL": "https://x.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "secret",
    }


class _Response:
    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


class BoundedProductionIngestionTests(unittest.TestCase):
    def test_dry_run_is_zero_write_and_bounded(self):
        plan = plan_batch([candidate(i) for i in range(10)], limit=3)
        self.assertTrue(plan["zeroDbWrites"])
        self.assertEqual(plan["boundedCount"], 3)
        self.assertEqual(plan["acceptedCount"], 3)

    def test_hard_limit(self):
        with self.assertRaises(ValueError):
            plan_batch([candidate()], limit=MAX_BATCH_LIMIT + 1)

    def test_duplicate_identity_is_collapsed(self):
        row = candidate()
        plan = plan_batch([row, dict(row)])
        self.assertEqual(plan["acceptedCount"], 1)

    def test_allowlist_rejects_unknown_host(self):
        plan = plan_batch([candidate(host="evil.test")], env={
            "THIRD_PARTY_DB_INGESTION_ALLOWED_HOSTS": "example.ma"
        })
        self.assertEqual(plan["acceptedCount"], 0)
        self.assertEqual(plan["rejected"][0]["reason"], "host_not_allowed")

    def test_guard_false_rejects_live_write(self):
        env = live_env()
        env["THIRD_PARTY_DB_INGESTION_ENABLED"] = "false"
        with self.assertRaises(PermissionError):
            assert_live_write_guard(env)

    def test_guard_requires_supabase(self):
        env = live_env()
        env["DATABASE_PROVIDER"] = "sqlite"
        with self.assertRaises(PermissionError):
            assert_live_write_guard(env)

    def test_guard_requires_nonempty_allowlist(self):
        with self.assertRaises(PermissionError):
            assert_live_write_guard(live_env(""))

    @patch("scripts.acquisition.bounded_production_ingestion.urlopen", return_value=_Response())
    def test_apply_201_reports_exact_inserted_identity(self, _mock):
        plan = plan_batch([candidate()], env=live_env())
        result = apply_plan(plan, env=live_env())
        self.assertEqual(result["insertedCount"], 1)
        self.assertEqual(result["duplicateCount"], 0)
        self.assertEqual(result["insertedIdentities"][0]["canonical_url"], "https://example.ma/annonce/1")
        self.assertEqual(rollback_manifest(result)["identities"], result["insertedIdentities"])

    @patch("scripts.acquisition.bounded_production_ingestion.urlopen")
    def test_apply_409_is_duplicate_noop(self, mock_urlopen):
        mock_urlopen.side_effect = HTTPError("u", 409, "conflict", None, None)
        result = apply_plan(plan_batch([candidate()], env=live_env()), env=live_env())
        self.assertEqual(result["insertedCount"], 0)
        self.assertEqual(result["duplicateCount"], 1)
        self.assertEqual(rollback_manifest(result)["identities"], [])

    @patch("scripts.acquisition.bounded_production_ingestion.urlopen")
    def test_apply_500_is_fatal(self, mock_urlopen):
        mock_urlopen.side_effect = HTTPError("u", 500, "boom", None, None)
        with self.assertRaises(HTTPError):
            apply_plan(plan_batch([candidate()], env=live_env()), env=live_env())

    def test_apply_rejects_oversized_plan(self):
        plan = {"rows": [candidate(i) for i in range(MAX_BATCH_LIMIT + 1)]}
        with self.assertRaises(ValueError):
            apply_plan(plan, env=live_env())

    def test_apply_rechecks_host_allowlist(self):
        plan = plan_batch([candidate(host="evil.test")])
        with self.assertRaises(PermissionError):
            apply_plan(plan, env=live_env("example.ma"))

    def test_dry_run_rollback_manifest_is_not_deletion_safe(self):
        manifest = rollback_manifest(plan_batch([candidate()]))
        self.assertEqual(set(manifest["identities"][0]), {"provider", "query_hash", "canonical_url"})
        self.assertIn("not safe for deletion", manifest["note"])


if __name__ == "__main__":
    unittest.main()
