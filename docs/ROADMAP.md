# AKARFINDER — ROADMAP CANONIQUE

**Version : 2026-08-07**  
**Statut : UX P1A.4 ✅ / P1A.5 prochain ; DATA-4.3F ✅ PR #358 / DATA-4.3G prochain**

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
- **4.3E ✅ #355** — 10-row production rehearsal ; 10/10 apply, verify, rollback ; état freshness/evidence restauré ; `updated_at` = audit trail non rollbackable.
- **4.3F ✅ #358** — controlled promotion design ; live proof : **6 533 total**, **6 431 seed-only**, **102 fresh-confirmed**, **0 canary residue**, Registry eligible, drift 0 %, **50 initial**, **100/run max**, **500 avant re-certification**, TTL 14 jours, 0 write/activation.

## DATA-4.3G — First Persistent Freshness Batch 🔴 PROCHAIN DATA

Objectif : effectuer le premier batch **persistant** de 50 lignes maximum sans modifier la policy d’affichage.

Contraintes :

1. batch déterministe ≤50 ;
2. préflight Registry + sitemap immédiatement avant write ;
3. seules lignes `seed_only` sans canal `public_sitemap_presence` ;
4. snapshot complet incluant `updated_at` comme audit trail ;
5. write uniquement freshness/evidence ;
6. canal `public_sitemap_presence`, TTL 14 jours ;
7. vérification 50/50 post-write ;
8. observabilité applied/skipped/drifted ;
9. arrêt si drift >1 % ;
10. rollback disponible mais pas exécuté automatiquement si batch certifié ;
11. aucune modification display/publication policy ;
12. aucune page détail/content reuse ;
13. mesurer l’impact Search/display séparément sans l’interpréter comme nouvelle autorisation.

Gate : 4.3G peut persister un premier batch fraîcheur, mais ne peut pas bulk-promote les 5 564 ni modifier la policy publique.

# 7. Lane business parallèle

**Agenz = priorité partenariat/feed** : 4 490 normalized, 1 227 fresh, 1 146 decision-structured, hidden/internal-only. Aucun changement avant autorisation écrite.

# 8. Suite DATA

4.3G first persistent batch → observation TTL/aging + mesure Search/display → batchs suivants jusqu’à 500 max → re-certification obligatoire → autres sources admissibles → DATA-3 connectors → DATA-5/6/7 feeds/claim/workspace → 20K → 50K → 100K+.

# 9. Définition de terminé

Scope respecté, tests/build/gates verts, preuves, Registry respecté, aucun bypass, PR mergée, prod vérifiée si write, rollback disponible, 3 MD alignés.

# 10. Prochaine action exacte

## DATA — DATA-4.3G

Construire et certifier un **premier batch persistant de 50 lignes maximum**, sans changement de display policy ni bulk activation.

## UX — P1A.5

Construire le **Territorial Explorer** au-dessus du Map Design System certifié, sans modifier l’identité Geo, le contrat URL ni la vérité des données.
