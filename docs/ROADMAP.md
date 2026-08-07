# AKARFINDER — ROADMAP CANONIQUE

**Version : 2026-08-07**  
**Statut : UX P1A.3 ✅ / P1A.4 prochain ; DATA-4.3E ✅ PR #355 / DATA-4.3F prochain**

# 1. Cap produit

AkarFinder = **moteur de recherche immobilier + index national + couche d’intelligence** pour le Maroc. Cœur : `/search`. `/map` complète Search. Objectif long terme : **Property Graph**.

North Star DATA : `COVERAGE × FRESHNESS × QUALITY × DEDUP × RELEVANCE`.

Paliers : **5K → 20K → 50K → 100K+** observations utiles, jamais du volume artificiel.

Pipeline : `DISCOVERY → OBSERVATION → NORMALIZATION → CANONICALIZATION → FRESHNESS → DEDUP → ENRICHMENT → INTELLIGENCE → DISPLAY ELIGIBILITY → RANKING → PUBLICATION`.

# 2. Doctrine non négociable

No-bypass ; robots/sitemap/capability ≠ permission ; Source Registry obligatoire ; aucune donnée inventée ; Search canonique ; mutation DATA = preuve + rollback ; un lot = une responsabilité/branche/PR/merge ; tests/gates avant merge.

# 3. Lane UX

- P1A.0 ✅ PR #327 ;
- P1A.1 ✅ PR #328 — 9,5/10 ;
- P1A.2 ✅ PR #334 ;
- P1A.3 ✅ PR #349 — 9,3/10 ;
- **P1A.4 — Map Design System 🔴**.

Puis P1A.5 Territorial Explorer → P1A.6 Responsive → P1B intelligence cartographique.

# 4. Fondation DATA

Observation Ledger/Freshness/quality/dedup ; Source Registry v2 ; display eligibility ; Market Index ; Partner Feed ; OpenSERP/public sitemaps/Common Crawl ; 53 villes/pôles.

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
- **4.3E ✅ #355** — premier rehearsal production borné : 10/10 apply freshness, 10/10 vérification, 10/10 rollback. Après rollback : 10/10 `seed_only`, `fresh_last_seen_at=NULL`, `fresh_channels=[]`, metadata originale, aucune `freshness_evidence`. Les 10 restent dans `public_search_representations_v1`, donc cette présence n’a pas été créée par le canary. `updated_at` a été touché et n’était pas dans le snapshot initial : dette explicitement documentée.

## DATA-4.3F — Controlled Promotion Design 🔴 PROCHAIN DATA

Objectif : passer du rehearsal 10-row à une promotion contrôlée du signal sitemap sans bulk activation implicite.

Scope :

1. définir batch size initial et plafonds ;
2. capturer **toutes** les colonnes mutables dans le snapshot, y compris `updated_at` ou décider explicitement qu’il est audit-log non rollbackable ;
3. TTL 14 jours et expiration/aging ;
4. batchs idempotents avec préconditions exactes ;
5. observabilité : applied/skipped/drifted/rolled-back ;
6. vérification Search/display avant et après chaque batch ;
7. aucune modification de Source Registry/display policy dans le même lot ;
8. aucune page détail/content reuse ;
9. arrêt automatique sur drift robots/sitemap/Registry ;
10. pas de promotion des 5 564 en une seule opération.

Gate : 4.3F doit produire un design + canary plan suffisamment sûr pour décider d’un premier batch persistant séparé. Il ne doit pas activer massivement la SERP.

# 7. Business parallèle

**Agenz = priorité partenariat/feed** : 4 490 normalized, 1 227 fresh, 1 146 decision-structured, hidden/internal-only. Aucun changement avant autorisation écrite.

# 8. Suite DATA

4.3F controlled promotion design → premier batch persistant borné si certifié → mesure impact Search/canonical-link → autres sources admissibles → DATA-3 connectors → DATA-5/6/7 feeds/claim/workspace → 20K → 50K → 100K+.

# 9. Définition de terminé

Scope respecté, tests/build/gates verts, preuves, Registry respecté, aucun bypass, PR mergée, prod vérifiée si write, rollback vérifié, 3 MD alignés.

# 10. Prochaine action exacte

## DATA — DATA-4.3F

Formaliser la promotion contrôlée de `public_sitemap_presence` : batchs bornés, snapshot complet, TTL/aging, idempotence, observabilité et arrêt fail-closed sur drift.

## UX — P1A.4

Construire le **Map Design System** sans modifier l’identité Geo ni la vérité des données.
