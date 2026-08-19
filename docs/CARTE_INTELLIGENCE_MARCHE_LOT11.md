# Carte intelligence marché — Lot 11

Statut : EN COURS — FICHE QUARTIER + CERTIFICATION FINALE

## Goal

Transformer la fiche quartier en vue de décision cohérente avec la Carte intelligence marché, en utilisant exactement la même vérité observée que les Lots 9–10, puis certifier l’ensemble du chantier.

## Baseline

Baseline avant implémentation : artifact `ui-all-pages-baseline-32200536322` du HEAD Lot 10 `e9ec7dfdedcaafa7234cc2b765cb2c8ed4c9439b`.

Viewports disponibles : 390 / 430 / 768 / 1280.

La baseline montre une page quartier propre mais essentiellement statique : repère prix éditorial, confiance textuelle, proximité/lifestyle, CTA Search.

## Référence visuelle

Le mockup canonique `AkarFinder — Référentiel cible : Carte intelligence marché` reste la référence. La quatrième vue mobile `Fiche Quartier` est la cible fonctionnelle et visuelle minimale.

## Contrat de vérité

La fiche doit réutiliser `readCityMarketIntelligenceMetrics()` et ne doit pas créer un second calcul.

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
- le snapshot courant ne doit jamais être transformé en courbe fictive.

### Catégories dominantes

- aucune classification sans échantillon structuré suffisant.

## UX cible

1. titre ville + quartier ;
2. fraîcheur/état de donnée visible ;
3. trois KPIs Prix / Densité / Annonces ;
4. confiance et taille d’échantillon ;
5. tendance fail-closed ;
6. catégories fail-closed ;
7. contexte quartier first-party séparé de la donnée marché ;
8. CTA Search ;
9. CTA retour Carte conservant `city + district` ;
10. mobile-first, aucune collision avec bottom navigation.

## État d’implémentation

- page `/quartiers/[citySlug]/[neighborhoodSlug]` branchée sur le moteur observé : fait, non encore certifié ;
- Rabat rich sheet existante : réutilisée comme référence comportementale ;
- tests de vérité Lot 11 : ajoutés, non encore certifiés ;
- browser exact-head : à ajouter ;
- certification finale six villes : à faire.

## Gate de fermeture

Lot 11 ne peut être CLOSED que si :

1. tests Lot 11 verts ;
2. TypeScript + build verts ;
3. fiche quartier rendue sur 390 / 430 / 768 / 1280 ;
4. au moins un cas avec métriques observées et un cas fail-closed ;
5. Search et Carte conservent `city + district` ;
6. aucune tendance ou catégorie fabriquée ;
7. Rabat + Casablanca cohérents ;
8. Marrakech / Tanger / Agadir / Fès restent explicitement fail-closed lorsque les preuves manquent ;
9. comparaison baseline / mockup / after >= 9,8/10 ;
10. régression Carte globale verte ;
11. docs canoniques et roadmap cohérentes ;
12. merge vérifié sur `main`.

Aucun déploiement Vercel sans autorisation explicite.
