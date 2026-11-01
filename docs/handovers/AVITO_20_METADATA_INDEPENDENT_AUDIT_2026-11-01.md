# Akarfinder — Audit indépendant des 20 métadonnées Avito — 2026-11-01

Source figée : `docs/handovers/avito-qualification-results.json` (commit Codex `7de4473`). Aucune nouvelle requête Avito.

## Résultats recalculés
- 20/20 HTTP 200, mais aucune activité confirmée.
- 20/20 titre, localisation, description observés.
- 18/20 prix, 17/20 références photos, 11/20 surface.
- 0/20 date de publication ou mise à jour observée.
- **11/20** seulement ont simultanément titre + prix + localisation + surface observés.
- **18/20** passent le seuil `completeness_sufficient` du script. Ce seuil n'impose donc pas la présence de la surface : ne pas le présenter comme complétude immobilière stricte.
- IDs `58600152` et `58791823` : prix et surface non observés.
- **Doublon physique potentiel :** IDs `58685536` et `58707942` : même libellé de villa à démolir à Agdal, même annonceur textuel KB GROUP REAL ESTATE, 940 m², 7 990 000 DH, description initiale identique ; images référencées différentes. Nécessite vérification humaine avant fusion.
- 0/20 droits commerciaux confirmés, 0/20 activité confirmée.
- 33/53 URLs non testées ; aucun constat possible sur celles-ci.

## Verdict
**Métadonnées techniquement lisibles : oui, sur 20 pages.**
**Fiches structurées strictes (4 champs) : 11/20.**
**Biens physiques uniques : non certifié.**
**Admissibilité publication commerciale : 0 certifiée.**
**Prochaine preuve :** dédoublonnage physique avec données autorisées et preuve de droits/activité ; ne pas publier les 18 sur le seul critère du script.


## Shadow staging hors ligne — AKAR-AVITO-SHADOW-STAGING-01

À partir du JSON de qualification figé, sans collecte réseau :

- 20/20 fiches traitées : 14 validées en staging hors ligne par `lib/feeds/schema.ts` et `lib/feeds/staging.ts`, 6 rejetées explicitement (`surface_m2 obligatoire pour apartment`). Cela ne constitue pas une admission ni une publication.
- 11/20 complètes strictes (titre, prix, localisation, surface). Descriptions : 20/20 ; photos observées : 17/20 ; fraîcheur vérifiée : 0/20, inconnue : 20/20.
- IDs suspects `58685536` / `58707942` : mêmes ville, prix, surface et description, références photos différentes. Signalement seulement, aucune fusion.
- Toutes les lignes : `commercial_reuse=not_verified`, `availability_status=unconfirmed`, `publishable=false`, `images_rights_confirmed=false`. Aucun appel au bridge partenaire v2.
- Artefacts : `avito-shadow-staging.json`, `avito-shadow-staging-report.json`, `avito-shadow-staging-quality.json`, `avito-shadow-staging-validation.md`. Le pipeline offline vérifie la somme SHA-256 du JSON source.
- CI offline exécute les tests TypeScript/Python et sauvegarde ces artefacts GitHub. Aucune requête Avito, photo, écriture base, publication ou déploiement n’est déclenché.

Prochaine étape : revue humaine du couple suspect et obtention de preuves de droits/activité avant toute décision d’admission commerciale. Les six rejets du schéma exigent des surfaces observées avant d’être requalifiés.
