# 3 — Vivre Ici AkarFinder

**Statut : ACTIVE — SCOPE RECALIBRÉ / L0 `/map` À CERTIFIER**  
**Dernière mise à jour : 2026-09-05**  
**Repo : `hraaaaf/Akarfinder`**  
**Branche : `docs/3-vivre-ici-akarfinder`**  
**PR : `#1025` — OPEN**  
**Fondation produit vérifiée : `/map`**  
**Référence UX : Bien’ici, sans clone pixel-perfect**  
**Vercel : aucun déploiement sans accord explicite d’Achraf.**

---

## 0. RÈGLE DE REPRISE

À toute reprise :

1. lire ce fichier ;
2. vérifier `main`, branche, PR, HEAD et CI ;
3. vérifier l’état réel LIVE de `/map` ;
4. ne jamais utiliser `/search` comme baseline de ce chantier ;
5. pour tout changement UI/UX : `BEFORE → Goal → référence/mockup → implémentation → AFTER mêmes viewports → comparaison + tests → score visuel` ;
6. aucune déclaration LIVE sans preuve LIVE distincte.

---

## 1. GOAL

Transformer **uniquement la rubrique Vivre ici**, fondée sur l’actuel `/map`, en une expérience immersive de découverte territoriale inspirée du meilleur de Bien’ici et adaptée au Maroc.

> **Chercher où vivre, puis voir les biens.**

Doctrine produit :

> **Territoire → Marché → Vie locale → Biens**

`/search` reste la recherche classique de biens. Ce chantier ne transforme ni `/search`, ni tout AkarFinder en Bien’ici.

L’utilisateur de Vivre ici doit pouvoir comprendre, dans cet ordre :

- le territoire : ville, quartier, zone ;
- le marché : prix et offre observés, avec niveau de confiance ;
- la vie locale : transports, écoles, santé, commerces, parcs/plages et autres POI uniquement quand les données sont fiables ;
- les biens : accès aux annonces pertinentes sans dupliquer le moteur `/search`.

---

## 2. FONDATION EXISTANTE VÉRIFIÉE

`app/map/page.tsx` existe sur `main` et constitue la fondation de Vivre ici :

- route : `/map` ;
- `NationalMapRouter` pour l’exploration cartographique ;
- `P4MapDecisionRail` pour l’aide à la décision ;
- navigation ville/quartier déjà prévue ;
- metadata actuelle : « Carte immobilière du Maroc — Villes et quartiers » ;
- `/map` est actuellement exposé comme **Carte** dans le menu secondaire desktop.

Contrat géographique à préserver :

- coordonnées exactes certifiées → pin exact autorisé ;
- quartier seulement → zone/agrégation explicitement approximative ;
- ville seulement → agrégation ville ;
- précision inconnue → aucun faux pin ;
- ne jamais inventer frontières, POI, temps de trajet ou précision.

---

## 3. SUCCÈS OBSERVABLE — P0

Le P0 est réussi uniquement si les preuves montrent :

1. Vivre ici est une rubrique identifiable et distincte de `/search` ;
2. `/map` évolue vers une exploration **map-first** territoire → marché → vie locale → biens ;
3. desktop et tablette : carte + contexte territorial utilisables ensemble ;
4. mobile 390/430 : carte et panneau de contexte conçus pour le petit écran, sans simple réduction desktop ;
5. ville/quartier sélectionnés déterminent un état cohérent et partageable quand pertinent ;
6. prix/offre affichés ne dépassent pas la précision réellement prouvée ;
7. les POI P0 éventuellement affichés sont sourcés et fiables ; sinon ils restent absents plutôt que fictifs ;
8. accès clair aux biens de la zone via le moteur existant sans refaire `/search` ;
9. responsive propre à `390×844`, `430×932`, `768×900`, `1280×900` ;
10. aucune collision/clipping/overflow critique ;
11. accessibilité/clavier de base vérifiés ;
12. aucune régression fonctionnelle hors rubrique Vivre ici ;
13. comparaison BEFORE / TARGET / AFTER inspectée.

### Preuve minimale

- captures BEFORE réelles de `/map` sur les 4 viewports ;
- référence/mockup cible desktop + mobile ;
- tests navigation carte/territoire ;
- tests de précision géographique et absence de faux pins ;
- TypeScript + build ;
- captures AFTER mêmes viewports ;
- comparaison BEFORE/TARGET/AFTER ;
- score visuel documenté ;
- preuve LIVE distincte avant toute déclaration LIVE.

---

## 4. PÉRIMÈTRE

### P0 — Vivre ici

- évolution de `/map`, pas de `/search` ;
- carte comme surface principale d’exploration ;
- navigation ville → quartier/zone ;
- contexte marché observable et honnête ;
- panneau territoire/quartier lisible ;
- première couche de vie locale uniquement si les données disponibles sont fiables ;
- transition claire vers les biens de la zone ;
- états loading / empty / error ;
- responsive desktop/tablette/mobile ;
- instrumentation/testabilité pour certification.

### P1 — après P0 certifié

- POI enrichis : transports, écoles, santé, commerces, parcs/plages ;
- dessin de zone ;
- temps de trajet uniquement avec une source soutenable ;
- semantic zoom ville → quartier → POI ;
- comparaison de quartiers.

### P2 — seulement après P0/P1

