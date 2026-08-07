# AKARFINDER — ROADMAP CANONIQUE

**Version : 2026-08-07**  
**Statut : CARTE-QUARTIER P1A.2 ✅ PR #334 ; P1A.3 prochain UX ; DATA-4.2 ✅ PR #344 ; DATA-4.3A prochain DATA**

`README.md` définit l’identité/doctrine. `docs/SESSION.md` porte le handover court. Ce fichier est l’unique roadmap.

# 1. Cap produit

AkarFinder = **moteur de recherche immobilier + index national + couche d’intelligence** pour le Maroc.

- cœur produit : `/search` ;
- `/map` : exploration spatiale complémentaire ;
- objectif long terme : **Property Graph du marché immobilier marocain** ;
- positionnement : search-first / intelligence-first.

Pipeline canonique :

`DISCOVERY → INGESTION/OBSERVATION → NORMALIZATION → CANONICALIZATION → FRESHNESS → DEDUPLICATION/CLUSTERING → ENRICHMENT → INTELLIGENCE → DISPLAY ELIGIBILITY → RANKING → PUBLICATION/SERP`

North Star DATA :

`COVERAGE × FRESHNESS × QUALITY × DEDUP × RELEVANCE`

Paliers : **5K→20K → 50K → 100K+**, sans sacrifier légalité, fraîcheur, qualité, provenance ou dédup.

# 2. Doctrine non négociable

- no-bypass absolu ;
- robots/sitemap/capability ≠ permission ;
- Source Registry obligatoire avant activation ;
- `DISCOVERED ≠ AUDITED ≠ POLICY_ASSIGNED ≠ ELIGIBLE ≠ INGESTIBLE ≠ DISPLAYABLE` ;
- privacy policy ≠ CGU ≠ permission ;
- partenaire/autorisé ≠ public-indexed ≠ signal interne ;
- aucune donnée/image/géométrie/coordonnée/proximité/partenariat inventé ;
- Search reste canonique ; Map partage son identité géographique ;
- migrations séparées du code applicatif ;
- une responsabilité / une branche / une PR / un merge ;
- tests + preuves avant merge.

# 3. État UX acquis

- Accueil/Neuf/Acheter/Louer/Mon Projet P1 acquis ;
- CARTE-QUARTIER-P1A.0 ✅ PR #327 ;
- P1A.1 Geo Canonical Core ✅ PR #328, score **9,5/10** ;
- P1A.2 Search Geo Contract ✅ PR #334.

## P1A.3 — Map State & Navigation 🔴 PROCHAIN UX

Cible : `/map?city=rabat&district=agdal&layer=explore&project_id=...`

- conserver city/district/layer/filtres/project_id ;
- Back/Forward ;
- URL partageable ;
- Map ↔ Search ↔ Quartier ↔ Mon Projet sans perte de contexte ;
- double-check + score ≥9/10.

Puis P1A.4 Map Design System → P1A.5 Territorial Explorer → P1A.6 Responsive → P1B intelligence cartographique.

# 4. Fondation DATA acquise

- Observation Ledger / Freshness / normalization / quality tiers ;
- display eligibility / Source Registry v2 ;
- Market Index / Property Graph foundation ;
- dedup conservant les observations ;
- Discovery Expansion / Coverage Gap ;
- Partner Feed ;
- OpenSERP / sitemaps publics / Common Crawl ;
- 53 villes/pôles.

# 5. DATA-1 — Moroccan Real Estate Web Census ✅

## DATA-1.1 ✅ PR #322
## DATA-1.2 ✅ PR #323

- **37 009 URLs / 7 051 domaines** ;
- 983 HIGH/MEDIUM.

## DATA-1.3A ✅ PR #324
## DATA-1.3B ✅ PR #326

- `CC-MAIN-2026-25` ;
- **300/300 Parquet** ;
- 9 087 hosts bruts ; 8 970 canoniques ; **8 727 registered domains** ;
- 0 WARC / 0 write / 0 activation.

## DATA-1.4 ✅ PR #329

