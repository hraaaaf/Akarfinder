# AKARFINDER — ROADMAP CANONIQUE

**Version : 2026-08-07**  
**Statut : consolidation UX publique en cours ; moteur ODM actif ; priorité stratégique DATA = couverture, fraîcheur, qualité et profondeur de recherche**

Ce fichier est l’unique roadmap du projet. `README.md` définit l’identité et la doctrine ; `docs/SESSION.md` porte uniquement le handover courant.

## 1. Cap produit

AkarFinder est un **moteur de recherche immobilier, un index national et une couche d’intelligence pour le marché marocain**.

- cœur produit : `/search` ;
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
- aucune donnée, image, coordonnée ou relation partenaire inventée ;
- contenu partenaire/autorisé ≠ résultat public indexé ≠ signal marché interne ;
- un résultat tiers indexé doit conserver provenance et lien vers la source selon sa policy ;
- migrations séparées du code applicatif ;
- une responsabilité, une branche, une PR et un merge par lot ;
- aucune nouvelle roadmap ou session concurrente ;
- Search reste le moteur canonique des parcours publics.

## 3. État acquis

### UX publique consolidée ✅

- **Vendre** : terminé ;
- **Accueil P1** : certifié et mergé via PR #299 ;
- **Neuf P1** : certifié 390 / 768 / 1280, score **9,1/10** ;
- **Acheter P1** : certifié et mergé via PR #312, score **9,1/10** ;
- **Louer P1** : certifié et mergé via PR #313, score **9,0/10** ;
- **Mon Projet P1A** : parcours guidé en huit écrans, certifié et mergé via PR #314, score **9,2/10**.

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
- 53 villes/pôles couverts dans la logique d’acquisition existante.

## 4. Lot UX actif — MON-PROJET-P1B 🟡

Objectif : conserver le contexte du projet actif jusque dans Search et rendre visible la continuité réelle, sans modèle ni stockage parallèle.

Livré dans la PR #315 :

- lecture du `project_id` canonique transmis par Mon Projet ;
- bandeau compact **Projet actif** dans `/search` ;
- projet affiché uniquement s’il appartient à l’utilisateur authentifié, est actif et possède un profil V2 structuré ;
- résumé objectif, zone et budget ;
- compteurs réels de favoris et comparaisons filtrés par `project_id` ;
- accès direct à `/mon-projet/espace` ;
- absence de bandeau si le projet est absent, invalide ou inaccessible ;
- aucune migration, aucun `localStorage`, aucune clé service-role côté navigateur ;
- contrat intégré à `User Continuity V1`.

Hors périmètre P1B : modifier le projet directement dans Search, retirer explicitement le projet actif, écrire de nouvelles actions favoris/comparaison depuis les cartes et toute refonte générale de la SERP.

## 5. Séquence UX publique validée

1. **MON-PROJET-P1B** — CI complète, certification, documentation et merge PR #315 ;
2. **Carte / Quartier** — audit, questions, usage réel, densité DATA et lisibilité mobile ;
3. **Pro / Agences / Promoteurs** — pages publiques et activation professionnelle ;
4. **Immobilier / SEO** — villes, quartiers et intentions avec contenu utile ;
5. **recette SERP + fiche bien** — cohérence finale sans refonte gratuite.

La séquence UX ne doit pas retarder la montée en profondeur DATA ; les deux chantiers avancent par lots séparés.

# 6. PHASE DATA — P0 STRATÉGIQUE

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

Objectif : enrichir le graphe indépendamment du cycle de vie des annonces.

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
- rattacher plusieurs observations à une même entité physique.

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

# 7. Stratégie de montée en volume

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

# 8. KPI DATA obligatoires

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

# 9. Séquence d’exécution consolidée

Ordre recommandé sans créer de roadmap parallèle :

1. terminer **MON-PROJET-P1B** lorsque GitHub Actions redevient fiable ;
2. poursuivre **DATA-0** : dédup/change detection → quarantaine → canary ;
3. lancer **DATA-1 — Moroccan Real Estate Web Census** ;
4. lancer **DATA-2 — Common Crawl URL Index + Web Data Commons** ;
5. produire le classement réel des domaines/sources par volume × policy × difficulté ;
6. auditer **DATA-4 — profondeur des grands réservoirs** ;
7. construire **DATA-3 — Universal Site Connector** à partir des familles dominantes réellement observées ;
8. atteindre le palier **20K observations** avec preuves de qualité ;
9. avancer **Carte / Quartier** avec densité DATA réelle ;
10. activer **DATA-5/6/7 — feeds + claim + Professional Workspace** ;
11. atteindre **50K observations** avec une part croissante de données directes ;
12. construire **DATA-8 — Open Geodata / Property Graph** ;
13. consolider historique, intelligence, SEO et expansion vers **100K+ observations** ;
14. recette SERP + fiche bien + lancement élargi.

# 10. Définition de terminé

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
- PR mergée ;
- `SESSION.md` réécrit avec la prochaine action exacte.

# 11. Prochaine action exacte

### UX

1. terminer la relance des gates P1B affectés par l’incident GitHub Actions `Service Unavailable` ;
2. corriger uniquement une éventuelle régression réelle ;
3. certifier le bandeau Projet actif dans Search ;
4. merger la PR #315 dans `main` ;
5. lancer l’audit Carte / Quartier avec questions avant tout code.

### DATA — peut être préparé sans modifier le pipeline de production

1. créer le lot **DATA-1 — Moroccan Real Estate Web Census** ;
2. inventorier les discovery engines existants pour éviter tout doublon d’architecture ;
3. définir le schéma minimal `Domain Census` et son mapping vers `Source Registry` ;
4. tester Common Crawl URL Index et Web Data Commons en **discovery-only** ;
5. produire une première liste de domaines marocains classés `AGENCY / PROMOTER / PORTAL / CLASSIFIED / OTHER` ;
6. mesurer pour chaque domaine : volume potentiel, stack technique, sitemap/structured data, policy et connecteur probable ;
7. choisir le premier connecteur générique uniquement à partir des résultats de ce census ;
8. ne lancer aucune ingestion massive avant validation des gates DATA-0 et Source Registry.