# AKARFINDER — ROADMAP CANONIQUE

**Version : 2026-08-07**  
**Statut : CARTE / QUARTIER P1A.1 ✅ PR #328 ; P1A.2 prochain en lane UX ; DATA-1.5 ✅ PR #331 ; DATA-1.6A Source Policy Evidence Review prochain en lane DATA**

Ce fichier est l’unique roadmap du projet. `README.md` définit l’identité et la doctrine ; `docs/SESSION.md` porte uniquement le handover courant.

## 1. Cap produit

AkarFinder est un **moteur de recherche immobilier, un index national et une couche d’intelligence pour le marché marocain**.

- cœur produit : `/search` ;
- `/map` : moteur complémentaire d’exploration spatiale et d’intelligence, jamais moteur Search parallèle ;
- objectif long terme : **Property Graph du marché immobilier marocain** ;
- positionnement : search-first / intelligence-first, pas simple portail de dépôt d’annonces ;
- provenance, fraîcheur, qualité et divergences restent explicables ;
- aucune fonctionnalité publique ne doit prétendre exploiter une donnée absente ;
- la couverture du marché doit croître sans sacrifier légalité, dédoublonnage, fraîcheur ni qualité.

Pipeline canonique :

`DISCOVERY → INGESTION / OBSERVATION → NORMALIZATION → CANONICALIZATION → FRESHNESS → DEDUPLICATION / CLUSTERING → ENRICHMENT → INTELLIGENCE → DISPLAY ELIGIBILITY → RANKING → PUBLICATION / SERP`

### North Star DATA

Ne pas piloter uniquement par le nombre brut d’annonces.

Mesure canonique :

`COVERAGE × FRESHNESS × QUALITY × DEDUP × RELEVANCE`

Les objectifs de volume sont exprimés d’abord en **observations immobilières exploitables**, puis en **propriétés canoniques actives** après dédoublonnage.

Paliers bootstrap :

- **5K → 20K observations** : densité crédible sur marchés prioritaires ;
- **20K → 50K observations** : couverture multi-source nationale structurée ;
- **50K → 100K+ observations** : profondeur suffisante pour devenir un réflexe de recherche ;
- objectif long terme : maximiser la part du marché immobilier marocain visible sur Internet et représentable légalement dans AkarFinder.

## 2. Doctrine non négociable

- no-bypass absolu : pas de proxy/stealth, faux Googlebot, CAPTCHA solve, login bypass ou contournement technique ;
- `robots.txt`, `noindex`, CGU, licence et politique source doivent être vérifiés avant activation ;
- **Source Registry obligatoire avant toute ingestion publique ou partenaire** ;
- chaque source reçoit une politique explicite : `GREEN`, `PARTNER_ONLY`, `INDEX_ONLY`, `RESEARCH_ONLY` ou `BLOCKED` ;
- aucune donnée, image, coordonnée, géométrie, proximité ou relation partenaire inventée ;
- contenu partenaire/autorisé ≠ résultat public indexé ≠ signal marché interne ;
- un résultat tiers indexé doit conserver provenance et lien vers la source selon sa policy ;
- migrations séparées du code applicatif ;
- une responsabilité, une branche, une PR et un merge par lot ;
- aucune nouvelle roadmap ou session concurrente ;
- Search reste le moteur canonique des parcours publics ;
- Map, Search, SEO et Mon Projet doivent partager la même identité géographique canonique ;
- une couleur cartographique ne porte qu’une seule signification active à la fois ;
- aucune frontière ou forme territoriale approximative ne doit être présentée comme géométrie réelle ;
- une illustration de landmark peut enrichir un repère réel, mais ne remplace jamais position, géométrie ou provenance.

## 3. État acquis

### UX publique consolidée ✅

- **Vendre** : terminé ;
- **Accueil P1** : certifié et mergé via PR #299 ;
- **Neuf P1** : certifié 390 / 768 / 1280, score **9,1/10** ;
- **Acheter P1** : certifié et mergé via PR #312, score **9,1/10** ;
- **Louer P1** : certifié et mergé via PR #313, score **9,0/10** ;
- **Mon Projet P1A** : parcours guidé en huit écrans, certifié et mergé via PR #314, score **9,2/10** ;
- **Mon Projet P1B** : continuité du `project_id` vers Search, favoris et comparaisons, certifiée et mergée via PR **#318** ;
- **CARTE-QUARTIER-P1A.0** : contrat produit/documentaire certifié et mergé via PR **#327**, score **9,5/10**, **19/19 workflows verts** ;
- **CARTE-QUARTIER-P1A.1** : Geo Canonical Core certifié via PR **#328**, score **9,5/10**, **19/19 workflows verts** sur le head fonctionnel/documentaire avant clôture finale.

