# 3 — Vivre Ici AkarFinder

**Statut : ACTIVE — CADRAGE / BEFORE À CERTIFIER**  
**Dernière mise à jour : 2026-09-05**  
**Repo : `hraaaaf/Akarfinder`**  
**Branche : `docs/3-vivre-ici-akarfinder`**  
**PR : `#1025` — OPEN**  
**HEAD canonique : `7db26d9a47a919fcc138db12b572fc7d563ef5e6` avant cette synchronisation**  
**Base de création vérifiée : `main@0c3e3ea3ea86b5cba97a72f67ba0af347215241d`**  
**Référence : `https://www.bienici.com/`**  
**Vercel : aucun déploiement sans accord explicite d’Achraf.**

---

## 0. RÈGLE DE REPRISE

À toute reprise :

1. lire ce fichier ;
2. vérifier `main`, branche, PR, HEAD et CI ;
3. vérifier l’état réel de `/search` et de la carte ;
4. ne jamais déduire un état LIVE depuis le seul code ;
5. pour tout changement UI/UX : `BEFORE → Goal → référence/mockup → implémentation → AFTER mêmes viewports → comparaison + tests → score visuel`.

---

## 1. GOAL

Transformer la recherche AkarFinder en une expérience **map-first contextualisée**, inspirée du meilleur de Bien’ici mais adaptée au Maroc et aux avantages propres d’AkarFinder.

Doctrine produit :

> **Chercher un endroit, pas seulement une annonce.**

L’utilisateur doit comprendre simultanément :

- où se trouvent les biens ;
- combien ils coûtent ;
- ce qui existe autour ;
- comment comparer les zones ;
- d’où vient chaque annonce et à quel niveau elle est fiable.

AkarFinder ne doit pas devenir un clone pixel-perfect de Bien’ici. La référence fixe le niveau d’expérience attendu, pas l’identité visuelle.

---

## 2. SUCCÈS OBSERVABLE — P0

Le P0 est réussi uniquement si les preuves montrent :

1. desktop : liste et carte réellement utilisables ensemble ;
2. mobile : comportement carte/liste conçu pour 390/430 px ;
3. sélection annonce ↔ carte synchronisée ;
4. mouvement/zoom carte ↔ résultats cohérents selon le contrat produit retenu ;
5. clusters et/ou marqueurs de prix lisibles ;
6. filtres essentiels immédiatement accessibles ;
7. état URL/recherche déterministe et partageable pour les champs non privés ;
8. aucune régression ranking, média, provenance, déduplication ou publication ;
9. responsive propre à `390×844`, `430×932`, `768×900`, `1280×900` ;
10. aucune collision/clipping/overflow critique ;
11. accessibilité/clavier de base vérifiés ;
12. comparaison BEFORE / TARGET / AFTER inspectée.

### Preuve minimale

- captures BEFORE réelles sur les 4 viewports ;
- référence/mockup cible ;
- tests interactionnels Search/Map ;
- TypeScript + build ;
- captures AFTER mêmes viewports ;
- comparaison BEFORE/TARGET/AFTER ;
- score visuel documenté ;
- preuve LIVE distincte avant toute déclaration LIVE.

---

## 3. DIFFÉRENCIATEURS AKARFINDER À PRÉSERVER

- agrégation multi-sources ;
- déduplication multi-portails ;
- provenance explicite ;
- score confiance/qualité uniquement quand prouvé ;
- distinction vérifié / incomplet / à confirmer ;
- redirection vers la source quand le contrat de publication l’impose ;
- `Mon Projet / Akar Sense` déjà livré ;
- langage visuel certifié des annonces indexées sans photo.

Produit cible : **ergonomie cartographique de référence + intelligence multi-sources AkarFinder**.

---

## 4. PÉRIMÈTRE

### P0 — maintenant

- liste + carte synchronisées ;
- responsive desktop/tablette/mobile ;
- clusters / marqueurs de prix ;
- sélection croisée liste ↔ carte ;
- filtres principaux ;
- loading / empty / error ;
- vérité des données et provenance ;
- instrumentation/testabilité pour certification.

### P1 — après P0 certifié

