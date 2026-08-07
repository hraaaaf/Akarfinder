# AKARFINDER — ROADMAP CANONIQUE

**Version : 2026-08-07**  
**Statut : UX P1A.5 ✅ PR #365 / P1A.6 prochain ; DATA-4.3H ✅ PR #364 / première expansion persistante ≤100 prochaine**

`README.md` définit l’identité/doctrine. `docs/SESSION.md` porte le handover court. Ce fichier est l’unique roadmap.

# 1. Cap produit

AkarFinder = **moteur de recherche immobilier + index national + couche d’intelligence** pour le Maroc.

- cœur produit : `/search` ;
- `/map` : complément spatial ;
- objectif long terme : **Property Graph du marché immobilier marocain** ;
- North Star DATA : `COVERAGE × FRESHNESS × QUALITY × DEDUP × RELEVANCE` ;
- paliers : **5K → 20K → 50K → 100K+** observations utiles, jamais du volume artificiel.

Pipeline canonique :

`DISCOVERY → INGESTION/OBSERVATION → NORMALIZATION → CANONICALIZATION → FRESHNESS → DEDUPLICATION/CLUSTERING → ENRICHMENT → INTELLIGENCE → DISPLAY ELIGIBILITY → RANKING → PUBLICATION/SERP`

# 2. Doctrine non négociable

- no-bypass absolu ;
- robots/sitemap/capability ≠ permission ;
- Source Registry obligatoire avant activation ;
- `DISCOVERED ≠ AUDITED ≠ POLICY_ASSIGNED ≠ ELIGIBLE ≠ INGESTIBLE ≠ DISPLAYABLE` ;
- aucune donnée/image/géométrie/coordonnée/proximité/partenariat inventé ;
- Search reste canonique ; Map partage son identité géographique ;
- migrations séparées du code applicatif ;
- une responsabilité / une branche / une PR / un merge ;
- tests + preuves avant merge ;
- mutation DATA : rollback avant activation.

# 3. Lane UX

Acquis :

- P1A.0 ✅ PR #327 ;
- P1A.1 ✅ PR #328 — Geo Canonical Core, **9,5/10** ;
- P1A.2 ✅ PR #334 — Search Geo Contract ;
- P1A.3 ✅ PR #349 — Map State & Navigation, **9,3/10** ;
- P1A.4 ✅ PR #350 — Map Design System, **9,3/10**, audit final **30 captures / 0 finding** ;
- P1A.5 ✅ PR #365 — Territorial Explorer progressif **Maroc → ville → quartier**, Geo Registry + canonical neighborhood data uniquement, URL/Search contracts préservés, aucun hard-coded geometry, responsive **390 / 430×932 / 768 / 1280**, états `/map`, `Rabat`, `Rabat/Agdal` certifiés, **48 captures / 0 finding**, **9,3/10**.

## P1A.6 — Responsive hardening 🔴 PROCHAIN UX

Objectif : durcir les comportements carte + panneaux + navigation sur mobile/tablette/desktop à partir des viewports certifiés, avec **430×932 obligatoire**, sans modifier les contrats Geo/URL ni introduire de nouvelle intelligence métier.

Puis : **P1B — intelligence cartographique**.

# 4. Fondation DATA acquise

Observation Ledger / Freshness / normalization / quality tiers ; Source Registry v2 / display eligibility ; Market Index / Property Graph foundation ; dedup ; Partner Feed ; OpenSERP / public sitemaps / Common Crawl ; 53 villes/pôles.

# 5. DATA-1 ✅

37 009 URLs / 7 051 domaines ; 8 727 registered domains Common Crawl ; univers 15 238 domaines ; 230 primary-source candidates ; 625 portal candidates ; Registry initial sans activation non autorisée.

# 6. DATA-4 — Reservoir Strategy

- **4.0 ✅ #341** — Avito+Mubawab : 35 134 normalized, 3 588 technical display, 0 policy-activable.
- **4.1A ✅ #343** — Avito unavailable : 95,06 % bruit ; 73 core-récupérables ; 0 policy-activable.
- **4.2 ✅ #344** — Dar Agadir = `ADMISSIBLE_GROWTH`; Agenz = `PARTNERSHIP_UPSIDE`.
- **4.3A ✅ #347** — 5 eligible shadow ; 6 425 revalidation-required.
- **4.3B ✅ #348** — 5 905 URLs sitemap ; 5 673 seed-only encore présentes.
- **4.3C ✅ #351** — 5 566 SHADOW_READY dont 5 564 seed-only ; 0 write/activation.
- **4.3D ✅ #353** — 100-row dry-run réversible ; `public_sitemap_presence`; TTL 14 jours ; 100/100 rollback ; 0 write/activation.
- **4.3E ✅ #355** — 10-row production rehearsal ; 10/10 apply, verify, rollback.
- **4.3F ✅ #358** — controlled promotion design ; initial 50, max 100/run, cap 500 avant re-certification, TTL 14 jours.
- **4.3G ✅ #362** — First Persistent Freshness Batch certifié ; batch déterministe 50, snapshot/rollback complet, observabilité Search/display, aucune display-policy mutation.
- **4.3H ✅ #364** — Controlled Expansion to 500 certifiée en DRY_RUN ; départ 50 persistent rows ; plan **[100,100,100,100,50]** ; max **100/run** ; TTL **14 jours** ; Registry+sitemap revalidés ; drift cap **1 %** ; Search/display mesurés ; **0 DB write / 0 activation** dans la PR.

## Prochaine action DATA — première expansion persistante sous contrat 4.3H

Effectuer un premier batch **≤100 lignes** uniquement après préflight exact Registry+sitemap.

Contraintes :

1. batch déterministe ≤100 ;
2. Registry + sitemap revalidés immédiatement avant write ;
3. seules lignes encore éligibles selon le contrat 4.3H ;
4. snapshot complet + rollback prêt ;
5. write freshness/evidence uniquement ;
6. canal `public_sitemap_presence`, TTL 14 jours ;
7. observabilité applied/skipped/drifted ;
8. arrêt/rollback si drift >1 % ou précondition cassée ;
9. mesure Search/display avant/après séparée de toute décision d’autorisation ;
10. aucune modification display/publication policy ;
11. aucune page détail/content reuse ;
12. cap cumulé 500 avant re-certification obligatoire.

Aucun numéro de lot suivant n’est canonique tant qu’il n’a pas été explicitement défini.

# 7. Lane business parallèle

**Agenz = priorité partenariat/feed** : 4 490 normalized, 1 227 fresh, 1 146 decision-structured, hidden/internal-only. Aucun changement avant autorisation écrite.

# 8. Suite DATA

Premier batch ≤100 sous contrat 4.3H → observation TTL/aging + mesure Search/display → batchs suivants jusqu’à 500 max → re-certification obligatoire → autres sources admissibles → DATA-3 connectors → DATA-5/6/7 feeds/claim/workspace → 20K → 50K → 100K+.

# 9. Définition de terminé

Scope respecté, tests/build/gates verts, preuves, Registry respecté, aucun bypass, PR mergée, prod vérifiée si write, rollback disponible, 3 MD alignés.

# 10. Prochaine action exacte

## DATA

Préparer puis exécuter la **première expansion persistante ≤100 lignes** sous le contrat DATA-4.3H, sans changement de display policy.

## UX — P1A.6

Durcir le responsive de la carte et de ses panneaux sur **390 / 430×932 / 768 / 1280**, score UX/UI ≥9/10, sans changer les contrats Geo/URL/Search.