### Fondation Carte / Quartier existante ✅

- `/map` : vraie carte MapLibre interactive ;
- `/search` : Atlas des résultats, positions exactes certifiées et intelligence quartier ;
- `/immobilier/[city]/[district]` : route quartier SEO canonique ;
- Geo Registry : villes/quartiers canoniques avec `seo_eligible` / `map_eligible` ;
- géométries quartier déjà amorcées, notamment Casablanca ;
- repères prix existants mais couverture limitée ;
- `/map` est désormais raccordé à `canonical-neighborhood-data.ts`, lui-même adossé à `geo-entity-registry`.

Audit initial Carte / Quartier : **7,4/10**. Potentiel après consolidation : **~9,1/10**. Le chantier porte sur l’unification, la vérité DATA, l’identité cartographique, la continuité Map → Quartier → Search et l’intelligence spatiale ; il ne part pas de zéro.

### Fondation DATA acquise ✅

- Observation Ledger ;
- Freshness/Lifecycle ;
- normalisation et quality tiers ;
- display eligibility ;
- Source Registry ;
- Market Index / fondation Property Graph ;
- dédoublonnage conservant les observations ;
- activation progressive ODM certifiée ;
- discovery national déjà amorcé via OpenSERP, sitemaps publics et Common Crawl ;
- 53 villes/pôles couverts dans la logique d’acquisition existante ;
- DATA-1.1 / DATA-1.2 / DATA-1.3A / DATA-1.3B / DATA-1.4 acquis ;
- **DATA-1.5 Technical Capability Audit ✅ PR #331** : 20 candidats P0 audités, 19 techniquement review-ready, familles CMS/connecteurs détectées sans aucune policy automatique ;
- prochain lot DATA : **DATA-1.6A — Source Policy Evidence Review**, read-only avant toute écriture Source Registry.

## 4. Lot UX certifié — CARTE-QUARTIER-P1A.1 ✅

PR **#328 — Geo Canonical Core**. Merge final autorisé uniquement après la dernière CI du head documentaire.

Objectif atteint : supprimer le bypass géographique de `/map` et imposer une seule identité ville/quartier sans modèle parallèle.

Livré :

- `MapNeighborhoodExperience` consomme `canonical-neighborhood-data.ts` ;
- l’import runtime direct de `neighborhood-data.ts` est supprimé de cette surface ;
- `canonical-neighborhood-data.ts` reste l’adaptateur entre seeds existants et `geo-entity-registry` ;
- `resolveCityEntity` et `resolveNeighborhoodEntity` restent les autorités de résolution ;
- la gate Geo Productization protège ce contrat contre une régression ;
- aucun changement UI, Search `district`, migration ou structure DATA dans ce lot ;
- les trois MD canoniques sont alignés.

Double-check : comportement visuel inchangé, dépendance géographique mieux contrainte, pas de modèle parallèle, DATA lane intacte.

Score final architecture/vérité géographique : **9,5/10**.

## 5. Séquence UX publique validée

1. **CARTE-QUARTIER-P1A** — vérité, identité canonique, URL, Search district contract, design system cartographique, exploration territoriale et responsive ;
2. **CARTE-QUARTIER-P1B** — signaux marché, moteur de couches, heatmaps/choroplèthes, buildings/landmarks et cockpit quartier ;
3. **Pro / Agences / Promoteurs** — pages publiques et activation professionnelle ;
4. **Immobilier / SEO** — villes, quartiers et intentions avec contenu utile ;
5. **recette SERP + fiche bien** — cohérence finale sans refonte gratuite ;
6. **CARTE-QUARTIER-P2** — spatial intelligence avancée lorsque les données et usages le justifient.

La séquence UX ne doit pas retarder la montée en profondeur DATA ; les deux chantiers avancent par lots séparés.

# 6. CARTE / QUARTIER — ROADMAP D’EXÉCUTION

## Vision cible

AkarFinder dispose de deux moteurs complémentaires :

- **Search** = moteur de recherche immobilier canonique ;
- **Map** = moteur d’exploration spatiale et d’intelligence.

Hiérarchie cible :

`Maroc → Ville → Quartier → Zone → Bien`

Couches préparées :

`Géographie | Offre | Prix | Densité | Typologie | Style de vie | Repères | Projet`

Règles absolues :

