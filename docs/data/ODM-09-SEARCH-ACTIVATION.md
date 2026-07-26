# ODM-09 — Search activation

Status: ACTIVE

## Objective

Activate the certified ODM-03 -> ODM-08 Thin Index Search Gateway in the real `/search` experience, then certify filters, pagination, source safety, mobile/desktop rendering and production readiness.

## Activation decision

The public Search Gateway is enabled by default at build time unless explicitly disabled with `NEXT_PUBLIC_SEARCH_GATEWAY_ENABLED=false`.

This is safe because:

- `search_thin_index_v3` is already service-role only;
- only ODM-06 eligible rows can leave the database;
- Node re-applies provider, freshness, URL-pattern and deduplication gates;
- external results keep the original-source CTA;
- no commercial ranking influence is introduced.

## Execution gates

1. Gateway activation in `/search`.
2. Real-query matrix against the pre-launch Supabase database.
3. Price/surface filter parity for Thin Index results.
4. Stable deep pagination and deduplication.
5. Desktop/mobile QA.
6. Preview deployment only after CI is green.
7. Production deployment only after explicit certification.

No Vercel production deployment is included in the first activation commit.
