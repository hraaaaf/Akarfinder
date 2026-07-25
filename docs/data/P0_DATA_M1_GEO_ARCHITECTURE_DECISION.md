# P0 DATA — Missions 1 à 4 — Architecture et exécution

**Statut :** IMPLEMENTATION_FOUNDATION_IN_PROGRESS  
**Branche :** `agent/p0-data-m1-geography`  
**Référence :** juillet 2026  
**Issue :** #94

## Décision

Le registre `lib/geo/geo-entity-registry.ts` reste le contrat de compatibilité Search/Map/SEO. Supabase devient progressivement la source persistante, sans second référentiel concurrent et sans mutation destructive de `property_listings`.

## Mission 1 — Référentiel géographique

Implémenté sur la branche :

- `geo_entities` pour les identités canoniques ville/quartier ;
- `geo_aliases` avec normalisation, provenance et confiance ;
- `geo_resolution_events` pour conserver les résolutions, ambiguïtés et valeurs inconnues ;
- import idempotent du registre TypeScript V1 via `scripts/p0-data-sync-geography.ts` ;
- préservation intégrale des valeurs source ;
- parité d’identifiants, slugs et alias contrôlée par test statique.

Le registre TypeScript n’est pas supprimé. Il reste le fallback de compatibilité jusqu’à activation DB explicitement certifiée.

## Mission 2 — Intelligence quartier

Fondation persistante implémentée :

- profils versionnés par quartier ;
- états `draft`, `reviewed`, `published`, `superseded` ;
- résumés FR/AR ;
- signaux lifestyle, typologie, commodités, mobilité et marché ;
- nombre de preuves, confiance et version méthodologique ;
- périodes de validité ;
- vue publique limitée au dernier profil réellement publié.

Aucun texte quartier inventé n’est seedé par la migration.

## Mission 3 — Référence prix/m²

Fondation persistante implémentée :

- segmentation géographique, transaction, type de bien et état meublé ;
- période de référence ;
- taille d’échantillon ;
- médiane, moyenne, P25 et P75 ;
- confiance et qualité `insufficient`, `provisional`, `reliable` ;
- version méthodologique et snapshot d’entrée ;
- vue de lecture limitée aux références provisoires ou fiables.

Aucun prix fictif ou statique n’est publié par la migration.

## Mission 4 — Recalcul et publication

Fondation persistante implémentée :

- batches de publication versionnés ;
- snapshots d’entrée et versions méthodologiques ;
- métriques et rapport de validation ;
- statuts `draft`, `validated`, `published`, `failed`, `rolled_back` ;
- items de publication et relation avec les versions remplacées ;
- vues séparant données calculées et données publiées.

## Sécurité et migration

- migration strictement additive ;
- aucune modification de `property_listings` ;
- RLS activée sur toutes les nouvelles tables ;
- index de résolution, profils, références prix et publications ;
- migration rejouable ;
- rollback manuel documenté ;
- aucun secret embarqué.

## Certification automatisée

Le workflow `.github/workflows/p0-data-m1-m4-gate.yml` exécute :

1. contrôles statiques M1–M4 ;
2. contrôle de collisions du registre ;
3. TypeScript ;
4. build de production.

Le premier run a détecté un faux positif sur le marqueur de rollback dans le préambule. Le SQL a été corrigé afin que le bloc actif soit analysé entièrement.

## Limite de certification

Cette branche fournit la **fondation technique des quatre missions**. Elle ne doit pas être présentée comme une certification de données réelles tant que les étapes suivantes ne sont pas exécutées avec les secrets Supabase de l’environnement cible :

- application de la migration ;
- import géographique V1 ;
- contrôle des volumes et collisions en base ;
- génération réelle des profils quartier ;
- calcul réel des références prix/m² ;
- validation puis publication d’un batch ;
- contrôle final des vues publiques.

## Gate Vercel

Le déploiement Vercel peut valider le build applicatif, mais il ne remplace pas l’application de la migration Supabase. La migration doit être appliquée avant toute activation d’un consommateur DB des nouvelles tables.
