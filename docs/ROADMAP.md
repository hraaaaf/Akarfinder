# AKARFINDER — ROADMAP CANONIQUE

**Version : 2026-08-07**  
**Statut : CARTE-QUARTIER P1A.2 ✅ PR #334 ; P1A.3 prochain en UX ; DATA-1.6B ✅ PR #338 + #339 ; DATA-4 prochain en DATA**

Ce fichier est l’unique roadmap du projet. `README.md` définit l’identité et la doctrine ; `docs/SESSION.md` porte le handover courant.

# 1. Cap produit

AkarFinder est un **moteur de recherche immobilier, un index national et une couche d’intelligence pour le marché marocain**.

- cœur produit : `/search` ;
- `/map` : moteur complémentaire d’exploration spatiale et d’intelligence ;
- objectif long terme : **Property Graph du marché immobilier marocain** ;
- positionnement : search-first / intelligence-first, pas simple portail de dépôt d’annonces ;
- provenance, fraîcheur, qualité et divergences restent explicables ;
- la couverture doit croître sans sacrifier légalité, dédoublonnage, fraîcheur ni qualité.

Pipeline canonique :

`DISCOVERY → INGESTION / OBSERVATION → NORMALIZATION → CANONICALIZATION → FRESHNESS → DEDUPLICATION / CLUSTERING → ENRICHMENT → INTELLIGENCE → DISPLAY ELIGIBILITY → RANKING → PUBLICATION / SERP`

## North Star DATA

`COVERAGE × FRESHNESS × QUALITY × DEDUP × RELEVANCE`

Paliers bootstrap :

- **5K → 20K observations** : densité crédible sur marchés prioritaires ;
- **20K → 50K observations** : couverture multi-source nationale structurée ;
- **50K → 100K+ observations** : profondeur suffisante pour devenir un réflexe de recherche.

Les volumes sont exprimés d’abord en **observations exploitables**, puis en **propriétés canoniques actives** après dédoublonnage.

# 2. Doctrine non négociable

- no-bypass absolu : pas de proxy furtif, stealth, faux Googlebot, CAPTCHA solve, login/rate-limit bypass ;
- `robots.txt`, `noindex`, CGU, licence et policy source sont vérifiés avant activation ;
- **Source Registry obligatoire avant activation** ;
- `DISCOVERED ≠ AUDITED ≠ POLICY_ASSIGNED ≠ ELIGIBLE ≠ INGESTIBLE ≠ DISPLAYABLE` ;
- technical capability ≠ permission ;
- robots allow ≠ licence ;
- privacy policy ≠ CGU ≠ permission de réutilisation ;
- contenu partenaire/autorisé ≠ résultat public indexé ≠ signal marché interne ;
- aucune donnée, image, géométrie, coordonnée, proximité ou partenariat inventé ;
- Search reste le moteur canonique ;
- Map, Search, SEO et Mon Projet partagent l’identité géographique canonique ;
- une couleur cartographique = une signification active ;
- migrations séparées du code applicatif ;
- une responsabilité / une branche / une PR / un merge par lot ;
- aucun contournement temporaire présenté comme final.

# 3. État acquis

## UX publique ✅

- Vendre ✅ ;
- Accueil P1 ✅ PR #299 ;
- Neuf P1 ✅ score **9,1/10** ;
- Acheter P1 ✅ PR #312, **9,1/10** ;
- Louer P1 ✅ PR #313, **9,0/10** ;
- Mon Projet P1A ✅ PR #314, **9,2/10** ;
- Mon Projet P1B ✅ PR #318 ;
- CARTE-QUARTIER-P1A.0 ✅ PR #327, **9,5/10** ;
- CARTE-QUARTIER-P1A.1 ✅ PR #328, **9,5/10** ;
- **CARTE-QUARTIER-P1A.2 ✅ PR #334**, merge `1fbe3e4`.

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
- **DATA-1.1 → DATA-1.6B acquis**.

# 4. CARTE / QUARTIER — ROADMAP UX

## Vision

Deux moteurs complémentaires :

- **Search** = recherche immobilière canonique ;
- **Map** = exploration spatiale et intelligence.

Hiérarchie :

`Maroc → Ville → Quartier → Zone → Bien`

Couches préparées :

