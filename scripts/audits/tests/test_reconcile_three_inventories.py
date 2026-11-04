import unittest

from reconcile_three_inventories import final_url_id, normalize_source, source_set_report, valid_key

class IdentityTests(unittest.TestCase):
    def test_normalizes_known_source_aliases(self):
        self.assertEqual(normalize_source("WWW.AVITO.MA"), "avito")
        self.assertEqual(normalize_source("mubawab.ma"), "mubawab")

    def test_extracts_only_source_length_suffix(self):
        self.assertEqual(final_url_id("https://www.avito.ma/fr/x/12345678", "avito"), "12345678")
        self.assertEqual(final_url_id("https://www.mubawab.ma/fr/x/1234567", "mubawab"), "1234567")
        self.assertIsNone(final_url_id("https://www.avito.ma/fr/x/1234567", "avito"))

    def test_rejects_noncanonical_source_keys(self):
        self.assertEqual(valid_key("12345678", "avito"), "12345678")
        self.assertIsNone(valid_key("abc12345678", "avito"))
        self.assertIsNone(valid_key("1234567", "avito"))

    def test_union_deduplicates_shared_reference(self):
        report = source_set_report({"1","2"}, {"2","3"}, {"3","4"}, set())
        self.assertEqual(report["distinct_references_union"], 4)
        self.assertEqual(report["history_backup"], 1)
        self.assertEqual(report["backup_neon"], 1)

    def test_canary_reference_not_double_counted(self):
        report = source_set_report({"1"}, {"2"}, {"3"}, {"3","4"})
        self.assertEqual(report["distinct_references_union"], 4)
        self.assertEqual(report["only_canary"], 1)

if __name__ == "__main__":
    unittest.main()
