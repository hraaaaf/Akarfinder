import tempfile
import unittest
from pathlib import Path

from scripts.audits.audit_supabase_clean_bootstrap import audit_migrations


class OfflineMigrationAuditTests(unittest.TestCase):
    def _directory(self, content):
        tmp = tempfile.TemporaryDirectory()
        root = Path(tmp.name)
        for name, body in content.items():
            (root / name).write_text(body, encoding="utf-8")
        self.addCleanup(tmp.cleanup)
        return root

    def test_duplicate_timestamp_is_blocker(self):
        root = self._directory({
            "20260101000000_one.sql": "create table public.property_listings (id int);",
            "20260101000000_two.sql": "create table public.listing_sources (id int);",
        })
        result = audit_migrations(root)
        self.assertEqual(result["migration_file_count"], 2)
        self.assertEqual(result["distinct_named_versions"], 1)
        self.assertEqual(len(result["duplicate_versions"]), 1)
        self.assertEqual(result["clean_bootstrap_status"], "STATIC_BLOCKERS_FOUND")

    def test_missing_bootstrap_is_flagged_even_with_valid_names(self):
        root = self._directory({
            "20260101000000_one.sql": "alter table public.listing_sources add column foo text;",
            "20260102000000_two.sql": "create table example (id bigint references property_listings(id));",
        })
        result = audit_migrations(root)
        self.assertEqual({x["table"] for x in result["missing_static_bootstrap"]},
                         {"listing_sources", "property_listings"})

    def test_full_static_chain_with_separate_versions(self):
        root = self._directory({
            "20260101000000_one.sql": "create table public.listing_sources(id bigint);",
            "20260102000000_two.sql": "create table public.property_listings(id bigint);",
            "20260103000000_three.sql": "alter table listing_sources add column foo text;",
        })
        result = audit_migrations(root)
        self.assertEqual(result["duplicate_versions"], [])
        self.assertEqual(result["missing_static_bootstrap"], [])
        self.assertEqual(result["clean_bootstrap_status"], "STATIC_CHECKS_CLEAR_REPLAY_NOT_TESTED")
        self.assertFalse(result["replay_verified"])

    def test_comments_do_not_count_as_real_create(self):
        root = self._directory({
            "20260101000000_one.sql": """
                -- create table listing_sources(id bigint);
                /* create table public.listing_sources (id bigint); */
                alter table listing_sources add column bar int;
            """,
        })
        result = audit_migrations(root)
        self.assertEqual(len(result["missing_static_bootstrap"]), 1)
        self.assertEqual(result["bootstrap_tables"]["listing_sources"]["static_create_file_count"], 0)


if __name__ == "__main__":
    unittest.main()
