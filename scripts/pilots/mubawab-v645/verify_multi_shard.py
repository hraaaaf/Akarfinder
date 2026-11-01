#!/usr/bin/env python3
"""Fail-closed multi-shard pilot verifier. Read-only. Never promotes listings."""
import json, os, sqlite3, sys
from pathlib import Path

def verify():
    reasons=[]
    def missing(name):
        if not Path(name).is_file(): reasons.append("missing:"+name)
    for f in ("akarfinder_diagnostics.json","akarfinder_data.json","akarfinder.db","pilot.log","pilot_state_restore.txt"):missing(f)
    if reasons:return {"status":"FAIL","reasons":reasons}
    docs=json.loads(Path("akarfinder_diagnostics.json").read_text(encoding="utf-8"))
    data=json.loads(Path("akarfinder_data.json").read_text(encoding="utf-8"))
    expected=(Path(__file__).parent/"pilot-urls.txt").read_text(encoding="utf-8").splitlines()
    pages=docs.get("pages",[])
    if len(pages)!=len(expected):reasons.append("unexpected_page_count")
    if docs.get("summary",{}).get("requested")!=len(expected):reasons.append("requested_count_mismatch")
    if docs.get("summary",{}).get("with_listings")!=len(expected):reasons.append("not_all_pages_accepted")
    for index, url in enumerate(expected):
        p=pages[index] if index<len(pages) else {}
        if p.get("url")!=url:reasons.append(f"source_url_mismatch:{index}")
        if p.get("final_status")!="ok" or p.get("quality_accepted") is not True:reasons.append(f"page_failed:{index}")
        n=int(p.get("eligible_cards") or 0)
        m=int(p.get("parsed_listings") or 0)
        if n<20 or m<20:reasons.append(f"low_eligible_or_parsed_count:{index}")
        if n and m/n <0.9:reasons.append(f"low_acceptance:{index}")
        for key in ("price_recognition_coverage","surface_coverage","locality_coverage"):
            if float(p.get(key) or 0)<0.85:reasons.append(f"{key}_too_low:{index}")
        if p.get("quality_reasons"):reasons.append(f"quality_reasons:{index}")
    if "statut: COMPLET" not in Path("pilot.log").read_text(encoding="utf-8"):
        reasons.append("status_not_complete")
    with sqlite3.connect("akarfinder.db") as conn:
        integrity=conn.execute("PRAGMA integrity_check").fetchone()[0]
        count=conn.execute("SELECT count(*) FROM listings").fetchone()[0]
        prior=conn.execute("SELECT price_review_status,price_mad FROM listings WHERE id='8441628'").fetchone()
        status_counts=conn.execute("SELECT count(*) FROM listings WHERE price_review_status LIKE 'review_%'").fetchone()[0]
    if integrity!="ok" or count<32:reasons.append("bad_sqlite_state")
    if prior is None or prior[0]!="review_low" or prior[1]!=15000:
        reasons.append("known_prior_price_flag_missing_or_modified")
    state_origin=Path("pilot_state_restore.txt").read_text(encoding="utf-8").strip()
    if "41315575782" not in state_origin:reasons.append("missing_verified_restore_origin")
    return {
        "status":"PASS" if not reasons else "FAIL",
        "reasons":reasons,
        "run_id":os.environ.get("GITHUB_RUN_ID"),
        "head":os.environ.get("GITHUB_SHA"),
        "pages_requested":len(expected),
        "pages_accepted":docs.get("summary",{}).get("with_listings"),
        "per_page":[{"url":p.get("url"),"status":p.get("final_status"),"eligible":p.get("eligible_cards"),"parsed":p.get("parsed_listings"),"price_coverage":p.get("price_coverage"),"locality_coverage":p.get("locality_coverage"),"reasons":p.get("quality_reasons")} for p in pages],
        "source_observations":sum(int(p.get("parsed_listings") or 0) for p in pages),
        "export_rows":len(data),
        "sqlite_rows":count,
        "sqlite_integrity":integrity,
        "prior_price_review":prior,
        "price_review_rows":status_counts,
        "state_origin":state_origin,
        "prod_writes":0
    }

if __name__=="__main__":
    try: result=verify()
    except Exception as ex: result={"status":"FAIL","reasons":["verifier_exception:"+type(ex).__name__+":"+str(ex)]}
    Path("multi_pilot_validation.json").write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(result,ensure_ascii=False))
    sys.exit(0 if result["status"]=="PASS" else 2)
