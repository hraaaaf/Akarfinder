# AkarFinder — Refonte Page Annonce Ultra Premium

**Programme canonique : `ANNOUNCEMENT-PAGE-ULTRA-PREMIUM`**  
**Version : 2026-08-16**  
**Statut : ANN-L0 ✅ CLOSED ; ANN-L1 ✅ CLOSED ; ANN-L2 ✅ CLOSED ; ANN-L3 NEXT**  
**Progression stricte : 18 / 100 %.**

> Ce document est la sous-roadmap normative du chantier de refonte de `/listings/[id]`. `docs/ROADMAP.md` reste le registre canonique global AkarFinder. Les pourcentages ci-dessous sont comptés uniquement sur les LOTS `CLOSED`, jamais sur du travail commencé ou supposé presque terminé.

## 0. Closeout ANN-L0 — Contrat vérité ✅

- **PR #716 ✅ MERGED** — merge `f0ffaa18b6774631ce25251b845cca9d7162913e` ; exact head `4cd12a96e9b7fccbcc359c6ff034fd4d5a22bb2d`.
- Gate dédié exact-head `Announcement Page L0 Truth Contract`, run `31925462743` : tests du nouveau contrat, régression `listing-detail-boundary`, `P10IMG`, `REAL-PROXIMITY-ENGINE-1` et TypeScript **SUCCESS**.
- Diff runtime public : **0**. Scope merge : roadmap dédiée, contrat fail-closed, tests, workflow CI.
- Contrat verrouillé : aucun pin exact sans geo `exact` ; aucun POI premium sans provider vérifié + observation horodatée ; aucun temps précis sans route mesurée depuis une origine exacte ; aucune Street Reality sans contexte geo admissible + asset attribuable ; aucune galerie sans permissions ; aucun score/estimate/comparable/contact/fit sans preuve correspondante.
- Dette explicitement contenue : les `walking_minutes` historiques dérivés de GPS/centroïdes par `REAL-PROXIMITY-ENGINE-1` ne valent **pas** preuve de routage pour la nouvelle fiche.
- **Crédit officiel ANN-L0 : +4 %.**

## 0.1 Closeout ANN-L1 — Shell premium ✅

- **PR #719 ✅ MERGED** — merge `f2e2c3db29b63d87eedff4c4e00e5e85f374c7f9` ; exact head certifié `a99e8987df287d2ed36a0eea4966aad1080edb87`.
- Gate dédié `Announcement Page L1 Premium Shell`, run `31926548546` : contrats, régressions, TypeScript, production build et Chromium ciblé **SUCCESS**.
- Artefact visuel `9258022426`, digest `sha256:565c3b1d91eb0f2023eb4b9dff399604c4e3a006d4b3d05c7fee14af5c22e1ff`.
- Fixture `/visual-qa/announcement-page` : **4/4 screenshots, 0 finding** sur 390×844 / 430×932 / 768×900 / 1280×900 ; HTTP 200 ; H1=1 ; main=1 ; overflow=0 ; 0 erreur console/ressource.
- Mobile/tablette : dock décision présent, touch targets 44/48/48 px. Desktop : Mon Projet présent dans le rail d'actions, 46 px.
- Shell livré : vrai `SiteHeader searchMode`, surface `pageLight`, largeur max 1500 px, H1 unique, loading reduced-motion, not-found fail-honest et fixture QA noindex.
- Régression détectée pendant le lot : retrait involontaire de Mon Projet desktop après suppression de `PropertyDecisionHeader`; corrigée et désormais couverte par test mobile + desktop.
- Dette volontaire : galerie = ANN-L2 ; densité/card hierarchy = ANN-L3 ; intelligence = ANN-L4.
- Preuve détaillée : `docs/ANNOUNCEMENT_PAGE_L1_CLOSEOUT.md`.
- **Crédit officiel ANN-L1 : +7 %. Progression cumulée : 11 %. Prochain chemin critique : ANN-L2 Galerie média.**

## 0.2 Closeout ANN-L2 — Galerie média ✅

