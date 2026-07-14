# OpenSERP First Write Execute 1

## Status
`GO_FOR_DISPLAY_PROD_ACTIVATION`

The first controlled OpenSERP batch wrote `177` new external-web-result listings and `177` linked sources to Supabase Production. The batch was validated by Preview while the Production display flag remained disabled.

## Controls
- The locked source corpus had `180` candidates; three values outside the PostgreSQL `INTEGER` range were explicitly excluded before writing.
- The run used one manifest, one run id, write caps, and batches of `20`.
- The database moved from `139` to `316` listings and from `144` to `321` sources, with no orphan source, duplicate canonical URL, unsafe collision, or partner-row overwrite.
- A post-write idempotence dry run planned no additional listing or source.
- Targeted rollback artifacts were created before writing and had already been proved in isolated PostgreSQL. No production rollback was needed.

## Preview
`dpl_B33hAB933bxPQieesncrSXDsSxyM` was built from clean commit `bb27b1a5362c04d550be1ab4d46ebe5b9fff2040` with the Preview-only display flag enabled. It read Supabase and returned external-web-result models for Casablanca, Rabat, and Marrakech searches. Production kept the display flag absent, equivalent to disabled.

The browser integration could not attach during this session. Responsive and browser-console verification must be repeated in the activation mission and are not represented as passed here.

## Scope Boundary
No source page was fetched, no image was downloaded, and no personal contact data was stored. The application was not deployed to Production, the Production alias was not changed, and Search Gateway and ranking were not modified.