- POI utiles selon sources fiables/autorisées ;
- dessin de zone ;
- temps de trajet si source soutenable ;
- couches quartier / marché ;
- vie locale sans fausse précision.

### P2 — seulement après P0/P1

- 3D ;
- bâtiments enrichis ;
- ensoleillement ;
- immersion avancée.

La 3D n’est pas un prérequis. Un cube qui tourne ne répare toujours pas une mauvaise recherche.

### Hors périmètre immédiat

- clone exact Bien’ici ;
- refonte ranking sans lot séparé ;
- mutation DB pour embellissement ;
- changement politique source ;
- déploiement Vercel sans autorisation explicite.

---

## 5. PORTEFEUILLE — DÉCISION 2026-09-05

Le portefeuille principal est ramené à **3 chantiers actifs**.

### 1 — DATA / ACQUISITION — GARDER

Canonique actuel : `data-ingestion/canonical.md`, lane `feat/data-ingestion-canonical`, PR `#996`.

Lanes rattachées :

- `#997` — full Mubawab enumeration ;
- `#1016` — ingestion canonique des 5 807 IDs Avito Kaynly ;
- `#956` — Common Crawl observation refresh, à revalider sur main.

Décision : **GARDER / FUSIONNER sous un seul chantier DATA**.

### 2 — SEO — GARDER

Canonique : `AKARFINDER_SEO_CANONICAL.md`.

État vérifié au 2026-09-05 : SEO-5D a obtenu/écrit les prix Agenz prévus ; le bridge géographique reste le blocage documenté.

`#938` appartient à SEO et doit être revalidée/fusionnée, pas traitée comme projet autonome.

Décision : **GARDER**.

### 3 — VIVRE ICI AKARFINDER — GARDER

Canonique : ce fichier / PR `#1025`.

Il absorbe les objectifs utiles des anciennes PR :

- `#822` — Map + Listing Standard N0 ;
- `#797` — Refonte carte reference.

Les deux PR ont été **fermées sans merge le 2026-09-05 comme supersédées**.

Décision : **GARDER ce chantier comme unique source de vérité Search/Map future**.

---

## 6. CHANTIERS SEARCH DÉJÀ FERMÉS

Ne pas les réouvrir comme projets parallèles :

- `AKARFINDER_SEARCH_INDEXED_VISUAL_CANONICAL.md` — fermé ;
- `AKARFINDER_SEARCH_INDEXED_VISUAL_POLISH_P1_CANONICAL.md` — texte historique partiellement périmé mais PR `#945` réellement merged le 2026-08-28, merge `b36111644ea5d50e3205e8313c8c6bc6b8885a47` ;
- `AKARFINDER_SEARCH_PROPERTY_TYPE_VISUALS_CANONICAL.md` — CLOSED, PR `#951` merged ;
- `AKARFINDER_MON_PROJET_PERSONALIZATION_CANONICAL.md` — CLOSED, PR `#985` merged.

---

## 7. TRI DES PR OUVERTES / HISTORIQUES

### Support à garder, pas chantier autonome

- `#991` — CI : **MAINTENANCE / REVALIDER SUR MAIN** ;
- `#936` — Data Trust quartier/POI : **REVALIDER SUR MAIN** ;
- `#938` — SEO : **RATTACHER À SEO** ;
- `#956` — Common Crawl refresh : **RATTACHER À DATA**.

### Réconciliation obligatoire avant fermeture

Ces lanes déclarent un état production/DB déjà modifié. Ne pas fermer aveuglément :

- `#454` — Registry Agadir, `RECONCILIATION REQUIRED` explicite ;
- `#622` — REAL-LISTINGS-ONLY, migration production déclarée appliquée ;
- `#487` — Rabat neighborhood visual library, migration production déclarée appliquée ;
- stack `#110 / #115 / #118 / #121 / #124 / #125 / #126` — migrations/activations Supabase internes déclarées appliquées.

Décision : **rattacher la dette à DATA, vérifier état actuel repo + DB, puis fermer/reconstruire proprement**.

### Sécurité à conserver

- `#310` — auth/session/RLS pro : **SECURITY BACKLOG — REVALIDATE BEFORE RESUME**.