1. aucune géométrie inventée ;
2. aucune donnée transformée en précision qu’elle n’a pas ;
3. une couleur = une signification active à la fois ;
4. une couche ne devient publique que si ses données et sa provenance passent la gate de vérité ;
5. toute étape UX/UI est double-checkée et scorée ; **< 9,0/10 = reprise obligatoire avant l’étape suivante**.

## CARTE-QUARTIER-P1A — Fondation cartographique 🔴

### P1A.0 — Contrat produit & documentaire ✅

PR **#327**, mergée. Score **9,5/10**. CI **19/19 workflows verts**.

Livré :

- `README.md`, `docs/ROADMAP.md`, `docs/SESSION.md` alignés ;
- doctrine Search/Map/Geo verrouillée ;
- roadmap P1A/P1B/P2 canonique ;
- gate UX/UI ≥ 9/10 obligatoire ;
- DATA-1.3B maintenu comme lane DATA active séparée ;
- aucun code applicatif modifié dans P1A.0.

### P1A.1 — Geo Canonical Core ✅

PR **#328**. Score **9,5/10**. Certification **19/19 workflows verts** avant la clôture documentaire finale.

Architecture livrée :

`Geo Registry → canonical neighborhood data → Map`

avec extension prévue aux contrats Search/SEO/Mon Projet existants sans modèle parallèle.

Livré :

- suppression du bypass direct de `/map` vers le seed brut ;
- réutilisation de `geo-entity-registry` via l’adaptateur canonique existant ;
- seed brut conservé derrière l’adaptateur, pas comme dépendance runtime publique ;
- test de non-régression dans la gate Geo Productization ;
- aucun changement visuel ;
- aucune migration ;
- aucun changement Search `district` avant P1A.2.

Gate : tests canoniques + TypeScript + production build + CI complète + score ≥ 9/10.

### P1A.2 — Search Geo Contract 🔴 PROCHAIN

Objectif : faire de `district` un filtre Search structuré réel.

Cible :

`/search?city=Rabat&district=Agdal`

Travail :

- `district` dans `SearchQuery` ;
- parsing URL ;
- stable key ;
- gateway/routing ;
- filtering/ranking ;
- API et composants concernés ;
- compatibilité avec anciennes URLs `q=` sans continuer à utiliser `q` comme contrat quartier.

Gate : `city + district` filtre réellement le quartier.

### P1A.3 — Map State & Navigation

Objectif : conserver le contexte de bout en bout.

Contrat cible :

`/map?city=rabat&district=agdal&layer=explore&project_id=...`

Travail :

- `city`, `district`, `layer`, intention/filtres utiles et `project_id` si fourni ;
- Back/Forward ;
- liens partageables ;
- Quartier → Map → Search → Mon Projet sans perte de contexte ;
- suppression de l’écran cinématique ville ;
- entrée immédiate dans la carte.

### P1A.4 — AkarFinder Map Design System

Objectif : rendre la carte reconnaissable comme AkarFinder même sans header ni logo.

Direction :

- MapLibre reste moteur technique, pas identité visuelle ;
- fond clair ivoire/sable ;
- eau bleu AkarFinder désaturé ;
- axes majeurs hiérarchisés ;
- routes secondaires et POI génériques atténués ;
- deep-blue = structure/navigation ;
- bronze = sélection/intelligence/accent ;
- palette territoriale désaturée ;
- clusters, marqueurs, labels, hover/focus et légendes AkarFinder ;
- dark mode conçu spécifiquement ;
- personnalité plus graphique et lisible, inspirée de l’efficacité de Waze sans copie ni esthétique enfantine.

Gate UX/UI : certification visuelle light/dark et score ≥ 9,0/10.

### P1A.5 — Territorial Explorer

Objectif : rendre le territoire explorable par niveaux de zoom.

#### Vue Maroc

- villes documentées visuellement distinctes ;
- couleurs territoriales stables en mode `Explorer` ;
- géométries de ville uniquement si elles sont réelles et traçables ;
- zones non documentées neutres ;
- couverture explicitement indiquée ;
- clic/tap → fly-to ville.

#### Vue Ville

- quartiers documentés prennent le relais ;
- polygones réels différenciés par couleur ;
- labels ;
- hover/tap ;
- sélection explicite ;
- si polygone absent : centroid/marker seulement, jamais faux contour.

Gate : Maroc → ville → quartier reste lisible sans ambiguïté sémantique.

### P1A.6 — Map UX Responsive

Mobile :

- carte plein écran ;
- bottom sheet glissante ;
- tap quartier → nom, repère prix/scope, niveau de preuve, offre et CTA ;
- `Explorer le quartier` ;
- `Voir les biens`.

Desktop :

