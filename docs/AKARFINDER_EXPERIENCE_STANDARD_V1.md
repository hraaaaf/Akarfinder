# AkarFinder Experience Standard v1

Statut : **N0 — TARGET CONTRACT**
Date : 2026-08-19
Scope : `/map`, `/search`, `/listings/[id]`, pages quartier/ville liées, publication propriétaire/agence/promoteur.

## 1. Goal produit

Construire une expérience immobilière continue où l'utilisateur comprend d'abord le territoire, puis le marché, puis les biens, sans perdre le contexte de recherche lorsqu'il passe de la carte aux résultats ou à une fiche.

Doctrine cible :

**Territoire → Marché → Vie locale → Biens → Décision**

La mécanique peut reprendre les bons patterns Zillow-like (split map/list, pins prix, synchronisation, recherche dans la zone), mais l'identité AkarFinder reste centrée sur l'intelligence territoriale, la confiance, la provenance et la vérité des données.

## 2. Baseline auditée

Baseline produit certifiée disponible sur le HEAD produit `3db92d158ca2c388e5d53857089fce304348899b`, puis intégrée sur `main` sans modification runtime lors du closeout #821.

Constats N0 :

1. `/map` est techniquement solide mais fonctionne surtout comme explorateur territorial séparé.
2. `/search` possède déjà des mécanismes Zillow-like, mais reste une surface distincte de la carte.
3. `/listings/[id]` est riche en intelligence, provenance et décision, mais la hiérarchie est longue et dense, surtout sur mobile.
4. Les gates existants prouvent principalement absence d'overflow, accessibilité structurelle et stabilité. Ils ne constituent pas à eux seuls une certification de cohérence globale de navigation.
5. Les fondations à réutiliser existent déjà : MapLibre, métriques Prix/Densité/Annonces, confiance/fraîcheur, POI/isochrones, comparables, provenance, geo precision, publication propriétaire, ranking et Search Gateway.

## 3. Principes non négociables

### 3.1 Une seule session de recherche

Les filtres, la ville, le quartier, le viewport, le mode de carte, le bien sélectionné et le projet éventuel appartiennent à une seule session logique.

Les transitions Carte ↔ Search ↔ Listing doivent préserver le contexte pertinent.

### 3.2 Pas de fausse précision géographique

Niveaux canoniques :

- `exact` : coordonnées suffisamment précises pour un pin bien ;
- `neighborhood_centroid` : quartier connu, emplacement exact inconnu ;
- `city_centroid` : ville connue uniquement ;
- `unknown` : localisation insuffisante.

Règles :

- `exact` peut produire un pin individuel ;
- `neighborhood_centroid` contribue au quartier mais ne doit jamais simuler une adresse exacte ;
- `city_centroid` contribue aux compteurs ville mais ne doit jamais être distribué artificiellement dans un quartier ;
- `unknown` ne doit jamais être cartographié comme une position connue.

### 3.3 Marché observé, jamais inventé

Les métriques publiques doivent conserver leurs qualifications :

- prix observé ;
- densité observée ;
- volume observé ;
- taille d'échantillon ;
- fraîcheur ;
- confiance/fiabilité.

Fail-closed si les données sont insuffisantes.

### 3.4 Une propriété peut avoir plusieurs offres

Le modèle cible distingue :

- **Property** : le bien physique canonique quand le rapprochement est suffisamment sûr ;
- **Offer/Listing** : une offre publiée par un propriétaire, une agence, un promoteur ou une source externe admissible.

Aucune fusion n'est autorisée sans preuve de rapprochement suffisante.

### 3.5 Complétude ≠ confiance

Deux indicateurs séparés :

- **Qualité de l'annonce / complétude** : quantité de données structurées exploitables ;
- **Confiance AkarFinder** : qualité de provenance, fraîcheur, vérification, cohérence et niveau géographique.

Une fiche complète n'est pas automatiquement fiable.

## 4. Architecture d'expérience cible

### 4.1 État A — Vue Maroc

Objectif : choisir un territoire, pas afficher un tapis de pins.

Affichage :
- villes prioritaires ;
- volume observé lorsque disponible ;
- aucune annonce city-only transformée en pin individuel.

### 4.2 État B — Vue ville