- **PR #725 ✅ MERGED** — merge `5664f699b7f51d06f368331d6e0e5a1c51cce83c` ; exact head certifié `8cad00a6f2ef08f8944b7e1c3cdef93a9f0123fd`.
- Gate dédié `Announcement Page L2 Media Gallery`, run `31938661694` : contrats, TypeScript, production build et Chromium ciblé **SUCCESS**.
- Artefact visuel `9261410081`, digest `sha256:7cf154d5bf8c09f1f15f304d681ba265b2477c3e9b5d27e9ef55e1d36cf31d16`.
- Rapport `ANNOUNCEMENT_PAGE_L2_MEDIA_VISUAL_V1` : **10/10 screenshots, 0 finding** ; galerie 390/430/768/1280, 2 photos desktop, preview mobile/desktop, forbidden, unknown et broken.
- Broken : exactement **1×404 attendu** sur l'asset volontairement absent puis fallback, sans erreur HTTP inattendue ; H1=1, main=1 et overflow=0 sur tous les scénarios.
- Galerie fail-closed : multi-image seulement avec `allowed + partner_full + can_show_gallery` ; preview = 1 image ; forbidden/unknown = fallback ; photos owner servies via URLs Storage signées depuis bucket privé.
- Anomalie importante corrigée : un 404 pouvait terminer avant hydratation et avant l'attachement de `onError` ; `MediaImage` récupère désormais `complete && naturalWidth === 0` et déduplique le signal d'erreur.
- Aucun feed CSV partenaire multi-image n'existe encore ; le contrat est prêt sans prétendre à une alimentation partenaire inexistante.
- Preuve détaillée : `docs/ANNOUNCEMENT_PAGE_L2_CLOSEOUT.md`.
- **Crédit officiel ANN-L2 : +7 %. Progression cumulée : 18 %. Prochain chemin critique : ANN-L3 Property Core.**

## 1. Vision produit

Transformer la fiche actuelle en une expérience immobilière mobile-first, ultra premium, aussi simple à lire qu'une grande fiche Zillow-like mais différenciée par les forces propres d'AkarFinder : vérité des données, provenance, multi-source, fiabilité, intelligence marché Maroc, expérience quartier mesurée et personnalisation `Mon Projet`.

La page ne doit pas être un clone graphique de Zillow. **L'architecture d'information peut reprendre les meilleures conventions du marché ; l'identité visuelle reste celle du Search AkarFinder réel.**

Référence visuelle validée : mockup mobile avec hero immobilier, prix/titre/facts, bloc AkarScore, description, localisation et dock `Demander une visite / WhatsApp`. ANN-L1 a matérialisé la référence de shell dans une fixture QA versionnée ; ANN-L2 a livré le contrat média et ANN-L3 poursuit la convergence du Property Core.

## 2. Doctrine non négociable

1. **Aucune donnée immobilière manquante n'est inventée.**
2. **Aucun temps de trajet précis n'est affiché sans routage réellement mesuré depuis une origine suffisamment précise.** Une distance Haversine, un centroïde ou une approximation ne devient jamais `8 min à pied`.
3. **Aucun pin exact n'est affiché si la géographie n'est pas `exact`.**
4. **Aucune galerie tierce n'est affichée sans permission explicite compatible avec le niveau de profondeur public.**
5. **Aucune vue rue n'est présentée comme photo du bien.** Toute imagerie street-level est un contexte géolocalisé avec source, distance/date si disponibles et attribution.
6. **Aucune estimation de valeur n'est affichée sans modèle calibré, plage d'incertitude et statut de certification.**
7. **Aucun comparable n'est synthétique.** Tous les comparables proviennent d'un service canonique, dédupliqué et traçable.
8. **Aucun score de compatibilité personnel n'est calculé sans profil utilisateur explicite.**
9. **Aucun CTA contact n'est exposé sans autorisation de contact.**
10. L'absence de preuve produit un état caché ou honnête, jamais une approximation décorative.

## 3. Socle existant à réutiliser

La refonte ne repart pas de zéro. Le code actuel fournit déjà :

- `PublicPropertyDetailV2` : conclusion AkarFinder, AkarScore, position marché, facts structurés, environnement, historique, provenance, multisource et professionnel ;
- `Listing` : prix, prix/m², surfaces, pièces, chambres, salles de bain, état, orientation, terrasse, jardin, garage, piscine, équipements premium, coordonnées et précision géographique ;
- règles image : `image_permission_status`, `source_access_level`, `can_show_gallery`, `can_show_thumbnail` ;
- historique d'observation AkarFinder ;
- Favorite / Compare / Visit / WhatsApp / Mon Projet ;
- moteur de proximité historique `REAL-PROXIMITY-ENGINE-1` avec données `osm_static` et calculs GPS/centroïdes.

### Dette explicitement reconnue

