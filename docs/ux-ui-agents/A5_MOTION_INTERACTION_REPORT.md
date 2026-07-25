# A5 — PREMIUM MOTION & INTERACTION

**Status:** CERTIFIED_FOR_A6
**Scope:** audit-only; no product code modification

## 1. Executive verdict

AkarFinder needs a restrained motion language that explains state changes across Search, Map and Price Atlas. Premium quality must come from continuity, responsiveness and stability—not cinematic delay. Motion is functional when it preserves context, confirms causality or reveals hierarchy.

## 2. Motion principles

1. Search response is never delayed for decoration.
2. Movement follows the user’s action and preserves spatial continuity.
3. Layout shift is minimized; existing content does not jump unnecessarily.
4. One dominant transition per interaction.
5. Loading indicators disclose real system state; no fake progress.
6. Reduced-motion produces a complete, not degraded, experience.
7. Map camera movement is interruptible.
8. Motion durations are tokenized and performance-budgeted.

## 3. Motion tokens

### Durations

- instant: 0–80 ms;
- fast: 120–160 ms;
- standard: 180–240 ms;
- deliberate: 280–360 ms;
- camera: 400–800 ms maximum for ordinary navigation.

No routine UI transition should exceed 400 ms. City-level map fly transitions may use up to 800 ms and must be cancellable.

### Easing

- entrance: decelerating;
- exit: accelerating;
- shared-layout movement: smooth standard curve;
- map camera: native/interpolated curve with reduced-motion fallback.

Spring motion is restricted to bounded direct manipulation, never data charts or repeated card entrances.

## 4. Search interactions

- Filter apply: chip updates immediately; results use subtle opacity/position transition only after response.
- Sorting: preserve card positions where possible and announce update.
- View change: shared query header remains fixed; list/split/map crossfade within 180–240 ms.
- Result selection: card and map marker share a selection state without pulsing indefinitely.
- Compare tray: slides from logical block end; no bouncing.
- Skeletons match final geometry to prevent layout shift.

## 5. Map interactions

- Morocco → city: camera move plus progressive layer transition.
- City → area: choropleth/labels fade by zoom threshold; do not simultaneously animate every marker.
- Selected area opens side panel on desktop and bottom sheet on mobile.
- User pan/zoom cancels programmed camera movement.
- Cluster expansion uses camera navigation only when it materially reveals content.
- Current blocking city overlay is rejected for V1 because it interrupts task flow.

## 6. Price Atlas interactions

- Metric/filter change: axes remain stable where comparable.
- Histogram bars update with short interpolation; labels update synchronously.
- National ↔ city scale change requires a visible legend transition and text notice.
- Comparison tray additions use local confirmation, not page-wide animation.
- Time slider is future-only and must not imply continuous data when periods are sparse.

## 7. Feedback system

### Immediate feedback

Button pressed, filter toggled, favorite saved locally, compare selection added.

### Confirmed feedback

Server-backed save/alert/contact completion only after success response.

### Failure feedback

Inline, persistent enough to read, with retry or recovery. Never rely solely on a disappearing toast.

### Optimistic updates

Allowed only for reversible actions such as favorites; rollback must be clear on failure.

## 8. Loading policy

- Under 300 ms: avoid spinner flash.
- 300 ms–2 s: local skeleton/progress indication.
- Over 2 s: explanatory state and partial-results strategy where possible.
- Map basemap and intelligence layers have separate readiness indicators.
- Charts retain previous valid state while new filters load, labelled as updating.

## 9. Reduced motion

When `prefers-reduced-motion` is active:

- replace camera fly with jump or very short ease;
- remove parallax, scale pulses and shared-layout morphs;
- keep fades <= 100 ms or instant;
- preserve focus, selection, loading and state feedback;
- disable auto-playing visual sequences.

## 10. Performance budgets

