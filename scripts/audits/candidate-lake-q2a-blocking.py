#!/usr/bin/env python3
import json, math, os, hashlib
from collections import Counter, defaultdict
from pathlib import Path

ROOT=Path(os.getenv('Q2A_Q1D_ROOT','.tmp/q2a-input/q1d'))
OUT=Path(os.getenv('Q2A_OUT','.tmp/q2a-blocking'))
EXPECTED_ROWS=251_046
BLOCK_CAP=int(os.getenv('Q2A_BLOCK_CAP','250'))
FAMILIES={'geo_exact':1,'title_exact':2,'numeric_exact':4,'city_type_price_surface':8,'district_type_surface':16,'district_type_price':32,'city_type_bed_surface':64}
BIT_TO_NAME={v:k for k,v in FAMILIES.items()}

def load_jsonl(path):
 with open(path,encoding='utf-8') as f:
  for line in f:
   if line.strip(): yield json.loads(line)

def price_bucket(x):
 if x is None:return None
 try:x=float(x)
 except:return None
 if x<=0:return None
 return int(round(math.log(x,1.10)))

def surface_bucket(x):
 if x is None:return None
 try:x=float(x)
 except:return None
 if x<=0:return None
 return int(round(x/10.0))

rows=list(load_jsonl(ROOT/'manifest-q1d.jsonl'))
assert len(rows)==EXPECTED_ROWS,len(rows)
N=len(rows)
blocks=defaultdict(list)
block_family={}
family_row_assignments=Counter()
blockable_rows=set()

def add(key,family,idx):
 blocks[key].append(idx); block_family[key]=family; blockable_rows.add(idx)

for i,r in enumerate(rows):
 f=r['features']; fps=f.get('fingerprints',{})
 if fps.get('geo_v1'):
  add('geo:'+fps['geo_v1'],'geo_exact',i); family_row_assignments['geo_exact']+=1
 if fps.get('title_v1'):
  add('title:'+fps['title_v1'],'title_exact',i); family_row_assignments['title_exact']+=1
 if fps.get('numeric_v1'):
  add('numeric:'+fps['numeric_v1'],'numeric_exact',i); family_row_assignments['numeric_exact']+=1
 city=f.get('city'); typ=f.get('property_type'); district=f.get('district'); beds=f.get('bedrooms_count')
 pb=price_bucket(f.get('price_mad')); sb=surface_bucket(f.get('surface_m2'))
 if city and typ and pb is not None and sb is not None:
  family_row_assignments['city_type_price_surface']+=1
  for dp in (-1,0,1):
   for ds in (-1,0,1): add(f'cptps:{city}|{typ}|p{pb+dp}|s{sb+ds}','city_type_price_surface',i)
 if city and district and typ and sb is not None:
  family_row_assignments['district_type_surface']+=1
  for ds in (-1,0,1): add(f'dts:{city}|{district}|{typ}|s{sb+ds}','district_type_surface',i)
 if city and district and typ and pb is not None:
  family_row_assignments['district_type_price']+=1
  for dp in (-1,0,1): add(f'dtp:{city}|{district}|{typ}|p{pb+dp}','district_type_price',i)
 if city and typ and beds is not None and sb is not None:
  family_row_assignments['city_type_bed_surface']+=1
  for ds in (-1,0,1): add(f'ctbs:{city}|{typ}|b{beds}|s{sb+ds}','city_type_bed_surface',i)

# Deterministic pair evidence mask. Integer packing is much smaller than tuple keys.
pairmask={}
block_sizes=[]; used_blocks=0; oversized_blocks=0; singleton_blocks=0
family_block_stats=defaultdict(lambda:Counter())
for key,members in blocks.items():
 family=block_family[key]; vv=sorted(set(members)); n=len(vv); block_sizes.append(n); family_block_stats[family]['blocks']+=1; family_block_stats[family]['assignments']+=n
 if n<2:
  singleton_blocks+=1; family_block_stats[family]['singletons']+=1; continue
 if n>BLOCK_CAP:
  oversized_blocks+=1; family_block_stats[family]['oversized']+=1; continue
 used_blocks+=1; family_block_stats[family]['used']+=1; bit=FAMILIES[family]
 for pos,a in enumerate(vv):
  base=a*N
  for b in vv[pos+1:]:
   packed=base+b
   pairmask[packed]=pairmask.get(packed,0)|bit