Le champ historique `nearby_places?: { label, time, icon }[]` et les `walking_minutes` calculés à partir d'une géométrie non routée **ne sont pas une preuve suffisante pour l'expérience premium**. Ils ne doivent pas être utilisés comme temps de trajet précis par la nouvelle fiche. ANN-L5/L6 introduiront un contrat provider + routage mesuré.

## 4. Architecture fonctionnelle cible

### 4.1 Hero & média

- galerie swipe mobile ;
- compteur photos ;
- fullscreen ;
- favori ;
- partage ;
- attribution discrète ;
- fallback premium si média non autorisé ;
- futur-compatible vidéo / 360 sans bloquer la v1.

### 4.2 Identité du bien

Ordre mobile cible :

`Transaction → Prix → Titre → Localisation → Surface / Chambres / SDB / Garage`.

Les caractéristiques essentielles restent compactes. Les gros pavés de métriques actuels sont remplacés par une ligne lisible et accessible.

### 4.3 AkarFinder Intelligence

- AkarScore `/100` : échelle canonique actuelle conservée ;
- couverture / qualité des données ;
- alertes ;
- position prix/m² ;
- position marché ;
- multi-source ;
- Property Fit uniquement si calculé ;
- futur AkarEstimate seulement après ANN-L9.

### 4.4 Description & caractéristiques

- description progressive `Voir plus` ;
- surfaces ;
- agencement ;
- bâtiment/état ;
- équipements ;
- provenance progressive : disponible sans transformer chaque valeur en sapin de Noël de badges.

### 4.5 `Vivre ici` — feature signature

La fiche doit répondre à la question : **« Si j'habite ici, à quoi ressemble réellement ma vie quotidienne ? »**

Catégories cibles :

- écoles / crèches ;
- supermarchés / commerces / marchés ;
- pharmacies / cliniques / hôpitaux ;
- tram / bus / gare / transports ;
- cafés / restaurants ;
- parcs / sport ;
- mosquées ;
- banques ;
- parking ;
- centres commerciaux ;
- plage / côte quand pertinente ;
- catégories marocaines additionnelles validées au benchmark.

Pour chaque POI admissible :

- nom réel ;
- catégorie ;
- coordonnées provider ;
- distance routée si disponible ;
- temps à pied / voiture **uniquement mesuré** ;
- source/provider et fraîcheur ;
- niveau de confiance.

UX cible : filtres `5 min / 10 min / 15 min`, carte, POI prioritaires et isochrones réels.

### 4.6 Street Reality

Provider street-level abstrait. Candidat principal à benchmarker : Mapillary. Le module doit afficher :

- imagerie disponible à proximité ;
- distance de la capture au bien/point de référence ;
- date si fournie ;
- attribution ;
- libellé explicite `Vue de rue à proximité`, jamais `Photo du bien`.

### 4.7 Marché, comparables & estimation

- comparables réels AkarFinder ;
- médiane / distribution prix/m² de zone ;
- percentile du bien ;
- stock / fraîcheur de l'échantillon ;
- historique des prix observés ;
- jours/temps d'observation quand défendable ;
- AkarEstimate : valeur centrale + fourchette + confiance + date du modèle, uniquement après calibration/backtest.

### 4.8 Finance Maroc

- mensualité paramétrable ;
- apport ;
- durée ;
- taux saisi ou hypothèse versionnée ;
- coût d'acquisition uniquement pour postes documentés ;
- distinction prix du bien / crédit / frais ;
- scénario MRE lorsque la doctrine financière est sourcée et versionnée.

Aucun taux ou frais réglementaire n'est figé silencieusement dans l'UI.

### 4.9 Professionnel & conversion

- identité agence/promoteur/particulier selon autorité publique ;
- badge commercial réel ;
- visite ;
- WhatsApp ;
- téléphone si autorisé ;
- source originale ;
- signalement ;
- dock mobile permanent ;
- Mon Projet et comparaison conservés sans concurrencer le CTA principal.

### 4.10 Personnalisation Mon Projet

Après profil explicite :

- match des critères ;
- budget ;
- surface/type ;
- préférences ;
- trajets personnalisés vers points sauvegardés (travail, école, etc.) ;
- raisons du match / mismatch.

## 5. Architecture providers cible

Aucune dépendance fournisseur n'entre directement dans les composants React. Les lots Geo passent par des interfaces :

