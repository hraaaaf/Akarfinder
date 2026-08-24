# AkarFinder — Partner Market Intelligence V2 — P5 Target

Date : 2026-08-24  
Statut : **ACTIVE — certification finale requise**

## Goal

Projeter une seule vérité marché canonique P4 vers Search, Map Intelligence et la fiche quartier, à l'échelle nationale, sans créer de second calcul ni inventer de géométrie ou de tendance.

## Succès attendu

1. un même `canonical_neighborhood_id` alimente Search, Map et fiche quartier ;
2. Search conserve ville + quartier canoniques ;
3. les labels nationaux N2 restent utilisables par Search/Fiche même sans géométrie Map ;
4. Map reste `runtimeResolved=false` tant que l'exact canonical neighborhood ID n'est pas explicitement qualifié pour le runtime cartographique ;
5. densité reste NULL si l'aire certifiée manque ;
6. tendance reste absente sans delta historique exactement compatible ;
7. aucun write production n'est ajouté ;
8. aucune divergence visuelle n'est introduite ;
9. tests P2→P5 + TypeScript + production build passent ;
10. browser smoke national passe en 390 / 430 / 768 / 1280.

## Goal visuel

**Zéro régression UI.** P5 n'est pas un redesign. Il conserve le référentiel Carte déjà validé et ne change aucune composition volontairement.

Référence canonique : `docs/CARTE_INTELLIGENCE_MARCHE_TARGET.md`.

- mockup source : 1448 × 1086 ;
- SHA-256 source : `4b6912480c5ce7dce6b04c5d0f8848b0be319955d220db84d8365a76ca66eac7` ;
- aperçu repo : `docs/assets/carte-intelligence-marche-reference.webp` ;
- SHA-256 aperçu : `ca973a84f74badfcb10ba6dd9297fb659a19cc3467c55e4b16264bd80bf76cb4`.

### BEFORE exact-head

- HEAD : `8907513d945a70de344bb76513bc7659483e0a7e`
- workflow : `Carte National Market BEFORE Audit`
- run : `32720134085`
- job : `97409584287`
- artifact : `9517492906`
- digest : `sha256:a28cd34443049bb42aae84e81c6dfdd9f0b90f2e20fc62dc01da0def5ab933f1`
- conclusion : **success**

## Implémentation cible

`PartnerMarketMetricRowV2` → `projectPartnerMarketDownstreamV2()` →

- projection Search ;
- projection `CityMarketMetricRow` compatible Map Intelligence ;
- modèle Fiche quartier ;
- même identité canonique et même snapshot ;
- fail-closed Map pour les zones sans preuve runtime.

## Preuve finale attendue

Un seul workflow P5 sur le commit produit final :

- régression P2/P3/P4/P5 ;
- TypeScript ;
- production build ;
- MapLibre/browser smoke ;
- API market smoke des six villes ;
- captures AFTER des six villes aux viewports 390 / 430 / 768 / 1280 ;
- zéro overflow horizontal ;
- zéro page error ;
- artifact AFTER inspectable.

P5 ne devient CLOSED qu'après lecture du run exact-head, inspection de l'artifact AFTER, comparaison BEFORE / référence / AFTER et closeout canonique.
