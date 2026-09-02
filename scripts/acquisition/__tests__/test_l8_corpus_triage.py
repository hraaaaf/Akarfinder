import unittest

from scripts.acquisition.l8_corpus_triage import classify_rows, triage_url


class L8CorpusTriageTests(unittest.TestCase):
    def test_known_detail_patterns(self):
        urls = [
            "https://www.mubawab.ma/fr/a/12345/appartement-a-vendre",
            "https://www.marocannonces.com/annonce/12345/foo.html",
            "https://www.leaderimmo.ma/biens/10/appartement-a-vendre-a-temara-",
            "https://www.sarouty.ma/plp/louer/villa-a-louer-casablanca-dar-bouazza-852620.html",
            "https://agenz.ma/fr/immobilier-neuf-maroc/appartement/tanger/palm-cabo-immobilier-neuf-861718",
            "https://www.avito.ma/ar/dar_bouazza/villas/Villa_dar_bouazza__55866281.htm",
        ]
        for url in urls:
            self.assertEqual(triage_url(url), "listing_detail_candidate", url)

    def test_discovery_pages_are_not_promoted(self):
        urls = [
            "https://www.mubawab.ma/ar/cd/casablanca/sidi-moumen/immobilier-a-vendre",
            "https://www.sarouty.ma/louer/dar-bouazza/villas-a-louer.html",
            "https://immo.mitula.ma/immo/location-hangar-dar-bouazza",
            "https://agenz.ma/ar/prix-immobilier-maroc/sidi-kacem/sidi-kacem",
        ]
        for url in urls:
            self.assertEqual(triage_url(url), "discovery_page", url)

    def test_noise_hosts(self):
        for url in [
            "https://youtube.com/watch?v=x",
            "https://www.tiktok.com/@x/video/1",
            "https://reddit.com/r/morocco/comments/x",
            "https://support.google.com/foo",
        ]:
            self.assertEqual(triage_url(url), "obvious_noise", url)

    def test_unknown_stays_uncertain(self):
        self.assertEqual(triage_url("https://example.ma/foo/bar"), "uncertain")

    def test_report_is_zero_write(self):
        report = classify_rows([
            {"source_domain": "leaderimmo.ma", "canonical_url": "https://leaderimmo.ma/biens/10/foo"},
            {"source_domain": "youtube.com", "canonical_url": "https://youtube.com/watch?v=x"},
        ])
        self.assertTrue(report["zeroDbWrites"])
        self.assertEqual(report["counts"]["listing_detail_candidate"], 1)
        self.assertEqual(report["counts"]["obvious_noise"], 1)


if __name__ == "__main__":
    unittest.main()
