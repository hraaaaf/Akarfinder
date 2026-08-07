# AKARFINDER — ROADMAP CANONIQUE

**Version : 2026-08-07**  
**Statut : CARTE-QUARTIER P1A.2 ✅ PR #334 ; P1A.3 prochain en UX ; DATA-4.0 ✅ PR #341 ; DATA-4.1 prochain en DATA**

Ce fichier est l’unique roadmap du projet. `README.md` définit l’identité et la doctrine ; `docs/SESSION.md` porte le handover opérationnel courant.

# 1. Cap produit

AkarFinder est un **moteur de recherche immobilier, un index national et une couche d’intelligence pour le marché marocain**.

- cœur produit : `/search` ;
- `/map` : moteur complémentaire d’exploration spatiale et d’intelligence ;
- objectif long terme : **Property Graph du marché immobilier marocain** ;
- positionnement : search-first / intelligence-first ;
- la couverture doit croître sans sacrifier légalité, fraîcheur, qualité, provenance ni dédoublonnage.

Pipeline canonique :

`DISCOVERY → INGESTION / OBSERVATION → NORMALIZATION → CANONICALIZATION → FRESHNESS → DEDUPLICATION / CLUSTERING → ENRICHMENT → INTELLIGENCE → DISPLAY ELIGIBILITY → RANKING → PUBLICATION / SERP`

North Star DATA :

`COVERAGE × FRESHNESS × QUALITY × DEDUP × RELEVANCE`

Paliers bootstrap :

- **5K → 20K observations** : densité crédible sur marchés prioritaires ;
- **20K → 50K** : couverture nationale multi-source structurée ;
- **50K → 100K+** : profondeur suffisante pour devenir un réflexe de recherche.

Le volume brut n’est jamais une métrique de succès autonome.

# 2. Doctrine non négociable

- no-bypass absolu : pas de stealth, proxy furtif, faux Googlebot, CAPTCHA solve, login/rate-limit bypass ;
- `robots.txt`, sitemap, noindex et capacité technique ne valent jamais permission ;
- **Source Registry obligatoire avant activation** ;
- `DISCOVERED ≠ AUDITED ≠ POLICY_ASSIGNED ≠ ELIGIBLE ≠ INGESTIBLE ≠ DISPLAYABLE` ;
- technical capability ≠ permission ;
- privacy policy ≠ CGU ≠ permission de réutilisation ;
- contenu partenaire/autorisé ≠ résultat public indexé ≠ signal marché interne ;
- aucune donnée, image, géométrie, coordonnée, proximité ou partenariat inventé ;
- Search reste le moteur canonique ;
- Map, Search, SEO et Mon Projet partagent l’identité géographique canonique ;
- migrations séparées du code applicatif ;
- une responsabilité / une branche / une PR / un merge par lot ;
- tests et preuves avant merge ;
- aucun contournement temporaire présenté comme final.

# 3. État acquis

## UX publique ✅

- Accueil P1 ✅ PR #299 ;
- Neuf P1 ✅ ;
- Acheter P1 ✅ PR #312 ;
- Louer P1 ✅ PR #313 ;
- Mon Projet P1A ✅ PR #314 ;
- Mon Projet P1B ✅ PR #318 ;
- CARTE-QUARTIER-P1A.0 ✅ PR #327 ;
- CARTE-QUARTIER-P1A.1 ✅ PR #328, score **9,5/10** ;
- CARTE-QUARTIER-P1A.2 ✅ PR #334.

## Fondation DATA ✅

- Observation Ledger ;
- Freshness/Lifecycle ;
- normalisation et quality tiers ;
- display eligibility ;
- Source Registry v2 ;
- Market Index / fondation Property Graph ;
- dédoublonnage conservant les observations ;
- Discovery Expansion B3 ;
- Coverage Gap Auditor ;
- Partner Feed B3.4.x ;
- OpenSERP, sitemaps publics et Common Crawl ;
- 53 villes/pôles dans la logique acquisition ;
- DATA-1.1 → DATA-1.6B ✅ ;
- DATA-4.0 ✅.

# 4. CARTE / QUARTIER — ROADMAP UX

## Vision

Deux moteurs complémentaires :

- **Search** = recherche immobilière canonique ;
- **Map** = exploration spatiale et intelligence.

Hiérarchie :

`Maroc → Ville → Quartier → Zone → Bien`

Règles :

