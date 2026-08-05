# LOT B2 — Source Registry v2

## Purpose

Turn the existing source registry into a machine-readable, fail-closed policy contract for every observed source domain.

## Contract

Each source now records:

- authorization status;
- acquisition mode;
- explicitly allowed discovery channels;
- maximum revalidation interval;
- review status and policy expiry;
- evidence observation timestamps;
- partnership/contact status;
- deterministic machine gate;
- policy hash for drift detection.

## Machine gates

- `canonical_link_only`: public sitemap facts and outbound canonical links only;
- `internal_signal_only`: internal market evidence only;
- `blocked_*`: no acquisition or public representation;
- `authorized_detail_feed` and `partner_feed`: reserved for written authorization.

## Fail-closed rules

- every observed domain must be registered;
- `no_bypass_required` must remain true;
- missing or expired evidence never grants broader access;
- unknown permissions never become detail-fetch permission;
- tables and reports remain service-role-only;
- B2 does not fetch source pages, reuse content, alter ranking, or change publication state.

## Newly registered source

`marrakechrealty.com` is registered in strict internal-only mode until robots, terms and authorization evidence are reviewed.

## Completion evidence

The production report is `odm_b2_source_registry_v2_report()`.
