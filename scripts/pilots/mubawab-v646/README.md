# Akarfinder scraper V6.4.6 — V6.4.5 safety audit fixes

- Refuses rental/category/agency and encoded-path mixing; only `https://www.mubawab.ma/fr/{st,sd,cd}/.../appartements-a-vendre` accepted for the bounded pilot.
- Fetches and hashes current robots.txt **before** any listing fetch/SQLite mutation; fail-closed if inaccessible or disallowing the requested path.
- SQLite migration adds `source_search_url` and `transaction_type`; legacy rows remain `NULL` until legitimately reobserved.
- Price-per-m² medians compare the same transaction type; explicit rentals rejected by sale pipeline.
- V6.4.5 immutable proof: [real run #41327076337](https://github.com/hraaaaf/Akarfinder/actions/runs/41327076337); [diagnostics](https://github.com/hraaaaf/Akarfinder/actions/runs/41327076337/artifacts/13091343743) + [SQLite](https://github.com/hraaaaf/Akarfinder/actions/runs/41327076337/artifacts/13091518100).
- Current **V6.4.6 is tested offline**, no live extraction or claim of new real-world results.

Run `python -m unittest discover -s tests -v` after installing `requirements.txt`. This GitHub standalone lane runs guard/robot regression tests; **full package with 116 local passing tests and previous run artefacts** is shared in this conversation as `Akarfinder_V646_with_verified_proofs.zip`.

**Legal boundary:** Respect robots.txt and site terms, which currently restrict mass extraction and competitor database creation. Robots permission alone is not reuse permission. No Supabase/Neon writes, Vercel, scheduling or merge.

**Redirect safety:** HTTP requests have `allow_redirects=False`; Chromium rejects any `page.url != requested_url`. This prevents a redirected rental/category page from being counted as a sale shard. The offline test covers the HTTP behavior.