OUT.mkdir(parents=True,exist_ok=True)
index_hasher=hashlib.sha256(); pair_hasher=hashlib.sha256(); kept=0; cross=0; same=0; covered=set(); mask_counts=Counter(); family_pair_hits=Counter()
with open(OUT/'representation-index.jsonl','w',encoding='utf-8') as f:
 for i,r in enumerate(rows):
  line=json.dumps({'row_index':i,'representation_key':r['representation_key'],'source_domain':r['normalized_source_domain']},separators=(',',':'),ensure_ascii=False)+'\n'
  f.write(line); index_hasher.update(line.encode())
with open(OUT/'candidate-pairs.tsv','w',encoding='utf-8') as f:
 f.write('a\tb\tmask\n'); pair_hasher.update(b'a\tb\tmask\n')
 for packed,mask in pairmask.items():
  a,b=divmod(packed,N); assert 0<=a<b<N
  cross_source=rows[a]['normalized_source_domain']!=rows[b]['normalized_source_domain']
  famcount=mask.bit_count()
  # Any cross-source block is retained. Same-source relistings need >=2 independent
  # families, except exact geo which is strong enough by itself.
  keep=cross_source or famcount>=2 or bool(mask & FAMILIES['geo_exact'])
  if not keep: continue
  line=f'{a}\t{b}\t{mask}\n'; f.write(line); pair_hasher.update(line.encode()); kept+=1; covered.add(a); covered.add(b); mask_counts[str(mask)]+=1
  if cross_source: cross+=1
  else: same+=1
  for bit,name in BIT_TO_NAME.items():
   if mask&bit: family_pair_hits[name]+=1

baseline=N*(N-1)//2
sizes=sorted(block_sizes)
def pct(q): return sizes[min(len(sizes)-1,int(len(sizes)*q))] if sizes else 0
summary={
 'schemaVersion':'q2a-candidate-pair-blocking-v1','inputRows':N,'unorderedAllPairsBaseline':baseline,'candidatePairs':kept,'crossSourcePairs':cross,'sameSourcePairs':same,
 'reductionFraction':1-(kept/baseline),'reductionFactor':baseline/kept if kept else None,'blockCap':BLOCK_CAP,'blockCount':len(blocks),'usedBlocks':used_blocks,'oversizedBlocksExcluded':oversized_blocks,'singletonBlocks':singleton_blocks,
 'blockSizeP50':pct(.50),'blockSizeP90':pct(.90),'blockSizeP99':pct(.99),'blockSizeMax':max(sizes) if sizes else 0,'blockableRows':len(blockable_rows),'rowsInAtLeastOneRetainedPair':len(covered),'blockableRowsWithoutRetainedPair':len(blockable_rows-covered),
 'familyRowAssignments':dict(family_row_assignments),'familyPairHits':dict(family_pair_hits),'familyBitMapping':FAMILIES,'maskCounts':dict(mask_counts),'familyBlockStats':{k:dict(v) for k,v in family_block_stats.items()},
 'representationIndexSha256':index_hasher.hexdigest(),'candidatePairsSha256':pair_hasher.hexdigest(),'data49bAggregateOnly':2326,'data49bIncluded':False,'missingDataInvented':False,'freshnessInferred':False,'authorizationInferred':False,'physicalPropertyMergePerformed':False,
 'databaseWrites':0,'productionWrites':0,'sourceSiteFetches':0,'vercelDeployments':0,'failures':[]}
(OUT/'summary.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print(json.dumps(summary,indent=2,ensure_ascii=False))
