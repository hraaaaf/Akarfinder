# MASS-INDEX M6 — Search activation + SEO

**Date : 2026-08-23**  
**Statut : ACTIVE — M6-A baseline read-only**  
**Issue canonique : #854**

## Goal
Activer Search + SEO uniquement à partir de représentations admissibles, avec fraîcheur et provenance vérifiées, sans régresser les invariants M0–M5.

## M6-A — Goal
Figer l’état exact de current-main, de la DB live et de la production réellement déployée avant toute activation Search/SEO supplémentaire.

## Succès M6-A
- topologie `/api/search`, `/api/search/gateway`, `/search` et pages SEO explicitement inventoriée ;
- RPC canonique et fallback identifiés ;
- fraîcheur live des deux RPC vérifiée ;
- surfaces SEO indexables et moteur de preview identifiés ;
- production Vercel distinguée de current-main ;
- 0 write DB, 0 activation Search, 0 changement SEO, 0 déploiement.

## Baseline vérifiée avant CI dédiée

### Current-main
HEAD de départ : `1731f489c4cf1f6c80c3592ac537016dcf7e2dd7`.

- `/api/search` appelle `routePublicSearch` ;
- l’ODM est gouverné par `ODM_PUBLIC_CANARY_ENABLED`, `ODM_PUBLIC_CANARY_APPROVED`, `ODM_PUBLIC_CANARY_STOP` et `ODM_PUBLIC_CANARY_PERCENT` ;
- trois lanes existent encore : `odm`, `legacy_primary`, `legacy_fallback` ;
- le chemin ODM canonique appelle `search_public_representations_v2` ;
- `/api/search/gateway` utilise le même RPC canonique et garde un fallback `search_thin_index_v3` via `appendSeedThinIndexResults` ;
- `/search` porte `robots: { index: false, follow: true }`, canonical `/search`, et n’est pas inclus au sitemap ;
- les pages `/immobilier/[city]` et `/immobilier/[city]/[district]` sont indexables et affichent jusqu’à 6 résultats issus du moteur legacy `searchListings` ;
- ce moteur legacy filtre les lignes DB par `canPublishDbRowToPublicSearchSurface`, donc ses droits/publication restent une voie séparée de l’ODM et doivent être certifiés séparément avant cutover.

### DB live après M5-B
Audit read-only Supabase :
- Thin Index LISTING `real_estate_likely` : **15 551** ;
- `fresh_confirmed` : **3 054** ;
- `seed_only` : **12 371** ;
- LISTING display-eligible `fresh_confirmed` : **3 054** ;
- LISTING display-eligible `seed_only` : **12 263**, conservés comme réservoir mais exclus des RPC publics par M5-B ;
- `search_public_representations_v2` total public observé : **3 049** ;
- aucune métrique de propriété unique n’est déduite de ces nombres.

### Production Vercel réellement déployée
Au contrôle du 2026-08-23, le dernier déploiement production READY est :
- deployment `dpl_CNKvqYuRXVrHRkAo1hrWei12sjah` ;
- commit GitHub déployé `10420b4c0e0622122aa86608e7f257080e6b3c44` ;
- current-main est donc en avance sur la production déployée.

Conséquence : une certification de current-main n’est **pas** une certification du runtime Vercel actuel. Aucun déploiement n’est effectué dans M6-A.

## Risques à traiter après M6-A
1. vérifier les droits/publication exacts du moteur legacy sur les pages Search/SEO ;
2. décider si la lane legacy doit rester, être réduite ou être retirée au profit du read model ODM ;
3. retirer le fallback `search_thin_index_v3` seulement après preuve que `search_public_representations_v2` est disponible et stable sur l’environnement cible ;
4. préserver le `noindex` de `/search` tant qu’aucune stratégie SEO de pages de résultats n’est explicitement approuvée ;
5. ne pas exposer individuellement des URLs de résultats externes dans le sitemap sans contrat dédié.

## Invariants
- aucun bypass ;
- aucune métrique propriété unique non certifiée ;
- `seed_only` hors Search public ;
- provenance + URL source obligatoires ;
- aucun Vercel sans autorisation explicite.