- carte dominante ~65–70 % ;
- panneau intelligence ~30–35 % ;
- pas de dépendance à des popups minuscules.

Certification : 360, 390, 768, 1280/1440, tactile, clavier, light/dark. Score final P1A ≥ 9,0/10.

## CARTE-QUARTIER-P1B — Intelligence géographique 🟠

### P1B.1 — Truthful Market Signals

Supprimer tout fallback prix ambigu.

États publics :

- `DISTRICT` / référence quartier ;
- `CITY` / fallback ville explicitement affiché ;
- `UNAVAILABLE` / aucun chiffre.

Aucune estimation implicite pour remplir un trou.

### P1B.2 — Map Layer Engine

Moteur générique de couches avec quatre modes principaux :

- **Explorer** ;
- **Marché** ;
- **Densité** ;
- **Style de vie**.

Sous-couches préparées selon données :

- prix/m² ;
- volume d’annonces ;
- achat/location/neuf ;
- appartements/villas ;
- densité d’offres/propriétés observées/programmes ;
- balnéaire, affaires, administratif, familial, étudiant, touristique, calme/nature, hypercentre, villas, connecté/transports.

Une seule signification de couleur active.

### P1B.3 — Heatmaps & Choropleths

- choroplèthe pour données zonales/polygones ;
- heatmap pour données ponctuelles ;
- couche `Prix/m²` optionnelle uniquement lorsque certifiée ;
- couche `Offre` basée sur observations réellement disponibles ;
- Casablanca = première ville enrichie si la donnée le permet, sans code métier spécial Casablanca.

### P1B.4 — Buildings & Landmark Layer

Objectif : enrichir la carte à mesure que le zoom augmente.

Hiérarchie :

- zoom faible : pas de bâtiment ;
- zoom ville : grands landmarks / stades / gares / parcs / marinas / plages / universités / monuments / équipements structurants ;
- zoom quartier : empreintes de bâtiments et équipements locaux quand disponibles.

Sources candidates à auditer : OpenStreetMap, Overture Maps, Microsoft Global Building Footprints et autres jeux compatibles/licenciés.

Chaque landmark public : `id`, nom, type, géométrie/position, source, date/preuve, priorité d’affichage.

### P1B.5 — Landmark Visual Language

Séparer strictement :

- **vérité géographique** = position/forme réelle ;
- **habillage AkarFinder** = pictogramme, silhouette ou mini-illustration.

Les grands repères marocains peuvent recevoir un traitement visuel premium lorsqu’il enrichit l’orientation sans saturer la carte.

### P1B.6 — Cockpit Quartier

Transformer `/immobilier/[city]/[district]` en page de décision :

- mini-map ;
- limites quartier si disponibles ;
- repère prix + scope + période + preuve ;
- comparaison à la ville lorsque démontrable ;
- volume réel d’annonces ;
- achat/location ;
- typologies ;
- résultats récents ;
- landmarks/proximité sourcés ;
- provenance ;
- CTA Search et Map.

La route canonique reste `/immobilier/[city]/[district]` ; aucune duplication `/quartier/...`.

## CARTE-QUARTIER-P2 — Spatial Intelligence 🟡

Architecture préparée, exécution différée jusqu’à ce que la DATA et les usages le justifient.

### P2.1 — Lifestyle Graph

Construire les attributs démontrables qui alimentent les classifications de style de vie : distance littoral, parcs, universités, équipements, transit, bâti, activité, programmes neufs, etc. Pas de tags éditoriaux présentés comme faits sans preuve.

### P2.2 — Advanced Multi-filter Map

Combinaisons spatiales avancées :

`Balnéaire + Appartement + Neuf + budget + Prix/m²`

ou

`Familial + calme + Rabat + achat + seuil prix/m²`

La carte devient une interface visuelle du Property Graph.

### P2.3 — Demand / Opportunity Intelligence

Lorsque le volume utilisateur le permet : recherches, favoris et interactions uniquement sous forme agrégée, non identifiable, pour comparer demande et offre par zone.

### P2.4 — Compare Areas

Comparer plusieurs quartiers sur prix, disponibilité, typologies, style de vie, proximité et niveau de preuve.

### P2.5 — Advanced Building Visualization

2.5D/3D légère, projets et bâtiments détaillés uniquement si la valeur utilisateur est démontrée. Pas de 3D décorative gratuite.

# 7. PHASE DATA — P0 STRATÉGIQUE

Objectif : passer d’un moteur techniquement solide mais encore peu profond à un **index immobilier marocain dense, multi-source, frais et dédupliqué**.

Principe directeur : ne pas chercher 100K uniquement avec des scrapers spécifiques. Construire un système cumulatif mêlant :

