# AKARFINDER — ROADMAP CANONIQUE

**Version : 2026-08-08**  
**Statut : P0-GOV-1 🔴 gouvernance agents en certification ; UX P1B.2 ✅ PR #376 ; prochain lot UX après audit métriques ; DATA-4.4A ✅ PR #379 ; DATA-4.4B 🔴 Promo Immo revalidation + canary 50**

`AGENTS.md` est la boussole de gouvernance obligatoire. `README.md` définit l’identité/doctrine. `docs/SESSION.md` porte le handover court. Ce fichier est l’unique roadmap.

# 0. P0-GOV-1 — Agent governance protocol 🔴

Objectif : rendre permanente la séparation **Builder → Reviewer indépendant → Release Certifier → merge → post-merge certification** pour tous les futurs LOTS AkarFinder, sans modifier l'avancement produit/DATA.

Scope du LOT :

- `AGENTS.md` = constitution/boussole unique ;
- `CLAUDE.md` = pointeur de découvrabilité uniquement ;
- équipe permanente et routage sous `.agents/` ;
- 8 procédures obligatoires sous `.skills/` ;
- template PR avec preuves Builder/Reviewer/Certifier ;
- `Agent Governance Gate` permanent, exécuté sur PR et push `main` ;
- processus 18 étapes, invalidation des preuves après changement de head SHA, UX score strictement >9.0 et DATA before/after obligatoire.

Processus de certification de **ce LOT lui-même** :

| Étape | État / preuve |
|---|---|
| Builder | ✅ implémentation isolée sur `agent/p0-gov-1-agent-governance` |
| Reviewer pass #1 | ⏳ après gel du head Builder |
| Corrections | ⏳ si `CHANGES_REQUIRED` |
| Reviewer final | ⏳ |
| PR | ⏳ |
| Exact-head CI | ⏳ |
| Specialized governance gate | ⏳ |
| Release Certifier pre-merge | ⏳ |
| Merge | ⏳ |
| Post-merge CI/gates | ⏳ |
| Release Certifier final | ⏳ |

Les SHA exacts de head/merge ne sont jamais inventés dans un commit auto-référentiel : ils sont consignés dans la PR, les commentaires Reviewer/Certifier, les runs GitHub et le rapport final, puis réconciliés dans une mise à jour canonique ultérieure si nécessaire.

**P0-GOV-1 n'est pas terminé tant que le verdict final post-merge n'est pas `CERTIFIED`.**

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
- mutation DATA : rollback avant activation ;
- Builder ≠ Reviewer ≠ Release Certifier ; le processus complet est défini dans `AGENTS.md`.

# 3. Lane UX

Acquis :

- P1A.0 ✅ PR #327 ;
- P1A.1 ✅ PR #328 — Geo Canonical Core, **9,5/10** ;
- P1A.2 ✅ PR #334 — Search Geo Contract ;
- P1A.3 ✅ PR #349 — Map State & Navigation, **9,3/10** ;
- P1A.4 ✅ PR #350 — Map Design System technique, cockpit flottant map-first ;
- P1A.5 ✅ PR #365 — Territorial Explorer progressif **Maroc → ville → quartier**, Geo Registry + canonical neighborhood data uniquement, URL/Search contracts préservés, responsive **390 / 430×932 / 768 / 1280**, **9,3/10** ;
- P1A.6 ✅ PR #369 — Responsive Hardening : audit natif **12 captures / 0 finding**, **21/21 tests**, score **9,2/10** ;
- P1B.1 ✅ PR #371 — **AkarFinder Map Visual Layer**, 16 arrondissements Casablanca shadow, couleurs non sémantiques, audit **3 captures / 0 finding**, score **9,1/10** ;
- P1B.2 ✅ PR #376 — **Sourced Territorial Intelligence** : `layer=price`, benchmarks quartier exacts appartement/achat, aucune interpolation/fallback ville, audit **3 captures / 0 finding**, score **9,2/10**.

## Prochain lot UX — audit préalable obligatoire

Auditer les métriques réellement calculables à la même granularité que les entités affichées : offre disponible, fraîcheur, confiance DATA et extension des prix exacts. Pas de donnée = neutre ; aucune interpolation ; aucune agrégation ville présentée comme quartier ; 430×932 obligatoire ; score strictement >9.0/10 sous la nouvelle gouvernance.

# 4. Fondation DATA acquise

Observation Ledger / Freshness / normalization / quality tiers ; Source Registry v2 / display eligibility ; Market Index / Property Graph foundation ; dedup ; Partner Feed ; OpenSERP / public sitemaps / Common Crawl ; 53 villes/pôles.

# 5. DATA-1 ✅

37 009 URLs / 7 051 domaines ; 8 727 registered domains Common Crawl ; univers 15 238 domaines ; 230 primary-source candidates ; 625 portal candidates ; Registry initial sans activation non autorisée.

# 6. DATA-4 — Reservoir Strategy

