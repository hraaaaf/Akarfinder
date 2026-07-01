# Visual Baseline Report — AkarFinder

**Date**: 2026-07-01
**Base URL**: http://localhost:3001
**Desktop viewport**: 1440 x 1000
**Mobile viewport**: 390 x 844

> This report captures the visual state of AkarFinder before any refactoring or hardening.
> No source code was modified during this capture.

---

## Summary Table

| Page | Desktop OK | Mobile OK | Status Code | Console Errors | Visible Problems | Capture Desktop | Capture Mobile |
|------|-----------|-----------|-------------|----------------|------------------|-----------------|----------------|
| home | Yes | Yes | 200/200 | None | None | home-desktop.png | home-mobile.png |
| search | Yes | Yes | 200/200 | None | None | search-desktop.png | search-mobile.png |
| map | Yes | Yes | 200/200 | None | None | map-desktop.png | map-mobile.png |
| acheter | Yes | Yes | 200/200 | None | None | acheter-desktop.png | acheter-mobile.png |
| louer | Yes | Yes | 200/200 | 1 error(s) | None | louer-desktop.png | louer-mobile.png |
| vendre | Yes | Yes | 200/200 | None | None | vendre-desktop.png | vendre-mobile.png |
| pro | Yes | Yes | 200/200 | None | None | pro-desktop.png | pro-mobile.png |
| pro-leads | Yes | Yes | 200/200 | None | Missing header; Missing footer | pro-leads-desktop.png | pro-leads-mobile.png |
| pro-analytics | Yes | Yes | 200/200 | None | Missing header; Missing footer | pro-analytics-desktop.png | pro-analytics-mobile.png |
| pro-alerts | Yes | Yes | 200/200 | None | Missing header; Missing footer | pro-alerts-desktop.png | pro-alerts-mobile.png |
| listing-detail | Yes | Yes | 200/200 | None | None | listing-detail-desktop.png | listing-detail-mobile.png |

---

## Detailed Findings

### home (`/`)

**Desktop** (1440x1000):
- HTTP Status: 200
- Body length: 376548 chars
- Blank screen: No
- Header visible: Yes
- Footer visible: Yes
- Screenshot: `home-desktop.png`

**Mobile** (390x844):
- HTTP Status: 200
- Body length: 393324 chars
- Blank screen: No
- Header visible: Yes
- Footer visible: Yes
- Screenshot: `home-mobile.png`

### search (`/search`)

**Desktop** (1440x1000):
- HTTP Status: 200
- Body length: 1595140 chars
- Blank screen: No
- Header visible: Yes
- Footer visible: Yes
- Screenshot: `search-desktop.png`

**Mobile** (390x844):
- HTTP Status: 200
- Body length: 1595141 chars
- Blank screen: No
- Header visible: Yes
- Footer visible: Yes
- Screenshot: `search-mobile.png`

### map (`/map`)

**Desktop** (1440x1000):
- HTTP Status: 200
- Body length: 351274 chars
- Blank screen: No
- Header visible: Yes
- Footer visible: Yes
- Screenshot: `map-desktop.png`

**Mobile** (390x844):
- HTTP Status: 200
- Body length: 351354 chars
- Blank screen: No
- Header visible: Yes
- Footer visible: Yes
- Screenshot: `map-mobile.png`

### acheter (`/acheter`)

**Desktop** (1440x1000):
- HTTP Status: 200
- Body length: 879007 chars
- Blank screen: No
- Header visible: Yes
- Footer visible: Yes
- Screenshot: `acheter-desktop.png`

**Mobile** (390x844):
- HTTP Status: 200
- Body length: 879008 chars
- Blank screen: No
- Header visible: Yes
- Footer visible: Yes
- Screenshot: `acheter-mobile.png`

### louer (`/louer`)

**Desktop** (1440x1000):
- HTTP Status: 200
- Body length: 417558 chars
- Blank screen: No
- Header visible: Yes
- Footer visible: Yes
- Screenshot: `louer-desktop.png`

**Mobile** (390x844):
- HTTP Status: 200
- Body length: 417565 chars
- Blank screen: No
- Header visible: Yes
- Footer visible: Yes
- Screenshot: `louer-mobile.png`
- Console errors:
  - `Failed to load resource: the server responded with a status of 404 (Not Found)`

### vendre (`/vendre`)

**Desktop** (1440x1000):
- HTTP Status: 200
- Body length: 475683 chars
- Blank screen: No
- Header visible: Yes
- Footer visible: Yes
- Screenshot: `vendre-desktop.png`

**Mobile** (390x844):
- HTTP Status: 200
- Body length: 475683 chars
- Blank screen: No
- Header visible: Yes
- Footer visible: Yes
- Screenshot: `vendre-mobile.png`

### pro (`/pro`)

**Desktop** (1440x1000):
- HTTP Status: 200
- Body length: 182116 chars
- Blank screen: No
- Header visible: Yes
- Footer visible: Yes
- Screenshot: `pro-desktop.png`

**Mobile** (390x844):
- HTTP Status: 200
- Body length: 182116 chars
- Blank screen: No
- Header visible: Yes
- Footer visible: Yes
- Screenshot: `pro-mobile.png`

### pro-leads (`/pro/leads`)

**Desktop** (1440x1000):
- HTTP Status: 200
- Body length: 20028 chars
- Blank screen: No
- Header visible: No
- Footer visible: No
- Screenshot: `pro-leads-desktop.png`

**Mobile** (390x844):
- HTTP Status: 200
- Body length: 20030 chars
- Blank screen: No
- Header visible: No
- Footer visible: No
- Screenshot: `pro-leads-mobile.png`

### pro-analytics (`/pro/analytics`)

**Desktop** (1440x1000):
- HTTP Status: 200
- Body length: 20032 chars
- Blank screen: No
- Header visible: No
- Footer visible: No
- Screenshot: `pro-analytics-desktop.png`

**Mobile** (390x844):
- HTTP Status: 200
- Body length: 20032 chars
- Blank screen: No
- Header visible: No
- Footer visible: No
- Screenshot: `pro-analytics-mobile.png`

### pro-alerts (`/pro/alerts`)

**Desktop** (1440x1000):
- HTTP Status: 200
- Body length: 19973 chars
- Blank screen: No
- Header visible: No
- Footer visible: No
- Screenshot: `pro-alerts-desktop.png`

**Mobile** (390x844):
- HTTP Status: 200
- Body length: 19971 chars
- Blank screen: No
- Header visible: No
- Footer visible: No
- Screenshot: `pro-alerts-mobile.png`

### listing-detail (`/listings/casablanca-finance-city-terrasse`)

**Desktop** (1440x1000):
- HTTP Status: 200
- Body length: 581871 chars
- Blank screen: No
- Header visible: Yes
- Footer visible: Yes
- Screenshot: `listing-detail-desktop.png`

**Mobile** (390x844):
- HTTP Status: 200
- Body length: 581871 chars
- Blank screen: No
- Header visible: Yes
- Footer visible: Yes
- Screenshot: `listing-detail-mobile.png`

---

## Notes

- **Pro pages** (`/pro`, `/pro/leads`, `/pro/analytics`, `/pro/alerts`): May require authentication. If blocked, the capture shows the auth-gate state.
- **Listing detail**: Uses mock listing ID `casablanca-finance-city-terrasse`.
- **No modifications**: This baseline was captured without changing any source code, styles, or configuration.
- **Purpose**: This baseline will be used to compare before/after refactoring and identify visual regressions.
