import unittest

from scripts.audits.classify_sarout_city_pairs import classify_city_pair, summarize_pairs


class SaroutCityPairTests(unittest.TestCase):
    def test_candidate_translation_is_not_approved_merge(self):
        self.assertEqual(classify_city_pair("Casablanca", "الدار البيضاء"), "translation_candidate")
        self.assertEqual(classify_city_pair("Rabat", "الرباط"), "translation_candidate")

    def test_geographic_review_and_unknown(self):
        for left, right in [("Martil", "تطوان"), ("Bouskoura", "الدار البيضاء"), ("Settat", "الدار البيضاء")]:
            with self.subTest(left=left):
                self.assertEqual(classify_city_pair(left, right), "geographic_review")
        self.assertEqual(classify_city_pair("Unknown", "الدار البيضاء"), "unmapped_review")
        self.assertEqual(classify_city_pair("Rabat", None), "missing")

    def test_aggregate_counts_only(self):
        self.assertEqual(
            summarize_pairs([("Casablanca", "الدار البيضاء", 113), ("Martil", "تطوان", 3)]),
            {"geographic_review": 3, "translation_candidate": 113},
        )
        with self.assertRaises(ValueError):
            summarize_pairs([("Rabat", "الرباط", -1)])


if __name__ == "__main__":
    unittest.main()
