"""Synthetic adversarial contracts for FeenWay J2 source URL intake; no HTTP/DB."""
from __future__ import annotations
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest
import zipfile
import gzip
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from v7_multisource.feenway_v2_dual_identity_intake import intake, IntakeRejected, fingerprint, source_claim

NEW = 'annonces_akarfinder_urls_origine.json'
OLD = 'feenway_annonces_trie_et_complet.json'
URL = 'https://www.avito.ma/fr/anfa/bureaux/Bureau_luxueux_à_louer_à_Anfa_225_m²_58688662.htm'
FW = 'https://www.feenway.com/listings/273928'

def row(*, url=URL, title='Bureau à louer', price='40 000 MAD', city='Casablanca', images=None):
    return {'nom_annonce':title,'url':url,'ville':city,'quartier':'Anfa',
            'superficie':'225 m²','prix':price,
            'liens_photos':images if images is not None else ['https://content.avito.ma/a.jpg']}

def mkzip(path, members):
    with zipfile.ZipFile(path,'w',compression=zipfile.ZIP_DEFLATED) as z:
        for k,v in members.items():
            z.writestr(k,json.dumps(v,ensure_ascii=False) if isinstance(v,(list,dict)) else v)
    return hashlib.sha256(path.read_bytes()).hexdigest()

def mknew(path, rows):
    from collections import Counter
    host=Counter()
    for r in rows:
        st, h, ident=source_claim(r['url'])
        if h:host[h]+=1
    rpt={'annonces_total':len(rows),'url_origine_trouvee':sum(bool(r['url']) for r in rows),
         'url_origine_absente':sum(not r['url'] for r in rows), 'domaines_sources':dict(host)}
    return mkzip(path,{NEW:rows,'rapport_urls_origine.json':rpt,'LISEZ_MOI_AKARFINDER.txt':'readme'})

def mkold(path, rows):
    return mkzip(path,{OLD:rows,'feenway_rapport_final.json':{'annonces_recuperees_uniques':len(rows)},
          'README_AKARFINDER_IMPORT.txt':'readme'})

