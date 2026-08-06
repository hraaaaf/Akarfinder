# ODM-CANARY-1PERCENT-01 — Baseline historique

> **Superseded operationally.** Ce document conserve le contrat initial à 1 %. Le code courant autorise un cap maximum de 10 % derrière les mêmes principes fail-closed, approbation explicite, stop switch et fallback legacy. Ne pas renommer ce fichier : son nom identifie le LOT historique. État actuel : `docs/SESSION.md` et `docs/ROADMAP.md`.

## Verdict du LOT d’origine

`CODE_READY_NOT_ACTIVATED`

## Boundary initiale

Le Canary public était plafonné à 1 % et exigeait :

- `ODM_PUBLIC_CANARY_ENABLED=true` ;
- `ODM_PUBLIC_CANARY_APPROVED=true` ;
- `ODM_PUBLIC_CANARY_PERCENT=1` ;
- `ODM_PUBLIC_CANARY_STOP` absent ou false.

Les valeurs invalides échouaient vers 0 %. Les erreurs ODM revenaient au résultat legacy.

## Préconditions initiales

- au moins 200 événements dual-read sains ;
- divergence analyzer sans stop gate ;
- approbation explicite ;
- observation Production disponible.

## Rollback invariant

Définir `ODM_PUBLIC_CANARY_STOP=true` ou désactiver un flag d’approbation, puis redéployer. Aucune migration ni réversion de code n’est nécessaire.

## Publication policy invariant

Les lignes ODM sont adaptées au contrat `SearchResult` avec accès source uniquement, sans contact, sans galerie et sans réutilisation d’image non autorisée.
