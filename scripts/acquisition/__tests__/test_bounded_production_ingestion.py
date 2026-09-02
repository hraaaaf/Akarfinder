import unittest

from scripts.acquisition.bounded_production_ingestion import (
    MAX_BATCH_LIMIT,
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
        with self.assertRaises(PermissionError):
            assert_live_write_guard({
                "THIRD_PARTY_DB_INGESTION_ENABLED": "false",
                "DATABASE_PROVIDER": "supabase",
                "SUPABASE_URL": "https://x.supabase.co",
                "SUPABASE_SERVICE_ROLE_KEY": "secret",
            })

    def test_guard_requires_supabase(self):
        with self.assertRaises(PermissionError):
            assert_live_write_guard({
                "THIRD_PARTY_DB_INGESTION_ENABLED": "true",
                "DATABASE_PROVIDER": "sqlite",
            })

    def test_rollback_manifest_uses_exact_idempotency_identity(self):
        plan = plan_batch([candidate()])
        manifest = rollback_manifest(plan)
        self.assertEqual(manifest["table"], "discovery_candidates")
        self.assertEqual(set(manifest["identities"][0]), {"provider", "query_hash", "canonical_url"})


if __name__ == "__main__":
    unittest.main()