Objectif : comparer les quartiers.

Lentilles de marché :
- Prix ;
- Densité ;
- Annonces ;
- Confiance.

Les quartiers utilisent des géométries certifiées uniquement.

### 4.3 État C — Vue quartier

Objectif : comprendre le quartier avant de choisir un bien.

Affichage progressif :
- métriques observées ;
- contexte quartier ;
- POI structurants ;
- stock disponible ;
- CTA vers les biens de la zone.

### 4.4 État D — Recherche de biens map/list

Desktop :
- carte dominante ou équilibrée selon le viewport ;
- panneau résultats persistant ;
- filtres compacts sticky ;
- pins prix lorsque la position exacte le permet ;
- clusters pour la densité ;
- bouton `Rechercher dans cette zone` après déplacement significatif.

Interaction :
- hover/focus résultat ↔ mise en évidence pin ;
- clic pin ↔ sélection résultat ;
- sélection conserve le contexte ;
- déplacement carte ne déclenche pas silencieusement une nouvelle requête sans feedback utilisateur.

### 4.5 État E — Bien sélectionné

Sans quitter immédiatement la carte :
- preview compacte ;
- prix, type, surface, localisation avec niveau de précision ;
- source/confiance ;
- CTA fiche complète.

### 4.6 État F — Fiche annonce

Hiérarchie cible :

1. **Bien** : prix, titre, localisation, faits clés, galerie.
2. **Confiance** : source, provenance, précision géographique, complétude.
3. **Marché** : comparables, position vs médiane observée, historique si prouvé.
4. **Vie locale** : POI et distances uniquement selon précision disponible.
5. **Décision** : favori, comparaison, visite/contact autorisé, Mon Projet.
6. **Source/offres** : source originale et autres offres du même bien uniquement si rapprochement prouvé.

La fiche doit proposer `Voir sur la carte` et `Retour à la recherche` en restaurant le contexte.

### 4.7 État G — Publication

L'utilisateur ne rédige pas une annonce libre : il construit un dossier conforme au **AkarFinder Listing Standard**.

Acteurs :
- propriétaire ;
- agence ;
- promoteur.

Le formulaire est dynamique selon :
- type de bien ;
- vente/location ;
- resale/new_build/off_plan ;
- droits médias ;
- précision géographique acceptée.

AkarFinder calcule ensuite les enrichissements qui lui appartiennent. Le déclarant ne saisit pas lui-même des métriques AkarFinder.

## 5. Semantic zoom

Le zoom change le niveau de sens, pas seulement la taille des éléments.

### Zoom national
- villes ;
- volume global si fiable.

### Zoom ville
- quartiers ;
- lentilles Prix / Densité / Annonces / Confiance.

### Zoom quartier
- frontières certifiées ;
- grands POI structurants ;
- groupes d'annonces / clusters.

### Zoom proche
- pins individuels exacts ;
- POI locaux utiles ;
- preview de bien.

Les POI ne doivent pas créer de bruit permanent. Ils apparaissent selon catégorie et niveau de zoom.

## 6. Standards navigation

1. **URL comme contrat partageable** pour les filtres et territoires pertinents.
2. Back/forward restaure l'état sans reset silencieux.
3. `city + district` reste le minimum de handoff territorial.
4. Le viewport carte peut être persisté lorsque cela apporte une valeur réelle, sans rendre l'URL illisible.
5. Un clic fiche depuis Search ou Map doit permettre un retour au même contexte.
6. Aucun lien `Carte` générique ne doit effacer inutilement des filtres actifs.
7. Le mode mobile ne doit pas dupliquer la navigation desktop en miniature.

## 7. Standards mobile

Doctrine : **map-first + bottom sheet**.

- carte visible et utile au chargement ;
- filtres horizontaux compacts ;
- bottom sheet repliée par défaut ;
- état intermédiaire pour preview ;
- état étendu pour liste complète ;
- swipe horizontal possible pour passer entre biens sélectionnables ;
- aucune sheet ne doit masquer durablement la quasi-totalité de la carte sans action utilisateur.

## 8. Standards UI

Identité AkarFinder à conserver :
- deep green / navy / neutres existants ;
- typographie actuelle ;
- cartes aérées ;
- rayon cohérent ;
- hiérarchie nette ;
- badges de confiance discrets mais lisibles.

