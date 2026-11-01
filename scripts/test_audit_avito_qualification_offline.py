import unittest
from audit_avito_qualification_offline import audit

class OfflineAuditTests(unittest.TestCase):
    def test_strict_and_legacy_are_distinct(self):
        base={"id":"1","fields":{"title":"T","price":"100 DH","location":"Rabat","description":"Nice","area":None},"completeness_sufficient":True}
        result=audit({"results":[base]})
        self.assertEqual(result["strict_four_fields_count"],0)
        self.assertEqual(result["legacy_threshold_count"],1)

    def test_candidate_duplicate_is_not_proven(self):
        fields={"title":"Villa","price":"7 DH","location":"Rabat","area":"940 m²","description":"Same property detail 123"}
        result=audit({"results":[{"id":"1","fields":fields},{"id":"2","fields":fields}]})
        self.assertEqual(result["possible_physical_duplicate_groups"],[["1","2"]])
        self.assertFalse(result["physical_duplicates_proven"])

if __name__=="__main__":
    unittest.main()