```text
Listing Geo Authority
        ↓
GeoTruthProvider
        ├── NearbyProvider       → POI
        ├── RoutingProvider      → distance / durée / matrix
        ├── IsochroneProvider    → zones 5/10/15 min
        └── StreetImageryProvider→ contexte street-level
```

ANN-L5 réalise un bake-off réel Maroc avant choix production. Candidats à comparer :

- POI : OpenStreetMap/Overpass, Mapbox Search, Google Places ou autre provider conforme ;
- Routing/Isochrone : Mapbox, Google Routes, moteur OSM/OSRM/Valhalla ou autre ;
- Street imagery : Mapillary prioritaire au benchmark, alternatives si couverture/droits insuffisants.

Critères : couverture Rabat/Casablanca/Marrakech/Tanger, exactitude, fraîcheur, latence, coût, quota, attribution, stockage/cache autorisé, droits de réaffichage et résilience.

## 6. Contrat de preuve public

Chaque module premium doit dépendre d'une capacité explicite, jamais de la simple présence d'un champ texte.

Niveaux de preuve :

- **SOURCE_DECLARED** : information déclarée par source/partenaire autorisé ;
- **AKAR_CALCULATED** : calcul déterministe à partir de données admissibles ;
- **GEO_VERIFIED** : géographie canonique avec précision connue ;
- **PROVIDER_VERIFIED** : POI/imagerie retourné par provider autorisé et attribuable ;
- **ROUTE_MEASURED** : distance/durée réellement routée ;
- **MARKET_CERTIFIED** : statistique produite par moteur marché certifié ;
- **MODEL_CERTIFIED** : estimation calibrée/backtestée ;
- **USER_PERSONALIZED** : résultat calculé sur profil explicite.

Le code de ANN-L0 formalise les gates correspondants.

## 7. Roadmap stricte — 14 LOTS / 100 %

La progression officielle est la somme des poids des LOTS `CLOSED` seulement.

| LOT | Poids | Objectif | Dépend de |
|---|---:|---|---|
| ANN-L0 — Contrat vérité | 4 % | Geler capacités, preuves, fail-closed, règles anti-invention | — |
| ANN-L1 — Shell premium | 7 % | Mobile-first + identité exacte Search + fixture QA | L0 |
| ANN-L2 — Galerie média | 7 % | Swipe/fullscreen/compteur/permissions/fallback | L0-L1 |
| ANN-L3 — Property Core | 6 % | Prix/titre/facts/caractéristiques essentielles | L1 |
| ANN-L4 — Akar Intelligence | 9 % | AkarScore/marché/qualité/alertes/multisource/fit | L0-L3 |
| ANN-L5 — Geo Foundation | 9 % | Autorité geo + abstraction providers + bake-off Maroc | L0 |
| ANN-L6 — Vivre ici | 12 % | POI réels + routing + isochrones + UX quartier | L5 |
| ANN-L7 — Street Reality | 6 % | Imagerie rue contextuelle et attribuée | L5 |
| ANN-L8 — Marché & comparables | 10 % | Comparables, distribution, prix/m², stock | L4-L5 |
| ANN-L9 — AkarEstimate & historique | 6 % | Estimation certifiée + fourchette + timeline prix | L8 |
| ANN-L10 — Finance Maroc | 7 % | Calculateur versionné, hypothèses explicites | L3 |
| ANN-L11 — Pro & conversion | 6 % | Profil pro + visite/WhatsApp/téléphone/source | L1-L3 |
| ANN-L12 — Mon Projet personnalisé | 5 % | Fit réel + destinations personnalisées | L5-L6 |
| ANN-L13 — Certification 10/10 | 6 % | Visuel, a11y, perf, vérité, permissions, régression | L1-L12 |

**Total = 100 %.**

## 8. Détail des LOTS et critères de sortie

### ANN-L0 — Contrat vérité — 4 % — ✅ CLOSED

**But** : empêcher la refonte premium de transformer des approximations existantes en affirmations visuellement convaincantes mais fausses.

Livrables :

- ce document canonique ;
- `lib/property-detail/announcement-page-truth-contract-v1.ts` ;
- tests fail-closed dédiés ;
- workflow CI ANN-L0 ;
- inventaire explicite des capacités premium.

Critères CLOSED :

