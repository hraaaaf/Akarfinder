# 3 — Vivre Ici AkarFinder

**Statut : ACTIVE — CADRAGE / BEFORE À CERTIFIER**  
**Dernière mise à jour : 2026-09-05**  
**Repo : `hraaaaf/Akarfinder`**  
**Branche canonique : `docs/3-vivre-ici-akarfinder`**  
**Base vérifiée : `main@0c3e3ea3ea86b5cba97a72f67ba0af347215241d`**  
**Référence produit : `https://www.bienici.com/`**  
**Vercel : aucun déploiement autorisé sans accord explicite d’Achraf.**

---

## 0. RÈGLE DE REPRISE

À toute reprise de ce chantier :

1. lire ce fichier ;
2. vérifier `main`, branche, PR, HEAD et CI ;
3. vérifier l’état réel de `/search` et de la carte avant toute conclusion ;
4. ne jamais déduire un état LIVE depuis le seul code ;
5. pour tout changement UI/UX : `BEFORE → Goal → référence/mockup → implémentation → AFTER mêmes viewports → comparaison + tests → score visuel`.

---

## 1. GOAL

Transformer la recherche AkarFinder en une expérience **map-first contextualisée**, inspirée du meilleur de Bien’ici mais adaptée au Maroc et à l’avantage compétitif propre d’AkarFinder.

Doctrine produit :

> **Chercher un endroit, pas seulement une annonce.**

Le chantier doit permettre à l’utilisateur de comprendre simultanément :

- **où** se trouvent les biens ;
- **combien** ils coûtent ;
- **ce qui existe autour** ;
- **comment comparer les zones** ;
- **d’où vient chaque annonce** et à quel niveau elle est fiable.

AkarFinder ne doit pas devenir un clone pixel-perfect de Bien’ici. La référence sert à verrouiller le niveau d’expérience attendu, pas à copier son identité.

---

## 2. SUCCÈS OBSERVABLE

### P0 — Search + Map synchronisés

Le P0 est réussi uniquement si les preuves montrent :

1. desktop : liste et carte réellement utilisables ensemble ;
2. mobile : comportement carte/liste explicitement conçu pour 390/430 px, pas un desktop compressé ;
3. sélection d’une carte annonce ↔ mise en évidence correspondante dans la carte ;
4. mouvement/zoom carte ↔ résultats cohérents avec la zone visible selon le contrat produit retenu ;
5. clusters et/ou marqueurs de prix lisibles ;
6. filtres essentiels immédiatement accessibles ;
7. état URL/recherche déterministe et partageable pour les champs non privés ;
8. aucune régression ranking, politique média, provenance, déduplication ou règles de publication ;
9. responsive propre à `390×844`, `430×932`, `768×900`, `1280×900` ;
10. aucune collision/clipping/overflow critique ;
11. comportement clavier/accessibilité de base vérifié ;
12. comparaison visuelle BEFORE / TARGET / AFTER inspectée humainement.

### Preuve minimale P0

- captures BEFORE réelles sur les 4 viewports ;
- référence/mockup cible documenté ;
- tests interactionnels Search/Map ;
- TypeScript + build ;
- captures AFTER sur les mêmes 4 viewports ;
- comparaison BEFORE/TARGET/AFTER ;
- score visuel documenté ;
- aucune déclaration LIVE sans preuve LIVE distincte.

---

## 3. DIFFÉRENCIATEURS AKARFINDER À PRÉSERVER

Le chantier doit renforcer, et non sacrifier :

- agrégation multi-sources ;
- déduplication multi-portails ;
- provenance explicite ;
- score de confiance / qualité lorsque prouvé ;
- distinction entre données vérifiées, incomplètes et à confirmer ;
- redirection vers la source lorsque le contrat de publication l’impose ;
- personnalisation `Mon Projet / Akar Sense` déjà livrée ;
- langage visuel des annonces indexées sans photo déjà certifié.

Le produit cible est donc : **Bien’ici dans l’ergonomie cartographique + l’intelligence multi-sources propre à AkarFinder**.

---

## 4. PÉRIMÈTRE

### P0 — À faire maintenant

- architecture liste + carte synchronisée ;
- comportement responsive desktop/tablette/mobile ;
- clusters / marqueurs de prix ;
- sélection croisée liste ↔ carte ;
- filtres principaux ;
- états loading / empty / error ;
- conservation de la vérité des données et de la provenance ;
- instrumentation/testabilité suffisante pour certifier l’expérience.

### P1 — Après certification P0

- POI utiles : écoles, transports, santé, commerces, espaces verts selon données autorisées et fiables ;
- dessin de zone ;
- recherche par temps de trajet si une source fiable et soutenable existe ;
- couches quartier / marché ;
- contextualisation de la vie locale sans fabriquer de précision.

