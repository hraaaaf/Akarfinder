# AKARFINDER — ROADMAP CANONIQUE

**Version : 2026-08-07**  
**Statut : UX P1A.4 ✅ / P1A.5 prochain ; DATA-4.3E ✅ PR #355 / DATA-4.3F prochain**

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
- P1A.4 ✅ PR #350 — Map Design System, **9,3/10**, audit final **30 captures / 0 finding**.

## P1A.5 — Territorial Explorer 🔴

Construire l’exploration Maroc → ville → quartier au-dessus du Map Design System sans inventer géométrie/proximité, préserver URL/Search/Quartier/Mon Projet, auditer 390/768/1280, score ≥9/10.

Puis : P1A.6 Responsive → P1B intelligence cartographique.

# 4. Fondation DATA acquise

Observation Ledger / Freshness / normalization / quality tiers ; Source Registry v2 / display eligibility ; Market Index / Property Graph foundation ; dedup ; Partner Feed ; OpenSERP / public sitemaps / Common Crawl ; 53 villes/pôles.

# 5. DATA-1 ✅

37 009 URLs / 7 051 domaines ; 8 727 registered domains Common Crawl ; univers 15 238 domaines ; 230 primary-source candidates ; 625 portal candidates ; Registry initial sans activation non autorisée.

# 6. DATA-4 — Reservoir Strategy

- **4.0 ✅ #341** — Avito+Mubawab : 35 134 normalized, 3 588 technical display, 0 policy-activable.
- **4.1A ✅ #343** — Avito unavailable : 95,06 % bruit ; 73 core-récupérables ; 0 policy-activable.
- **4.2 ✅ #344** — Dar Agadir = `ADMISSIBLE_GROWTH`; Agenz = `PARTNERSHIP_UPSIDE`.
- **4.3A ✅ #347** — 5 eligible shadow ; 6 425 revalidation-required.
- **4.3B ✅ #348** — 5 905 URLs sitemap ; 5 673 seed-only encore présentes ; 10 requêtes ; 0 détail/content reuse/write/activation.
- **4.3C ✅ #351** — 5 566 SHADOW_READY dont 5 564 seed-only ; 0 duplicate/policy blocked/write/activation.
- **4.3D ✅ #353** — 100-row dry-run réversible ; canal `public_sitemap_presence`; TTL 14 jours ; 100/100 rollback ; 20/20 gates ; 0 write/activation.
- **4.3E ✅ #355** — premier rehearsal production : 10/10 apply freshness, 10/10 verify, 10/10 rollback. Après rollback : 10/10 `seed_only`, `fresh_last_seen_at=NULL`, `fresh_channels=[]`, metadata originale, aucune `freshness_evidence`. Les 10 restent dans `public_search_representations_v1`, donc cette présence n’a pas été créée par le canary. `updated_at` a été touché et n’était pas dans le snapshot initial : désormais explicitement audit trail non rollbackable.

## DATA-4.3F — Controlled Promotion Design 🔴 PROCHAIN DATA

Objectif : passer du rehearsal 10-row à une promotion contrôlée du signal sitemap sans bulk activation implicite.

Scope :

1. first persistent batch : **50 lignes** ;
2. hard cap : **100/run** ;
3. maximum cumulé : **500 lignes avant re-certification** ;
4. drift maximal : **1 %** ;
5. canal `public_sitemap_presence`, TTL 14 jours ;
6. `updated_at` capturé comme audit trail non rollbackable ;
7. idempotence + préconditions exactes ;
8. observabilité applied/skipped/drifted/rolled-back ;
9. arrêt fail-closed sur drift Registry/robots/sitemap ;
10. aucune modification display/publication policy dans ce lot ;
11. aucune page détail/content reuse ;
12. jamais 5 564 lignes en une opération.

Gate : 4.3F est design/read-only. Un succès autorise seulement un premier batch persistant séparé.

# 7. Lane business parallèle

**Agenz = priorité partenariat/feed** : 4 490 normalized, 1 227 fresh, 1 146 decision-structured, hidden/internal-only. Aucun changement avant autorisation écrite.

# 8. Suite DATA

4.3F controlled promotion design → premier batch persistant borné si certifié → mesure impact Search/canonical-link → autres sources admissibles → DATA-3 connectors → DATA-5/6/7 feeds/claim/workspace → 20K → 50K → 100K+.

# 9. Définition de terminé

Scope respecté, tests/build/gates verts, preuves, Registry respecté, aucun bypass, PR mergée, prod vérifiée si write, rollback vérifié, 3 MD alignés.

# 10. Prochaine action exacte

## DATA — DATA-4.3F

Formaliser la promotion contrôlée de `public_sitemap_presence` : batch 50, plafond 100/run, 500 avant re-certification, drift 1 %, snapshot complet, TTL/aging, observabilité et arrêt fail-closed.

## UX — P1A.5

Construire le **Territorial Explorer** au-dessus du Map Design System certifié, sans modifier l’identité Geo, le contrat URL ni la vérité des données.