- discovery public web ;
- pages publiques admissibles ;
- sitemaps ;
- structured data ;
- connecteurs CMS génériques ;
- feeds directs agences/promoteurs ;
- annonces utilisateurs ;
- données ouvertes / géographiques ;
- observations historiques ;
- partenariats et claim de catalogues.

## DATA-0 — Stabiliser le pipeline existant 🔴

Séquence technique déjà engagée :

1. **B3.4.4 — Deduplication & Change Detection** ;
2. **B3.4.5 — Quarantaine & Review** ;
3. **B3.4.6 — Publication Canary bornée** ;
4. vérité prix / surface / géographie ;
5. fraîcheur et lifecycle par source ;
6. profondeur réelle des pages `LISTING` ;
7. Property Graph / déduplication V3.

Gate : aucune montée massive en volume ne doit contourner ces garanties.

## DATA-1 — Moroccan Real Estate Web Census 🔴 P0

Objectif : **recenser systématiquement où se trouve l’immobilier marocain sur le Web avant de multiplier les scrapers spécifiques**.

### Sources de discovery à auditer et combiner

- Common Crawl URL Index ;
- Common Crawl historique existant ;
- Web Data Commons / structured data extraites de Common Crawl ;
- moteurs de recherche et OpenSERP existant ;
- sitemaps publics ;
- répertoires publics d’agences/promoteurs ;
- sites officiels de promoteurs ;
- sites indépendants d’agences ;
- portails/classifieds ;
- données géographiques ouvertes pouvant aider à découvrir organisations et zones.

### Sortie attendue

Créer un **Domain Census** avec au minimum :

- domaine ;
- organisation détectée ;
- type : `AGENCY`, `PROMOTER`, `PORTAL`, `CLASSIFIED`, `BANK_INVENTORY`, `OTHER` ;
- villes/zones couvertes ;
- estimation du nombre de pages immobilières ;
- présence sitemap ;
- présence JSON-LD / Schema.org / microdata ;
- stack technique détectée ;
- endpoints publics éventuels ;
- fréquence de mise à jour estimée ;
- robots / noindex / CGU / licence ;
- policy Source Registry ;
- potentiel de volume ;
- priorité d’intégration.

### État d’exécution DATA-1 — 2026-08-07

- **DATA-1.1 — Domain Census Core ✅ PR #322** ;
- **DATA-1.2 — Existing Reserve Census ✅ PR #323** : 7 051 domaines / 37 009 URLs ;
- **DATA-1.3A — Common Crawl URL Index Contract ✅ PR #324** ;
- **DATA-1.3B — Common Crawl Live Evidence ✅ PR #326** : 300/300 Parquet, 8 727 registered domains ;
- **DATA-1.4 — Candidate Reconciliation ✅ PR #329** : 15 238 domaines réconciliés, 230 `PRIMARY_SOURCE_CANDIDATE` ;
- **DATA-1.5 — Candidate Technical Capability Audit ✅ PR #331**, merge `1f8b398`, score **9,4/10**.

Preuve DATA-1.5 sur batch P0 de 20 first-party candidates non enregistrés :

- **19/20 `CAPABILITY_REVIEW_READY`** ;
- 3 `WORDPRESS_REALHOMES` ;
- 3 `WORDPRESS_HOUZEZ` ;
- 5 `WORDPRESS_GENERIC` ;
- 4 `SITEMAP_JSONLD` ;
- 2 `SITEMAP_STRUCTURED_HTML` ;
- 2 `STRUCTURED_HTML` ;
- 1 timeout homepage (`damaneimmo.ma`), conservé review-only ;
- 116 GET publics au total, maximum 7/domain sur budget 8 ;
- 0 write DB, 0 policy, 0 auth, 0 bypass, 0 WARC.

Candidats techniquement les plus structurés : `valfoncier.ma`, `marrakech-luxury-properties.com`, `agadirimmobilier.org`, `proimmobilier.ma`, `rabatimmo.ma`, `agadirimmobilier.ma`, `capital-properties.ma`, `immobilier-pro-maroc.com`.

**Prochain lot DATA : DATA-1.6A — Source Policy Evidence Review.**

Responsabilité unique : établir, en lecture seule, les preuves policy des candidats techniquement viables : robots/noindex observés, CGU/licence, restrictions de réutilisation, canaux permis, besoin de partenariat/contact et niveau de confiance. Aucune ingestion et aucune écriture Source Registry dans 1.6A.

Puis **DATA-1.6B — Source Registry Assignment** n’écrira que les décisions suffisamment prouvées, via le schéma Registry existant, avant tout connecteur ou ingestion.

