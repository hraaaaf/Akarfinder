# AkarFinder — Session courante

**Mise à jour : 2026-08-13**

Ce fichier est le handover opérationnel court. `README.md` porte l'identité/doctrine et `docs/ROADMAP.md` reste l'unique roadmap canonique.

## Priorité d’exécution

### Bibliothèque visuelle quartiers — Rabat

Doctrine verrouillée : **photos réelles uniquement**, provenance/licence défendables, aucun visuel généré dans la bibliothèque certifiée, aucune photo d’ambiance présentée comme photo du bien, activation Search généralisée toujours fail-closed jusqu’à P2.

- **P0 Souissi ✅ CLOSED** — pilote source → droits → rendu → QA → Storage/metadata certifié.
- **P1.1 Agdal ✅ CLOSED**.
- **P1.2 Akkari ✅ CLOSED**.
- **P1.3 Aviation ✅ CLOSED**.
- **P1.4 Hassan ✅ CLOSED**.
- **P1.5 Hay Riad ✅ CLOSED**.
- **P1.6 Les Orangers ✅ CLOSED**.
- **P1.7 Médina ✅ CLOSED — PR #556**.
  - merge `6cff1970131d7660337d1b9fe6588ade07791e14` ;
  - exact head certifié `1916999fa71d1c5b1407769f94f85dbc4dffbff3` ;
  - 3 sources réelles distinctes `signature / immobilier / lifestyle` ;
  - Product Design Reviewer ✅ ; Independent Release Certifier ✅ ; contrats/baselines exact-head ✅ ;
  - QA machine **10/10** sur 360 / 390 / 768 / 1024 / 1280 / 1440 ;
  - gate visuel humain **9,1/10** ;
  - correctif QA : la navigation mobile globale ne se rend plus sur `/visual-qa/*`, avec les gates bottom-nav exact-head restés verts ;
  - aucune activation Search implicite.
- **P1.8 Océan 🔄 ACTIF — PR #559**.
  - branche `agent/neighborhood-visual-p1-8-ocean-source` ;
  - sourcing réel verrouillé : Phare de Rabat / Bab El Had / coucher de soleil associé au quartier Océan ;
  - source-discovery exact : `561b72a1093fd4fc207e573447f9de94330e66b1`, `33bc545195a8ba9904e9b68519cf2c4714af11b7`, `ec76f6f5f505a30bafc32810158e7bc014eb4983` ;
  - relations truth-safe : `nearby_context / edge_context / nearby_context` ; jamais de claim `inside Océan` ;
  - registry, route QA, fixture Search, audit six viewports, contract, reviewer et release-certifier en cours de certification ;
  - P1.8 reste read-only côté activation : Storage/DB/Search généralisé attend P2.
- **P1.9 Yacoub El Mansour ⏳ NEXT** après closeout P1.8.
- **P2 Visual Resolver integration ⏳** après P1 Rabat.
- **P3 national rollout ⏳** puis **P4 visual intelligence ⏳**.

### DATA MASS

- **MASS-1 ✅ CLOSED / 9,5/10** — réservoir qualifié à 101 domaines.
- **MASS-2 ✅ CLOSED / 100 %** — 101/101 audités ; 43 `PERMISSION_REQUIRED`, 58 `HOLD`, 0 permission positive/activation inférée.
- **MASS-3 🔄** — Minimal Listing Index uniquement pour sources explicitement policy-admissibles.
- Doctrine : attribution ≠ permission ; robots/sitemap/capability ≠ permission ; candidate ≠ authorization ; Source Registry autoritaire ; no-bypass.

### UX/Search

- Convergence **UX-SEARCH-1 → UX-SEARCH-7 ✅ COMPLETE**.
- Header, Search controls, results toolbar, cards, visual inventory, mobile precision et bottom-nav disposent de gates exact-head dédiés.
- Toute réouverture exige un finding mesuré ; ne pas casser les predecessor gates pour accélérer une lane indépendante.

## Invariants opérationnels

- `code mergé dans main → SESSION/ROADMAP/README cohérents → lot suivant` ;
- zéro donnée, permission, géographie ou provenance inventée ;
- une responsabilité / branche / PR / merge par lot ;
- mutation production uniquement après preuve bornée + rollback lorsque applicable ;
- CI GitHub en cours n'interrompt pas le travail indépendant ;
- exact-head + preuve visuelle requise avant certification d'un lot visuel.

## Reprise exacte

**P1.8 Océan** : vérifier le diff final de PR #559 contre `main` après merge Médina → éliminer tout reliquat de scaffold Médina → lancer/analyser Contract + Product Design Reviewer + Independent Release Certifier → inspecter les six captures → gate humain ≥9/10 → merge → closeout canonique → P1.9 Yacoub El Mansour.
