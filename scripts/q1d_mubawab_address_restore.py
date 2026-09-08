#!/usr/bin/env python3
import argparse,csv,json,re,unicodedata
from collections import Counter

def norm(s):
    if not s: return ''
    s=unicodedata.normalize('NFKD',str(s)).encode('ascii','ignore').decode().lower()
    s=re.sub(r"[’'`]+",' ',s)
    s=re.sub(r'[^a-z0-9]+',' ',s)
    return ' '.join(s.split())

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('manifest_jsonl')
    ap.add_argument('output_csv')
    args=ap.parse_args()
    known=Counter(); records=[]
    with open(args.manifest_jsonl,encoding='utf-8') as f:
        for idx,line in enumerate(f):
            o=json.loads(line)
            if o.get('source_domain')!='mubawab.ma':
                continue
            feat=o.get('features') or {}
            city=norm(feat.get('city')); dist=norm(feat.get('district'))
            if city and dist:
                known[(city,dist)] += 1
            records.append((idx,o,feat,city,dist))
    out=[]
    for idx,o,feat,city,dist in records:
        if dist or not city or not feat.get('address_text'):
            continue
        addr=feat['address_text']; na=norm(addr); cand=''
        parts=re.split(r'\s+[àa]\s+',addr,maxsplit=1,flags=re.I)
        if len(parts)==2:
            left,right=parts; nr=norm(right)
            if nr==city or city in nr or nr in city:
                cand=norm(left)
        if not cand and na.endswith(' '+city):
            cand=na[:-(len(city)+1)].strip()
        if not cand or cand==city:
            continue
        support=known[(city,cand)]
        tier=('SAFE_25' if support>=25 else 'SAFE_10' if support>=10 else
              'SAFE_5' if support>=5 else 'SAFE_1' if support>=1 else 'REJECT_UNKNOWN')
        if tier=='REJECT_UNKNOWN':
            continue
        out.append({
            'artifact_row_index':idx,
            'source_id':o.get('source_identity') or '',
            'city':feat.get('city') or '',
            'district_candidate':cand,
            'support':support,
            'tier':tier,
            'address_text':addr,
            'address_evidence':(feat.get('feature_evidence') or {}).get('address_text') or '',
            'match_basis':'q1d_address_text_exact_city_suffix',
            'provenance':'q1d_address_text_restore_v1',
        })
    fields=['artifact_row_index','source_id','city','district_candidate','support','tier','address_text','address_evidence','match_basis','provenance']
    with open(args.output_csv,'w',encoding='utf-8',newline='') as f:
        w=csv.DictWriter(f,fieldnames=fields); w.writeheader(); w.writerows(out)
    counts=Counter(r['tier'] for r in out)
    print(json.dumps({'rows':len(out),'tiers':dict(counts),'unique_artifact_row_index':len({r['artifact_row_index'] for r in out}),'unique_source_id':len({r['source_id'] for r in out})},sort_keys=True))

if __name__=='__main__': main()
