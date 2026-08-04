# ODM Canary 50 % — Runbook Production V1

**Statut : PRÉPARATION TECHNIQUE — aucune activation Production**  
**Palier Production certifié et actif : 25 %**  
**Palier proposé : 50 %**

## Objectif

Préparer une montée contrôlée du read model public ODM de 25 % à 50 %, sans modifier le ranking, les données métier, le schéma, les règles de publication ou l’ordre commercial canonique.

Le relèvement du plafond technique à `ODM_PUBLIC_CANARY_MAX_PERCENT=50` ne constitue pas une activation. Tant que la variable Vercel Production reste à `ODM_PUBLIC_CANARY_PERCENT=25`, le trafic réellement servi reste à 25 %.

## Préconditions bloquantes

Avant tout merge puis toute activation :

- certification 25 % PASS complet ;
- fenêtre d’observation Production bornée sans incident ;
- aucune erreur runtime récente sur `/search` ou `/api/search` ;
- CI complète verte ;
- plafond technique 50 % mergé et déployé depuis le `main` courant ;
- kill switch confirmé ;
- opérateur disponible pendant l’activation et la campagne ;
- aucune autre modification Search/Data simultanée.

## Activation manuelle

Modifier uniquement dans Vercel Production :

```text
ODM_PUBLIC_CANARY_PERCENT=50
```

Conserver :

```text
ODM_PUBLIC_CANARY_ENABLED=true
ODM_PUBLIC_CANARY_APPROVED=true
ODM_PUBLIC_CANARY_STOP=false
```

Créer ensuite un nouveau déploiement depuis le `main` courant. Ne pas réutiliser un ancien artifact.

Aucune valeur d’activation ne doit être committée dans le dépôt.

## Probes préalables

Avant la campagne complète, vérifier :

- une clé située sous 25 % reste ODM ;
- une clé située entre 25 % et 50 % passe de Legacy à ODM ;
- une clé située au-dessus de 50 % reste Legacy ;
- les trois réponses sont HTTP 200 ;
- `/search` et `/api/search` utilisent la même lane.

## Certification

Déclencher manuellement :

```text
ODM Canary 50 Percent Production Certification V1
```

Entrée obligatoire :

```text
confirm_activation=CERTIFY_50_PERCENT
```

La campagne exécute :

- 240 requêtes publiques structurées ;
- 120 clés déterministes ODM ;
- 120 clés déterministes Legacy ;
- 10 villes ;
- 4 types de bien ;
- 3 intentions ;
- filtres prix et surface ;
- offsets à zéro ;
- 10 à 12 probes SSR `/search` ;
- aucune écriture de donnée métier ;
- aucun accès d’écriture Vercel.

## Gates bloquants

- 240/240 HTTP 200 ;
- plan exact 120 ODM / 120 Legacy ;
- correspondance parfaite entre bucket attendu et lane observée ;
- couverture 10 villes, 4 types et 3 intentions ;
- aucune fuite de ville, type, intention, prix ou surface ;
- aucune fuite de contact, galerie ou miniature non autorisée ;
- aucun badge premium, partenaire, agence ou promoteur indu ;
- provenance réelle conservée ;
- mode `thin_indexed_seed` ;
- source originale obligatoire ;
- taux de bucket compris entre 48,5 % et 51,5 % ;
- au moins 50 requêtes ODM non vides et les 10 villes représentées ;
- parité Page/API sur au moins 10 probes ;
- p95 ODM inférieur ou égal à 5 secondes ;
- p99 ODM inférieur ou égal à 10 secondes ;
- aucune erreur runtime Vercel pendant la fenêtre de contrôle.

## Rollback immédiat

Au premier gate rouge :

```text
ODM_PUBLIC_CANARY_STOP=true
```

Puis restaurer le dernier palier certifié :

```text
ODM_PUBLIC_CANARY_PERCENT=25
ODM_PUBLIC_CANARY_STOP=false
```

Créer un nouveau déploiement Production depuis `main` et vérifier qu’une clé située entre 25 % et 50 % revient au moteur Legacy.

Le rollback ne nécessite ni migration, ni changement de ranking, ni modification de données.

## Preuves attendues

- artifact JSON conservé 30 jours ;
- branche d’audit `certification-results` ;
- fichier `reports/odm-canary-50-production-latest.json` ;
- identifiant du run ;
- commit source ;
- horodatage ;
- état runtime Vercel ;
- PR documentaire de clôture après PASS.

## Décision

- préparation CI verte : PR prête mais Production maintenue à 25 % ;
- observation 25 % verte : merge technique autorisable ;
- campagne 50 % PASS : le palier peut rester actif ;
- un seul gate FAIL : retour immédiat à 25 % ;
- aucune montée automatique au-delà de 50 %.
