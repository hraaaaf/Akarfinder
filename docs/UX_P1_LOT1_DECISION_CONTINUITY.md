# UX P1 LOT 1 — Result to decision continuity

## Objective

Turn the internal property detail page from a long information dossier into a decision-oriented journey without reducing evidence, provenance or source transparency.

## Product change

A new `PropertyDecisionHeader` appears before `PropertyDetailV2` and exposes:

- the compatibility conclusion for Mon Projet;
- an explicit evidence/provenance label;
- a cautious attention or market-reference state;
- price, location and the AkarFinder structured reading;
- canonical actions to save, compare or continue in Mon Projet.

The full property dossier remains unchanged below this layer.

## Non-effects

- no DATA acquisition or normalization change;
- no ranking change;
- no display-eligibility change;
- no source-access or contact-boundary change;
- no invented verification, certification or investment recommendation.

## Verification

Dedicated gate: `UX P1 Decision Continuity`.

It enforces:

- decision layer before the detailed dossier;
- canonical favorite, comparison and Mon Projet paths;
- no legacy buyer-profile/onboarding route;
- explicit evidence-safe wording;
- TypeScript and production build.
