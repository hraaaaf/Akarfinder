# AKARFINDER — ROADMAP CANONIQUE

**Version : 2026-08-07**  
**Statut : UX P1A.4 ✅ / P1A.5 prochain ; DATA-4.3G ✅ PR #362 / DATA-4.3H prochain**

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
- une responsabilité / une branche / une PR / un merge ;
- tests + preuves avant merge ;
- mutation DATA : snapshot + rollback avant activation ou expansion.

# 3. Lane UX

Acquis : P1A.0→P1A.4 ✅, avec P1A.4 PR #350, **9,3/10**, audit final **30 captures / 0 finding**.

## P1A.5 — Territorial Explorer 🔴

Construire l’exploration Maroc → ville → quartier sans inventer géométrie/proximité, préserver URL/Search/Quartier/Mon Projet, auditer 390/768/1280, score ≥9/10.

# 4. Fondation DATA acquise

Observation Ledger / Freshness / normalization / quality tiers ; Source Registry v2 ; display eligibility ; Market Index / Property Graph foundation ; dedup ; Partner Feed ; OpenSERP / public sitemaps / Common Crawl ; 53 villes/pôles.

# 5. DATA-1 ✅

37 009 URLs / 7 051 domaines ; 8 727 registered domains Common Crawl ; univers 15 238 domaines ; 230 primary-source candidates ; 625 portal candidates ; Registry initial sans activation non autorisée.

# 6. DATA-4 — Reservoir Strategy

- **4.0 ✅ #341** — Avito+Mubawab : 35 134 normalized, 3 588 technical display, 0 policy-activable.
- **4.1A ✅ #343** — Avito unavailable : 95,06 % bruit ; 73 core-récupérables ; 0 policy-activable.
- **4.2 ✅ #344** — Dar Agadir = `ADMISSIBLE_GROWTH`; Agenz = `PARTNERSHIP_UPSIDE`.
- **4.3A→D ✅ #347/#348/#351/#353** — reservoir Dar Agadir, sitemap revalidation, freshness shadow, evidence canary.
- **4.3E ✅ #355** — rehearsal production 10 lignes : apply/verify/rollback 10/10.
- **4.3F ✅ #358** — controlled promotion design : 50 initial, 100/run max, 500 avant re-certification, TTL 14 jours, drift cap 1 %.
- **4.3G ✅ #362** — premier batch persistant de **50** :
  - PR : **20/20 workflows verts** ;
  - dry-run : pool seed-only éligible **5 554**, 50/50 manifest + rollback ;
  - avant write : Public Search **50**, technical display **50** ;
  - production apply : **50/50** ;
  - état post-write : 50/50 `fresh_confirmed`, 50/50 `public_sitemap_presence`, 50/50 evidence typée ;
  - Public Search **50→50**, technical display **50→50** ;
  - source Dar Agadir : `seed_only 6431→6381`, `fresh_confirmed 102→152` ;
  - Registry inchangé : `public_sitemap_only / canonical_link_only / external_tail_link_only`, TTL 14, review `due_soon` ;
  - drift **0 %** ; rollback disponible mais non déclenché car batch certifié.

## DATA-4.3H — Controlled Expansion to 500 🔴 PROCHAIN DATA

Objectif : étendre le canal `public_sitemap_presence` jusqu’à **500 lignes cumulées maximum** avant re-certification obligatoire.

Contraintes :

1. batches déterministes **≤100/run** ;
2. compter les 50 déjà persistées dans le cumul ;
3. Registry + sitemap revalidés avant chaque run ;
4. uniquement `seed_only` sans canal sitemap ;
5. snapshot/rollback par batch ;
6. mesurer Public Search + technical display avant/après chaque run ;
7. TTL 14 jours ;
8. drift max **1 %** ;
9. stop immédiat sur partial apply, policy drift, sitemap drift ou effet public inattendu ;
10. aucune modification display/publication policy ;
11. aucune page détail/content reuse ;
12. **re-certification obligatoire à 500**, avant toute extension vers le pool restant.

Le but de 4.3H est de certifier la **répétabilité opérationnelle**, pas d’autoriser 5,5K lignes d’un coup.

# 7. Lane business parallèle

**Agenz = priorité partenariat/feed** : 4 490 normalized, 1 227 fresh, 1 146 decision-structured, hidden/internal-only. Aucun changement avant autorisation écrite.

# 8. Suite DATA

4.3H expansion contrôlée jusqu’à 500 → re-certification freshness/aging/Search impact → décision sur extension Dar Agadir → autres sources canonical-link admissibles → DATA-3 connectors → DATA-5/6/7 feeds/claim/workspace → 20K → 50K → 100K+.

# 9. Définition de terminé

Scope respecté, tests/build/gates verts, preuves, Registry respecté, aucun bypass, PR mergée, prod vérifiée si write, rollback disponible, 3 MD alignés.

# 10. Prochaine action exacte

## DATA — DATA-4.3H

Construire et certifier l’**expansion bornée jusqu’à 500 lignes cumulées**, en batches ≤100/run, sans changement de display policy.

## UX — P1A.5

Construire le **Territorial Explorer** au-dessus du Map Design System certifié, sans modifier l’identité Geo, le contrat URL ni la vérité des données.
