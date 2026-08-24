# AkarFinder — Partner Market Intelligence V2 — P3 Target

Date : 2026-08-24  
Statut : **TARGET APPROVED BY CONTRACT — BEFORE IMPLEMENTATION CERTIFICATION**

## Chantier

**P3 — National Geo Resolver**

## Goal

Résoudre une annonce partenaire vers la meilleure identité géographique AkarFinder réellement prouvée, sans déduire un quartier depuis un simple point proche et sans publier une adresse ou des coordonnées privées par défaut.

Flux cible :

`city_raw + neighborhood_raw + coordinates privées éventuelles → ville canonique → quartier canonique ou label N2 national → GeoResolutionV2`

## Succès

1. alias ville existants normalisés (`Casa` → `Casablanca`) ;
2. alias quartier validés normalisés (`Maarif`, `QUARTIER MAARIF` → `Maârif`) ;
3. labels nationaux N2 sourcés utilisables comme identité AkarFinder lorsque le petit registre canonique ne couvre pas la zone ;
4. ambiguïté de label → fail-closed, aucun quartier forcé ;
5. quartier inconnu + coordonnées → coordonnées conservées, **aucun nearest-neighborhood inventé** ;
6. coordonnées invalides ignorées sans écraser une résolution quartier valide ;
7. coordonnées non publiables par défaut, même si connues en interne ;
8. ville inconnue → unresolved ;
9. aucune frontière quartier certifiée par P3 ;
10. source/provenance et niveau de confiance présents dans la sortie.

## Sources autorisées

- `lib/geo/geo-entity-registry.ts` : petit registre canonique validé + alias ;
- `lib/map/national-territory-runtime.server.ts` : source nationale V5, artifact `carte-national-territory-registry-v5-32634250993` ;
- coordonnées partenaire : preuve de position seulement, pas preuve automatique d'appartenance quartier sans boundary certifiée.

## Non-goals

- aucun reverse-geocoding réseau ;
- aucun point-in-polygon quartier tant que les boundaries quartier ne sont pas certifiées ;
- aucun calcul Prix/Volume/Densité ;
- aucun changement Search/Map public ;
- aucun changement UI ;
- aucun déploiement Vercel.

## Preuve attendue

Un seul workflow P3 :

- régression P2 ;
- tests resolver P3 ;
- TypeScript ;
- build production.

P3 ne devient CLOSED qu'après run exact-head vert et relecture de la preuve.
