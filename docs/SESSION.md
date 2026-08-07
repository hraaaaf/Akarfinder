# AkarFinder — Session courante

**Mise à jour : 2026-08-07**  
**Lot DATA acquis : DATA-1.6A — Source Policy Evidence Review ✅ PR #333**  
**Prochain lot DATA : DATA-1.6B — Source Registry Assignment**  
**Lot UX certifié : CARTE-QUARTIER-P1A.2 — Search Geo Contract ✅ PR #334**  
**Prochain lot UX : CARTE-QUARTIER-P1A.3 — Map State & Navigation**

Ce fichier est le handover opérationnel court du projet. `docs/ROADMAP.md` reste l’unique roadmap canonique.

## Main canonique

`main` inclut notamment :

- Mon Projet P1B ✅ PR #318 ;
- CARTE-QUARTIER-P1A.0 ✅ PR #327 ;
- CARTE-QUARTIER-P1A.1 ✅ PR #328, score 9,5/10 ;
- **CARTE-QUARTIER-P1A.2 ✅ PR #334**, merge `1fbe3e4`, score **9,6/10**, head certifié `9c3a647`, **28/28 workflows verts** ;
- DATA-1.1 ✅ PR #322 ;
- DATA-1.2 ✅ PR #323 ;
- DATA-1.3A ✅ PR #324 ;
- DATA-1.3B ✅ PR #326 ;
- DATA-1.4 ✅ PR #329 ;
- DATA-1.5 ✅ PR #331, score **9,4/10** ;
- **DATA-1.6A ✅ PR #333**, merge `28fbdf5`, score **9,5/10**.

Invariants DATA : aucune migration DATA-1.6A, aucune policy Source Registry automatique, aucune ingestion, aucun auth/login, aucun bypass, aucun WARC fetch.

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

PR **#331**.

- **20/20 domaines audités** ;
- **19 `CAPABILITY_REVIEW_READY`** ;
- 1 homepage timeout : `damaneimmo.ma` ;
- familles : 3 RealHomes, 3 Houzez, 5 WordPress génériques, 8 structured-web ;
- 116 requêtes publiques ; max **7 GET/domain** sur budget 8 ;
- 0 write DB / 0 policy / 0 auth / 0 bypass / 0 WARC ;
- score **9,4/10**.

### DATA-1.6A — Source Policy Evidence Review ✅

PR **#333**, merge `28fbdf5`.

Entrée : les **19** sources `CAPABILITY_REVIEW_READY` certifiées par DATA-1.5.

Contrat live :

- maximum **5 GET publics/domain** ;
- UA explicite `AkarFinder-Policy-Evidence-Audit/1.0` ;
- `robots.txt` puis homepage si autorisée ;
- jusqu’à trois pages same-site de CGU/legal/privacy dans le budget ;
- redirects externes ou HTTP refusés ;
- aucun login/cookie/auth/challenge bypass ;
- texte juridique tiers non archivé : URL + statut + taille + SHA-256 + identifiants de signaux seulement ;
- préflight Source Registry : une lecture, zéro écriture.

Preuve finale, run **31182352538** :

- sources auditées : **19** ;
- requêtes : **79** ;
- max observé : **5/5 par domaine** ;
- `RESTRICTIVE_TERMS_FOUND` : **1** ;
- `TERMS_FOUND_NO_EXPLICIT_PERMISSION` : **3** ;
- `INSUFFICIENT_LEGAL_EVIDENCE` : **11** ;
- `ACCESS_OR_FETCH_LIMITED` : **4** ;
- `PUBLIC_CHANNEL_SIGNAL_FOUND` : **0** ;
- robots block-all : 0 ;
- noindex : 0 ;
- writes DB : **0** ;
- policies assigned : **0** ;
- Registry policy fields préremplis : **0** ;
- auth attempts : 0 ;
- bypass attempts : 0 ;
- WARC : 0.

Double-check qualitatif :

1. privacy-only ne vaut plus `TERMS_FOUND` ;
2. une URL légale redirigeant vers une homepage/non-legal page ne vaut plus preuve de CGU ;
3. timeout homepage ou pages légales explicitement disallow par robots deviennent `ACCESS_OR_FETCH_LIMITED` ;
4. `prior_authorization_required` seul ne suffit plus à conclure restrictif ;
5. `prestigeimmo.ma` reste `RESTRICTIVE_TERMS_FOUND` car ses CGU portent une restriction substantielle sur accès automatisé/copie/reproduction.

Cas prioritaires pour la revue 1.6B :

