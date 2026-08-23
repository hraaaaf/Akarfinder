# MASS-INDEX M6 — Search activation + SEO

**Date : 2026-08-23**  
**Statut : ACTIVE — M6-B Search cutover contract**  
**Issue canonique : #854**

## Goal
Activer Search + SEO uniquement à partir de représentations admissibles, avec fraîcheur et provenance vérifiées, sans régresser les invariants M0–M5.

## M6-A — CLOSED — baseline read-only

Goal : figer l’état exact de current-main, de la DB live et de la production réellement déployée avant toute activation Search/SEO supplémentaire.

Preuves certifiées :
- PR `#879` mergée ;
- merge `bd514a8f8797a77096bf11d52875dec431342367` ;
- CI dédiée `32636262489` SUCCESS ;
- artifact `9492399522` ;
- digest `sha256:3a19cec4b90f050dc1a5251ca535787a829121269cdddeaa0f867cbf5731d07b` ;
- 0 write DB, 0 activation Search/SEO, 0 Vercel.

### Baseline DB live M6-A
- Thin Index LISTING `real_estate_likely` : **15 551** ;
- `fresh_confirmed` : **3 054** ;
- `seed_only` : **12 371** ;
- LISTING display-eligible `fresh_confirmed` : **3 054** ;
- LISTING display-eligible `seed_only` : **12 263**, conservés comme réservoir mais exclus des RPC publics par M5-B ;
- `search_public_representations_v2` : **3 049** résultats admissibles observés ;
- l’écart **3 054 → 3 049** est exactement constitué de **5 lignes `openserp`** exclues par la whitelist provider du RPC ;
- 0 exclusion pour URL vide ;
- 0 exclusion par exact-URL dedup ;
- aucune métrique de propriété unique n’est déduite de ces nombres.

### Production réellement déployée au baseline
Au contrôle M6-A, le dernier déploiement production READY était :
- deployment `dpl_CNKvqYuRXVrHRkAo1hrWei12sjah` ;
- commit GitHub déployé `10420b4c0e0622122aa86608e7f257080e6b3c44`.

La certification current-main n’est donc pas une certification du runtime Vercel actuel. Aucun déploiement n’a été effectué.

## M6-B — Search cutover contract

### Goal
Verrouiller le contrat qui permet à l’ODM de devenir la voie Search canonique pour toutes les requêtes qu’il sait traiter, sans modifier le trafic de production.

### Succès
Avec la configuration de cutover contrôlée :
- `ODM_PUBLIC_CANARY_ENABLED=true` ;
- `ODM_PUBLIC_CANARY_APPROVED=true` ;
- `ODM_PUBLIC_CANARY_PERCENT=100` ;
- `ODM_PUBLIC_CANARY_STOP=false` ;

alors toute requête ODM-compatible doit servir la lane `odm`.

Les sécurités doivent rester vraies :
1. sans approbation explicite → `legacy_primary` ;
2. emergency stop → `legacy_primary` ;
3. erreur ODM → `legacy_fallback` ;
4. requête district → `legacy_primary` tant que le read model ODM n’a pas de champ district autoritatif ;
5. les RPC publics ne servent que `fresh_confirmed` ;
6. le réservoir `seed_only` reste hors Search public ;
7. aucun changement d’environnement production et aucun Vercel dans M6-B.

### Décision d’architecture
Aucune nouvelle variable de cutover n’est ajoutée : le routeur existant supporte déjà le cutover à 100 %, l’approbation explicite, l’arrêt d’urgence et le fallback. Ajouter un second système de bascule dupliquerait le contrôle sans augmenter la sûreté.

### Human gate
Le passage des variables de production à 100 % reste une décision explicite séparée. La CI M6-B certifie le **contrat**, pas l’activation réelle.

## Reste M6 après M6-B
- certifier la voie legacy utilisée par les previews SEO indexables city/district ;
- figer la stratégie du fallback `search_thin_index_v3` ;
- préparer le cutover production sans l’exécuter sans autorisation ;
- fermer M6 avec preuves et closeout canonique.

## Invariants
- aucun bypass ;
- aucune métrique propriété unique non certifiée ;
- `seed_only` hors Search public ;
- provenance + URL source obligatoires ;
- `/search` reste `noindex` tant qu’une stratégie différente n’est pas explicitement approuvée ;
- aucun Vercel sans autorisation explicite.
