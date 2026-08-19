# Carte intelligence marché — Lot 11

Statut : **CERTIFIÉ PRODUIT — CLOSEOUT / MERGE EN ATTENTE**

## Goal

Transformer la fiche quartier en vue de décision cohérente avec la Carte intelligence marché, en utilisant exactement la même vérité observée que les Lots 9–10, puis certifier l’ensemble du chantier.

## Baseline

Baseline avant implémentation : artifact `ui-all-pages-baseline-32200536322` du HEAD Lot 10 `e9ec7dfdedcaafa7234cc2b765cb2c8ed4c9439b`.

Viewports : 390 / 430 / 768 / 1280.

La baseline montrait une page quartier propre mais essentiellement statique : repère prix éditorial, confiance textuelle, proximité/lifestyle, CTA Search.

## Référence visuelle

Le mockup canonique `AkarFinder — Référentiel cible : Carte intelligence marché` reste la référence. La quatrième vue mobile `Fiche Quartier` constitue la cible fonctionnelle et visuelle minimale.

## Contrat de vérité

La fiche réutilise `readCityMarketIntelligenceMetrics()` et ne crée aucun second calcul.

### Prix

- médiane prix/m² observée ;
- échantillon visible ;
- fiabilité existante ;
- `Données insuffisantes` si le seuil n’est pas atteint.

### Volume

- annonces observées dédupliquées ;
- jamais remplacées par un compteur éditorial.

### Densité

- annonces/km² uniquement si une surface admissible existe ;
- fail-closed sinon.

### Tendance

- aucune tendance 6 mois sans historique suffisant ;
- le snapshot courant n’est jamais transformé en courbe fictive.

### Catégories dominantes

- aucune classification sans échantillon structuré suffisant.

## Implémentation finale

- `/quartiers/[citySlug]/[neighborhoodSlug]` branchée sur la vérité marché observée ;
- `NeighborhoodMiniMap` avec vraies tuiles OpenFreeMap, repère réel, handoff Carte et attribution explicite compacte `© OpenStreetMap contributors · OpenFreeMap` ;
- Search CTA et Map CTA conservent `city + district` ;
- tendance et catégories restent fail-closed sans preuve ;
- rich zone sheet Rabat corrigée en logique **map-first** : sheet mobile repliée par défaut, détails extensibles, carte visuellement dominante ;
- aucune valeur marché n’est fabriquée.

## Certification produit exact-head

**HEAD produit certifié : `3db92d158ca2c388e5d53857089fce304348899b`.**

Le commit documentaire de closeout peut créer un HEAD ultérieur sans modifier l’arbre produit ; la certification ci-dessous reste attachée exactement au HEAD produit ci-dessus.

### Fiche quartier — Browser exact-head

- run : `32244517995` ✅ ;
- artifact : `9366473237` ;
- digest : `sha256:340b8843fb9dedcc220fa2ec74a30ca7142901d852068ff3c52eeeb685dbced4` ;
- report : `ok: true` ;
- **8/8 cas** : Casablanca Maârif + Fès Ville Nouvelle sur 390 / 430 / 768 / 1280 ;
- chaque cas résout le runtime et charge une mini-carte réelle ;
- tuiles OpenFreeMap haut zoom : **>= 2** par cas, HTTP 200 ;
- overflow horizontal : **0 px** sur les 8 cas ;
- mobile bottom-nav clearance largement positive ;
- Search et Carte conservent `city + district` ;
- `previewMapHref === mapHref` sur les 8 cas.

Vérité observée dans l’artifact :

- Casablanca / Maârif : `1` annonce observée, densité `0,08 ann./km²`, prix médian/m² indisponible au seuil de preuve, fraîcheur confirmée ;
- Fès / Ville Nouvelle : `0` annonce observée dans ce snapshot, prix et densité indisponibles, fraîcheur non confirmée ;
- aucune extrapolation de tendance ni de catégories.

### Carte globale — C7 exact-head

- run : `32244517896` ✅ ;
- artifact : `9366976831` ;
- digest : `sha256:8ac9c4758d66986215795621c2b180a155e7b75fc54b5a217d35ffccc0d905eb` ;
- report : `ok: true` ;
- 390 : sheet ratio `0,30095`, map-clear ratio `0,60427` ;
- 430 : sheet ratio `0,27253`, map-clear ratio `0,64163` ;
- état initial : `collapsed` ;
- expansion mobile prouvée à `590 px` ;
- `0` page error ;
- `0` request failure ;
- Search handoff Rabat + district prouvé.

### Rich zone sheet — C5 exact-head

- run browser : `32244517863` ✅ ;
- artifact : `9366915962` ;
- digest : `sha256:c3164a00177a7a3602f0d7315611b1ed47074befc1b3e18fa7e1c279f869dcb0` ;
- contrat statique : run `32244517866` ✅.

## Double check visuel obligatoire

Deux passes distinctes ont été réalisées sur l’exact-head produit :

1. **preuve fonctionnelle** : rapports browser, tuiles réelles, handoffs, ratios, overflow, fail-closed ;
2. **comparaison visuelle manuelle** : baseline / référentiel canonique / captures exact-head.

Incident historique explicitement conservé : une version précédente de la zone sheet mobile masquait presque toute la carte et avait été rejetée à environ **7,5/10** malgré des tests techniques verts.

Après correction map-first :

- la carte occupe visuellement la majorité de l’écran au chargement ;
- la sheet est partielle et repliée par défaut ;
- les contrôles, la légende, le CTA Search et la bottom-nav restent lisibles ;
- sur la fiche quartier 390 / 430, l’attribution cartographique est compacte en haut à droite et ne masque ni le repère quartier, ni le marqueur, ni `Ouvrir la carte` ;
- 768 / 1280 ne montrent pas de régression structurelle ;
- hiérarchie, densité d’information et équilibre carte/sheet sont cohérents avec le référentiel canonique.

**Score visuel final du scope Lot 11 : 9,8/10.**

## Gate de fermeture

Validé :

1. tests Lot 11 verts ✅ ;
2. TypeScript + build verts dans les gates exact-head ✅ ;
3. fiche quartier 390 / 430 / 768 / 1280 ✅ ;
4. cas observé + cas fail-closed ✅ ;
5. Search et Carte conservent `city + district` ✅ ;
6. aucune tendance ou catégorie fabriquée ✅ ;
7. cohérence Rabat + Casablanca ✅ ;
8. absence de faux enrichissement sur les villes sans preuve ✅ ;
9. double check visuel baseline / mockup / after = **9,8/10** ✅ ;
10. régression Carte produit principale verte ✅ ;
11. docs de lot cohérentes ✅ sur ce commit de closeout.

Reste avant `CLOSED` :

12. finaliser les workflows globaux attachés au HEAD de closeout ;
13. merger PR `#820` ;
14. vérifier `main` post-merge et mettre à jour la roadmap canonique avec le merge réel.

La progression globale reste **10/11 = 90,9 %** tant que le merge et le post-merge ne sont pas prouvés.

**Aucun déploiement Vercel sans autorisation explicite.**