### Gate DATA-1

Avant ingestion :

`DISCOVERED → AUDITED → POLICY_ASSIGNED → ELIGIBLE → CONNECTOR_SELECTED`

Aucun domaine découvert ne devient automatiquement une source active.

## DATA-2 — Structured Web Mining 🔴 P0

Objectif : exploiter les couches déjà structurées du Web avant de parser du HTML spécifique site par site.

### DATA-2.1 — Common Crawl URL Index

Utiliser l’index d’URL pour :

- découvrir massivement les domaines/pages `.ma` ou liés au Maroc ;
- filtrer les patterns immobiliers ;
- mesurer la profondeur historique de chaque domaine ;
- identifier des sites inconnus de notre registry ;
- prioriser les domaines par densité de pages pertinentes.

Common Crawl sert d’abord de **discovery/historical signal**, puis d’observation seulement lorsque la source et l’usage sont admissibles.

### DATA-2.2 — Web Data Commons

Rechercher directement les objets structurés pertinents :

- `RealEstateListing` ;
- `Apartment` ;
- `House` ;
- `Residence` ;
- `Offer` ;
- `PostalAddress` ;
- `Organization` / `LocalBusiness`.

Usage prioritaire :

- découverte de domaines ;
- découverte de schémas récurrents ;
- historique ;
- pré-normalisation ;
- identification d’agences et promoteurs.

Ne pas considérer ces extractions historiques comme preuve de fraîcheur 2026.

## DATA-3 — Universal Site Connector 🔴 P0/P1

Objectif : remplacer la logique « un scraper par agence » par des **connecteurs de familles techniques**.

### Familles prioritaires

1. WordPress générique ;
2. Houzez ;
3. RealHomes et autres thèmes immobiliers récurrents identifiés par le Census ;
4. sitemap + JSON-LD ;
5. WordPress REST public lorsqu’admissible ;
6. XML public ;
7. CSV public ;
8. JSON/API publique explicitement admissible ;
9. HTML générique avec extraction structurée en dernier recours.

### Architecture cible

`domain → tech fingerprint → connector family → observation → canonical pipeline`

Le connecteur doit rester séparé de la policy source : une capacité technique d’extraction n’est jamais une autorisation d’usage.

## DATA-4 — Audit profondeur des grands réservoirs marocains 🔴 P0

Objectif : mesurer les écarts entre **volume visible sur la source** et **volume réellement découvert/indexable par AkarFinder**.

Sources prioritaires à auditer individuellement :

- Mubawab ;
- Avito immobilier ;
- autres portails marocains déjà connus ou découverts par DATA-1.

Pour chaque source :

- volume public annoncé/estimé ;
- couverture réelle actuelle dans AkarFinder ;
- sitemap / pagination / structured data ;
- robots / CGU / noindex ;
- profondeur historique ;
- doublons internes ;
- taux de pages detail accessibles publiquement ;
- fraîcheur ;
- policy finale ;
- meilleure méthode autorisée : `PARTNER_FEED`, `INDEX_ONLY`, `PUBLIC_DISCOVERY`, `NO_INGESTION`, etc.

But : détecter si le multiplicateur 5K → 20K se trouve déjà dans une source connue avant d’ouvrir trop de nouveaux fronts.

## DATA-5 — Universal Partner Feed 🔴 P1

Objectif : préparer la bascule future où la donnée vient directement vers AkarFinder.

Réutiliser les structures `partner_feed_*` existantes ; aucun modèle parallèle.

Formats cibles, selon besoin réel :

- AkarFinder Native JSON ;
- Generic JSON ;
- Generic XML ;
- Generic CSV ;
- Trovit XML ;
- OpenImmo / ImmoXML ;
- Kyero ;
- RESO/Web API lorsque pertinent ;
- sitemap/Schema.org ;
- WordPress/Houzez ;
- Google Sheet/SFTP uniquement si un besoin partenaire réel le justifie.

Principe : un CRM ou une agence ne doit pas avoir à reconstruire son système pour publier sur AkarFinder.

## DATA-6 — “Index / Claim my agency” 🔴 P1

Objectif : transformer le bootstrap DATA en moteur d’acquisition B2B.

Parcours cible :

`URL agence → discovery → pages détectées → propriétés reconnues → organisation candidate → claim → vérification → feed direct`

Exemple de valeur présentée au professionnel :

- nombre de pages détectées ;
- nombre d’observations ;
- nombre de propriétés uniques estimées ;
- fraîcheur ;
- anomalies/doublons ;
- possibilité de réclamer l’organisation et connecter un feed direct.

