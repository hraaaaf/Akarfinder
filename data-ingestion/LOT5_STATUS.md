# Lot 5 Status

**Status: 🟡 OPEN — deterministic lifecycle gate running**

## Goal

Rendre les runs répétés idempotents et gérer la vie d'une annonce sans perdre la provenance source.

## Succès observable

Prouver hors production :

- même `source.name + source_id` revu avec même `content_hash` → `unchanged`, pas d'insert ;
- même clé source avec hash différent → `update`, `first_seen_at` préservé ;
- annonce absente → `active → stale → inactive` selon seuil explicite ;
- deux annonces représentant le même bien → même `property_group_id`, enregistrements source distincts ;
- matching cross-source possible sans fusionner `portal` et `agency_direct` ;
- un run Mubawab ne rend pas stale/inactive les annonces directes ou partenaires hors scope ;
- `purge source=mubawab` ne purge que `source.name=mubawab AND source_type=portal` ;
- aucune écriture DB / production.

## Implémentation

- `data-ingestion/lifecycle.ts`
- `scripts/scrapers/__tests__/data-ingestion-lifecycle.test.ts`
- `scripts/data-ingestion-lifecycle-proof.ts`
- workflow `Data Ingestion Lot 5 Lifecycle Gate`

## Seuil lifecycle initial

- premier run complet où l'annonce est absente : `stale` ;
- deuxième run complet consécutif où elle est absente : `inactive`.

Ces seuils sont déterministes et configurables dans le moteur ; ils ne touchent aucune donnée production à ce stade.

## Matching

La clé source reste primaire pour l'idempotence :

`source.name + source_id`

Le rapprochement immobilier produit seulement un `property_group_id`. Il ne fusionne jamais les lignes source ni leur provenance.

Le fingerprint baseline refuse les cas trop pauvres et exige au minimum :

- ville ;
- type de bien ;
- surface ;
- quartier ou adresse.

Le prix n'entre pas dans le fingerprint afin qu'une variation de prix ne casse pas le rapprochement du même bien.

## Preuve attendue

Workflow `Data Ingestion Lot 5 Lifecycle Gate` :

1. tests unitaires ;
2. seed contrôlé ;
3. run suivant avec `unchanged`, `update`, `insert`, `stale`, matching duplicate et cross-source ;
4. run suivant avec passage `stale → inactive` ;
5. purge Mubawab portal ;
6. preuve que `agency_direct` et `partner_feed` survivent ;
7. artifact `data-ingestion-lot5-lifecycle-proof`.

## Interdictions inchangées

- zéro write production
- zéro ingestion AkarFinder
- aucun merge automatique
- aucun déploiement Vercel

## Next exact

Inspecter le premier run CI Lot 5 et corriger toute erreur de logique avant de déclarer le lot prouvé.