### P2 — Seulement après P0/P1 solides

- 3D ;
- bâtiments enrichis ;
- ensoleillement ;
- autres effets immersifs.

La 3D n’est pas un prérequis. Un cube qui tourne ne répare pas une mauvaise recherche. L’humanité survivra à cette privation temporaire.

### Hors périmètre immédiat

- clone visuel exact de Bien’ici ;
- refonte du ranking sans preuve séparée ;
- mutation DB juste pour embellir la carte ;
- changement de politique source ;
- déploiement Vercel sans autorisation explicite.

---

## 5. PORTEFEUILLE AKARFINDER — TRI AU 2026-09-05

Le portefeuille est volontairement ramené à **3 chantiers actifs principaux**.

### 1 — DATA / ACQUISITION — GARDER

**État : ACTIF.**

Source de reprise principale : `data-ingestion/canonical.md` sur la lane `feat/data-ingestion-canonical` / PR `#996`.

À intégrer dans ce même chantier, et non à compter comme projets indépendants :

- `#997` — full Mubawab enumeration ;
- `#1016` — ingestion canonique des 5 807 IDs Avito Kaynly ;
- `#956` — Common Crawl observation refresh, à revalider sur le main courant ;
- anciens lots DATA encore nécessaires uniquement après comparaison avec l’architecture actuelle.

Décision : **GARDER / FUSIONNER sous un seul chantier DATA**.

### 2 — SEO — GARDER

**État : ACTIF.**

Canonique : `AKARFINDER_SEO_CANONICAL.md`.

État vérifié le 2026-09-05 : SEO-5D a écrit les 34 prix Agenz Casablanca prouvés ; le blocage courant est le bridge géographique ODM, pas la récupération des prix.

`#938` appartient à ce chantier et doit être **revalidée/fusionnée dans SEO**, pas maintenue comme chantier autonome.

Décision : **GARDER**.

### 3 — VIVRE ICI AKARFINDER — GARDER / NOUVEAU CANONIQUE

**État : ACTIF.**

Canonique : ce fichier.

Il absorbe les objectifs encore pertinents de :

- `#822` — Map + Listing Standard N0 ;
- `#797` — Refonte carte reference.

Ces deux PR ne doivent plus piloter un chantier parallèle.

Décision : **SUPERSEDE / ABSORBER DANS LE CHANTIER 3**.

---

## 6. CHANTIERS DÉJÀ FERMÉS — NE PAS RÉOUVRIR COMME PROJETS

### Search Indexed Visual

`AKARFINDER_SEARCH_INDEXED_VISUAL_CANONICAL.md` : lots fermés et merges documentés.

### Search Indexed Visual Polish P1

`AKARFINDER_SEARCH_INDEXED_VISUAL_POLISH_P1_CANONICAL.md` contient un `NEXT EXACT` devenu périmé, mais la PR `#945` est réellement **MERGED** depuis le 2026-08-28 (`b36111644ea5d50e3205e8313c8c6bc6b8885a47`).

Décision : **FERMÉ — canonique historique à ne plus traiter comme actif**.

### Search Property Type Visual System

`AKARFINDER_SEARCH_PROPERTY_TYPE_VISUALS_CANONICAL.md` : `CLOSED`, PR `#951` merged, preuve LIVE documentée.

Décision : **FERMÉ**.

### Mon Projet / Akar Sense

`AKARFINDER_MON_PROJET_PERSONALIZATION_CANONICAL.md` : `CLOSED`, PR `#985` merged, activation production déjà documentée.

Décision : **FERMÉ**.

---

## 7. PR OUVERTES : GARDER, RÉCONCILIER OU ABANDONNER

### À garder comme support, pas comme chantier

- `#991` — réduction de charge CI : **MAINTENANCE / REVALIDER SUR MAIN** ;
- `#936` — garde Data Trust quartier/POI : **SÉCURITÉ DE DONNÉES / REVALIDER SUR MAIN**.

### Réconciliation obligatoire avant fermeture

Ces lanes ont touché ou déclarent avoir touché un état production/DB ; elles ne doivent pas être jetées comme de vieux post-it :

- `#454` — Registry Agadir : **RECONCILIATION REQUIRED** explicite ;
- `#622` — REAL-LISTINGS-ONLY, migration production déclarée appliquée ;
- `#487` — Rabat neighborhood visual library, migration production déclarée appliquée ;
- stack historique `#110 / #115 / #118 / #121 / #124 / #125 / #126` — plusieurs migrations/activations Supabase internes déclarées appliquées.

Décision : **FUSIONNER LA DETTE DE RÉCONCILIATION DANS DATA, puis fermer une fois l’état courant prouvé**.

