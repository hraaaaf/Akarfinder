"""Q1E private Neon path: fail-closed unit regression; no credentials, no network."""
from pathlib import Path
import sys
import tempfile
from unittest import TestCase,main,mock
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import akarparser_v2_neon_readonly_canary as reader

GOOD=('postgresql://q1e_ro:fakepass@'
      'ep-falling-unit-b2hper1a.c-6.eu-central-1.aws.neon.tech/'
      'AkarFinder?sslmode=require')
class NeonReadonlyGuards(TestCase):
    def test_rejects_admin_wrong_endpoint_and_cleartext(self):
        bad=[
            GOOD.replace('q1e_ro','neondb_owner'),
            GOOD.replace('q1e_ro','postgres'),
            GOOD.replace('ep-falling-unit','ep-not-recovery'),
            GOOD.replace('/AkarFinder','/neondb'),
            GOOD.replace('sslmode=require','sslmode=disable'),
            GOOD.replace('postgresql://','http://'),
            '']
        for url in bad:
            with self.subTest(url=url[:12]):
                with self.assertRaises(ValueError):reader.checked_env(url)
        env=reader.checked_env(GOOD)
        self.assertIn('default_transaction_read_only=on',env['PGOPTIONS'])
    def test_readonly_sql_guard(self):
        text=reader.PREFLIGHT_SQL.lower()
        self.assertIn("transaction_read_only",text)
        self.assertIn("'insert'",text)
        self.assertIn("'select'",text)
        query=reader.QUERY.lower()
        self.assertIn('limit 1000',query)
        for token in ('insert into','delete from','drop table','update public.'):
            self.assertNotIn(token,query)
    def test_fails_closed_on_writer_role(self):
        with mock.patch.object(reader,'psql_query',return_value=['Q1E_DENIED']):
            with tempfile.TemporaryDirectory() as td:
                with self.assertRaisesRegex(RuntimeError,'NOT_READONLY_ROLE'):
                    reader.run(GOOD,Path(td))
    def test_psql_errors_do_not_embed_credentials(self):
        fake=mock.Mock(returncode=1,stdout='',stderr='postgresql://SENSITIVE')
        with mock.patch.object(reader.subprocess,'run',return_value=fake):
            with self.assertRaisesRegex(RuntimeError,'DATABASE_QUERY_FAILED'):
                reader.psql_query('SELECT 1',{})
if __name__=='__main__':main()
