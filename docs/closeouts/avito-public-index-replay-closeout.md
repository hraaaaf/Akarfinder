# Avito Public-Index Replay — Closeout

Status: CLOSED / ABANDONED PATH
Date: 2026-09-01

## Goal

Make the bounded Avito replay publicly searchable through the canonical ODM search path, with 15/15 accepted URLs exposed link-only.

## Outcome

The functional goal was **not achieved** on this path.

Verified evidence before closure:

- PR #962 was merged.
- GitHub Actions run `33535484659` completed the bounded replay through the official writer.
- Replay evidence contained 24 rows, 16 unique URLs, 15 accepted and 1 rejected vacation URL.
- Writer guardrails required `before=0`, `after=15`, and `new_listing_sources=15` for the apply step to pass.
- The production search runtime was serving ODM without fallback or runtime error.
- The public ODM corpus reported 2,001 representations during verification.
- A live search for the retained marker `FANTAZIA` returned 0 results.

Therefore the replay proved persistence into the writer/listing-source layer, but did **not** prove projection of those 15 entries into the publicly searchable ODM representation layer.

## Closure decision

This implementation path is intentionally retired rather than extended in place.

- Do not describe this replay as 15/15 publicly indexed.
- Do not use the old OpenSERP → thin-index/provider route as a serving-path workaround.
- Preserve the replay scripts and historical CI evidence for diagnosis/reproducibility.
- Remove the one-shot GitHub Actions workflow that can apply this replay to production, preventing accidental future writes from this retired lane.
- No Vercel deployment is part of this closeout.
- No database rollback is claimed or performed by this closeout.

## Known residual state

The replay's 15 accepted listing-source writes are historical production state. Direct Supabase verification was unavailable at final closeout because the connected SQL read was denied by permissions, so this document does not claim a fresh database count or rollback.

## Next path

Any future Avito ingestion work must start as a separate bounded lane whose success criterion is end-to-end ODM publication: candidate → canonical ingest → ODM representation → public RPC/search result, with rollback defined before writes.
