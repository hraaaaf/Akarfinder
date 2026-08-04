# ODM 100 % — Routage et observabilité Production V1

**Statut : LOT I — préparation technique**  
**Palier Production de départ : ODM 100 % certifié**  
**Rollback conservé : Legacy via stop switch ou fallback automatique**

## Objectif

Consolider le cutover ODM 100 % sans modifier les données, le ranking, les règles de publication ou l’ordre commercial.

Le LOT centralise le choix ODM/Legacy utilisé par `/search` et `/api/search`, puis émet une télémétrie structurée pour chaque recherche publique terminée ou échouée.

## Limites

- aucune suppression du moteur Legacy dans ce LOT ;
- aucune migration ;
- aucune écriture de donnée métier ;
- aucune modification du corpus ODM ;
- aucune modification des filtres, du ranking ou des politiques d’affichage ;
- aucune valeur d’activation Vercel committée dans le dépôt.

## Routage canonique

Les deux surfaces publiques utilisent :

```text
lib/odm/odm-public-routing.ts
```

Surfaces couvertes :

- `api_search` pour `/api/search` ;
- `search_page` pour le rendu SSR initial de `/search`.

Lanes possibles :

- `odm` : réponse normale du read model ODM ;
- `legacy_primary` : ODM désactivé, non approuvé, arrêté ou hors bucket ;
- `legacy_fallback` : ODM sélectionné mais indisponible, puis réponse Legacy réussie.

À 100 %, toute clé stable éligible doit utiliser `odm`, sauf arrêt d’urgence ou erreur ODM.

## Télémétrie structurée

Chaque événement utilise le préfixe :

```text
[odm-public-routing]
```

Version du contrat :

```text
odm_public_routing_v1
```

Champs principaux :

- `event` : `route_completed` ou `route_failed` ;
- `surface` : `api_search` ou `search_page` ;
- `lane` : `odm`, `legacy_primary` ou `legacy_fallback` ;
- `failure_stage` : `odm`, `legacy_primary` ou `legacy_fallback` ;
- `stable_key_hash` : empreinte SHA-256 tronquée, jamais la requête brute ;
- `configured_percent` ;
- `full_cutover_configured` ;
- `enabled`, `approved`, `emergency_stop` ;
- `duration_ms` ;
- `result_count`, `total_count`, `has_more` ;
- `result_source` ;
- `error_name`, sans message d’erreur brut.

## Signaux Production

État normal à 100 % :

```text
 event=route_completed
 lane=odm
 configured_percent=100
 full_cutover_configured=true
 emergency_stop=false
```

Fallback ODM à investiguer :

```text
 event=route_failed
 failure_stage=odm
```

suivi de :

```text
 event=route_completed
 lane=legacy_fallback
```

Rollback volontaire :

```text
 event=route_completed
 lane=legacy_primary
 emergency_stop=true
```

Échec total :

```text
 event=route_failed
 failure_stage=legacy_fallback
```

ou :

```text
 event=route_failed
 failure_stage=legacy_primary
```

## Gates d’exploitation

Le palier 100 % reste sain si :

- le taux `lane=odm` reste proche de 100 % hors tests de rollback ;
- aucun `legacy_primary` n’apparaît sans action opérateur connue ;
- aucun `legacy_fallback` récurrent n’apparaît ;
- aucune série de `route_failed` n’est observée ;
- le p95 de `duration_ms` reste inférieur ou égal à 5 secondes ;
- le p99 reste inférieur ou égal à 10 secondes ;
- `/search` et `/api/search` présentent le même profil de lane ;
- les erreurs runtime Vercel restent nulles sur les deux routes.

## Procédure d’incident

Au premier incident bloquant :

```text
ODM_PUBLIC_CANARY_STOP=true
```

Créer un nouveau déploiement Production et confirmer :

```text
lane=legacy_primary
emergency_stop=true
```

Après diagnostic, le retour au dernier état certifié s’effectue avec :

```text
ODM_PUBLIC_CANARY_PERCENT=100
ODM_PUBLIC_CANARY_STOP=false
```

Le palier 50 % reste disponible comme rollback intermédiaire si nécessaire :

```text
ODM_PUBLIC_CANARY_PERCENT=50
ODM_PUBLIC_CANARY_STOP=false
```

## Définition de terminé

- API et SSR passent par un routeur commun ;
- métriques structurées couvertes par tests ;
- fallback ODM vers Legacy démontré par test ;
- stop switch vers `legacy_primary` démontré par test ;
- TypeScript et build verts ;
- CI complète verte ;
- smoke Production après déploiement ;
- aucune erreur runtime ;
- runbook et roadmap mis à jour ;
- aucune suppression du moteur Legacy dans ce LOT.
