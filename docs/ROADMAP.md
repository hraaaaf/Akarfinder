# AKARFINDER — ROADMAP CANONIQUE

**Version : 2026-08-07**  
**Statut : CARTE-QUARTIER P1A.3 ✅ PR #349 ; P1A.4 prochain UX ; DATA-4.3A ✅ PR #347 ; DATA-4.3B ✅ PR #348**

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
- P1A.2 Search Geo Contract ✅ PR #334 ;
- P1A.3 Map State & Navigation ✅ PR #349, score contractuel **9,3/10**.

## P1A.3 — Map State & Navigation ✅

Contrat : `/map?city=rabat&district=agdal&layer=explore&project_id=...`

Acquis :

- URL Map = source de vérité ;
- `city` et `district` canonicalisés via le Geo Registry ;
- district inconnu ou incohérent rejeté fail-closed ;
- `layer=explore` canonique ;
- filtres Search compatibles et `project_id` conservés ;
- Back/Forward et URL partageable ;
- Map ↔ Search ↔ Quartier sans perte de contexte ;
- page quartier exposée depuis Map uniquement pour une paire SEO-éligible ;
- écran cinématique ville supprimé : entrée directe dans la carte ;
- gate P1 Geo Productization étendue aux contrats P1A.3, P10B, TypeScript et build.

## P1A.4 — Map Design System 🔴 PROCHAIN UX

Objectif : transformer le contrat fonctionnel P1A.3 en expérience cartographique premium, cohérente et lisible sans changer la vérité géographique.

- hiérarchie visuelle carte / contrôles / panneau quartier ;
- tokens couleur cohérents ville/quartier/layer ;
- états hover/selected/focus/loading/empty ;
- densité et lisibilité desktop/tablette/mobile ;
- aucun signal couleur ambigu ;
- audit visuel réel + double-check ;
- score UX/UI minimum **9,0/10**, reprise obligatoire sous 9.

Puis P1A.5 Territorial Explorer → P1A.6 Responsive → P1B intelligence cartographique.

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

## DATA-4.3A — Dar Agadir Canonical-Link Shadow ✅ PR #347

Audit read-only, sans requête source :

- 6 533 lignes Dar Agadir auditées ;
- **5 `ELIGIBLE_SHADOW`** ;
- **6 425 `SEED_ONLY_REVALIDATION_REQUIRED`** ;
- 46 `NON_NORMALIZED` ;
- 57 `INSUFFICIENT_STRUCTURE` ;
- 0 duplicate ;
- 0 policy blocked ;
- 0 fetch / 0 content reuse / 0 write / 0 policy change / 0 activation.

Conclusion : le réservoir ne peut pas être traité comme frais sur sa seule profondeur historique ; une revalidation séparée est nécessaire.

## DATA-4.3B — Dar Agadir Sitemap Revalidation ✅ PR #348

Audit live borné via le seul canal Registry autorisé `public_sitemap` :

- robots/sitemaps same-origin uniquement ;
- budget maximum 40 requêtes ;
- aucune page détail ;
- aucune réutilisation de contenu ;
- aucun write DB ou freshness ;
- aucune policy modifiée ;
- aucune activation ;
- gate dédiée, TypeScript et build verts.

### Prochaine décision DATA

Lire la preuve 4.3B comme **signal de présence sitemap uniquement**, jamais comme fraîcheur ou permission implicite. Un éventuel freshness shadow/write doit rester un lot séparé, borné, fail-closed et certifié ; sinon passer au réservoir admissible suivant.

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

P1A.4 → P1A.5 → P1A.6 → P1B → Pro/Agences/Promoteurs → SEO → recette SERP.

## Lane DATA

1. décider le traitement post-4.3B à partir de la preuve sitemap sans confondre présence et fraîcheur ;
2. si justifié : freshness shadow séparé et borné ; sinon réservoir admissible suivant ;
3. parallèle business : partenariat Agenz ;
4. classer/approfondir les autres sources canonical-link admissibles ;
5. DATA-3 Universal Site Connector pour sources éligibles ;
6. atteindre **20K observations exploitables** ;
7. DATA-5/6/7 feeds + claim + workspace ;
8. 50K puis DATA-8/9 vers 100K+.

# 18. Définition de terminé

Un lot est terminé uniquement si : périmètre respecté, tests/build/gates verts, preuves disponibles, Registry respecté, aucun bypass, aucun workflow temporaire, PR mergée, production vérifiée si write, et les 3 MD canoniques alignés.

# 19. Prochaine action exacte

## DATA — décision post-DATA-4.3B

1. lire l’artefact live 4.3B ;
2. quantifier présence sitemap sur le réservoir `seed_only` ;
3. ne jamais convertir présence sitemap en `fresh_confirmed` implicitement ;
4. si le signal est suffisant, spécifier un freshness shadow/write séparé avec rollback ;
5. sinon arrêter Dar Agadir et passer au prochain réservoir admissible ;
6. 0 bypass et Source Registry toujours autoritaire.

## UX — P1A.4

Construire le **Map Design System** au-dessus du contrat URL P1A.3 sans modifier l’identité Geo ni la vérité des données : hiérarchie visuelle, couleurs, marqueurs, contrôles, panneau quartier, états responsive et accessibilité, puis audit visuel et score ≥9/10.