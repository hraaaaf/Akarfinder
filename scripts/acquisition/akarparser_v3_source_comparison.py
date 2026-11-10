#!/usr/bin/env python3
"""Offline compare of two isolated source-only readers vs sealed V3 output.

Only machine-reported SOURCE CLAIM CONSISTENCY, never human truth.
Full detailed disagreements stay under private Windows directory.
"""
from __future__ import annotations
import argparse
from collections import Counter,defaultdict
import gzip
import hashlib
import json
from pathlib import Path
import unicodedata

FIELDS=("title","city","district","price_mad","surface_total_m2","property_type","transaction_type")
NUMERIC={"price_mad","surface_total_m2"}
def canonical(v,field):
    if v is None:return None
    if field in NUMERIC:
        if isinstance(v,bool):return None
        try:return round(float(v),2)
        except (ValueError,TypeError,OverflowError):return None
    if not isinstance(v,str):return None
    return " ".join(unicodedata.normalize("NFKC",v).casefold().split()) or None

def read_jsonl(path):
    opener=gzip.open if path.name.endswith(".gz") else open
    with opener(path,"rt",encoding="utf8") as stream:
        for line in stream:
            if line.strip():
                obj=json.loads(line)
                if not isinstance(obj,dict):raise ValueError("NOT_OBJECT")
                yield obj

def safe_private(path):
    path=path.resolve()
    if any((dir/".git").exists() for dir in (path.parent,*path.parents)):
        raise ValueError("PRIVATE_OUTPUTS_ONLY")
    return path

def compare(args):
    for p in (args.counter,args.parsed,args.out):
        safe_private(p)
    if args.out.exists():raise FileExistsError("NO_OVERWRITE")
    manifest=json.loads(args.counter.with_name(args.counter.name+".summary.json").read_text("utf8"))
    digest=hashlib.sha256(args.counter.read_bytes()).hexdigest()
    if digest!=manifest["sha256_output"] or manifest["record_count"]!=args.expect:
        raise ValueError("BLIND_COUNTER_SEAL_INVALID")
    if manifest.get("no_v2_v3_predictions_read") is not True:
        raise ValueError("SOURCE_READER_NOT_BLIND")
    original={x["source_file"].replace("/","\\"):x for x in read_jsonl(args.counter)}
    if len(original)!=args.expect:raise ValueError("DUPLICATE_COUNTER_PATH")
    observed={}
    for rec in read_jsonl(args.parsed):
        f=rec["input_ref"]["file"].replace("/","\\")
        if args.canonical:
            f="pages\\"+f
        if f not in original:continue
        if f in observed:raise ValueError("DUPLICATE_PARSER_ENTRY")
        observed[f]=rec
    if set(original)!=set(observed):
        raise ValueError("SOURCE_READER_V3_SAMPLES_DO_NOT_MATCH")
    legacy={}
    if args.legacy:
        legacy={x["source_file"].replace("/","\\"):x for x in read_jsonl(args.legacy)}
        if set(original)!=set(legacy):raise ValueError("OLD_READER_DIFFERENT_SAMPLE")
    counts=Counter();per_portal=defaultdict(Counter);per_field=defaultdict(Counter)
    reports=[]
    for path,source in original.items():
        parsed=observed[path]
        if parsed["input_ref"]["file_sha256"]!=source["source_file_sha256"]:
            raise ValueError("SOURCE_HTML_HASH_MISMATCH")
        if parsed.get("source",{}).get("source_url")!=source["source_url"]:
            raise ValueError("SOURCE_URL_MISMATCH")
        portal=source["portal"]
        classifications=[]
        for field in FIELDS:
            claim=source["claims"][field]
            current=parsed["fields"].get(field)
            state=claim["state"]
            old=legacy.get(path,{}).get("fields",{}).get(field,{})
            if state=="conflict":
                label="INTERNAL_SOURCE_CONFLICT"
            elif state=="unknown":
                label="NO_INDEPENDENT_SOURCE_PROOF" if current is not None else "BOTH_UNDETERMINED"
            elif canonical(claim["value"],field)==canonical(current,field):
                label="SOURCE_MATCH"
            elif current is None:
                label="V3_MISSING_SOURCE_SUPPORTED"
            else:
                label="V3_VALUE_DIFFERENCE"
            legacy_match=bool(old.get("state")=="present"
                and canonical(old.get("value"),field)==canonical(claim.get("value"),field))
            counts[label]+=1
            per_portal[portal][label]+=1
            per_field[field][label]+=1
            if label in ("INTERNAL_SOURCE_CONFLICT","V3_MISSING_SOURCE_SUPPORTED","V3_VALUE_DIFFERENCE"):
                classifications.append({"field":field,"classification":label,
                  "counter_claim":claim,"parser_value":current,"prior_source_reader":old,
                  "two_isolated_source_readers_agree":legacy_match})
        reports.append({"source_file":path,"source_url":source["source_url"],
                        "source_html_sha256":source["source_file_sha256"],
                        "portal":portal,"parser_status":parsed["quality"]["status"],
                        "parser_review_reasons":parsed["quality"].get("review_reasons",[]),
                        "source_claims_supported":source["supported_field_count"],
                        "unresolved_mismatches":classifications,
                        "source_reader_unknown_fields":[f for f in FIELDS if source["claims"][f]["state"]=="unknown"],
                        "manual_market_truth_verified":False})
    args.out.parent.mkdir(parents=True,exist_ok=True)
    with args.out.open("x",encoding="utf8") as stream:
        for row in reports:stream.write(json.dumps(row,ensure_ascii=False,sort_keys=True)+"\n")
    summary={"compared_listing_count":len(reports),
      "compared_field_count":len(reports)*len(FIELDS),
      "classification":dict(counts),
      "by_field":{k:dict(v) for k,v in per_field.items()},
      "by_portal":{k:dict(v) for k,v in per_portal.items()},
      "source_reader_frozen_before_v3_comparison":True,
      "human_ground_truth_labels":0,
      "two_machine_readers_are_not_human_certification":True,
      "neon_product_admission_authorized":False,
      "source_sha_verified":len(reports),
      "private_comparison_output":str(args.out),
      "nonmatching_source_pages":sum(bool(r["unresolved_mismatches"]) for r in reports)}
    sm=args.out.with_name(args.out.name+".summary.json")
    sm.write_text(json.dumps(summary,ensure_ascii=False,indent=2,sort_keys=True),encoding="utf8")
    print(json.dumps({k:v for k,v in summary.items()
        if k not in ("by_field","by_portal","private_comparison_output")},
        ensure_ascii=False,sort_keys=True),flush=True)
    print("FIELDS",json.dumps(summary["by_field"],sort_keys=True),flush=True)
    print("PORTALS",json.dumps(summary["by_portal"],sort_keys=True),flush=True)
if __name__=="__main__":
    ap=argparse.ArgumentParser()
    ap.add_argument("--counter",type=Path,required=True)
    ap.add_argument("--parsed",type=Path,required=True)
    ap.add_argument("--legacy",type=Path)
    ap.add_argument("--out",type=Path,required=True)
    ap.add_argument("--expect",type=int,required=True)
    ap.add_argument("--canonical",action="store_true")
    compare(ap.parse_args())
