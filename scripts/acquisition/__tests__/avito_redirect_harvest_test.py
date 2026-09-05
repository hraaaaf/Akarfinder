import unittest

from scripts.acquisition.avito_redirect_harvest import (
    extract_avito_id,
    harvest_visible_listing_urls,
    identity_preserved,
)


class AvitoRedirectHarvestTest(unittest.TestCase):
    def test_extracts_listing_id(self):
        self.assertEqual(
            extract_avito_id("https://avito.ma/fr/racine/appartements/x_56938509.htm"),
            "56938509",
        )

    def test_identity_preserved_same_id(self):
        requested = "https://avito.ma/fr/a/appartements/x_56938509.htm"
        final = "https://www.avito.ma/fr/b/appartements/y_56938509.htm"
        self.assertTrue(identity_preserved(requested, final))

    def test_identity_rejected_catalog(self):
        requested = "https://avito.ma/fr/a/appartements/x_56938509.htm"
        self.assertFalse(identity_preserved(requested, "https://avito.ma/fr/maroc"))

    def test_harvests_visible_urls_and_dedups_ids(self):
        body = '''
        <a href="/fr/racine/appartements/Studio_56938509.htm">one</a>
        <script>{"url":"https:\\/\\/www.avito.ma\\/fr\\/agdal\\/appartements\\/Flat_58264603.htm"}</script>
        <a href="/fr/other/appartements/Duplicate_56938509.htm?foo=bar">dup</a>
        '''
        found = harvest_visible_listing_urls(body, "https://avito.ma/fr/maroc")
        self.assertEqual(set(found.keys()), {"56938509", "58264603"})
        self.assertEqual(found["56938509"], "https://avito.ma/fr/racine/appartements/Studio_56938509.htm")


if __name__ == "__main__":
    unittest.main()