- **4.0 ✅ #341** — Avito+Mubawab : 35 134 normalized, 3 588 technical display, 0 policy-activable.
- **4.1A ✅ #343** — Avito unavailable : 95,06 % bruit ; 73 core-récupérables ; 0 policy-activable.
- **4.2 ✅ #344** — Dar Agadir = `ADMISSIBLE_GROWTH`; Agenz = `PARTNERSHIP_UPSIDE`.
- **4.3A → H ✅ jusqu’à #377** — Dar Agadir certifié au cap **500** selon `50+100+100+100+100+50`, TTL 14 jours, Search **500/500**, technical display **500/500**, drift **0 %**, Registry inchangé.
- **4.3I ✅ #367** — protection multi-channel freshness ownership.
- **4.3J ✅ #368** — ordre du trigger display corrigé.

## DATA-4.4 — Second Reservoir Expansion 🔴 ACTUEL

Objectif : reproduire le modèle Dar Agadir sur un second réservoir à fort rendement sans relâcher Registry, fraîcheur, qualité, déduplication et vérité publique.

### DATA-4.4A — Second Reservoir Qualification ✅ PR #379

Qualification read-only certifiée et mergée (`43d8086c`).

Snapshot production au choix :

| Source | Lignes | Normalized OK | Technical display | Fresh | Seed only | City | Type | Intent | Review |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| `promoimmomarrakech.com` | **3 005** | **3 000** | **2 923** | 9 | **2 996** | **3 005** | 2 556 | **2 905** | due_soon |
| `limmobiliersansfrontieres.com` | 1 414 | 563 | 573 | 94 | 1 320 | 607 | 1 107 | 1 068 | due_soon |
| `atlasimmobilier.com` | 793 | 414 | 420 | 2 | 791 | 445 | 558 | 70 | due_soon |
| `aykana.ma` | 647 | 467 | 472 | 62 | 585 | 486 | 507 | 534 | due_soon |

Décision certifiée : **`promoimmomarrakech.com` = `PREFERRED_PENDING_REVALIDATION`**. Qualification ≠ activation ; 0 write en 4.4A.

### DATA-4.4B — Promo Immo Source Revalidation + Canary 50 🔴

Lot actif. Le PR reste **DRY_RUN** jusqu’au merge.

Gates :

1. Registry exact `public_sitemap_canonical_link / public_sitemap_only / canonical_link_only / external_tail_link_only` ;
2. review `current|due_soon`, TTL 14 j, canal `public_sitemap` ;
3. `robots.txt` live + sitemap same-origin ;
4. population sitemap actuelle + intersection normalized ;
5. canary seulement `seed_only`, normalized, **Marrakech**, type/intention présents ;
6. quality tiers **A/B** uniquement ; tier C mesuré mais exclu ;
7. Public Search **50/50** et technical display **50/50** avant write ;
8. écran collision cross-source exacte sur titre+ville+type+intent+prix+surface ; aucun fuzzy-match inventé ;
9. contrôle Property Graph quand un lien direct existe ; cluster multi-membre connu = blocage ;
10. snapshot + apply manifest + rollback manifest exacts **50/50** ;
11. aucun detail-page fetch, aucune réutilisation contenu/image, aucun changement Registry/policy ;
12. CI = zéro write et `canaryWriteAuthorizedByThisRun=false`.

Après merge du dry-run uniquement, l’éventuel write des 50 devra avoir un preflight exact, une transaction 50/50, une vérification Search/display avant→après et un drift ≤1 %, sinon rollback immédiat.

Aucun passage à 100/500 n’est autorisé avant certification persistante du canary 50.

# 7. Lane business parallèle

**Agenz = priorité partenariat/feed** : hidden/internal-only tant qu’aucune autorisation écrite n’autorise une évolution Registry/produit.

# 8. Suite DATA

DATA-4.4B dry-run → canary 50 transactionnel si certifié → re-certification persistante → décision d’expansion bornée du second réservoir → autres sources admissibles → DATA-3 connectors → DATA-5/6/7 feeds/claim/workspace → 20K → 50K → 100K+.

# 9. Définition de terminé

La définition de terminé est désormais celle de `AGENTS.md` : étapes 1→18, Reviewer PASS, exact-head CI/gates, Certifier pre-merge GO, merge depuis le head attendu, `main` vérifié, post-merge CI/gates et verdict final. Aucun `100 % ✅` avant l'étape 18.

# 10. Prochaine action exacte

## Gouvernance

Fermer **P0-GOV-1** uniquement après Reviewer indépendant, corrections éventuelles, exact-head CI, Release Certifier pre-merge, merge attendu et certification post-merge.

## DATA

Certifier le dry-run **DATA-4.4B** sur les signaux publics actuels de Promo Immo Marrakech. Aucun write avant merge du contrat et des manifests exacts 50.

## UX

Auditer les métriques spatiales possédant une granularité territoriale exacte, une provenance explicable et un dénominateur stable avant de définir le prochain lot UX.
