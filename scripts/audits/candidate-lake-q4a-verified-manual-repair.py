#!/usr/bin/env python3
import json,hashlib,os
from pathlib import Path
OUT=Path(os.getenv('Q4A_VERIFIED_OUT','.tmp/q4a-verified-manual-repair'))
# Facts visually verified against the public listing pages on 2026-09-07.
# These are regression anchors for parser failures, not inferred values.
ROWS=[
 {'url':'https://agenz.ma/fr/annonces/immo-agadir/location-appartements/agadir-oufella/180652','city':'Agadir','price_mad':6000.0,'surface_m2':63.0,'price_period':'month','evidence':'verified_public_page_visible_fields_2026-09-07'},
 {'url':'https://masaken.ma/fr/immobilier-maroc/location-appartement-agadir/7160','city':'Agadir','price_mad':499.0,'surface_m2':100.0,'price_period':'day','evidence':'verified_public_page_visible_fields_2026-09-07'},
 {'url':'https://masaken.ma/fr/immobilier-maroc/location-appartement-agadir/4542','city':'Agadir','price_mad':4000.0,'surface_m2':90.0,'price_period':'month','evidence':'verified_public_page_visible_fields_2026-09-07'},
]
OUT.mkdir(parents=True,exist_ok=True)
body=''.join(json.dumps(r,separators=(',',':'),ensure_ascii=False)+'\n' for r in ROWS)
(OUT/'verified-repairs.jsonl').write_text(body,encoding='utf-8')
summary={'schemaVersion':'q4a-verified-manual-repair-v1','rows':len(ROWS),'rule':'exact URL only; visible field verification only','inferredValues':0,'databaseWrites':0,'productionWrites':0,'sourceSiteFetches':0,'vercelDeployments':0,'sha256':hashlib.sha256(body.encode()).hexdigest()}
(OUT/'summary.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print(json.dumps(summary,indent=2,ensure_ascii=False))
