# ODM Full Cutover 100 % — Runbook Production V1

**Statut : PRÉPARATION TECHNIQUE — aucune activation 100 %**  
**Palier Production certifié et actif : 50 %**  
**Palier proposé : 100 %**

## Objectif

Faire passer toutes les recherches publiques éligibles sur le read model ODM, sans modifier le ranking, les données métier, le schéma, les règles de publication ou l'ordre commercial canonique.

Il n'y a pas de palier 75 % : le trafic de validation est synthétique et déterministe. Après la certification complète du palier 50 %, un palier intermédiaire n'apporterait pas de preuve supplémentaire significative.

Le relèvement du plafond technique à `ODM_PUBLIC_CANARY_MAX_PERCENT=100` ne constitue pas une activation. Tant que la variable Vercel Production reste à `ODM_PUBLIC_CANARY_PERCENT=50`, le trafic réellement servi reste à 50 %.

## Limite du LOT

Legacy reste disponible comme chemin de rollback. Il n'y a aucune suppression du moteur Legacy dans ce LOT.

La suppression ou la simplification de Legacy fera l'objet d'un LOT distinct, uniquement après certification 100 % et conservation d'une capacité de retour rapide.

## Préconditions bloquantes

- certification 50 % PASS complet ;
- aucune erreur runtime récente sur `/search` ou `/api/search` ;
- CI complète verte ;
- plafond technique 100 % mergé et déployé depuis le `main` courant ;
- kill switch confirmé ;
- opérateur disponible pendant l'activation et la campagne ;
- aucune autre modification Search/Data simultanée.

## Activation manuelle

Modifier uniquement dans Vercel Production :

```text
ODM_PUBLIC_CANARY_PERCENT=100
```

Conserver :

```text
ODM_PUBLIC_CANARY_ENABLED=true
ODM_PUBLIC_CANARY_APPROVED=true
ODM_PUBLIC_CANARY_STOP=false
```

Créer ensuite un nouveau déploiement depuis le `main` courant. Ne pas réutiliser un ancien artifact.

Aucune valeur d'activation ne doit être committée dans le dépôt.

## Probes préalables

Avant la campagne complète, vérifier :

- une clé située sous 50 % reste ODM ;
- une clé située entre 50 % et 100 % passe de Legacy à ODM ;
- les deux réponses sont HTTP 200 ;
- `/search` et `/api/search` utilisent la même lane ;
- une valeur supérieure à 100 % reste rejetée en fail-closed par le contrat logiciel.

## Certification

Déclencher manuellement :

```text
ODM Full Cutover 100 Percent Production Certification V1
```

Entrée obligatoire :

```text
confirm_activation=CERTIFY_100_PERCENT
```

La campagne exécute :

- 240 requêtes publiques structurées ;
- 120 clés de la moitié basse des buckets ;
- 120 clés de la moitié haute, auparavant Legacy au palier 50 % ;
- 240 réponses ODM attendues ;
- 0 réponse Legacy attendue ;
- 10 villes ;
- 4 types de bien ;
- 3 intentions ;
- filtres prix et surface ;
- offsets à zéro ;
- 10 à 12 probes SSR `/search` ;
- aucune écriture de donnée métier ;
- aucun accès d'écriture Vercel.

## Gates bloquants

- 240/240 HTTP 200 ;
- plan exact 120 buckets bas / 120 buckets hauts ;
- 240/240 réponses ODM ;
- 0 réponse Legacy ;
- couverture 10 villes, 4 types et 3 intentions ;
- aucune fuite de ville, type, intention, prix ou surface ;
- aucune fuite de contact, galerie ou miniature non autorisée ;
- aucun badge premium, partenaire, agence ou promoteur indu ;
- provenance réelle conservée ;
- mode `thin_indexed_seed` ;
- source originale obligatoire ;
- au moins 100 requêtes ODM non vides et les 10 villes représentées ;
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
ODM_PUBLIC_CANARY_PERCENT=50
ODM_PUBLIC_CANARY_STOP=false
```

Créer un nouveau déploiement Production depuis `main` et vérifier qu'une clé située entre 50 % et 100 % revient au moteur Legacy.

Le rollback ne nécessite ni migration, ni changement de ranking, ni modification de données.

## Après PASS

- conserver le palier 100 % actif ;
- conserver Legacy comme fallback pendant le LOT suivant ;
- graver la preuve dans `certification-results` ;
- supprimer tout workflow temporaire de déclenchement ;
- ouvrir ensuite le LOT de consolidation : observabilité ODM, simplification du routage et stratégie de retrait Legacy ;
- reprendre en parallèle la priorité DATA : acquisition, fraîcheur, profondeur, déduplication et couverture nationale.

## Décision

- préparation CI verte : merge technique autorisable, Production maintenue à 50 % ;
- campagne 100 % PASS : le cutover total peut rester actif ;
- un seul gate FAIL : retour immédiat à 50 % ;
- aucune suppression Legacy dans ce LOT.