`Géographie | Offre | Prix | Densité | Typologie | Style de vie | Repères | Projet`

Règles :

1. aucune géométrie inventée ;
2. aucune précision fabriquée ;
3. une couleur = une signification active ;
4. une couche publique exige une provenance suffisante ;
5. chaque étape UX/UI : double-check + score **≥ 9,0/10**.

## CARTE-QUARTIER-P1A — Fondation 🔴

### P1A.0 — Contrat produit & documentaire ✅

PR #327, score 9,5/10.

### P1A.1 — Geo Canonical Core ✅

PR #328, score 9,5/10.

Architecture :

`Geo Registry → canonical neighborhood data → Map`

Acquis : `/map` ne contourne plus l’identité géographique canonique.

### P1A.2 — Search Geo Contract ✅

PR **#334**, merge `1fbe3e4`.

Contrat :

`/search?city=Rabat&district=Agdal`

Acquis :

- `district` dans `SearchQuery` ;
- parsing URL et stable key ;
- DB et Typesense appliquent le district canonique ;
- `q` reste texte libre ;
- gateway fail-closed lorsque le provider ne supporte pas `district` ;
- ODM sans district autoritatif ne peut pas élargir silencieusement à la ville ;
- SSR/client/API conservent le district ;
- page quartier et Map transmettent `city + district` vers Search ;
- aucune nouvelle structure géographique ni migration.

### P1A.3 — Map State & Navigation 🔴 PROCHAIN UX

Objectif : conserver le contexte spatial de bout en bout.

Contrat cible :

`/map?city=rabat&district=agdal&layer=explore&project_id=...`

Travail :

- `city`, `district`, `layer`, intention/filtres utiles et `project_id` ;
- Back/Forward ;
- URL partageable ;
- Quartier → Map → Search → Mon Projet sans perte de contexte ;
- suppression des handoffs encore dépendants de `q` ;
- entrée immédiate dans la carte.

Gate : aucune perte silencieuse de `district`.

### P1A.4 — AkarFinder Map Design System

- MapLibre = moteur, pas identité visuelle ;
- fond clair ivoire/sable ;
- eau bleu AkarFinder ;
- deep-blue = structure/navigation ;
- bronze = sélection/intelligence ;
- palette territoriale désaturée ;
- clusters/marqueurs/labels/légendes AkarFinder ;
- dark mode spécifique ;
- certification light/dark ≥ 9/10.

### P1A.5 — Territorial Explorer

Vue Maroc : villes documentées, géométries réelles seulement, zones inconnues neutres.

Vue Ville : quartiers documentés, polygones réels ; sinon centroid/marker, jamais faux contour.

### P1A.6 — Map UX Responsive

Mobile : carte plein écran + bottom sheet.

Desktop : carte ~65–70 % + intelligence ~30–35 %.

Certification 360/390/768/1280–1440, clavier/tactile, light/dark.

## CARTE-QUARTIER-P1B — Intelligence géographique 🟠

### P1B.1 — Truthful Market Signals

États publics : `DISTRICT`, `CITY`, `UNAVAILABLE`. Aucun fallback ambigu.

### P1B.2 — Map Layer Engine

Modes : Explorer, Marché, Densité, Style de vie.

### P1B.3 — Heatmaps & Choropleths

- choroplèthe pour données zonales ;
- heatmap pour points ;
- prix/m² uniquement si certifié ;
- offre basée sur observations réelles.

### P1B.4 — Buildings & Landmark Layer

Sources candidates : OpenStreetMap, Overture Maps, Microsoft Global Building Footprints et autres datasets compatibles/licenciés.

### P1B.5 — Landmark Visual Language

Vérité géographique séparée de l’habillage AkarFinder.

### P1B.6 — Cockpit Quartier

`/immobilier/[city]/[district]` devient une page de décision : mini-map, prix/scope/preuve, volume, typologies, résultats récents, landmarks sourcés, CTA Search/Map.

## CARTE-QUARTIER-P2 — Spatial Intelligence 🟡

- P2.1 Lifestyle Graph ;
- P2.2 Advanced Multi-filter Map ;
- P2.3 Demand / Opportunity Intelligence agrégée ;
- P2.4 Compare Areas ;
- P2.5 2.5D/3D uniquement si valeur démontrée.