La présence indexée ne vaut jamais partenariat. Les badges commerciaux et droits de gestion nécessitent vérification explicite.

## DATA-7 — Professional Workspace / B3.5 🔴 P1

Le Professional Workspace devient la couche d’activation et de gestion **après** que le moteur possède une densité suffisante pour offrir une valeur évidente aux agences et promoteurs.

Séquence canonique :

`Acquisition publique → demande d’activation → qualification interne → organisation → membres → ownership → feeds → projets/annonces → leads`

Sous-lots B3.5 existants restent la référence technique ; ils doivent réutiliser :

- `professional_organizations` ;
- `professional_memberships` ;
- `professional_activation_requests` ;
- `professional_property_submissions` ;
- `professional_projects` ;
- `professional_media_assets` ;
- `professional_listing_ownership` ;
- `professional_lead_assignments` ;
- tables `partner_feed_*` ;
- auth et RLS canoniques.

## DATA-8 — Open Geodata & Property Graph 🟠 P1/P2

Objectif : enrichir le graphe indépendamment du cycle de vie des annonces et alimenter à terme les couches Carte / Quartier avec des géométries et repères sourcés.

Sources à évaluer selon licence et pertinence :

- Overture Maps ;
- Microsoft Global Building Footprints ;
- OpenStreetMap ;
- limites administratives/quartiers ;
- POI, transports et services ;
- adresses et bâtiments disponibles légalement.

Ces données **n’augmentent pas le compteur d’annonces**. Elles servent à :

- identifier bâtiment / adresse / zone ;
- renforcer canonicalisation et géocodage ;
- améliorer dédoublonnage ;
- créer des nœuds du Property Graph ;
- calculer proximité et intelligence locale ;
- rattacher plusieurs observations à une même entité physique ;
- alimenter les polygones, bâtiments et landmarks de la carte lorsque la provenance est suffisante.

## DATA-9 — Historical Observation Layer 🟠 P2

Objectif : ne pas jeter la valeur d’une annonce expirée ou modifiée.

Conserver lorsque licite et justifié :

- apparition/disparition ;
- changements de prix ;
- changements de surface/description ;
- source ;
- agence ;
- dates d’observation ;
- changements de disponibilité ;
- signatures d’images si admissibles ;
- historique de cluster.

Résultat : passage d’un simple catalogue courant à une **mémoire du marché**.

## DATA-10 — External datasets / Research Radar 🟠 P2

Hugging Face, GitHub et datasets tiers restent des **sources de recherche, accélérateurs techniques ou signaux**, pas des sources de production par défaut.

Exemples :

- repos historiques Mubawab/Avito pour comprendre structures et profondeur, jamais comme justification d’un bypass ;
- Semsar et datasets similaires pour recherche/intelligence si licence et provenance compatibles ;
- datasets bâtiments/masques pour enrichment ;
- bibliothèques open source de formats immobiliers pour accélérer les connecteurs.

Toute réutilisation de code ou données nécessite audit : licence, fraîcheur, provenance, sécurité et compatibilité avec notre architecture.

# 8. Stratégie de montée en volume

## Palier A — 5K → 20K

Priorité : **densité**, pas dispersion nationale superficielle.

Focus : Casablanca, Rabat-Salé-Témara, Marrakech, Tanger, Agadir puis autres pôles selon census réel.

Leviers :

1. profondeur des sources déjà connues ;
2. Web Census ;
3. sitemaps/structured data admissibles ;
4. long tail agences/promoteurs ;
5. connecteurs CMS génériques ;
6. amélioration du taux de pages `LISTING` réellement exploitables ;
7. déduplication pour connaître le vrai nombre de propriétés.

## Palier B — 20K → 50K

Leviers :

1. multiplication automatique des domaines compatibles avec connecteurs existants ;
2. extension nationale ;
3. feeds directs des premières agences/promoteurs ;
4. claim d’organisations ;
5. contribution utilisateurs ;
6. meilleure fraîcheur et réactivation automatique.

## Palier C — 50K → 100K+

Leviers :

1. réseau de feeds professionnels ;
2. intégrations CRM ;
3. promoteurs et programmes neufs ;
4. croissance SEO/Search ;
5. partenaires institutionnels ou data providers ;
6. boucle acquisition B2B auto-renforçante.

À ce stade, la croissance ne doit plus dépendre majoritairement du crawling.

# 9. KPI DATA obligatoires

Dashboard canonique à maintenir par source et globalement :