### Sécurité à conserver en backlog

- `#310` — auth/session/RLS pro : **SECURITY BACKLOG — REVALIDATE BEFORE RESUME**.

Décision : **NE PAS ABANDONNER SANS RÉAUDIT**.

### À abandonner / superséder comme lanes actives

- `#995` — détail Avito/MarocAnnonces bloqué par 403/robots, stratégie déjà pivotée vers des voies autorisées ;
- `#474 / #478` — ancienne architecture MASS-FIRST / DNS hold, à archiver après conservation de ses invariants de sécurité dans DATA ;
- `#319` — adaptive partition ancien ;
- `#289` — ancien objectif A5.4 ;
- `#255` — ancienne baseline DATA P0 ;
- `#133` — ancien public-index delta ;
- `#113` — ancien Search Gateway certification ;
- `#54` — ancien bulk seed confirmation ;
- `#383` — gouvernance déjà elle-même marquée superseded candidate.

Décision : **ARCHIVE / CLOSE-AS-SUPERSEDED après pointeur vers DATA actuel**, sans réintroduire leur ancien code par merge tardif.

### Anciennes lanes cartographiques / géographiques

- `#796`, `#785`, `#752` : preuves/propositions historiques utiles, mais pas des chantiers actifs.

Décision : **ARCHIVE ; réutiliser seulement les preuves encore valides**.

### B2B

- `#644`, `#645`, `#653` : chaîne ancienne Partner Pages.

Décision : **UN SEUL FUTUR BACKLOG B2B À RÉAUDITER SUR MAIN**, pas trois chantiers actifs.

### Anciennes lanes UI

- `#671` — Favoris ;
- `#628` — visuels Maârif.

Décision : **BACKLOG / ARCHIVE**, hors chemin critique Vivre Ici.

---

## 8. ACTIFS SEARCH À PRÉSERVER PENDANT LA REFONTE

Le chantier Vivre Ici part de l’existant au lieu de le démolir joyeusement puis de redécouvrir trois semaines plus tard pourquoi il existait.

À préserver tant qu’aucune preuve contraire ne justifie un changement :

- `SearchListingCardDark` et sa politique média ;
- système `IndexedPropertyTypeArtwork` pour `public_indexed` sans photo ;
- provenance / CTA source ;
- ranking et personnalisation hors scope du P0 visuel ;
- `Mon Projet / Akar Sense` comme couche optionnelle ;
- règles de publication et de vérité source ;
- responsive déjà certifié des cartes comme baseline de non-régression.

---

## 9. ROADMAP DU CHANTIER 3

- [ ] **L0 — BEFORE / audit actuel `/search`** : captures réelles 390/430/768/1280 + inventaire code/carte/interactions.
- [ ] **L1 — TARGET** : référence Bien’ici décortiquée + mockup AkarFinder desktop/mobile + critères visuels verrouillés.
- [ ] **L2 — Architecture P0** : contrat liste/carte, viewport, URL/query state, markers/clusters, erreurs/loading.
- [ ] **L3 — Implémentation Search + Map** : synchronisation liste ↔ carte sans régression de données.
- [ ] **L4 — Mobile-first** : interactions 390/430, bascule/overlay/sheet selon TARGET verrouillé.
- [ ] **L5 — Certification** : tests + AFTER mêmes viewports + comparaison + score visuel + closeout.
- [ ] **P1 — Contexte de quartier** : POI / dessin de zone / mobilité selon sources certifiées.
- [ ] **P2 — Immersion** : 3D / ensoleillement uniquement si le ROI et les données sont prouvés.

Aucun pourcentage global n’est déclaré à ce stade : le BEFORE du nouveau chantier n’est pas encore certifié.

---

## 10. NEXT EXACT

1. capturer le vrai `/search` actuel aux viewports `390×844`, `430×932`, `768×900`, `1280×900` ;
2. montrer les captures ;
3. auditer l’architecture Search/Map existante sur le HEAD courant ;
4. comparer précisément avec la référence Bien’ici ;
5. produire le TARGET/mockup AkarFinder avant toute modification visuelle.

**Aucune implémentation UI du chantier 3 ne commence avant cette preuve BEFORE.**

---

## 11. ÉTAT GIT AU DÉMARRAGE

- repo : `hraaaaf/Akarfinder` ;
- base vérifiée : `main@0c3e3ea3ea86b5cba97a72f67ba0af347215241d` ;
- branche : `docs/3-vivre-ici-akarfinder` ;
- PR du chantier 3 : à créer après écriture du présent canonique ;
- DB : aucune mutation effectuée par la création de ce chantier ;
- Vercel : aucun déploiement demandé ou effectué.
