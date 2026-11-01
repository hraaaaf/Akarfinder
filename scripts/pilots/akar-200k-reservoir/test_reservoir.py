import unittest
from build_reservoir import parse_key
class TestReservoir(unittest.TestCase):
  def test_two_real_id_patterns(self):
    self.assertEqual(parse_key('avito','https://www.avito.ma/fr/rabat/appartements/T_12345678.htm')[0],('avito','12345678'))
    self.assertEqual(parse_key('mubawab','https://www.mubawab.ma/fr/a/8432690/example')[0],('mubawab','8432690'))
  def test_https_host_and_safe_port_required(self):
    for s in ('http://www.mubawab.ma/fr/a/8432690/example','https://evil.com/fr/a/8432690/example',
              'https://www.mubawab.ma:8443/fr/a/8432690/example'):
      self.assertIsNone(parse_key('mubawab',s))
  def test_tracking_query_not_preserved(self):
    x=parse_key('avito','https://avito.ma/fr/rabat/appartements/T_12345678.htm?utm_source=x')[1]
    self.assertNotIn('utm_',x)
if __name__=='__main__':unittest.main()
