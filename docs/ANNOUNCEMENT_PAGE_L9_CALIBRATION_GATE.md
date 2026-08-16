# ANN-L9 — AkarEstimate & historique — Calibration Gate

## Verdict

- **Historique de prix affichés observés : ADMISSIBLE**, sous réserve du gate code/QA L9.
- **AkarEstimate présenté comme estimation de valeur du bien : NON CERTIFIABLE avec les données actuelles.**

La base actuelle ne contient pas de cible de vérité de transaction finale/notariée permettant de calibrer puis backtester honnêtement une estimation de valeur. Un backtest sur `displayed_price` mesurerait seulement la capacité à reproduire des **prix demandés**, pas une valeur de transaction.

## Preuve DB — 2026-08-16

Projet Supabase audité : `AqarFinder` (`kusfiyimwvxblvsrhaes`). Requêtes read-only uniquement.

Schéma : recherche dans `information_schema.columns` sur les familles `sold`, `sale_price`, `transaction_price`, `final_price`, `closing_price`, `notary`, `deed` → **0 colonne correspondante** dans `public`.

Couverture Market Index vérifiée :

- `property_listings` : **5 683** ;
- clusters d'origine vérifiée : **5 544** ;
- membres de clusters vérifiés : **5 544** ;
- observations avec `displayed_price > 0` : **1 162** ;
- annonces/offres avec au moins une observation de prix : **1 020** ;
- avec au moins 2 observations : **108** ;
- avec au moins 2 prix distincts : **19** ;
- maximum observé pour un même bien/offre : **5 observations** ;
- fenêtre observée : **2026-07-26 → 2026-08-16**.

## Conséquence produit

L9 peut publier une timeline intitulée explicitement **« Évolution du prix affiché »**, avec source et date, sans interpolation.

L9 ne doit pas publier :

- une « valeur estimée » ;
- une fourchette de valeur ;
- une confiance de modèle ;
- un badge `MODEL_CERTIFIED` ;

avant disponibilité d'une cible de vérité adéquate et d'un backtest holdout conforme à une politique de publication versionnée.

## Donnée requise pour débloquer AkarEstimate

Minimum conceptuel : observations de transactions conclues avec prix final, date, type de bien, transaction, géographie/segment et surface, obtenues avec provenance et droits d'utilisation documentés. La calibration doit ensuite être séparée train/holdout et évaluée par segment avant ouverture du Truth Contract.

## Règle fail-closed

Tant que cette condition n'est pas satisfaite :

`estimate = null` → `estimate_certified = false` → le Truth Contract refuse `akar_estimate`.