- poids = 100 % vérifié par test ;
- pin exact impossible sans geo `exact` ;
- POI premium impossible sans provider vérifié ;
- minutes précises impossibles sans `ROUTE_MEASURED` + origine exacte ;
- street imagery impossible sans provider/asset attribuable ;
- galerie impossible sans permission ;
- AkarEstimate impossible sans modèle certifié ;
- comparables/market impossible sans service certifié ;
- direct contact impossible sans permission ;
- fit impossible sans profil + calcul ;
- targeted tests PASS ; TypeScript PASS ; exact-head gate vert ; merge et présence sur `main` vérifiés.

**Aucun changement UI public dans L0.**

### ANN-L1 — Shell premium — 7 % — ✅ CLOSED

Implémentation : nouvelle composition mobile-first de `/listings/[id]`, tokens visuels du vrai `/search`, H1 unique, spacing, sections continues, skeletons et states. Fixture QA data-backed/noindex stable à 390/430/768/1280.

Gate CLOSED : comparaison mockup/rendu pour le scope L1, aucune régression header/nav, overflow 0, touch targets conformes, exact-head Chromium 4/4 + 0 finding. Détails : `docs/ANNOUNCEMENT_PAGE_L1_CLOSEOUT.md`.

### ANN-L2 — Galerie média — 7 % — ✅ CLOSED

Implémentation : `PropertyMediaGallery`, swipe, clavier, fullscreen, compteur, attribution, favori/partage. Le composant consomme uniquement le résultat du contrat média ; fallback `ListingVisual` si non autorisé. Owner : URLs Storage signées serveur depuis bucket privé ; aucune permission élargie.

Gate CLOSED : exact head `8cad00a6f2ef08f8944b7e1c3cdef93a9f0123fd`, run `31938661694` SUCCESS, **10/10 captures + 0 finding** ; partner_full multi-image, preview single-image, forbidden/unknown fallback, broken URL fallback et galerie 2 photos certifiés. Détails : `docs/ANNOUNCEMENT_PAGE_L2_CLOSEOUT.md`.

### ANN-L3 — Property Core — 6 % — NEXT

Implémentation : prix, titre, quartier, transaction, facts essentiels, description progressive et groupes de caractéristiques. Suppression de la hiérarchie actuelle trop card-heavy sans perdre de facts.

Gate : données nulles/0, prix non communiqué, très long titre, 1/20 caractéristiques, provenance conservée.

### ANN-L4 — Akar Intelligence — 9 %

Implémentation : nouveau `AkarInsightCard` compact et lisible ; AkarScore /100, couverture, alertes, position marché, multi-source, Property Fit si calculé. Les métriques absentes disparaissent proprement.

Gate : aucun score ou fit synthétique ; labels non trompeurs ; version intelligence visible en debug/QA.

### ANN-L5 — Geo Foundation — 9 %

Implémentation :

- adapter Listing → `GeoTruth` canonique ;
- interfaces `NearbyProvider`, `RoutingProvider`, `IsochroneProvider`, `StreetImageryProvider` ;
- contrat cache/attribution/fraîcheur ;
- benchmark réel d'au moins 30 points couvrant Rabat, Casablanca, Marrakech, Tanger ;
- rapport couverture/coût/latence/droits ;
- choix provider(s) réversible par configuration.

Gate : aucune coordonnée exacte inférée ; aucun provider lock-in dans React ; test failover/fail-closed.

### ANN-L6 — Vivre ici — 12 %

Implémentation : pipeline POI réel, taxonomy AkarFinder, ranking de pertinence, routing exact, isochrones 5/10/15, carte interactive et listes rapides.

Règles :

- exact GPS → POI + routage possible ;
- neighborhood centroid → POI de quartier possible mais pas `X min depuis ce bien` ;
- city centroid → module quartier précis masqué ;
- provider/routing indisponible → pas de faux résultat.

Gate : échantillon humain de POI et trajets, anti-dup, catégories, attribution, cache policy, tests de cohérence origine/destination.

### ANN-L7 — Street Reality — 6 %

Implémentation : recherche d'imagerie street-level autour du point admissible, viewer léger, miniatures, distance/date/source. Mapillary est benchmarké mais non hardcodé dans l'UI.

Gate : aucune image présentée comme le bien, seuil de distance explicite, attribution, état `non disponible` élégant.

### ANN-L8 — Marché & comparables — 10 %

Implémentation : service canonique de comparables basé sur type, transaction, zone, surface, fraîcheur et déduplication. Sorties : comparables, distribution prix/m², médiane, percentile, taille échantillon et fenêtre temporelle.

Gate : pas de `mockListings`, pas de comparable non traçable, minimum statistique versionné, contrôle outliers.