class IntakeContract(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.d=Path(self.temp.name);self.new=self.d/'new.zip';self.old=self.d/'old.zip'
        self.base=[row()];self.sha=mknew(self.new,self.base)

    def execute(self, **kwargs):
        return intake(self.new,self.sha,self.d/'out',**kwargs)
    def getrow(self):
        with gzip.open(self.d/'out'/'dual_identity_QUARANTINE.jsonl.gz','rt',encoding='utf-8') as f:
            return json.loads(f.readline())

    def test_missing_old_keeps_null_feeway_id_and_quarantine(self):
        r=self.execute();j=self.getrow()
        self.assertEqual(r['records_processed'],1)
        self.assertIsNone(j['feenway_url'])
        self.assertEqual(j['source_offer_id_hint'],'58688662')
        self.assertEqual(j['identity_link_state'],'OLD_FEENWAY_ARCHIVE_NOT_SUPPLIED')
        self.assertFalse(r['private_staging_authorized'])
        self.assertFalse(r['public_admission_authorized'])
    def test_unique_exact_fields_join_to_old_without_authorizing(self):
        oldrow=row(url=FW);sha=mkold(self.old,[oldrow])
        r=self.execute(old_archive=self.old,old_sha=sha);j=self.getrow()
        self.assertEqual(j['feenway_url'],FW)
        self.assertEqual(j['identity_link_state'],'UNIQUE_SIX_FIELD_CONTENT_MATCH_NOT_SOURCE_VERIFIED')
        self.assertFalse(j['feenway_identity_independently_verified'])
        self.assertEqual(r['network_requests'],0)
    def test_mismatched_title_never_joins(self):
        sha=mkold(self.old,[row(url=FW,title='Another listing')])
        self.execute(old_archive=self.old,old_sha=sha)
        self.assertIsNone(self.getrow()['feenway_url'])
        self.assertEqual(self.getrow()['identity_link_state'],'NO_EXACT_SIX_FIELD_MATCH')
    def test_ambiguous_content_never_guesses_id(self):
        a=row(url=URL,images=[])
        b=row(url='https://www.avito.ma/fr/anfa/bureaux/Another_58688663.htm',images=[])
        self.sha=mknew(self.new,[a,b])
        sha=mkold(self.old,[row(url=FW,images=[]),row(url='https://www.feenway.com/listings/273929',images=[])])
        r=self.execute(old_archive=self.old,old_sha=sha)
        self.assertEqual(r['identity_link_counts'].get('AMBIGUOUS_SIX_FIELD_MATCH'),2)
        with gzip.open(self.d/'out'/'dual_identity_QUARANTINE.jsonl.gz','rt') as f:
            self.assertTrue(all(json.loads(x)['feenway_url'] is None for x in f))
    def test_new_wrong_sha_rejected(self):
        with self.assertRaisesRegex(IntakeRejected,'NEW_ARCHIVE_PIN_OR_FILE_INVALID'):
            intake(self.new,'0'*64,self.d/'out')
    def test_old_wrong_sha_rejected(self):
        mkold(self.old,[row(url=FW)])
        with self.assertRaisesRegex(IntakeRejected,'OLD_ARCHIVE_PIN_INVALID'):
            self.execute(old_archive=self.old,old_sha='0'*64)
    def test_malicious_zip_member_rejected(self):
        self.sha=mkzip(self.new,{'../evil.json':'{}'})
        with self.assertRaisesRegex(IntakeRejected,'NEW_ARCHIVE_UNEXPECTED_CONTENT'):
            self.execute()
    def test_duplicate_url_causes_no_output(self):
        self.sha=mknew(self.new,[row(),row()])
        with self.assertRaisesRegex(IntakeRejected,'NEW_DUPLICATE_SOURCE_URL'):
            self.execute()
        self.assertFalse((self.d/'out').exists())
    def test_report_count_disagreement_fails_closed(self):
        self.sha=mkzip(self.new,{NEW:[row()], 'rapport_urls_origine.json':{
            'annonces_total':1,'url_origine_trouvee':0,'url_origine_absente':1,'domaines_sources':{}},
            'LISEZ_MOI_AKARFINDER.txt':'txt'})
        with self.assertRaisesRegex(IntakeRejected,'SOURCE_REPORT_DISAGREES_WITH_ROWS'):
            self.execute()
        self.assertFalse((self.d/'out').exists())
    def test_unsupported_or_nonstandard_route_not_promoted(self):
        self.assertEqual(source_claim('https://immoneuf.avito.ma/fr/d/Hn0/5pz')[0],'SOURCE_ROUTE_REVIEW')
        self.assertIsNone(source_claim('https://immoneuf.avito.ma/fr/d/Hn0/5pz')[2])
        self.assertEqual(source_claim('https://evil-avito.ma/p')[0],'SOURCE_URL_UNSAFE_OR_UNSUPPORTED_HOST')
    def test_empty_url_never_backfills_feeway(self):
        self.sha=mknew(self.new,[row(url='')]);self.execute()
        j=self.getrow();self.assertIsNone(j['source_url']);self.assertIsNone(j['feenway_url'])
        self.assertEqual(j['source_url_status'],'SOURCE_URL_MISSING')
    def test_unicode_order_independent_fields_stable(self):
        a=row(url=URL);b=dict(reversed(list(a.items())));b['url']=''
        self.assertEqual(fingerprint(a),fingerprint(b))
    def test_no_output_under_repository(self):
        g=self.d/'repo';g.mkdir();(g/'.git').mkdir()
        with self.assertRaisesRegex(IntakeRejected,'PRIVATE_NEW_OUTPUT_OUTSIDE_GIT_REQUIRED'):
            intake(self.new,self.sha,g/'out')
    def test_wrong_old_key_duplicate_rejected(self):
        sha=mkold(self.old,[row(url=FW),row(url=FW, title='Other')])
        with self.assertRaisesRegex(IntakeRejected,'OLD_FEENWAY_ID_INVALID_OR_DUPLICATE'):
            self.execute(old_archive=self.old,old_sha=sha)

if __name__=='__main__':unittest.main()