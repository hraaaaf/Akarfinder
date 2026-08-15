# SEARCH Price Extraction v5 — audit

## Objectif

Augmenter significativement la couverture de prix fiables sans abaisser le niveau de preuve.

Baseline de départ vérifiée par le closeout précédent : **2 703 / 15 438 = 17,51 %** de représentations publiques avec prix fiable. Les **44 prix Agenz indicatifs** restent séparés et ne comptent pas dans cette couverture.

## Priorité v5

1. Mubawab : audit de fiches publiques reconnues.
2. Masaken + Mouldar : signaux déterministes de fiche.
3. Agenz : promotion uniquement si un signal de fiche plus fort que le fallback indicatif est observé.
4. PromoImmo / Avito / DarAgadir résiduel : hors chemin critique v5 tant qu'aucune voie robuste nouvelle n'est prouvée.

## Canary production #1 — run 31901019200

Statut : **SUCCESS**, strictement read-only.

Résultat total :

- 240 candidats ;
- 130 pages fetchées ;
- 88 prix génériques high-confidence détectés ;
- 0 prix promu fiable ;
- 118 mismatches d'identité ;
- 110 échecs HTTP.

Par source :

- Mubawab : 60/60 fetchées, 53 prix high-confidence, 60 mismatches d'identité, 0 échec HTTP.
- Masaken : 52/60 fetchées, 24 prix high-confidence, 52 mismatches d'identité, 8 HTTP 410.
- Mouldar : 0/60 fetchée, 60 HTTP 403.
- Agenz : 18/60 fetchées, 11 prix high-confidence, 42 HTTP 429, 6 mismatches d'identité.

## Canary post-correction — run 31901424574

Statut : **SUCCESS**, strictement read-only.

- 10 prix fiables, tous Mubawab via `jsonld_canonical_offer` ;
- 80 signaux génériques high-confidence conservés hors promotion ;
- Mouldar : 60/60 HTTP 403 ;
- Agenz : forte limitation HTTP 429 ;
- Masaken : identité corrigée mais aucun signal suffisamment fort avec le parseur H1 initial.

## Cohorte structurée Mubawab + Masaken — run 31901840973

Statut : **SUCCESS**, strictement read-only.

Sur 120 candidats par source :

- Mubawab : 120 fetchées, 40 identités prouvées, **33 prix fiables**, 0 échec ;
- Masaken : 104 fetchées, 104 identités prouvées, **59 prix fiables**, 16 HTTP 410 ;
- total fiable structuré : **92 / 240 = 38,3 %**.

La cohorte exige :

- identité de fiche prouvée ;
- confiance prix `high` ;
- devise DH/MAD explicite ;
- rejet prix/m², courte durée, prix sur demande et montants hors bornes ;
- identité Mubawab par ID stable `/a/<id>/`, indépendamment du slug.

## Bounded write production — run 31904092395

Statut global : **SUCCESS**.

Pipeline :

- `certify` : SUCCESS ;
- `production-canary-read-only` : SUCCESS ;
- `production-bounded-write` : SUCCESS.

Résultat du write :

- `PRICE_V5_COHORT_LIMIT=120` ;
- `PRICE_V5_MAX_WRITES=100` ;
- **planned = 92** ;
- **written = 92** ;
- Mubawab : 33 prix fiables ;
- Masaken : 59 prix fiables ;
- chaque page a été re-fetchée avant écriture ;
- chaque update exigeait `seed_id + source_domain` et `normalized_price_mad IS NULL` ;
- le plan entier devait rester <= 100 avant le premier update.

## Correction de sécurité post-write

Le workflow initial pouvait réexécuter le bounded write lors d'un nouveau push PR. Aucun write supplémentaire n'est volontairement autorisé par ce mécanisme.

Le workflow est désormais corrigé :

- les pushes / PR exécutent uniquement certification + audits read-only + comptage exact ;
- `production-bounded-write` ne peut s'exécuter que via `workflow_dispatch` ;
- `execute_write=true` doit être explicitement fourni ;
- le plafond dur reste **100** ;
- le comptage production exact est assuré par `price-extraction-v5-production-count.ts`.

## Sources non promues

- Mouldar : HOLD, HTTP 403 systématique observé sur la cohorte testée ; aucune tentative de contournement.
- Agenz : les 44 valeurs indicatives restent hors couverture fiable ; les HTTP 429 sont respectés, sans bypass.
- Les signaux génériques high-confidence non couverts par une preuve de fiche suffisante ne sont pas promus.

## État

- +92 prix fiables ont été effectivement écrits en production lors du run 31904092395.
- Le comptage exact post-write est en cours de recertification read-only sur le head corrigé.
- Le write automatique sur PR est neutralisé ; toute écriture future exige un dispatch explicite.
- Le lot n'est pas déclaré clos avant comptage exact, exact-head CI vert et merge de la PR #669.