### B2B à consolider ultérieurement

- `#644 / #645 / #653` — anciennes Partner Pages.

Décision : **un seul futur audit B2B depuis main**, pas trois chantiers.

### Fermées le 2026-09-05 comme supersédées / archivées

- `#995` — détail Avito/MarocAnnonces bloqué, stratégie pivotée ;
- `#474 / #478` — ancienne architecture MASS-FIRST / DNS hold ;
- `#319` — adaptive partition ancien ;
- `#289` — ancien A5.4 ;
- `#255` — ancienne baseline DATA ;
- `#133` — ancien public-index delta ;
- `#113` — ancienne certification Search Gateway ;
- `#54` — ancien bulk seed confirmation ;
- `#383` — ancienne gouvernance ;
- `#796 / #785 / #752` — anciennes preuves/propositions géographiques ;
- `#671` — ancienne lane Favoris ;
- `#628` — ancienne lane visuels Maârif.

Aucune de ces fermetures n’a réalisé de merge, de mutation DB ou de déploiement.

---

## 8. ACTIFS SEARCH À PRÉSERVER PENDANT LA REFONTE

- `SearchListingCardDark` et sa politique média ;
- `IndexedPropertyTypeArtwork` pour `public_indexed` sans photo ;
- provenance / CTA source ;
- ranking et personnalisation hors scope P0 visuel ;
- `Mon Projet / Akar Sense` optionnel ;
- règles de publication / vérité source ;
- responsive certifié des cartes comme baseline de non-régression.

---

## 9. ROADMAP CHANTIER 3

- [ ] **L0 — BEFORE / audit `/search`** : captures 390/430/768/1280 + inventaire code/carte/interactions.
- [ ] **L1 — TARGET** : Bien’ici décortiqué + mockup AkarFinder desktop/mobile + critères verrouillés.
- [ ] **L2 — Architecture P0** : liste/carte, viewport, URL/query state, markers/clusters, erreurs/loading.
- [ ] **L3 — Implémentation Search + Map** : synchronisation sans régression de données.
- [ ] **L4 — Mobile-first** : interactions 390/430 selon TARGET.
- [ ] **L5 — Certification** : tests + AFTER + comparaison + score visuel + closeout.
- [ ] **P1 — Contexte quartier** : POI / zone / mobilité selon sources certifiées.
- [ ] **P2 — Immersion** : 3D / ensoleillement seulement si ROI et données prouvés.

**Avancement global : non chiffré.** Le BEFORE du nouveau chantier n’est pas encore certifié.

---

## 10. PREUVES DU LOT DE CRÉATION

### Git

- branche créée depuis `main@0c3e3ea3ea86b5cba97a72f67ba0af347215241d` ;
- commit initial canonique : `7db26d9a47a919fcc138db12b572fc7d563ef5e6` ;
- PR : `#1025` ;
- le `main` avance en parallèle sur DATA ; le chantier 3 doit donc toujours recontrôler le delta avant merge.

### CI sur le commit initial `7db26d9…`

6/6 workflows observés **SUCCESS** :

- `33985867133` — Phase 1 P0 Closure Gate ;
- `33985867170` — Canonical Baseline Compile Validation ;
- `33985867144` — Phase 1 P1 Final Sweep Gate ;
- `33985867118` — UX Gate 0 Contracts ;
- `33985867135` — Phase 1 P2 Residual Closure Gate ;
- `33985867143` — Canonical Baseline Validation.

### Production

- DB : aucune mutation liée à ce lot ;
- Vercel : aucun déploiement demandé ou effectué par ce lot.

---

## 11. NEXT EXACT

1. vérifier le nouveau HEAD de la PR `#1025` et sa CI après cette synchronisation ;
2. capturer le vrai `/search` actuel en `390×844`, `430×932`, `768×900`, `1280×900` ;
3. montrer les captures ;
4. auditer l’architecture Search/Map existante sur le HEAD courant ;
5. comparer précisément avec Bien’ici ;
6. produire le TARGET/mockup AkarFinder avant toute modification visuelle.

**Aucune implémentation UI du chantier 3 avant la preuve BEFORE.**
