# Carte intelligence marché — C6 fondation « nos annonces »

Date : 2026-08-16
Statut : PREPARED, non fermé
Dépendance produit : C5 fiche quartier riche

## Objectif

Préparer la Carte intelligence marché à distinguer et exploiter les annonces réellement rattachées à une organisation professionnelle AkarFinder, sans créer un second système d'ownership ni modifier les métriques marché C2/C3.

## Source d'autorité

C6 réutilise exclusivement la fondation professionnelle existante :
- revendication d'ownership via `app/api/pro/organizations/[organizationId]/ownership/listings/route.ts` ;
- persistance et règles via `lib/professional/repository.ts` ;
- cycle de vérification existant `claimed` → `verified` séparé de la simple revendication.

Interdictions :
- aucun nouveau statut d'ownership parallèle ;
- aucune annonce `claimed` exposée comme « notre annonce » publique ;
- aucune inférence d'ownership depuis l'URL, le téléphone, le nom d'agence ou le scraping ;
- aucune mutation du ranking Search ou des métriques marché C3 dans ce lot.

## Règle d'exposition Carte

Une annonce peut être exposée à la couche Carte « nos annonces » uniquement si son ownership professionnel est explicitement `verified` dans la source d'autorité existante.

`claimed`, absent, rejeté ou inconnu reste exclu fail-closed.

## Reader attendu

Le repository doit fournir une lecture bornée et read-only des annonces possédées vérifiées, au lieu de s'appuyer seulement sur le compteur public existant.

Le reader doit :
- filtrer par `organizationId` autorisé lorsque le contexte est privé ;
- filtrer strictement `verificationStatus = verified` pour toute exposition publique ;
- retourner des identifiants d'annonces réels et leur contexte minimal nécessaire à la Carte ;
- appliquer une limite explicite et déterministe ;
- ne jamais transformer un compteur en faux inventaire ;
- ne produire aucune écriture DB.

## Relation avec les market zones

La future projection des annonces possédées vers les `market_zone` doit réutiliser la résolution géographique certifiée déjà utilisée par la Carte. Une annonce sans résolution de zone fiable reste non attribuée, jamais forcée dans un polygone.

Les volumes « nos annonces » sont un signal d'inventaire AkarFinder distinct :
- ils ne remplacent pas `listing_count` marché ;
- ils ne modifient pas `listing_density_km2` ;
- ils ne servent pas à combler une donnée Prix insuffisante ;
- ils doivent être étiquetés comme inventaire AkarFinder/partenaire, pas comme représentativité marché.

## Critères de fermeture C6

C6 peut être CLOSED uniquement après preuve que :
- le modèle d'ownership existant est réutilisé sans statut parallèle ;
- un reader verified-only borné retourne les annonces réelles concernées ;
- `claimed` et ownership absent sont exclus fail-closed ;
- la résolution vers `market_zone` ne fabrique aucune géographie ;
- l'inventaire propre reste séparé des métriques C2/C3 ;
- tests ciblés, TypeScript et build sont verts ;
- aucun write, activation ou ranking mutation n'est introduit ;
- closeout canonique et roadmap sont mis à jour après merge.