1. aucune géométrie inventée ;
2. aucune précision fabriquée ;
3. une couleur = une signification active ;
4. une couche publique exige une provenance suffisante ;
5. chaque étape UX/UI : double-check + score **≥ 9,0/10**.

### P1A.0 — Contrat produit & documentaire ✅ PR #327
### P1A.1 — Geo Canonical Core ✅ PR #328
### P1A.2 — Search Geo Contract ✅ PR #334

Contrat acquis : `/search?city=Rabat&district=Agdal` avec `district` structuré, Geo Registry canonique et fail-closed lorsqu’un provider ne supporte pas le district.

### P1A.3 — Map State & Navigation 🔴 PROCHAIN UX

Contrat cible :

`/map?city=rabat&district=agdal&layer=explore&project_id=...`

Travail :

- conserver `city`, `district`, `layer`, filtres/intention utiles et `project_id` ;
- Back/Forward ;
- URL partageable ;
- Quartier → Map → Search → Mon Projet sans perte de contexte ;
- aucune perte silencieuse de `district`.

### P1A.4 — AkarFinder Map Design System
### P1A.5 — Territorial Explorer
### P1A.6 — Map UX Responsive

Puis P1B : truthful market signals, layer engine, heatmaps/choropleths, buildings/landmarks et cockpit quartier.

# 5. PHASE DATA — P0 STRATÉGIQUE

Objectif : un index immobilier marocain **dense, multi-source, frais, dédupliqué et gouverné**.

Le système cumule :

- discovery public web ;
- résultats publics admissibles ;
- sitemaps / structured data lorsque policy compatible ;
- connecteurs CMS génériques ;
- feeds agences/promoteurs ;
- annonces utilisateurs ;
- données ouvertes/géographiques ;
- historique ;
- partenariats et claim de catalogues.

## DATA-0 — Stabiliser le pipeline

- B3.4.4 Deduplication & Change Detection ;
- B3.4.5 Quarantine & Review ;
- B3.4.6 Publication Canary ;
- vérité prix/surface/géographie ;
- freshness/lifecycle ;
- profondeur LISTING ;
- Property Graph / dedup V3.

# 6. DATA-1 — Moroccan Real Estate Web Census ✅

## DATA-1.1 — Domain Census Core ✅ PR #322
## DATA-1.2 — Existing Reserve Census ✅ PR #323

- **37 009 URLs distinctes** ;
- **7 051 domaines** ;
- **983 HIGH/MEDIUM** au premier tri.

## DATA-1.3A — Common Crawl URL Index Contract ✅ PR #324
## DATA-1.3B — Common Crawl Live Evidence ✅ PR #326

- `CC-MAIN-2026-25` ;
- **300/300 Parquet** ;
- **9 087 hosts bruts** ;
- **8 970 hosts canoniques** ;
- **8 727 registered domains** ;
- 0 WARC / 0 write / 0 activation.

## DATA-1.4 — Candidate Reconciliation ✅ PR #329

- univers : **15 238 domaines** ;
- `PRIMARY_SOURCE_CANDIDATE` : **230** ;
- `PORTAL_CANDIDATE` : **625**.

## DATA-1.5 — Candidate Technical Capability Audit ✅ PR #331

- 20 domaines P0 ;
- **19 review-ready** ;
- 3 RealHomes ; 3 Houzez ; 5 WordPress génériques ; 8 structured-web ;
- score **9,4/10**.

## DATA-1.6A — Source Policy Evidence Review ✅ PR #333

- 19 sources ;
- 1 restrictive ;
- 3 terms sans permission explicite ;
- 11 preuves insuffisantes ;
- 4 access/fetch-limited ;
- score **9,5/10**.

## DATA-1.6B — Source Registry Assignment ✅ PR #338 + #339

Production :

- **19/19** lignes Registry ;
- authorization : 1 prohibited / 3 permission_required / 15 unverified ;
- acquisition : 1 blocked / 18 public_index_internal_only ;
- hidden : **19/19** ;
- unsafe/activating : **0** ;
- migration Supabase version **20260807142236** ;
- score final **9,6/10**.

# 7. DATA-4 — Large Reservoir Depth Audit

Objectif : mesurer si le passage **5K → 20K observations** se trouve déjà dans les grands réservoirs connus, sans confondre profondeur technique et inventaire publiable.

Contrat :

`PUBLIC VISIBLE → DISCOVERED/SEEDED → NORMALIZED → TECHNICALLY DISPLAYABLE → POLICY-ACTIVABLE`

## DATA-4.0 — Mubawab + Avito Reservoir Baseline ✅ PR #341