- domains discovered ;
- domains audited ;
- sources par policy ;
- observations découvertes ;
- observations ingérées ;
- observations display-eligible ;
- propriétés canoniques uniques ;
- taux de déduplication ;
- freshness buckets ;
- couverture ville/quartier/type/transaction ;
- complétude prix/surface/géographie/photos ;
- taux d’échec fetch/parse/normalize ;
- churn / stale / removed ;
- contribution par connecteur ;
- contribution par source ;
- part partenaire vs indexée vs utilisateur ;
- densité SERP sur les requêtes prioritaires.

Le KPI de lancement n’est pas « 100K lignes en base » mais **une SERP utile, dense, fraîche et dédupliquée sur les intentions principales**.

# 10. Séquence d’exécution consolidée

Deux lanes peuvent avancer sans se mélanger :

### Lane UX

1. **CARTE-QUARTIER-P1A.0 ✅ PR #327** — contrat produit/documentaire ;
2. **P1A.1 ✅ PR #328** — Geo Canonical Core, certifié, merge final après CI documentaire ;
3. **P1A.2 🔴 PROCHAIN** — Search Geo Contract `district` ;
4. P1A.3 — Map State & Navigation ;
5. P1A.4 — AkarFinder Map Design System ;
6. P1A.5 — Territorial Explorer ;
7. P1A.6 — Responsive UX + certification P1A ≥ 9/10 ;
8. CARTE-QUARTIER-P1B selon la séquence définie ci-dessus ;
9. Pro / Agences / Promoteurs ;
10. Immobilier / SEO ;
11. recette SERP + fiche bien.

### Lane DATA

1. poursuivre **DATA-1.3B — Common Crawl URL Index Live Evidence** ;
2. qualifier le rendement net `NEW_TO_CENSUS` contre les 7 051 domaines DATA-1.2 ;
3. poursuivre DATA-1.4 / DATA-2 selon la preuve obtenue ;
4. produire le classement réel des domaines/sources par volume × policy × difficulté ;
5. auditer **DATA-4 — profondeur des grands réservoirs** ;
6. construire **DATA-3 — Universal Site Connector** à partir des familles dominantes réellement observées ;
7. atteindre le palier **20K observations** avec preuves de qualité ;
8. activer **DATA-5/6/7 — feeds + claim + Professional Workspace** ;
9. atteindre **50K observations** avec une part croissante de données directes ;
10. construire **DATA-8 — Open Geodata / Property Graph** en articulation avec les besoins Carte / Quartier ;
11. consolider historique, intelligence, SEO et expansion vers **100K+ observations**.

# 11. Définition de terminé

Un lot est terminé uniquement si :

- périmètre respecté ;
- code et documentation alignés ;
- tests ciblés, TypeScript et build verts lorsque le lot touche le code ;
- CI complète sans régression pertinente ;
- preuves visuelles ou DATA disponibles ;
- métriques avant/après disponibles pour les lots DATA ;
- policy Source Registry documentée pour toute source activée ;
- aucun bypass ajouté ;
- workflow temporaire supprimé ;
- chaque étape UX/UI a subi un **double-check** ;
- chaque étape UX/UI affiche un **score ≥ 9,0/10** avant passage à la suivante ; si le score est inférieur, reprise + nouvelle certification obligatoires ;
- mobile, desktop, light/dark, hiérarchie, lisibilité, vérité des données et accessibilité sont contrôlés selon le périmètre ;
- `README.md`, `docs/ROADMAP.md` et `docs/SESSION.md` sont relus et alignés avec l’état réellement livré ;
- PR mergée ;
- `SESSION.md` contient la prochaine action exacte.

# 12. Prochaine action exacte

### UX — CARTE-QUARTIER

1. exécuter la dernière CI sur le head documentaire final de **PR #328** ;
2. merger P1A.1 si toutes les gates restent vertes ;
3. repartir du `main` synchronisé ;
4. ouvrir **P1A.2 — Search Geo Contract** ;
5. introduire `district` comme filtre Search structuré réel ;
6. préserver les recherches textuelles `q` pour le texte, sans les utiliser comme identité quartier ;
7. tester parsing, stable key, gateway/routing, filtering/ranking et handoffs ;
8. double-check + score ≥ 9/10 avant P1A.3.

### DATA — lane indépendante

1. poursuivre **DATA-1.3B — Common Crawl URL Index Live Evidence**, PR #326 ;
2. conserver exactement le crawl, SQL, artefacts et comparaison contre DATA-1.2 ;
3. aucun WARC fetch ;
4. aucune écriture Source Registry automatique ;
5. ne pas laisser le chantier Carte / Quartier réécrire ou masquer le handover DATA actif.