# 5. PHASE DATA — P0 STRATÉGIQUE

Objectif : un index immobilier marocain **dense, multi-source, frais, dédupliqué et gouverné**.

Le système cumulatif combine :

- discovery public web ;
- résultats publics admissibles ;
- sitemaps / structured data ;
- connecteurs CMS génériques ;
- feeds agences/promoteurs ;
- annonces utilisateurs ;
- données ouvertes/géographiques ;
- historique ;
- partenariats et claim de catalogues.

## DATA-0 — Stabiliser le pipeline 🔴

1. B3.4.4 Deduplication & Change Detection ;
2. B3.4.5 Quarantine & Review ;
3. B3.4.6 Publication Canary ;
4. vérité prix/surface/géographie ;
5. freshness/lifecycle par source ;
6. profondeur réelle LISTING ;
7. Property Graph / dedup V3.

Gate : aucun volume massif ne contourne ces garanties.

# 6. DATA-1 — Moroccan Real Estate Web Census ✅

## DATA-1.1 — Domain Census Core ✅ PR #322

Core déterministe, fail-closed, normalisation et priorité de revue.

## DATA-1.2 — Existing Reserve Census ✅ PR #323

- **37 009 URLs** ;
- **7 051 domaines** ;
- batch initial HIGH/MEDIUM : **983 domaines**.

## DATA-1.3A — Common Crawl URL Index Contract ✅ PR #324

Deux lanes discovery-only : `.ma real estate` et `external + Morocco/city`.

## DATA-1.3B — Common Crawl Live Evidence ✅ PR #326

- `CC-MAIN-2026-25` ;
- **300/300 Parquet** ;
- **9 087 hosts bruts** ;
- **8 970 hosts canoniques** ;
- **8 727 registered domains** ;
- 0 WARC / 0 write / 0 activation.

## DATA-1.4 — Candidate Reconciliation ✅ PR #329

- univers : **15 238 domaines** ;
- B3 ∩ Common Crawl : **532** ;
- `PRIMARY_SOURCE_CANDIDATE` : **230** ;
- `PORTAL_CANDIDATE` : **625** ;
- aucune policy automatique.

## DATA-1.5 — Candidate Technical Capability Audit ✅ PR #331

- 20 domaines P0 ;
- **19 review-ready** ;
- 3 RealHomes ;
- 3 Houzez ;
- 5 WordPress génériques ;
- 8 structured-web ;
- 116 GET publics ;
- 0 write/policy/auth/bypass/WARC ;
- score **9,4/10**.

## DATA-1.6A — Source Policy Evidence Review ✅ PR #333

Run `31182352538` :

- 19 sources ;
- 79 GET ; max 5/domain ;
- 1 restrictive ;
- 3 terms sans permission explicite ;
- 11 preuves insuffisantes ;
- 4 access/fetch-limited ;
- 0 policy/write/auth/bypass/WARC ;
- score **9,5/10**.

## DATA-1.6B — Source Registry Assignment ✅ PR #338 + #339

### Preflight

Run `31186041984` :

- 19 décisions ;
- 0 target existant ;
- 0 activation ;
- 19 hidden ;
- 0 direct fetch ;
- 0 partner ;
- PR #338 : **20/20 workflows verts**.

### Production

Première tentative : échec atomique avant insert car `execution_score` est `GENERATED ALWAYS`.

Hotfix PR #339 : retrait de la colonne générée + test permanent, **20/20 verts**.

Migration finale appliquée : `data_1_6b_source_registry_assignment`, version Supabase **20260807142236**.

État certifié :

- **19/19** lignes Registry ;
- authorization : 1 prohibited / 3 permission_required / 15 unverified ;
- acquisition : 1 blocked / 18 public_index_internal_only ;
- detail : 1 prohibited / 3 permission_required / 11 legal_review_required / 4 paused ;
- display : 1 blocked / 18 internal_signal_only ;
- hidden : **19** ;
- unsafe/activating : **0**.

`prestigeimmo.ma` : hard-block `prohibited / blocked / hidden / no-bypass`.

**Score final DATA-1.6B : 9,6/10.**

Gate DATA-1 atteinte pour ce batch :

`DISCOVERED → AUDITED → POLICY_ASSIGNED`