Score **9,6/10**, 19/19 workflows verts, audit read-only.

Résultat live certifié :

| Source | Normalized | Technical display | Policy-activable | Normalization unavailable | Fresh confirmed |
|---|---:|---:|---:|---:|---:|
| Avito | **23 925** | **231** | **0** | **22 227** | **10** |
| Mubawab | **11 209** | **3 357** | **0** | **7 506** | **902** |
| **Total** | **35 134** | **3 588** | **0** | **29 733** | **912** |

Mubawab : compteur public borné observé **106 947**, soit **95 738** de gap public→normalized. La policy reste restrictive ; ce gap est un sujet partenariat/licence ou public-index admissible, pas une permission de crawl.

Avito : aucun compteur national immobilier fiable n’a été retenu. Le sitemap déclaré reste un signal technique, pas une autorisation.

Conclusion : **les grands réservoirs contiennent beaucoup de profondeur technique mais 0 ligne actuellement policy-activable publiquement**.

## DATA-4.1 — Avito Internal Reservoir Recovery Audit 🔴 PROCHAIN DATA

Objectif : expliquer et segmenter les **22 227 lignes Avito déjà détenues** en `normalization_status=unavailable`, sans aucun nouveau fetch source.

Scope strict :

- données déjà présentes dans AkarFinder uniquement ;
- croiser `discovery_candidates`, `source_offer_seeds`, `thin_index_normalized_documents_v2`, observations/historique déjà stockés et métadonnées de provenance existantes ;
- identifier pourquoi la normalisation est `unavailable` ;
- mesurer les champs récupérables sans réseau : city, intent, property type, price, surface, title/snippet, provenance ;
- distinguer :
  - `RECOVERABLE_FROM_EXISTING_DATA` ;
  - `INSUFFICIENT_EXISTING_EVIDENCE` ;
  - `POLICY_BLOCKED_FOR_NEW_OBSERVATION` ;
  - `NOISE_OR_NON_LISTING` ;
- aucune mutation dans DATA-4.1A ;
- aucun fetch Avito ;
- aucune sitemap traversal ;
- aucun changement de Source Registry ;
- aucune publication.

Sortie attendue :

`22 227 unavailable → causes → récupérables depuis données existantes → non récupérables → valeur interne potentielle`

Gate : DATA-4.1 ne peut jamais transformer un gain de normalisation interne en “nouvel inventaire public” tant que la policy Avito reste hidden/internal-only.

## DATA-4.2 — Reservoir Policy / Partnership Decision

Après DATA-4.1 :

- Avito : décider si une re-review policy est justifiée ;
- Mubawab : partenariat/licence prioritaire si le gap commercial le justifie ;
- classer ensuite les autres grands portails par `gap × policy × freshness × difficulty`.

# 8. DATA-2 — Structured Web Mining

- Common Crawl URL Index pour discovery/historique ;
- Web Data Commons pour structured discovery/schema mapping ;
- données historiques ≠ fraîcheur 2026.

# 9. DATA-3 — Universal Site Connector

Objectif : **un connecteur par famille technique**, pas un scraper par agence.

Familles : WordPress, Houzez, RealHomes, sitemap + JSON-LD, WP REST admissible, XML/CSV/JSON/API publique autorisée, HTML générique en dernier recours.

Architecture :

`domain → policy gate → tech fingerprint → connector family → observation → canonical pipeline`

Activation seulement pour sources Registry éligibles.

# 10. DATA-5 — Universal Partner Feed

Réutiliser `partner_feed_*` et favoriser les feeds directs/licenciés.

# 11. DATA-6 — Index / Claim my agency

`URL agence → discovery → organisation candidate → claim → vérification → feed direct`

Présence indexée ≠ partenariat.

# 12. DATA-7 — Professional Workspace / B3.5

Flux canonique :

`Acquisition publique → activation request → qualification → organisation → membres → ownership → feeds → projets/listings → leads`

Réutiliser les modèles `professional_*`, `partner_feed_*`, auth et RLS existants.

# 13. DATA-8 — Open Geodata & Property Graph

Overture Maps, Microsoft Global Building Footprints, OpenStreetMap et autres sources compatibles/licenciées pour géocodage, canonicalisation, dedup et intelligence spatiale. Ces données n’augmentent pas le compteur d’annonces.

# 14. DATA-9 — Historical Observation Layer

Conserver lorsque licite apparition/disparition, prix, disponibilité, provenance et historique de cluster.