### ANN-L9 — AkarEstimate & historique — 6 %

Implémentation : modèle d'estimation séparé de l'AkarScore. Sortie obligatoire : estimate, borne basse, borne haute, confidence, modèle/version, date, taille/qualité échantillon. Timeline = observations réelles uniquement.

Gate : backtest holdout, métriques d'erreur par ville/segment, seuils de publication ; si seuil non atteint, estimation masquée.

### ANN-L10 — Finance Maroc — 7 %

Implémentation : calculateur client déterministe ; taux/apport/durée modifiables ; hypothèses datées ; frais uniquement si sourcés/versionnés. Ne jamais présenter une simulation comme offre de crédit.

Gate : tests calculs, arrondis, taux 0/limites, disclaimer, aucune constante réglementaire silencieuse.

### ANN-L11 — Pro & conversion — 6 %

Implémentation : identité professionnelle canonique, badge commercial autorisé, visite, WhatsApp, téléphone, source originale, signalement. Dock mobile : `Demander une visite` + `WhatsApp` quand autorisé, alternatives propres sinon. Favori/compare/Mon Projet restent secondaires.

Gate : CTA matrix par `source_access_level`/`allowed_ctas`; aucune donnée de contact extraite/inférée.

### ANN-L12 — Mon Projet personnalisé — 5 %

Implémentation : Property Fit réel et destinations sauvegardées. Les temps vers travail/école passent par le même `RoutingProvider` que `Vivre ici`.

Gate : aucun profil → aucun fit ; suppression/édition destinations ; confidentialité ; cache isolé des données personnelles.

### ANN-L13 — Certification 10/10 — 6 %

Certification finale :

- 390×844 ; 430×932 ; 768×900 ; 1280×900 ;
- iOS safe areas ;
- Chrome/Safari raisonnables ;
- a11y clavier/lecteur ;
- aucune collision dock/bottom-nav ;
- Core Web Vitals / bundle / images ;
- galeries autorisées/interdites ;
- geo exact/quartier/ville/inconnu ;
- POI/routing provider success/failure ;
- intelligence présente/absente ;
- contact autorisé/interdit ;
- snapshots visuels ;
- régression `/search` + `/listings/[id]` ;
- audit humain final.

`10/10` n'est attribué qu'après preuves exact-head et navigateur, jamais sur jugement du mockup seul.

## 9. Ordre du chemin critique

```text
L0
 ↓
L1 ─→ L2 ─→ L3 ─→ L4
              │
L5 ─→ L6 ─→ L7│
 │      │      ↓
 └──────┴────→ L8 ─→ L9
        │
        ├────→ L12
L3 ─────┼────→ L10
L1/L3 ───────→ L11

L1..L12 ─────→ L13
```

Parallélisation autorisée après L0 : L1 et L5 peuvent avancer en parallèle ; L10 peut démarrer après L3 ; L11 après le shell/core.

## 10. Règle de closeout de chaque LOT

Chaque LOT suit :

`implémentation → tests ciblés → TypeScript/build selon risque → navigateur/QA si UI → correction → exact-head CI → documentation → roadmap/% → merge → vérification post-merge`.

Un run queued/in_progress ne clôt pas un LOT. Un LOT n'est `CLOSED` que sur preuve.

## 11. Progression canonique

| LOT | Poids | État | Crédit officiel |
|---|---:|---|---:|
| ANN-L0 | 4 % | ✅ CLOSED | 4 % |
| ANN-L1 | 7 % | ✅ CLOSED | 7 % |
| ANN-L2 | 7 % | ✅ CLOSED | 7 % |
| ANN-L3 | 6 % | NEXT | 0 % |
| ANN-L4 | 9 % | NOT_STARTED | 0 % |
| ANN-L5 | 9 % | NOT_STARTED | 0 % |
| ANN-L6 | 12 % | NOT_STARTED | 0 % |
| ANN-L7 | 6 % | NOT_STARTED | 0 % |
| ANN-L8 | 10 % | NOT_STARTED | 0 % |
| ANN-L9 | 6 % | NOT_STARTED | 0 % |
| ANN-L10 | 7 % | NOT_STARTED | 0 % |
| ANN-L11 | 6 % | NOT_STARTED | 0 % |
| ANN-L12 | 5 % | NOT_STARTED | 0 % |
| ANN-L13 | 6 % | NOT_STARTED | 0 % |

**Progression officielle actuelle : 18 / 100 %.**