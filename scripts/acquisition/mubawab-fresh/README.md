# AkarFinder — Mubawab Fresh Snapshot (independent V0)

## Principle

**Two strictly separated phases:**

1. `fresh`: starts from `https://www.mubawab.ma/fr`, **never opens or seeds from a historical archive**; uses a newly created SQLite file and fresh queue; first reads `robots.txt`, stops on denial, 403, 429, redirect or network failure. Captures discovered pages/detail HTML with SHA-256 and extracts listing IDs, price/area/title and **photo URLs**. Does not download actual photo files. Enforces max 100 discovery pages / 500 details and ≥2s inter-request delay. Never generates denied `:p:N` URLs. No API, CAPTCHA bypass, rotating IPs or hidden endpoints.
2. `compare`: takes only the **new** `listings.jsonl` and a *separate* historical ZIP/JSONL/SQLite. No HTTP or source discovery. Exact ID dedup; rich-record selection on repeat IDs; changed prices/areas/titles; possible cross-ID image and URL collisions for **human review**. Historical-only IDs are *not* considered removed or dead.

## Local usage

```
python -m pip install -r requirements.txt
python -m unittest -v test_fresh_snapshot.py
python fresh_snapshot.py fresh --work ./runs/2026-10-30T1433 --max-pages 10 --max-details 20 --delay 3
# Only when `fresh_report.json` proves real pages + details captured:
python fresh_snapshot.py compare \
  --fresh ./runs/2026-10-30T1433/listings.jsonl \
  --historical ./old_archive.zip \
  --out ./runs/2026-10-30T1433/comparison
```

If interrupted, rerun the same `fresh` command with `--resume`. The **first run** refuses to overwrite an existing `fresh.sqlite`. A brand-new snapshot must use a new work directory. The historic file is never passed to `fresh`.

## Evidence as of 2026-10-30

- 13/13 offline unit tests PASS; independent fresh work directory, synthetic request count, robots refusal, stop on 429, HTML/image extraction, SHA archival, ID reconciliation and distinct-ID same-photo candidate handling.
- Actual fresh attempt from this execution environment: `fresh_report.json` state **blocked** (`NameResolutionError` / domain DNS resolution failure) before any successful request. **0 new page / 0 new listing / 0 new photo**. Therefore **no actual fresh-vs-old comparison is claimed**. `coverage_certified=false`.
- Historical baseline (available privately from earlier work): 129 known distinct historical records and 530 photo URL references. They are **not seeds for this run**.
- No deployment, DB production writes, merge, new photo downloads, or bypass of access controls.

## Caveats

`robots.txt` compliance is a technical constraint **not** evidence of a commercial license for text/images; check official conditions before distributing any archive. HTML and photos may differ in dynamically rendered pages, and the parser has only synthetic fixtures so far. This is an independently implemented bounded tool, **not a complete site mirror**. Discovery coverage remains unverified. No archived data are committed to GitHub; keep captures private.

### Next exact

Run `fresh` in an environment with ordinary DNS access and review the real crawl report. If a page successfully yields fresh unique listing records, run `compare` against the saved historical baseline and inspect collisions. If the site refuses access, record the cause; do not bypass CAPTCHA or server blocks.