- univers : **15 238 domaines** ;
- PRIMARY_SOURCE_CANDIDATE : **230** ;
- PORTAL_CANDIDATE : **625**.

## DATA-1.5 ✅ PR #331

20 domaines P0 ; 19 review-ready ; score **9,4/10**.

## DATA-1.6A ✅ PR #333

19 reviews policy ; score **9,5/10**.

## DATA-1.6B ✅ PR #338 + #339

- 19 lignes Registry en production ;
- 1 prohibited / 3 permission_required / 15 unverified ;
- hidden : 19/19 ;
- activations : **0** ;
- score **9,6/10**.

# 6. DATA-4 — Reservoir Strategy

Objectif : identifier le chemin réel vers **20K observations utiles** sans confondre profondeur technique et inventaire activable.

## DATA-4.0 — Mubawab + Avito Baseline ✅ PR #341

- **35 134 normalized** ;
- **3 588 technical display** ;
- **0 policy-activable** ;
- Avito : 22 227 unavailable ;
- Mubawab : gap public→normalized borné 95 738 ;
- score **9,6/10**.

## DATA-4.1A — Avito Internal Recovery Audit ✅ PR #343

Sur 22 227 unavailable :

- **1 098** immobilier canonique ;
- **21 129 (95,06%)** bruit/non-immobilier ;
- 804 type-compatible ;
- **73** type-compatible + intent + geo ;
- 1 025 insufficient evidence ;
- prix 0 / surface 0 ;
- policy-activable 0.

Décision : pas de Shadow Recovery Avito maintenant.

## DATA-4.2 — Reservoir Prioritization ✅ PR #344

Live proof paginé :

- normalized evidence : **56 803** ;
- display evidence : **22 426** ;
- Registry rows : **35** ;
- candidats : **14** ;
- writes / source requests / policy changes / activations : **0**.

### ADMISSIBLE_GROWTH

1. **daragadir.com — 71,75** ; 6 533 normalized ; 6 319 core-structured ; 6 528 technical display ; canonical-link/external-tail-link only.
2. promoimmomarrakech.com — 67,91.
3. aykana.ma — 53,09.
4. limmobiliersansfrontieres.com — 47,91.

### PARTNERSHIP_UPSIDE

1. **agenz.ma — 58,93** ; 4 490 normalized ; 1 227 fresh ; 1 146 decision-structured ; hidden/internal-only.
2. mouldar.com — 53,56.
3. masaken.ma — 48,73.

Minimum **500 lignes normalisées** pour gagner cette lane afin de viser un multiplicateur réellement significatif.

## DATA-4.3A — Dar Agadir Bounded Canonical-Link Activation Audit 🔴 PROCHAIN DATA

Objectif : mesurer, **sans activer**, combien des 6 533 observations Dar Agadir peuvent alimenter une surface de résultats externes bornée et vraie sous la policy existante.

Frontière Registry actuelle :

`public_sitemap_canonical_link → canonical_link_only → external_tail_link_only`

Scope :

- observations déjà détenues ;
- aucune page détail fetchée ;
- aucune description/image/contact copiés ;
- vérifier canonical URL, city/type/intent, fraîcheur, doublons et qualité minimale ;
- mesurer overlap avec listings déjà visibles/canoniques ;
- produire `eligible_shadow / stale / duplicate / insufficient / blocked` ;
- **0 policy change / 0 production activation en 4.3A**.

Sortie attendue :

`6 533 Dar Agadir → truthful canonical-link candidates → dedup/freshness/quality losses → bounded activation ceiling`

Si le shadow est propre et utile : DATA-4.3B = canary borné séparé, avec rollback et certification.

## Lane business parallèle

**Agenz = priorité partenariat/feed**. Aucun changement Registry ou produit avant autorisation écrite.

# 7. DATA-2 — Structured Web Mining

Common Crawl / Web Data Commons pour discovery et historique. Historical ≠ fresh.

# 8. DATA-3 — Universal Site Connector