Aucune des 19 sources n’est encore `ELIGIBLE` pour direct connector ingestion.

# 7. DATA-4 — Large Reservoir Depth Audit 🔴 PROCHAIN DATA

Objectif : mesurer si le passage **5K → 20K observations** se trouve déjà dans les grands réservoirs connus.

Premier scope audit-only :

1. Mubawab ;
2. Avito immobilier ;
3. autres portails marocains majeurs classés ensuite par volume × policy × profondeur.

Pour chaque source :

- volume public annoncé/estimé ;
- nombre de représentations/observations AkarFinder actuelles ;
- profondeur discovery actuelle ;
- sitemap / pagination / structured data ;
- robots / CGU / noindex ;
- policy Registry ;
- historique Common Crawl ;
- pages détail publiquement atteignables ;
- fraîcheur ;
- duplication/bruit ;
- gap potentiel ;
- meilleur mode admissible : `PARTNER_FEED`, `INDEX_ONLY`, `PUBLIC_DISCOVERY`, `NO_INGESTION`.

### Gate DATA-4.0

Le premier lot **ne construit pas de scraper**. Il produit une matrice de profondeur et de gouvernance suffisamment solide pour décider où investir.

Sortie cible :

`SOURCE → PUBLIC DEPTH → AKARFINDER COVERAGE → GAP → POLICY → ALLOWED MODE → NEXT ACTION`

# 8. DATA-2 — Structured Web Mining 🔴 P0

## DATA-2.1 — Common Crawl URL Index

Utiliser l’index pour discovery massif, historique et densité de domaines — jamais comme permission implicite.

## DATA-2.2 — Web Data Commons

Rechercher `RealEstateListing`, `Apartment`, `House`, `Residence`, `Offer`, `PostalAddress`, `Organization/LocalBusiness` pour discovery/historique/schema mapping.

Données historiques ≠ fraîcheur 2026.

# 9. DATA-3 — Universal Site Connector 🔴 P0/P1

Objectif : **un connecteur par famille technique**, pas un scraper par agence.

Familles déjà justifiées par DATA-1.5 :

1. WordPress générique ;
2. Houzez ;
3. RealHomes ;
4. sitemap + JSON-LD ;
5. WordPress REST public si admissible ;
6. XML public ;
7. CSV public ;
8. JSON/API publique explicitement admissible ;
9. HTML générique en dernier recours.

Architecture :

`domain → policy gate → tech fingerprint → connector family → observation → canonical pipeline`

Le connecteur n’est développé/activé que pour sources Registry éligibles.

# 10. DATA-5 — Universal Partner Feed 🔴 P1

Réutiliser `partner_feed_*`.

Formats possibles selon besoin réel : Native JSON, Generic JSON/XML/CSV, Trovit, OpenImmo/ImmoXML, Kyero, RESO/Web API, sitemap/Schema.org, WordPress/Houzez.

# 11. DATA-6 — Index / Claim my agency 🔴 P1

Parcours :

`URL agence → discovery → pages détectées → organisation candidate → claim → vérification → feed direct`

Présence indexée ≠ partenariat.

# 12. DATA-7 — Professional Workspace / B3.5 🔴 P1

Couche d’activation/gestion après densité DATA suffisante.

Flux canonique :

`Acquisition publique → activation request → qualification → organisation → membres → ownership → feeds → projets/listings → leads`

Réutiliser :

- `professional_organizations` ;
- `professional_memberships` ;
- `professional_activation_requests` ;
- `professional_property_submissions` ;
- `professional_projects` ;
- `professional_media_assets` ;
- `professional_listing_ownership` ;
- `professional_lead_assignments` ;
- `partner_feed_*` ;
- auth/RLS canoniques.

# 13. DATA-8 — Open Geodata & Property Graph 🟠 P1/P2

Évaluer selon licence : Overture Maps, Microsoft Global Building Footprints, OpenStreetMap, limites, POI, transports, adresses/bâtiments.

Usage : géocodage, canonicalisation, dedup, Property Graph, proximité, bâtiments/landmarks Map.

Ces données n’augmentent pas le compteur d’annonces.

# 14. DATA-9 — Historical Observation Layer 🟠 P2

