# ODM Canary 10 % — Certification Production V1

**Statut : EN COURS — aucune montée à 25 % avant PASS complet**  
**Base applicative : `main` après priorité commerciale V1**  
**Production ciblée : `https://akarfinder.vercel.app`**

## Objectif

Recertifier le palier public ODM à 10 % après l'introduction de l'ordre commercial canonique :

1. promoteurs premium ;
2. agences partenaires ;
3. annonces déposées directement sur AkarFinder ;
4. annonces publiques indexées.

Le LOT ne modifie ni le taux Production, ni le ranking, ni la base de données. Il mesure le comportement réellement servi et échoue fermé dès qu'un gate n'est pas respecté.

## Campagne

- 240 requêtes contrôlées ;
- 80 clés déterministes dans le bucket ODM 10 % ;
- 160 clés hors bucket, servies par le moteur Legacy ;
- 10 villes ;
- 4 types de bien ;
- 3 intentions ;
- filtres de prix et de surface sur chaque requête ;
- jusqu'à 12 probes du rendu SSR `/search` pour vérifier la parité visible Page/API ;
- concurrence limitée à 6 ;
- timeout de 30 secondes par requête ;
- lecture publique uniquement.

## Gates bloquants

- 240/240 réponses HTTP 200 ;
- correspondance exacte entre bucket attendu et moteur observé ;
- couverture des 10 villes, 4 types et 3 intentions ;
- aucune fuite de ville, type, intention, prix ou surface ;
- aucune fuite de contact, galerie ou miniature non autorisée sur la lane ODM ;
- résultats ODM maintenus en catégorie 4 avec redirection vers la source originale ;
- présence de preuves non vides sur au moins 20 requêtes ODM et 7 villes ;
- parité SSR `/search` et API sur au moins 8 probes non vides ;
- taux de bucket observé entre 8,5 % et 11,5 % ;
- p95 ODM inférieur ou égal à 5 secondes ;
- p99 ODM inférieur ou égal à 10 secondes.

## Rollback

Le kill switch reste prioritaire :

```text
ODM_PUBLIC_CANARY_STOP=true
```

Une valeur invalide de `ODM_PUBLIC_CANARY_PERCENT`, l'absence d'approbation ou toute valeur supérieure au plafond codé échoue vers le moteur Legacy.

## Décision de montée

Le passage à 25 % exige :

1. artifact JSON de la campagne Production ;
2. tous les gates à `true` ;
3. absence d'erreur runtime sur `/search` et `/api/search` ;
4. rapport final commité avec les latences et le verdict ;
5. PR séparée relevant le plafond technique et activation Vercel séparée.

Aucune montée automatique n'est autorisée.