# 15. DATA-10 — External Datasets / Research Radar

GitHub/Hugging Face/datasets tiers = `RESEARCH_ONLY` jusqu’à audit licence, provenance, fraîcheur et sécurité.

# 16. Stratégie de montée en volume

## 5K → 20K

1. récupérer la profondeur **déjà détenue** lorsqu’elle est exploitable ;
2. structured discovery admissible ;
3. sources first-party et feeds activables ;
4. connecteurs CMS génériques ;
5. profondeur LISTING ;
6. déduplication ;
7. ne jamais compter les reservoirs hidden comme inventaire public.

## 20K → 50K

- extension nationale ;
- feeds directs ;
- claim organisations ;
- utilisateurs ;
- freshness/reactivation.

## 50K → 100K+

- réseau de feeds professionnels ;
- promoteurs/programmes neufs ;
- partenariats data ;
- Property Graph ;
- boucle B2B.

# 17. KPI DATA obligatoires

- domains discovered / audited / policy-assigned / eligible ;
- observations découvertes / normalisées / display-eligible / policy-activable ;
- propriétés canoniques uniques ;
- dedup rate ;
- freshness buckets ;
- couverture ville/quartier/type/transaction ;
- complétude prix/surface/géo ;
- normalisation unavailable/partial/normalized ;
- stale/removed/churn ;
- contribution par source/connecteur ;
- part partenaire/indexée/utilisateur ;
- densité SERP sur intentions prioritaires.

KPI lancement : **SERP utile, dense, fraîche et dédupliquée**, pas « 100K lignes ».

# 18. Séquence d’exécution consolidée

## Lane UX

1. P1A.0 ✅ ;
2. P1A.1 ✅ ;
3. P1A.2 ✅ ;
4. **P1A.3 — Map State & Navigation** ;
5. P1A.4 — Map Design System ;
6. P1A.5 — Territorial Explorer ;
7. P1A.6 — Responsive certification ;
8. P1B ;
9. Pro / Agences / Promoteurs ;
10. Immobilier / SEO ;
11. recette SERP + fiche bien.

## Lane DATA

1. DATA-1.6B ✅ ;
2. DATA-4.0 ✅ ;
3. **DATA-4.1 — Avito Internal Reservoir Recovery Audit** ;
4. DATA-4.2 — policy/partnership decision ;
5. classer les autres grands réservoirs ;
6. approfondir uniquement les modes admissibles ;
7. DATA-3 Universal Site Connector pour sources éligibles ;
8. atteindre **20K observations exploitables** avec preuve qualité ;
9. DATA-5/6/7 feeds + claim + Professional Workspace ;
10. atteindre **50K** avec part directe croissante ;
11. DATA-8 Property Graph/geodata ;
12. historique/intelligence/SEO vers **100K+**.

# 19. Définition de terminé

Un lot est terminé uniquement si :

- périmètre respecté ;
- tests ciblés + TypeScript + build verts si code ;
- CI sans régression pertinente ;
- preuves et métriques disponibles ;
- policy Registry documentée pour toute source gouvernée/activée ;
- aucun bypass ;
- aucun workflow temporaire résiduel ;
- pour UX/UI : double-check + score ≥ 9/10 ;
- `README.md`, `docs/ROADMAP.md`, `docs/SESSION.md` alignés ;
- PR mergée ;
- production vérifiée si migration/write ;
- SESSION contient la prochaine action exacte.

# 20. Prochaine action exacte

## DATA — DATA-4.1

1. partir du `main` incluant PR #341 ;
2. prendre uniquement les **22 227 Avito `normalization_status=unavailable` déjà en base** ;
3. classifier les causes d’indisponibilité ;
4. rechercher uniquement des signaux déjà stockés dans les tables canoniques ;
5. quantifier les champs récupérables sans réseau ;
6. produire une matrice `cause → volume → recoverable fields → confidence → next action` ;
7. zéro fetch Avito / zéro sitemap / zéro policy change / zéro write en 4.1A ;
8. ne jamais compter la récupération interne comme inventaire public ;
9. double-check des chiffres, score et PR avant tout sous-lot de write.

## UX — P1A.3

1. introduire `district` dans l’état URL `/map` ;
2. conserver `city`, `district`, `layer`, filtres utiles et `project_id` ;
3. rendre Back/Forward et partage stables ;
4. supprimer les pertes de contexte Map → Search → Quartier ;
5. double-check fonctionnel/visuel ;
6. score ≥ 9/10 avant P1A.4.
