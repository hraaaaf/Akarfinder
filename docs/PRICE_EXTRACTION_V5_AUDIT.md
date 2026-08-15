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
  - offre JSON-LD de fiche avec devise MAD et identité canonique ;
  - méta prix de fiche avec devise MAD et identité canonique ;
  - phrase primaire Mouldar explicitement liée au prix/loyer ;
  - montant terminal du H1 Masaken ;
- rejette prix/m², courte durée, prix sur demande et montants hors bornes vente/location ;
- comptabilise séparément les prix structurés génériques de haute confiance qui ne satisfont pas encore la preuve v5.

Le workflow PR échantillonne au maximum **60 fiches par source**. Aucun rendement n'est revendiqué avant lecture des logs du canary production.

## État

- Implémentation initiale : en cours de certification.
- Canary production read-only : en attente de CI.
- Write borné : **non implémenté** tant que le canary n'a pas démontré une cohorte fiable suffisante.