Un connecteur par famille technique : WordPress, Houzez, RealHomes, sitemap+JSON-LD, WP REST admissible, XML/CSV/JSON/API autorisée, HTML générique en dernier recours.

`domain → policy gate → tech fingerprint → connector family → observation → canonical pipeline`

Activation uniquement si Registry éligible.

# 9. DATA-5 — Universal Partner Feed

Réutiliser `partner_feed_*` et privilégier feeds directs/licenciés.

# 10. DATA-6 — Claim my agency

`URL agence → discovery → organisation candidate → claim → vérification → feed direct`.

# 11. DATA-7 — Professional Workspace

`Acquisition publique → activation request → qualification → organisation → membres → ownership → feeds → projets/listings → leads`.

# 12. DATA-8 — Open Geodata / Property Graph

Overture / Microsoft footprints / OSM et sources compatibles pour géocodage, canonicalisation, dedup et intelligence spatiale. N’augmente pas le compteur d’annonces.

# 13. DATA-9 — Historical Observation Layer

Apparition/disparition, prix, disponibilité, provenance et historique de cluster lorsque licite.

# 14. DATA-10 — Research Radar

Datasets externes = `RESEARCH_ONLY` avant audit licence/provenance/fraîcheur.

# 15. Stratégie volume

## 5K → 20K

1. exploiter honnêtement profondeur déjà détenue ;
2. canonical/public-index admissible ;
3. first-party et feeds autorisables ;
4. Universal Site Connector ;
5. profondeur LISTING ;
6. dedup/freshness ;
7. ne jamais compter hidden/internal-only comme inventaire public.

## 20K → 50K

Extension nationale + feeds + claim + utilisateurs + reactivation.

## 50K → 100K+

Réseau professionnel + promoteurs + partenariats data + Property Graph + boucle B2B.

# 16. KPI DATA

- domains discovered/audited/policy-assigned/eligible ;
- observations discovered/normalized/technical-display/policy-activable ;
- propriétés canoniques ;
- dedup rate ;
- freshness ;
- couverture ville/quartier/type/transaction ;
- prix/surface/géo completeness ;
- unavailable/partial/normalized ;
- stale/removed/churn ;
- contribution par source/connecteur ;
- densité SERP.

North Star lancement : **SERP utile, dense, fraîche et dédupliquée**, pas « 100K lignes ».

# 17. Séquence consolidée

## Lane UX

P1A.3 → P1A.4 → P1A.5 → P1A.6 → P1B → Pro/Agences/Promoteurs → SEO → recette SERP.

## Lane DATA

1. DATA-4.3A Dar Agadir shadow audit ;
2. si certifié : DATA-4.3B canary borné ;
3. parallèle business : partenariat Agenz ;
4. classer/approfondir les autres sources canonical-link admissibles ;
5. DATA-3 Universal Site Connector pour sources éligibles ;
6. atteindre **20K observations exploitables** ;
7. DATA-5/6/7 feeds + claim + workspace ;
8. 50K puis DATA-8/9 vers 100K+.

# 18. Définition de terminé

Un lot est terminé uniquement si : périmètre respecté, tests/build/gates verts, preuves disponibles, Registry respecté, aucun bypass, aucun workflow temporaire, PR mergée, production vérifiée si write, et les 3 MD canoniques alignés.

# 19. Prochaine action exacte

## DATA — DATA-4.3A

1. partir du `main` incluant PR #344 ;
2. isoler `daragadir.com` ;
3. utiliser uniquement observations existantes et facts autorisés ;
4. mesurer URL canonique, structure, freshness, dedup et quality ;
5. classifier `ELIGIBLE_SHADOW / STALE / DUPLICATE / INSUFFICIENT / BLOCKED` ;
6. calculer le plafond de canonical outbound links utiles ;
7. zéro fetch détail / zéro content reuse / zéro policy change / zéro activation ;
8. double-check qualitatif ;
9. score ≥9/10 avant toute proposition de canary 4.3B.

## UX — P1A.3

Stabiliser l’état URL Map, Back/Forward, partage et transitions Map ↔ Search avec conservation de `district`.