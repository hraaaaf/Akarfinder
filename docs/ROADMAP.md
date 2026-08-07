# AKARFINDER — ROADMAP CANONIQUE

**Version : 2026-08-07**  
**Statut : CARTE / QUARTIER P1A engagé en parallèle de DATA-1.3B ; moteur ODM actif ; priorité stratégique DATA = couverture, fraîcheur, qualité et profondeur de recherche**

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
- **Mon Projet P1B** : continuité du `project_id` vers Search, favoris et comparaisons, certifiée et mergée via PR **#318**.

### Fondation Carte / Quartier existante ✅

- `/map` : vraie carte MapLibre interactive ;
- `/search` : Atlas des résultats, positions exactes certifiées et intelligence quartier ;
- `/immobilier/[city]/[district]` : route quartier SEO canonique ;
- Geo Registry : villes/quartiers canoniques avec `seo_eligible` / `map_eligible` ;
- géométries quartier déjà amorcées, notamment Casablanca ;
- repères prix existants mais couverture limitée.

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
- DATA-1.1 / DATA-1.2 / DATA-1.3A acquis ;
- DATA-1.3B actif en lane DATA séparée.

## 4. Lot UX actif — CARTE-QUARTIER-P1A.0 🔴

Objectif : verrouiller le contrat produit et d’exécution avant tout changement fonctionnel de la carte.

Décisions produit validées :

- `/map` = exploration et intelligence ; `/search` = moteur de recherche canonique ;
- conserver `/immobilier/[city]/[district]` comme page quartier canonique ;
- construire un noyau cartographique commun tout en gardant des couches adaptées à Map et Search ;
- état URL partageable `city + district + layer + intention utile + project_id si fourni` ;
- handoff Search structuré par `city + district`, sans dépendre de `q=quartier` ;
- aucune position approximative d’annonce présentée comme exacte ;
- prix : `QUARTIER / VILLE / INDISPONIBLE`, jamais fallback silencieux ;
- commodités / POI publics uniquement avec provenance démontrable ;
- Casablanca = première ville enrichie, sans architecture spéciale Casablanca ;
- mobile = carte plein écran + bottom sheet ;
- desktop = carte dominante ~65–70 % + panneau intelligence ~30–35 % ;
- fond cartographique et composants visuels doivent adopter une identité AkarFinder propre, plus graphique et chaleureuse, sans imitation de Google Maps ni copie de Waze ;
- villes puis quartiers différenciés par couleur en mode Explorer lorsque leurs géométries réelles existent ;
- moteur de couches prévu pour Explorer, Marché, Densité et Style de vie ;
- landmarks et bâtiments enrichissent les zooms élevés uniquement à partir de données géographiques traçables.

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

### P1A.0 — Contrat produit & documentaire

Objectif : verrouiller la présente roadmap, corriger l’état Mon Projet P1B et formaliser doctrine cartographique + gate UX/UI.

Livrables :

- `README.md`, `docs/ROADMAP.md`, `docs/SESSION.md` alignés ;
- maintien de DATA-1.3B comme lane DATA active ;
- aucun code applicatif modifié ;
- prochaine action UX = P1A.1 Geo Canonical Core.

### P1A.1 — Geo Canonical Core

Objectif : une seule identité géographique dans tout AkarFinder.

Architecture cible :

`Geo Registry → canonical neighborhood data → Map / Search / SEO / Mon Projet`

Travail :

- supprimer le bypass direct de `/map` vers les seeds non canoniques ;
- réutiliser le `geo-entity-registry` ;
- porter autant que possible `city_id`, `city_slug`, `district_id`, `district_slug`, nom canonique, aliases, centroid, geometry, `seo_eligible`, `map_eligible`, niveau de preuve et provenance ;
- même Rabat/Agdal = même entité dans toutes les surfaces.

Gate : tests canoniques + aucun modèle géographique parallèle.

### P1A.2 — Search Geo Contract

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

1. **CARTE-QUARTIER-P1A.0** — contrat produit/documentaire ;
2. P1A.1 — Geo Canonical Core ;
3. P1A.2 — Search Geo Contract `district` ;
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

1. terminer et merger **P1A.0 — Contrat produit & documentaire** sans code applicatif ;
2. ouvrir **P1A.1 — Geo Canonical Core** depuis le `main` synchronisé ;
3. auditer tous les consommateurs directs de `neighborhood-data.ts`, `canonical-neighborhood-data.ts` et `geo-entity-registry` avant modification ;
4. supprimer le bypass de `/map` sans créer de modèle parallèle ;
5. ajouter les tests d’identité canonique nécessaires ;
6. double-check architecture + score ; ne pas poursuivre sous 9/10 ;
7. seulement après merge P1A.1, ouvrir P1A.2 Search Geo Contract.

### DATA — lane indépendante

1. poursuivre **DATA-1.3B — Common Crawl URL Index Live Evidence** ;
2. conserver exactement le crawl, SQL, artefacts et comparaison contre DATA-1.2 ;
3. aucun WARC fetch ;
4. aucune écriture Source Registry automatique ;
5. ne pas laisser le chantier Carte / Quartier réécrire ou masquer le handover DATA actif.