- `prestigeimmo.ma` → `PARTNERSHIP_REQUIRED_REVIEW` ;
- `mhproperties.ma` → `PARTNER_OR_INDEX_ONLY_REVIEW` ;
- `nouraimmobilier.ma` → `PARTNER_OR_INDEX_ONLY_REVIEW` ;
- `agadirimmobilier.org` → `PARTNER_OR_INDEX_ONLY_REVIEW` ;
- `marrakech-luxury-properties.com` → `ACCESS_OR_FETCH_LIMITED` car pages légales observées comme robots-disallowed ;
- `immobilier-pro-maroc.com` → privacy-only, donc preuve de réutilisation insuffisante ;
- les autres sources restent en revue manuelle tant que la preuve est insuffisante/limitée.

**Score final DATA-1.6A : 9,5/10.**  
Head certifié : `69f6545` — **20/20 workflows verts**.

## Doctrine DATA active

`DISCOVERED ≠ AUDITED ≠ AUTHORIZED ≠ INGESTIBLE ≠ DISPLAYABLE`

Et :

`TECHNICAL CAPABILITY ≠ SOURCE PERMISSION`

`PRIVACY PAGE ≠ TERMS ≠ REUSE PERMISSION`

Une détection Houzez/RealHomes/WordPress REST/sitemap/JSON-LD, un robots allow ou une page publique ne crée aucun droit d’usage.

## Prochain lot DATA — DATA-1.6B

### Source Registry Assignment

Responsabilité unique : convertir **uniquement les décisions suffisamment prouvées et explicitement revues** en entrées/mises à jour du `source_policy_registry` existant.

Règles :

- réutiliser le schéma Registry actuel ; aucune table parallèle ;
- migration séparée seulement si une vraie lacune de schéma est prouvée ;
- aucune policy déduite automatiquement de la seule catégorie 1.6A ;
- `RESTRICTIVE_TERMS_FOUND` doit rester bloqué pour ingestion/réutilisation tant qu’aucune autorisation écrite/partenariat ne change la preuve ;
- `TERMS_FOUND_NO_EXPLICIT_PERMISSION` nécessite décision humaine explicite avant `INDEX_ONLY`, `PARTNER_ONLY` ou autre policy ;
- `INSUFFICIENT_LEGAL_EVIDENCE` et `ACCESS_OR_FETCH_LIMITED` restent sans activation et nécessitent preuve/contact supplémentaire ;
- policy hash, evidence URLs, observed_at, review status et next review doivent rester traçables ;
- aucun connecteur/ingestion/publication avant gate Registry verte.

Gate :

`AUDITED → POLICY_ASSIGNED`

uniquement pour les sources dont la décision est démontrable.

## UX — état acquis

### CARTE-QUARTIER-P1A.2 — Search Geo Contract ✅

PR **#334**, merge `1fbe3e4`.

Contrat certifié :

- `district` est un filtre Search structuré réel et indépendant de `q` ;
- `/search?city=Rabat&district=Agdal` conserve l’identité géographique de bout en bout ;
- DB et Typesense appliquent le district avec canonicalisation Geo Registry ;
- SSR, état client et refresh API conservent le quartier via l’état `neighborhood` existant ;
- page quartier et handoff Map → Search utilisent `city + district` ;
- ODM ne sert pas les requêtes district tant que son read model ne peut pas certifier ce champ ;
- le gateway multi-source fail-closed sur district au lieu d’élargir silencieusement à la ville ;
- aucune migration, aucun nouveau modèle géographique, aucun redesign Map dans ce lot.

Preuve finale : head `9c3a647`, **28/28 workflows verts**, Search Truth, Geo Productization, Canonical Baseline, TypeScript et build production inclus.

**Score final CARTE-QUARTIER-P1A.2 : 9,6/10.**

## Prochain lot UX — CARTE-QUARTIER-P1A.3

### Map State & Navigation

Responsabilité unique : rendre l’état cartographique canonique, partageable et navigable sans perte de contexte.

Contrat cible :

`/map?city=rabat&district=agdal&layer=explore&project_id=...`

À faire :

- `city`, `district`, `layer` et `project_id` quand fourni ;
- Back/Forward et liens partageables ;
- Quartier → Map → Search → Mon Projet sans perte de contexte ;
- suppression de l’écran cinématique ville ;
- entrée immédiate dans la carte ;
- aucune géométrie inventée ni modification du contrat DATA.

Le lot DATA-1.6B reste indépendant et ne doit ni réécrire ni masquer cette lane UX.
