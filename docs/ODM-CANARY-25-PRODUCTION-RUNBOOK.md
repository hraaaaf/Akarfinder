# ODM Canary 25 % — Runbook Production V1

**Statut : PRÉPARATION TECHNIQUE — activation Production non committée**  
**Palier certifié actuel : 10 %**  
**Palier proposé : 25 %**

## Objectif

Porter le read model public ODM de 10 % à 25 % sans modifier le ranking, la base de données, la politique d'affichage ou l'ordre commercial canonique.

Le relèvement du plafond technique ne constitue pas une activation. Le pourcentage réellement servi reste contrôlé exclusivement par les variables d'environnement Vercel Production.

## Préconditions obligatoires

- certification 10 % PASS complet ;
- plafond technique `ODM_PUBLIC_CANARY_MAX_PERCENT=25` mergé et déployé ;
- CI complète verte ;
- aucun incident runtime récent sur `/search` ou `/api/search` ;
- kill switch vérifié ;
- opérateur autorisé disponible pendant toute la campagne ;
- aucune autre modification Search/Data simultanée.

## Activation Vercel Production

Modifier uniquement la variable suivante :

```text
ODM_PUBLIC_CANARY_PERCENT=25
```

Conserver explicitement :

```text
ODM_PUBLIC_CANARY_ENABLED=true
ODM_PUBLIC_CANARY_APPROVED=true
ODM_PUBLIC_CANARY_STOP=false
```

Ne jamais committer ces valeurs dans le dépôt. Après la modification, créer ou redéployer une version Production afin que la nouvelle valeur soit prise en compte.

## Certification

Déclencher manuellement le workflow :

```text
ODM Canary 25 Percent Production Certification V1
```

Entrée obligatoire :

```text
confirm_activation=CERTIFY_25_PERCENT
```

Le workflow attend 90 secondes, puis exécute :

- 240 requêtes publiques ;
- 120 clés déterministes dans le bucket ODM 25 % ;
- 120 clés hors bucket Legacy ;
- les 10 villes ;
- les 4 types de bien ;
- les 3 intentions ;
- des filtres prix/surface larges et structurés ;
- 10 à 12 probes SSR `/search` ;
- aucune écriture de donnée métier.

## Gates bloquants

- 240/240 HTTP 200 ;
- plan exact 120 Canary / 120 Legacy ;
- correspondance parfaite entre lane attendue et lane observée ;
- couverture 10 villes, 4 types et 3 intentions ;
- aucune fuite de ville, type, intention, prix ou surface ;
- aucune fuite de contact, galerie ou miniature non autorisée ;
- aucun badge commercial premium/partenaire/agence/promoteur attribué aux résultats indexés ;
- provenance réelle conservée ;
- mode `thin_indexed_seed` ;
- source originale obligatoire ;
- taux de bucket compris entre 23,5 % et 26,5 % ;
- au moins 50 requêtes ODM non vides et les 10 villes représentées ;
- parité Page/API sur au moins 10 probes ;
- p95 ODM inférieur ou égal à 5 secondes ;
- p99 ODM inférieur ou égal à 10 secondes ;
- aucune erreur runtime Vercel pendant la fenêtre de contrôle.

## Rollback immédiat

Au premier gate rouge, appliquer d'abord :

```text
ODM_PUBLIC_CANARY_STOP=true
```

Puis revenir à :

```text
ODM_PUBLIC_CANARY_PERCENT=10
ODM_PUBLIC_CANARY_STOP=false
```

Redéployer la Production et vérifier que les clés situées entre les buckets 10 % et 25 % reviennent au moteur Legacy.

Le rollback ne nécessite aucune migration ni modification de ranking.

## Preuves

Le workflow conserve :

- un artifact JSON pendant 30 jours ;
- la preuve la plus récente dans la branche `certification-results` ;
- le fichier `reports/odm-canary-25-production-latest.json` ;
- l'identifiant du run, le commit source et l'horodatage.

## Décision

- tous les gates PASS : palier 25 % certifiable par une PR documentaire séparée ;
- un seul gate FAIL : retour à 10 %, diagnostic et nouvelle campagne avant toute réactivation ;
- aucune montée automatique au-delà de 25 %.