À éviter :
- clone visuel Zillow blanc/bleu ;
- accumulation de pills ;
- panneaux concurrents ;
- informations secondaires au-dessus du prix/titre/localisation ;
- cartes gigantesques de quartier qui obstruent la recherche active ;
- micro-texte critique ;
- animation décorative non fonctionnelle.

## 9. Standard Listing commun

Blocs de données :

### Identité
- transaction ;
- type de bien ;
- segment de marché ;
- titre ;
- acteur/source.

### Localisation
- ville ;
- quartier ;
- coordonnées éventuelles ;
- niveau de précision ;
- provenance géographique.

### Bien
- surfaces ;
- pièces/chambres/salles d'eau ;
- étage/bâtiment ;
- état ;
- équipements ;
- données conditionnelles par type.

### Prix
- statut ;
- montant ;
- charges ;
- prix/m² calculé si possible ;
- historique si prouvé.

### Médias
- photos/plans/vidéos ;
- droits ;
- provenance.

### Confiance
- provenance champ par champ ;
- fraîcheur ;
- complétude ;
- fiabilité ;
- duplication/rapprochement.

### Enrichissement AkarFinder
- marché observé ;
- comparables ;
- vie locale ;
- historique ;
- scores explicables ;
- Mon Projet.

## 10. Sources et profondeur de fiche

- first-party / propriétaire AkarFinder : fiche interne complète ;
- partenaire autorisé : fiche interne complète selon droits ;
- externe public live : résultat + preview/intelligence uniquement selon droits et doctrine ;
- legacy tiers : aucune nouvelle publication structurée ;
- benchmark : jamais une annonce.

La normalisation de données peut être commune sans confondre les droits d'affichage.

## 11. Wireframes contractuels N0

### Desktop — Recherche map/list

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Header AkarFinder                                                           │
├──────────────────────────────────────────────────────────────────────────────┤
│ Acheter | Casablanca | Prix | Surface | Type | Chambres | Filtres           │
├───────────────────────────────────────┬──────────────────────────────────────┤
│                                       │ 247 biens · Maarif                   │
│              CARTE                    │ ┌──────────────────────────────────┐ │
│                                       │ │ photo | prix | titre | confiance │ │
│   quartiers / heatmap / pins          │ └──────────────────────────────────┘ │
│                                       │ ┌──────────────────────────────────┐ │
│   [Rechercher dans cette zone]        │ │ photo | prix | titre | confiance │ │
│                                       │ └──────────────────────────────────┘ │
└───────────────────────────────────────┴──────────────────────────────────────┘
```

### Mobile — Recherche

```text
┌──────────────────────────────┐
│ Header compact               │
│ filtres horizontaux          │
├──────────────────────────────┤
│                              │
│            CARTE             │
│                              │
│ [Rechercher dans cette zone] │
├──────────────────────────────┤
│ 247 biens · Maarif      ───  │
│ preview / sheet repliée      │
└──────────────────────────────┘
```

### Fiche annonce

```text
Bien
  ↓
Confiance
  ↓
Marché
  ↓
Vie locale
  ↓
Décision
  ↓
Source / autres offres prouvées
```

Ces wireframes fixent la hiérarchie et les comportements, pas les pixels finaux. Un mockup haute fidélité devra être approuvé avant le lot visuel correspondant.

## 12. Critères de certification visuelle

Pour chaque lot UI/UX :

1. captures BEFORE aux viewports concernés ;
2. Goal écrit ;
3. target visuel/wireframe/mockup verrouillé ;
4. implémentation ;
5. captures AFTER aux mêmes viewports ;
6. comparaison BEFORE / target / AFTER ;
7. test fonctionnel + accessibilité proportionnels au risque ;
8. score visuel humain explicite ;
9. aucune certification sur seul critère `0 overflow`.

Viewports de référence : 390×844, 430×932, 768×900, 1280×900.

## 13. Hors scope initial

- dessiner une zone ;
- routing multimodal temps réel ;
- recommandations opaques par IA ;
- fusion de propriétés sur signaux faibles ;
- nouvelles activations de sources ou mutations de données sans gate dédié ;
- déploiement Vercel sans autorisation explicite.