- 3D ;
- bâtiments enrichis ;
- ensoleillement ;
- immersion avancée.

### Hors périmètre

- refonte globale du site ;
- transformation ou remplacement de `/search` ;
- clone exact de Bien’ici ;
- refonte ranking ;
- mutation DB pour simple embellissement ;
- changement de politique source/publication ;
- déploiement Vercel sans autorisation explicite.

---

## 5. DIFFÉRENCIATEURS AKARFINDER À PRÉSERVER

Quand Vivre ici mène aux biens :

- agrégation multi-sources ;
- déduplication multi-portails ;
- provenance explicite ;
- confiance/qualité seulement quand prouvée ;
- distinction vérifié / incomplet / à confirmer ;
- redirection source quand le contrat de publication l’impose ;
- aucune fausse géolocalisation.

Produit cible : **exploration territoriale de référence + vérité multi-sources AkarFinder**.

---

## 6. PORTEFEUILLE — DÉCISION 2026-09-05

Le portefeuille principal reste ramené à **3 chantiers actifs** :

1. **DATA / ACQUISITION — GARDER** : `data-ingestion/canonical.md`, PR `#996`, avec lanes DATA rattachées ;
2. **SEO — GARDER** : `AKARFINDER_SEO_CANONICAL.md` ;
3. **VIVRE ICI AKARFINDER — GARDER** : ce fichier, PR `#1025`, centré exclusivement sur `/map` / exploration territoriale.

Anciennes PR cartographiques `#822` et `#797` : fermées sans merge le 2026-09-05 comme supersédées. Leurs idées utiles peuvent être réévaluées, mais elles ne sont plus sources de vérité.

Chantiers Search déjà fermés restent fermés : Indexed Visual, Indexed Visual Polish P1, Property Type Visuals, Mon Projet Personalization. Ils ne sont pas absorbés par Vivre ici.

---

## 7. DETTES / SUPPORTS À NE PAS CONFONDRE AVEC CE CHANTIER

À garder/rattacher ailleurs :

- `#991` CI maintenance ;
- `#936` Data Trust quartier/POI, source potentielle pour P1 mais à revalider ;
- `#938` SEO ;
- `#956` Common Crawl / DATA ;
- dettes production/DB `#454`, `#622`, `#487`, stack `#110/#115/#118/#121/#124/#125/#126` → DATA/reconciliation ;
- `#310` → sécurité ;
- `#644/#645/#653` → futur audit B2B.

Les anciennes lanes #995, #474, #478, #319, #289, #255, #133, #113, #54, #383, #796, #785, #752, #671 et #628 ont été fermées comme supersédées/archivées le 2026-09-05 sans merge ni déploiement lié à ce nettoyage.

---

## 8. CORRECTION DE SCOPE — PREUVE `/search` INVALIDÉE POUR L0

Le premier gate L0 créé par erreur a ciblé `/search` :

- run `33986443546` — SUCCESS ;
- artifact `9975310805` ;
- digest `sha256:55ab9ff591dba14a420f6cf41b31e80e4db0eabd17cd1e13957d76a5b990c9df` ;
- captures 390/430/768/1280 techniquement valides.

**Décision : ces captures sont hors scope et ne certifient absolument pas L0 Vivre ici.** Elles restent seulement comme trace de la correction de scope.

Le captureur et le workflow sont désormais retargetés vers `/map`.

---

## 9. ROADMAP CHANTIER 3

- [ ] **L0 — BEFORE `/map`** : captures LIVE 390/430/768/1280 + inventaire composants/interactions/données.
- [ ] **L1 — TARGET Vivre ici** : Bien’ici décortiqué + référence/mockup AkarFinder desktop/mobile + critères verrouillés.
- [ ] **L2 — Architecture P0** : territoire, navigation map, état URL, marché, vie locale, lien vers biens, précision géographique.
- [ ] **L3 — Implémentation Vivre ici** : évolution `/map` sans toucher au rôle de `/search`.
- [ ] **L4 — Mobile-first** : interactions 390/430 selon TARGET.
- [ ] **L5 — Certification** : tests + AFTER + comparaison + score visuel + closeout.
- [ ] **P1 — Vie locale enrichie** : POI / zone / mobilité selon sources certifiées.
- [ ] **P2 — Immersion** : 3D / ensoleillement seulement si ROI et données prouvés.

**Avancement global : non chiffré tant que L0 `/map` n’est pas certifié.**

---

## 10. PREUVES ACTUELLES

- repo/route : `/map` vérifié dans `app/map/page.tsx` ;
- composants : `NationalMapRouter` + `P4MapDecisionRail` ;
- navigation actuelle : `/map` libellé `Carte` dans le menu secondaire desktop ;
- `/search` explicitement hors scope ;
- DB : aucune mutation liée au chantier 3 ;
- Vercel : aucun déploiement demandé ou effectué par le chantier 3.

---

## 11. NEXT EXACT

1. exécuter le gate L0 retargeté sur le LIVE `/map` ;
2. récupérer et montrer les 4 captures ;
3. auditer `NationalMapRouter`, `P4MapDecisionRail`, état URL et contrats de précision ;
4. comparer la rubrique avec la référence Bien’ici ;
5. produire le TARGET/mockup Vivre ici desktop + mobile avant toute modification visuelle.

**Aucune implémentation visuelle de Vivre ici avant le vrai BEFORE `/map`.**
