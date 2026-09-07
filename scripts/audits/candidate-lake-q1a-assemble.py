#!/usr/bin/env python3
import hashlib,json,os,re
from pathlib import Path
from urllib.parse import urlsplit,urlunsplit

R=Path(os.getenv('Q1A_ARTIFACT_ROOT','.tmp/q1a-materializable-artifacts')); O=Path(os.getenv('Q1A_MANIFEST_OUT','.tmp/q1a-materializable-manifest'))
C=json.load(open(Path(__file__).with_name('candidate-lake-q1a-materializable-contract.json')))
URL=re.compile(r'https?://[^\s"\'<>\\]+')
def canon(s):
 s=s.strip().rstrip('),.;'); p=urlsplit(s); host=(p.hostname or '').lower().removeprefix('www.'); net=host+(f':{p.port}' if p.port else ''); path=p.path.rstrip('/') or '/'; return urlunsplit((p.scheme.lower() or 'https',net,path,p.query,''))
def file(a,n):
 x=list((R/str(a)).rglob(n)); assert len(x)==1,(a,n,len(x)); return x[0]
def lines(a,n): return [x.strip() for x in file(a,n).read_text(errors='ignore').splitlines() if x.strip()]
def urls(a,n=None):
 fs=[file(a,n)] if n else [p for p in (R/str(a)).rglob('*') if p.is_file()]
 return sorted({canon(m.group()) for p in fs for m in URL.finditer(p.read_text(errors='ignore'))})
def host(u): return (urlsplit(u).hostname or '').lower().removeprefix('www.')
lanes={}
def put(k,domain,vals,kind='url'):
 vals=sorted(set(vals)); lanes[k]=[{'representation_key':f'{domain}|{kind}:{v}','source_domain':domain,'source_identity':v,'identity_kind':kind,'lane':k,'layer':'L0','candidate_status':'private_unverified'} for v in vals]
put('avito_baseline','avito.ma',lines(9971118875,'union_ids.txt'),'id')
put('akaar','akaar.ma',lines(9974670013,'listing_hint_urls.txt'))
put('mubawab_direct','mubawab.ma',lines(9969651653,'listing-ids.txt'),'id')
put('marocannonces','marocannonces.com',lines(9888335708,'listing-urls.txt'))
put('sarouty','sarouty.ma',lines(9897323745,'listing-urls.txt'))
put('agenz_direct','agenz.ma',lines(9898224274,'listing-urls.txt'))
db=[json.loads(x) for x in lines(9997114366,'db-backed-candidates.jsonl')]; lanes['db_backed_union']=[{'representation_key':f"{r['source']}|url:{canon(r['source_identity'])}",'source_domain':r['source'],'source_identity':canon(r['source_identity']),'identity_kind':'url','lane':'db_backed_union','layer':'L0','candidate_status':'private_unverified'} for r in db]
def domain_urls(a,d): return [u for u in urls(a) if host(u)==d]
put('aykana_mass_x5','aykana.ma',domain_urls(9205427369,'aykana.ma'))
put('kawtar_mass_x5','kawtarimmobilier.com',domain_urls(9205374370,'kawtarimmobilier.com'))
put('atlas_masaken_souk','mixed',[*domain_urls(9203620957,'atlasimmobilier.com'),*domain_urls(9205410118,'masaken.ma'),*domain_urls(9205361327,'soukimmobilier.com')])
put('mouldar_mass_x5','mouldar.com',domain_urls(9205390731,'mouldar.com'))
put('promo_mass_x5','promoimmomarrakech.com',domain_urls(9203620957,'promoimmomarrakech.com'))
put('domio','domio.ma',lines(9974714576,'listing_hint_urls.txt')); put('immodirect','immodirect.ma',lines(9974939355,'listing_hint_urls.txt'))
put('yakeey','yakeey.com',[*domain_urls(9976337671,'yakeey.com'),*domain_urls(9976383551,'yakeey.com')])
for k,a in [('mass_x2',9998233478),('oneimmo_historical',9998238197)]:
 rs=[json.loads(x) for x in lines(a,'manifest.jsonl')]; lanes[k]=[{'representation_key':f"{r['source_domain']}|url:{canon(r.get('canonical_url') or r.get('source_url'))}",'source_domain':r['source_domain'],'source_identity':canon(r.get('canonical_url') or r.get('source_url')),'identity_kind':'url','lane':k,'layer':'L0','candidate_status':'private_unverified'} for r in rs]
put('mass1_additive','mixed',lines(9988296190,'exact-additive-urls.txt'))
hist=set(lines(9989328673,'agenz-historical-detail-urls.txt')); direct=set(lines(9898224274,'listing-urls.txt')); put('agenz_historical_delta','agenz.ma',hist-direct)
for k,a,n,d in [('mubawab_realestatebuddy',9991042950,'net-new-ids.txt','mubawab.ma'),('mubawab_hicham',9991207598,'mubawab-net-new-ids.txt','mubawab.ma'),('avito_hicham',9991207598,'avito-net-new-ids.txt','avito.ma'),('mubawab_marwane',9991403015,'net-new-ids.txt','mubawab.ma'),('mubawab_public_batch',9991447841,'combined-net-new-ids.txt','mubawab.ma'),('avito_public_batch',9991488198,'combined-net-new-ids.txt','avito.ma')]: put(k,d,lines(a,n),'id')
fails=[]
for k,n in C['lanes'].items():
 if len(lanes.get(k,[]))!=n:fails.append(f'{k}: {len(lanes.get(k,[]))} != {n}')
allrows=[r for k in C['lanes'] for r in lanes.get(k,[])]; keys=[r['representation_key'] for r in allrows]; dup=len(keys)-len(set(keys))
if len(allrows)!=C['materializableExpected']:fails.append(f'total {len(allrows)}');
if dup:fails.append(f'cross-lane duplicate keys {dup}')
allrows.sort(key=lambda r:r['representation_key']); O.mkdir(parents=True,exist_ok=True); text=''.join(json.dumps(r,separators=(',',':'))+'\n' for r in allrows); (O/'manifest.jsonl').write_text(text)
summary={'schemaVersion':'q1a-materializable-manifest-v1','rows':len(allrows),'uniqueRepresentationKeys':len(set(keys)),'crossLaneDuplicates':dup,'laneCounts':{k:len(v) for k,v in lanes.items()},'sha256':hashlib.sha256(text.encode()).hexdigest(),'failures':fails,'data49bAggregateOnly':2326,'databaseWrites':0,'productionWrites':0,'sourceSiteFetches':0,'vercelDeployments':0}
(O/'summary.json').write_text(json.dumps(summary,indent=2)+'\n'); print(json.dumps(summary,indent=2)); assert not fails,fails