Conserver lorsque licite : apparition/disparition, prix, surface/description, source, dates, disponibilité, signatures admissibles, historique de cluster.

# 15. DATA-10 — External Datasets / Research Radar 🟠 P2

GitHub/Hugging Face/datasets tiers = `RESEARCH_ONLY` par défaut jusqu’à audit licence, provenance, fraîcheur, sécurité et architecture.

# 16. Stratégie de montée en volume

## Palier A — 5K → 20K

Priorité : densité Casablanca, Rabat-Salé-Témara, Marrakech, Tanger, Agadir.

Leviers :

1. profondeur grands réservoirs — DATA-4 ;
2. structured discovery admissible ;
3. sitemaps/structured data ;
4. long-tail agences/promoteurs ;
5. connecteurs CMS génériques ;
6. profondeur LISTING ;
7. déduplication.

## Palier B — 20K → 50K

- domaines compatibles avec connecteurs existants ;
- extension nationale ;
- feeds directs ;
- claim organisations ;
- utilisateurs ;
- freshness/reactivation.

## Palier C — 50K → 100K+

- réseau de feeds professionnels ;
- CRM ;
- promoteurs/programmes neufs ;
- SEO/Search ;
- partenaires institutionnels/data ;
- boucle B2B.

À ce stade, la croissance ne doit plus dépendre principalement du crawling.

# 17. KPI DATA obligatoires

- domains discovered / audited / policy-assigned / eligible ;
- sources par policy ;
- observations découvertes / ingérées / display-eligible ;
- propriétés canoniques uniques ;
- dedup rate ;
- freshness buckets ;
- couverture ville/quartier/type/transaction ;
- complétude prix/surface/géo/photos ;
- fetch/parse/normalize failures ;
- stale/removed/churn ;
- contribution par connecteur et source ;
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

1. DATA-1.6B ✅ — 19 Registry policies conservatrices, 0 activation ;
2. **DATA-4.0 — Large Reservoir Depth Audit** ;
3. classer grands réservoirs par `gap × policy × freshness × difficulty` ;
4. approfondir uniquement les modes admissibles ;
5. construire DATA-3 Universal Site Connector à partir des familles réellement utiles et éligibles ;
6. atteindre **20K observations** avec preuve qualité ;
7. DATA-5/6/7 feeds + claim + Professional Workspace ;
8. atteindre **50K** avec part directe croissante ;
9. DATA-8 Property Graph/geodata ;
10. historique/intelligence/SEO vers **100K+**.

# 19. Définition de terminé

Un lot est terminé uniquement si :

- périmètre respecté ;
- tests ciblés + TypeScript + build verts si code ;
- CI sans régression pertinente ;
- preuves et métriques avant/après disponibles ;
- policy Registry documentée pour toute source gouvernée/activée ;
- aucun bypass ;
- aucun workflow temporaire résiduel ;
- pour UX/UI : double-check + score ≥ 9/10 ;
- mobile/desktop/light/dark/accessibilité selon scope ;
- `README.md`, `docs/ROADMAP.md`, `docs/SESSION.md` alignés ;
- PR mergée ;
- production vérifiée si migration/write ;
- SESSION contient la prochaine action exacte.

# 20. Prochaine action exacte

## DATA — DATA-4.0

1. partir du `main` synchronisé ;
2. auditer les sources majeures déjà dans `source_policy_registry` ;
3. commencer par **Mubawab et Avito immobilier** ;
4. mesurer volume public, stock/observations AkarFinder, gap, freshness, sitemap/pagination/structured data, Common Crawl depth et policy ;
5. ne faire **aucune ingestion de masse** dans ce lot ;
6. produire une matrice `source → coverage → gap → policy → allowed mode → next action` ;
7. double-check des chiffres et de la frontière légale ;
8. scorer le lot ;
9. sélectionner ensuite le premier reservoir/connector réellement rentable et admissible.

## UX — P1A.3

1. introduire `district` dans l’état URL `/map` ;
2. conserver `city`, `district`, `layer`, filtres utiles et `project_id` ;
3. rendre Back/Forward et partage stables ;
4. supprimer les pertes de contexte Map → Search → Quartier ;
5. double-check fonctionnel/visuel ;
6. score ≥ 9/10 avant P1A.4.
