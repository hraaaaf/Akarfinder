# AkarFinder — Partner Market Intelligence V2 — P3 Closeout

Date : 2026-08-24  
Statut : **P3 CLOSED — 3/5 lots certifiés = 60 %**

## Goal

Résoudre une annonce partenaire vers la meilleure identité géographique AkarFinder réellement prouvée, sans déduire un quartier depuis un simple point proche et sans publier une adresse ou des coordonnées privées par défaut.

## Preuve

HEAD produit certifié : `58d9489393539b4613e1b64d4c13c5dfcbdc7386`  
PR : #896  
Workflow : `Partner Market Intelligence P3`  
Run : `32719626888`  
Job : `97408062438`  
Conclusion : **success**

### Tests

- **26 tests**
- **26 pass**
- **0 fail**
- **0 skipped**

Les 7 tests P3 prouvent :

- `Casa + QUARTIER MAARIF` → `district_casablanca_maarif` ;
- recours au catalogue national N2 sourcé pour un label unique hors petit registre canonique ;
- aucun nearest-neighborhood inventé depuis des coordonnées ;
- coordonnées privées sauf permission explicite ;
- coordonnées invalides ignorées sans détruire une résolution quartier valide ;
- ville inconnue → `unresolved` ;
- PartnerListingV2 ne laisse pas fuiter adresse privée/coordonnées via le resolver.

### Régression

Le même run rejoue P2 : identité partenaire, CSV/JSON/XML, lifecycle et droits médias restent verts.

### Compilation

- `npx tsc --noEmit` : **success**
- `npm run build` : **success**
- Next.js : `Compiled successfully in 18.4s`

## Sources runtime utilisées

- `lib/geo/geo-entity-registry.ts` ;
- artifact national V5 `carte-national-territory-registry-v5-32634250993` ;
- labels HCP/Barid/OSM déjà matérialisés dans le runtime national ;
- coordonnées partenaire comme preuve de position uniquement, jamais comme preuve automatique de quartier sans boundary certifiée.

## Limites conservées

- aucune boundary quartier certifiée par P3 ;
- aucun reverse-geocoding réseau ;
- aucun point-in-polygon quartier ;
- aucune activation Search/Map ;
- aucun déploiement Vercel.

## Anomalies non bloquantes

- `npm ci` signale toujours 5 vulnérabilités high, backlog sécurité séparé ;
- GitHub signale la dépréciation Node 20 pour les actions v4, exécutées par le runner sous Node 24. Le runtime de test projet reste explicitement Node 22.

## Verdict

**P3 CLOSED.**

Next : **P4 — National Market Aggregator**.
