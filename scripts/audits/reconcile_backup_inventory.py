#!/usr/bin/env python3
"""Reconcile a local PostgreSQL plain-SQL gzip backup with an offline ID manifest.

Read-only; no SQL is executed, no DB is opened, and no network is used. Raw IDs and
URLs are held only in memory and never emitted. Output contains aggregates only.
"""
from __future__ import annotations
import argparse, collections, datetime as dt, gzip, json, re, sqlite3, urllib.parse
from pathlib import Path

COPY_RE = re.compile(rb"^COPY ([^ ]+) \(([^)]*)\) FROM stdin;")
TABLES = {"public.source_offer_seeds", "public.listing_sources", "public.mubawab_listing_corpus_v1"}
LENGTH = {"avito": 8, "mubawab": 7}

def source_for(value):
    v=(value or "").lower()
    if v in {"avito", "avito.ma", "www.avito.ma"}: return "avito"
    if v in {"mubawab", "mubawab.ma", "www.mubawab.ma"}: return "mubawab"
    return None

def tail_id(url, source):
    if not url or source not in LENGTH: return None
    path=urllib.parse.unquote(urllib.parse.urlsplit(url).path)
    tokens=re.findall(r"(?<!\d)\d{%d}(?!\d)" % LENGTH[source], path)
    return tokens[-1] if tokens else None

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("backup_gz", type=Path)
    ap.add_argument("historical_sqlite", type=Path)
    ap.add_argument("--output", type=Path, required=True)
    ap.add_argument("--canary-summary", type=Path)
    args=ap.parse_args()
    backup=args.backup_gz.resolve(strict=True); manifest=args.historical_sqlite.resolve(strict=True)
    con=sqlite3.connect(f"file:{manifest.as_posix()}?mode=ro",uri=True)
    integrity=con.execute("PRAGMA integrity_check").fetchone()[0]
    if integrity != "ok": raise SystemExit("Manifest SQLite integrity check failed")
    historical=collections.defaultdict(set); sample=collections.defaultdict(set); new_sample=collections.defaultdict(set)
    historical_urls=collections.defaultdict(set); tail_valid=collections.Counter(); manifest_rows=collections.Counter()
    for source,sid,url,is_hist,is_sample in con.execute("SELECT source,source_id,canonical_url,historical_snapshot,recent_sample FROM candidates"):
        manifest_rows[source]+=1
        if is_hist:
            historical[source].add(sid); historical_urls[source].add(url)
            tail_valid[source]+=int(tail_id(url,source)==sid)
        if is_sample: sample[source].add(sid)
        if is_sample and not is_hist: new_sample[source].add(sid)
    con.close()

    backup_ids=collections.defaultdict(set); table_rows=collections.Counter(); columns={}; table=None
    def add_id(source,value):
        if source not in LENGTH or value is None: return
        value=value.strip()
        if value.isdigit() and len(value)==LENGTH[source]: backup_ids[source].add(value)
    def add_url(source,value):
        candidate=tail_id(value,source)
        if candidate: backup_ids[source].add(candidate)
    with gzip.open(backup,"rb") as stream:
        for line in stream:
            if table is not None:
                if line.rstrip(b"\r\n")==b"\\.": table=None; continue
                if table not in TABLES: continue
                table_rows[table]+=1
                cells=line.rstrip(b"\r\n").split(b"\t"); ix=columns[table]
                def val(name):
                    pos=ix.get(name)
                    if pos is None or pos>=len(cells) or cells[pos]==b"\\N": return None
                    return cells[pos].decode("utf-8","replace")
                if table=="public.source_offer_seeds":
                    source=source_for(val("source_domain")); add_url(source,val("canonical_url"))
                elif table=="public.listing_sources":
                    source=source_for(val("source_name")); add_id(source,val("source_offer_key"))
                    add_url(source,val("listing_url")); add_url(source,val("source_url"))
                else:
                    source=source_for(val("source_domain")); add_id(source,val("source_listing_id")); add_url(source,val("canonical_url"))
                continue
            m=COPY_RE.match(line)
            if m:
                table=m.group(1).decode("utf-8","replace")
                if table in TABLES: columns[table]={x.strip().decode("utf-8","replace"):i for i,x in enumerate(m.group(2).split(b","))}

    canary={"reported_distinct_ids":None,"individual_ids_available":False,"matched_to_backup":None,"reason":"Published evidence stores per-city counts and hashes, not the individual source IDs."}
    if args.canary_summary:
        proof=json.loads(args.canary_summary.read_text(encoding="utf-8"))
        aggregate=proof.get("aggregate",{}) if isinstance(proof,dict) else {}
        canary["reported_distinct_ids"]=aggregate.get("distinct_source_ids_across_shards")
        def has_id_values(value):
            if isinstance(value,dict):
                for key,item in value.items():
                    if key in {"source_ids","observed_source_ids"} and isinstance(item,list): return True
                    if has_id_values(item): return True
            elif isinstance(value,list):
                return any(has_id_values(item) for item in value)
            return False
        canary["individual_ids_available"]=has_id_values(proof)
        if canary["individual_ids_available"]: canary["reason"]="Published proof contains an ID array; provide its approved local path to extend the join."
    summary={"manifest_integrity":integrity,"manifest_rows":dict(manifest_rows),
      "historical_ids":{s:len(historical[s]) for s in sorted(historical)},
      "sample_ids":{s:len(sample[s]) for s in sorted(sample)},
      "sample_absent_from_history":{s:len(new_sample[s]) for s in sorted(new_sample)},
      "manifest_url_suffix_rule_validation":{s:{"historical_rows":len(historical[s]),"matching_source_id_suffix":tail_valid[s],"ratio":round(tail_valid[s]/len(historical[s]),6) if historical[s] else None} for s in sorted(historical)},
      "backup_table_rows":dict(table_rows),"backup_candidate_ids_by_source":{},"reconciliation_by_source":{},
      "v646_mubawab_canary":canary,
      "limitations":["ID candidates from URLs use the final numeric path token of source-specific historical ID length; exact per-source rule validation is reported above.","Archive membership does not prove current availability, freshness, rights, or physical uniqueness.","No IDs, URLs, listing text, or contact fields are written to output."]}
    for s in sorted(LENGTH):
        vals=backup_ids[s]; h=historical[s]; sm=sample[s]; new=new_sample[s]
        summary["backup_candidate_ids_by_source"][s]=len(vals)
        summary["reconciliation_by_source"][s]={"historical_ids_in_backup":len(vals&h),"historical_ids_not_matched_in_selected_tables":len(h-vals),"sample_ids_in_backup":len(vals&sm),"inventory_manifest_sample_new_ids_in_selected_tables":len(vals&new)}
    summary["generated_at_utc"]=dt.datetime.now(dt.timezone.utc).isoformat()
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(summary,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"output":str(args.output),"manifest_integrity":integrity,"reconciliation_by_source":summary["reconciliation_by_source"],"canary_join":summary["v646_mubawab_canary"]},ensure_ascii=False))

if __name__=="__main__": main()
