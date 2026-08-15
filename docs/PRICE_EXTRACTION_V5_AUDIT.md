# SEARCH Price Extraction v5 — audit

## Objectif

Augmenter significativement la couverture de prix fiables sans abaisser le niveau de preuve.

Baseline de départ vérifiée par le closeout précédent : **2 703 / 15 438 = 17,51 %** de représentations publiques avec prix fiable. Les **44 prix Agenz indicatifs** restent séparés et ne comptent pas dans cette couverture.

## Priorité v5

1. Mubawab : audit de fiches publiques reconnues.
2. Masaken + Mouldar : signaux déterministes de fiche.
3. Agenz : promotion uniquement si un signal de fiche plus fort que le fallback indicatif est observé.
4. PromoImmo / Avito / DarAgadir résiduel : hors chemin critique v5 tant qu'aucune voie robuste nouvelle n'est prouvée.

## Canary read-only

Le script `scripts/scrapers/price-extraction-v5-detail-audit.ts` :

- ne possède aucune voie d'écriture ; `PRICE_V5_WRITE=true` échoue explicitement ;
- ne cible que Mubawab, Masaken, Mouldar et Agenz ;
- exige une URL de fiche reconnue par source ;
- respecte `robots.txt` avant fetch ;
- accepte comme prix fiable uniquement :
  - offre JSON-LD de fiche avec devise MAD et identité de fiche prouvée ;
  - méta prix de fiche avec devise MAD et identité de fiche prouvée ;
  - phrase primaire Mouldar explicitement liée au prix/loyer ;
  - montant terminal du H1 Masaken ;
- rejette prix/m², courte durée, prix sur demande et montants hors bornes vente/location ;
- comptabilise séparément les prix structurés génériques de haute confiance qui ne satisfont pas encore la preuve v5.

Le workflow PR échantillonne au maximum **60 fiches par source**.

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

Conclusion : le rendement brut existe surtout sur Mubawab et Masaken, mais le premier gate d'identité était trop strict car il ignorait l'URL finale effectivement retournée par `fetch()` après redirection. Le code utilise désormais cette URL résolue comme preuve d'identité lorsqu'elle correspond exactement à la fiche cible après normalisation `www`/apex. Cette correction reste read-only jusqu'au prochain canary.

## État

- Implémentation initiale : certifiée sur le premier run.
- Canary production #1 : **SUCCESS**, 0 write.
- Correction identité via URL résolue : implémentée, nouvelle certification en cours.
- Write borné : **non implémenté** tant qu'un canary post-correction n'a pas démontré une cohorte fiable suffisante.
