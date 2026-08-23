# MASS-INDEX M5 — CLOSEOUT

**Date : 2026-08-23**  
**Statut : CLOSED**  
**Issue canonique : #854**

## Goal
Durcir la déduplication et la fraîcheur avant M6 Search.

## Succès observables
- déduplication opérée en mode conservateur : collisions déterministes = candidats seulement ;
- aucune métrique de propriété unique revendiquée sans preuve ;
- `seed_only` préservé comme réservoir mais exclu des deux chemins Search publics ;
- seuls les documents `fresh_confirmed` sont servis par les RPC publics ;
- aucun Vercel.

## Preuves

### M5-A — Shadow dedup
- PR #874 ;
- merge `e1a6328b12dada4a21672f68c824f3f4368e65a9` ;
- run `32611464377` SUCCESS ;
- artifact `9485645948` ;
- digest `sha256:4e98e033682c2bb13315f7a1798dbf37e24315b0cc15a79ae4c5107d4e60fa20` ;
- 15 551 LISTING `real_estate_likely` ;
- 818 lignes avec city/type/intent/price/surface exacts ;
- 8 groupes de collision / 16 représentations ;
- 1 groupe cross-source / 2 représentations ;
- `collisionIsDuplicateProof=false` ;
- `uniquePropertyMetricClaimed=false` ;
- 0 DB write / 0 mutation `property_clusters` / 0 activation Search.

### M5-B — Public freshness gate
- PR #876 ;
- merge `25397654f9200bbee9a9736c96b1b93af49e44f7` ;
- run `32631787333` SUCCESS ;
- artifact `9491244621` ;
- digest `sha256:f5204395fdc18892e393988fb385859528b3a8b1f70e07fd67ddbc61c2ae2c6a` ;
- audit live avant migration : 12 263 LISTING `seed_only` display-eligible + 3 054 `fresh_confirmed` ;
- migration prod `mass_index_m5_public_freshness_gate` : SUCCESS ;
- postcondition définition : ancien prédicat absent, `freshness_status = 'fresh_confirmed'` présent dans les 2 RPC ;
- preuve comportementale : `search_public_representations_v2(p_limit=>500)` et `search_thin_index_v3(p_limit=>500)` retournent uniquement `fresh_confirmed` ;
- lignes non fraîches observées dans ces deux échantillons : 0 ;
- réservoir inchangé après migration : 12 263 `seed_only` et 3 054 `fresh_confirmed` ;
- aucune suppression de seed/Thin Index et aucun Vercel.

## Décision
M5 est fermé. M6 peut commencer sur une base Search fail-closed côté fraîcheur. La dédup reste volontairement conservatrice : les groupes de collision ne sont pas des propriétés uniques certifiées.

## Next
M6 — Search activation + SEO.