- Main-thread animation work target < 4 ms/frame.
- Avoid animating layout properties; prefer transform/opacity.
- No continuous animation while idle.
- Maximum 50 simultaneously animated visible elements; normal target far lower.
- Motion library incremental bundle target < 35 kB gzip; prefer CSS/Web Animations for primitives.
- Map FPS p75 target >= 45 on defined mid-range mobile test device; aspirational 60 on capable devices.
- Long tasks > 50 ms during core interactions are failures.

## 11. Accessibility

- Focus moves only when interaction semantics require it.
- Live regions announce result and save state without repetition.
- Tooltips are not the sole source of information.
- Motion never communicates direction/meaning without text or state.
- Keyboard and pointer interactions receive equivalent feedback.

## 12. Motion matrix

| Surface | Interaction | Motion | Reduced mode |
|---|---|---|---|
| Search | filter results | local fade/translate | instant/fade |
| Search | view switch | crossfade | instant |
| Map | enter city | camera + layer reveal | jump |
| Map | select area | panel/sheet | instant |
| Atlas | metric change | stable-axis interpolation | instant update |
| Compare | add item | tray reveal | instant |
| Favorite | save | icon state | state only |
| Error | appear | no shake | same |

## 13. Roadmap

### MOT-0 — Audit and instrumentation

Inventory animations, layout shifts, long tasks and reduced-motion gaps.

### MOT-1 — Tokens and primitives

Durations, easing, disclosure, sheets, selection and loading.

### MOT-2 — Search continuity

Filters, result updates, view switching and compare tray.

### MOT-3 — Map and Atlas

Camera/layer choreography, chart updates and legend transitions.

### MOT-4 — Quality gates

Performance traces, reduced-motion screenshots and interaction regression tests.

## 14. Backlog

| ID | Task | Priority | Effort |
|---|---|---:|---:|
| MOT-01 | Motion token definitions | P0 | S |
| MOT-02 | Loading timing policy | P0 | M |
| MOT-03 | Reduced-motion contract | P0 | M |
| MOT-04 | Search transition prototypes | P0 | M |
| MOT-05 | Interruptible map camera | P0 | M |
| MOT-06 | Layer transition rules | P0 | L |
| MOT-07 | Atlas stable-axis transitions | P1 | M |
| MOT-08 | Feedback/toast/error standard | P0 | M |
| MOT-09 | Performance instrumentation | P0 | L |
| MOT-10 | Playwright reduced-motion gates | P0 | M |

## 15. Reviewer — cycle 1

**Initial score: 8.87/10 — FAIL**

Critical finding:

- Initial proposal allowed optimistic state for actions that could initiate external contact, risking a false impression of successful transmission.

Major findings:

- map camera was not explicitly interruptible;
- loading thresholds were undefined;
- chart transitions could imply continuity across incompatible scales;
- reduced-motion camera fallback was incomplete;
- performance target claimed 60 FPS universally;
- transient toasts could hide actionable errors.

## 16. Corrections

- Restricted optimistic UI to reversible local actions.
- Made camera animation cancellable by user interaction.
- Added loading timing thresholds.
- Required stable/comparable axes and explicit scale-change notices.
- Added jump fallback for reduced motion.
- Replaced universal 60 FPS claim with device-based p75 budgets.
- Required persistent inline recovery for actionable failures.

## 17. Final scoring

| Criterion | Score /10 |
|---|---:|
| Functional clarity | 9.7 |
| Search responsiveness | 9.8 |
| Map choreography | 9.5 |
| Atlas transitions | 9.4 |
| Reduced motion | 9.7 |
| Performance realism | 9.6 |
| Feedback integrity | 9.8 |
| Accessibility | 9.5 |
| Risk handling | 9.8 |
| Execution readiness | 9.5 |

**Final score: 9.63/10**

Critical findings open: 0  
Major findings open: 0

## 18. Certification

```text
A5 MOTION & INTERACTION
Cycles of correction: 2
Initial score: 8.87/10
Final score: 9.63/10
Verdict: CERTIFIED_FOR_A6
```
