# AkarFinder — Session courante

**Mise à jour : 2026-08-07**
**Lot DATA acquis : DATA-1.5 — Candidate Technical Capability Audit ✅ PR #331**
**Prochain lot DATA : DATA-1.6A — Source Policy Evidence Review**
**Lot UX certifié : CARTE-QUARTIER-P1A.1 — Geo Canonical Core ✅ PR #328**
**Prochain lot UX : CARTE-QUARTIER-P1A.2 — Search Geo Contract**

Ce fichier est le handover opérationnel court du projet. `docs/ROADMAP.md` reste l’unique roadmap canonique.

## Main canonique

`main` inclut notamment :

- Mon Projet P1B ✅ PR #318 ;
- CARTE-QUARTIER-P1A.0 ✅ PR #327 ;
- CARTE-QUARTIER-P1A.1 ✅ PR #328, score 9,5/10 ;
- DATA-1.1 ✅ PR #322 ;
- DATA-1.2 ✅ PR #323 ;
- DATA-1.3A ✅ PR #324 ;
- DATA-1.3B ✅ PR #326 ;
- DATA-1.4 ✅ PR #329 ;
- **DATA-1.5 ✅ PR #331**, merge `1f8b398`, score **9,4/10**.

Invariants : aucune migration DATA-1.5, aucune policy Source Registry automatique, aucune ingestion, aucun auth/login, aucun bypass, aucun WARC fetch.

## DATA-1 — état acquis

### DATA-1.2 — Reserve Census ✅

- **37 009 URLs distinctes** ;
- **7 051 domaines**.

### DATA-1.3B — Common Crawl Live Evidence ✅

- **300/300 Parquet** analysés ;
- **9 087 hosts bruts** ;
- **8 970 hosts canoniques** ;
- **8 727 registered domains** ;
- aucun WARC/content fetch, write DB ou source activée.

### DATA-1.4 — Candidate Reconciliation ✅

- univers réconcilié : **15 238 domaines** ;
- B3 ∩ Common Crawl : **532** ;
- **15 222 non enregistrés** ;
- `PRIMARY_SOURCE_CANDIDATE` : **230** ;
- `PORTAL_CANDIDATE` : **625** ;
- fail-closed : 0 write / 0 policy.

### DATA-1.5 — Candidate Technical Capability Audit ✅

PR **#331**, merge `1f8b398`.

Batch certifié : les **20 meilleurs `PRIMARY_SOURCE_CANDIDATE` non enregistrés** de DATA-1.4.

Preuve finale :

- **20/20 domaines audités** ;
- **19 `CAPABILITY_REVIEW_READY`** ;
- **1 homepage timeout** : `damaneimmo.ma`, conservé `REVIEW_ONLY_HOMEPAGE_UNAVAILABLE` ;
- 116 requêtes publiques au total ;
- max **7 GET/domain** sur budget 8 ;
- robots block-all : 0 ;
- noindex : 0 ;
- challenge/access-control final : 0 ;
- writes DB : 0 ;
- policies : 0 ;
- auth : 0 ;
- bypass : 0 ;
- WARC : 0.

Familles techniques :

- `WORDPRESS_REALHOMES` : **3** ;
- `WORDPRESS_HOUZEZ` : **3** ;
- `WORDPRESS_GENERIC` : **5** ;
- `SITEMAP_JSONLD` : **4** ;
- `SITEMAP_STRUCTURED_HTML` : **2** ;
- `STRUCTURED_HTML` : **2** ;
- `BLOCKED_OR_INACCESSIBLE` : **1** (timeout, pas interdiction prouvée).

Top capacité observée :

1. `valfoncier.ma` — 100 — RealHomes + sitemap + JSON-LD + WP REST ;
2. `marrakech-luxury-properties.com` — 100 — WordPress + sitemap + JSON-LD + WP REST ;
3. `agadirimmobilier.org` — 100 — Houzez + sitemap + JSON-LD + WP REST ;
4. `proimmobilier.ma` — 95 — RealHomes + WP REST ;
5. `rabatimmo.ma` — 95 — RealHomes + WP REST ;
6. `agadirimmobilier.ma` — 95 — Houzez ;
7. `capital-properties.ma` — 93 — WordPress + WP REST ;
8. `immobilier-pro-maroc.com` — 93 — WordPress + WP REST.

Volumes structurés remarquables :

- `immo-maroc.com` : **1 210** URLs sitemap observées, **1 090** listing-like ;
- `leaderimmo.ma` : **799** URLs sitemap et **833** signaux listing cumulés ;
- `agadirimmobilier.ma` : **320** URLs sitemap ;
- `mhproperties.ma` : **292** URLs sitemap ;
- `immohammedia.com` : **282** URLs sitemap.

Deux faux positifs ont été découverts malgré des runs CI verts puis corrigés avant merge : URL homepage mal passée au gate robots, puis détection Cloudflare/CAPTCHA trop large. Les tests protègent désormais ces régressions.

**Score final DATA-1.5 : 9,4/10.**

## Doctrine DATA active

`DISCOVERED ≠ AUDITED ≠ AUTHORIZED ≠ INGESTIBLE ≠ DISPLAYABLE`

Et :

`TECHNICAL CAPABILITY ≠ SOURCE PERMISSION`

La détection Houzez/RealHomes/WordPress REST/sitemap/JSON-LD ne crée aucun droit d’usage.

## Prochain lot DATA — DATA-1.6A

### Source Policy Evidence Review

Responsabilité : établir en **read-only** la preuve policy des candidats techniquement viables avant toute écriture Registry.

Pour le batch P0 prioritaire :

- robots et noindex observés avec date ;
- CGU / licence / mentions de réutilisation ;
- distinction consultation publique vs extraction/réutilisation ;
- canaux techniquement et contractuellement permis ;
- besoin de partenariat ou consentement ;
- contact/claim possible ;
- `legal_review_required` si ambigu ;
- evidence URLs + résumé + dates ;
- recommandation de décision, **sans l’écrire dans Source Registry**.

Gate 1.6A : aucune policy finale sans preuve explicite, aucun connecteur activé, aucune ingestion.

Ensuite seulement : **DATA-1.6B — Source Registry Assignment**, sur le schéma existant, pour les décisions suffisamment prouvées.

## UX — handover

CARTE-QUARTIER-P1A.1 est mergé via PR #328. Prochaine étape UX indépendante : **CARTE-QUARTIER-P1A.2 — Search Geo Contract**, avec `district` comme filtre structuré et `q` conservé comme texte libre.
