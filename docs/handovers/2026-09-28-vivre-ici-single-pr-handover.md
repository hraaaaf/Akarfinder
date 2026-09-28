# HANDOVER — AkarFinder / Vivre Ici — single PR reconciliation

Date: 2026-09-28
Repository: `hraaaaf/Akarfinder`

## GOAL

Unifier tout le chantier **Vivre Ici** dans un seul véhicule produit, puis reprendre la convergence visuelle à partir de la meilleure lignée déjà construite :

`Maroc 12 régions → ville → quartier → landmarks / MapLibre → Search`

Succès observable :
- une seule PR produit Vivre Ici active ;
- national + N2/N3 préservés ;
- Maârif repris dans la même lignée ;
- captures réelles 390 / 430 / 768 / 1280 ;
- TARGET ↔ AFTER ;
- revue UX/UI + 3D ;
- aucune fausse précision géographique ;
- aucun déploiement Vercel sans autorisation explicite.

## TARGET LOCK

Référence visuelle durable :
- fichier : `AKARFINDER_VIVRE_ICI_TARGET_FREEZE_2026-09-06.png`
- Drive ID : `1nt6ouxqGp-z6cHnj5A3iQHmw8I_YnGFL`
- dimensions : `1536×1024`
- SHA-256 : `c552bc2d4ef669394694f71027c9852a6c56d155b7853a27f2e9e672942637c8`

Important :
- le TARGET est une autorité **visuelle seulement** ;
- il n'autorise jamais l'invention de prix, météo, distance, score, position ou pin immobilier ;
- le Product Owner a explicitement jugé l'ancienne lignée Cesium v30 à **≈3/10 vs TARGET**. Ne pas reprendre les anciens scores 8.x/9.x comme vérité visuelle actuelle.

## RÉCONCILIATION EFFECTUÉE

Décision Product Owner : **un seul projet / une seule PR active Vivre Ici**.

PR canonique :
- PR : **#1090**
- titre : `feat(vivre-ici): canonical national → city → district TARGET reconciliation`
- branche : `feat/akar-map-quartier-target-couche3`
- base : `main@b0ec9d6a5526bd60c14653a5679b88e2e6d7194d`
- HEAD vérifié : `7e8b9c50390a493e763ddf0d6d5540a25419f040`
- état : OPEN / DRAFT
- mergeable : true
- mergeable_state : unstable

PRs fragmentées fermées comme superseded / archive :
`#1025, #1040, #1041, #1043, #1045, #1046, #1047, #1048, #1049, #1051, #1052, #1054, #1055, #1056, #1060, #1061, #1062, #1063, #1064, #1065, #1066, #1067, #1068, #1069, #1070, #1071, #1072, #1073, #1074, #1075, #1076, #1077, #1078, #1079, #1080, #1086, #1088`.

Rien n'a été supprimé : commits et historique restent récupérables.

Sources préservées :
- **#1037** : fondation national + N3, mergée dans main ;
- **#1089** : sémantique contour administratif Maârif, mergée ;
- #1086 et #1088 : leur état produit est dans la lignée cumulative de #1090.

Le fichier canonique `3-vivre-ici-akarfinder.md` a été mis à jour sur la branche #1090 avec la règle single-PR.

## COMMITS DE RÉCONCILIATION À CONNAÎTRE

- `059a77827cb232e496ae45e34f8a11fb31f07b74` — docs : single-PR reconciliation
- `9b49dd1cb3ed21a45af8dc6b8a2ee3526c6d9b27` — trigger canonical visual certification
- `73900feeb56515aebc6bea1311c9bae5ab4d0fc5` — compatibilité du nouveau Maârif rail avec le contrat d'audit
- `69f3c3b048f72b98fed26452b1720747d5527541` — workflows visuels/N3 liés au rail canonique
- `a21bbc2c2aa1dd527677db3c4d529163de11c3bf` — réduction max-height du rail local mobile/tablette
- `7e8b9c50390a493e763ddf0d6d5540a25419f040` — suppression de la dépendance Google Font au build

## ÉTAT CI EXACT-HEAD

HEAD : `7e8b9c50390a493e763ddf0d6d5540a25419f040`

Verts :
- `Canonical Baseline Compile Validation` — run **36360416576** ✅
- `Carte National Neighborhoods N2 Certification` — run **36360416647** ✅
- `Carte National Journey N3 Certification` — run **36360416662** ✅
- `CI Workflow Efficiency Policy` — run **36360416651** ✅
- `UI All Pages Inventory` — run **36360416653** ✅

Rouge utile :
- `Carte Lot 8 Casablanca Visual After` — run **36360416581** ❌
  - build / TypeScript / serveur : verts ;
  - 390 et 430 ont produit des captures ;
  - échec au viewport **tablet 768×900** ;
  - cause exacte :
    `Vivre Ici rail escapes viewport`
  - diagnostics :
    rail `y=504`, `height=795.531`, bottom `1299.531` pour viewport `900px`.
  - donc le prochain correctif doit cibler **le rail overview/tablet**, pas seulement le tab local.

Rouge externe / non visuel :
- `Carte C7 Final Certification` — run **36360416682** ❌
  - cause : Supabase `exceed_db_size_quota`, API price 503.
  - ne pas masquer ce signal ; ce n'est pas une preuve d'échec de la composition visuelle.

## VISUELS À OUVRIR EN PREMIER

### Baseline nationale / N3 déjà prouvée (#1037)

Artifact :
- run : `35282869300`
- artifact : **10523630593**
- nom : `vivre-ici-after`
- digest : `sha256:c4d0fe087d7194bb5554c109f87d5d9750ffd088d9f2edf94a4a0bc15822a4fb`

Fichiers importants :
- `map-after-premium-national-1280x900.png`
- `map-after-premium-national-768x900.png`
- `map-after-premium-national-430x932.png`
- `map-after-premium-national-390x844.png`
- `map-after-n3-casablanca-maarif-1280x900.png`
- `map-after-n3-casablanca-maarif-768x900.png`
- `map-after-n3-casablanca-maarif-430x932.png`
- `map-after-n3-casablanca-maarif-390x844.png`

Ces images démontrent que le travail Maroc 12 régions + Maârif N3 **existe déjà** et ne doit pas être reconstruit depuis zéro.

### État visuel actuel #1090

Run :
- `Carte Lot 8 Casablanca Visual After` : **36360416581**
- artifact : **10944992909**
- nom : `carte-lot8-casablanca-after-36360416581`
- digest : `sha256:b9da368393577611f962f0e6799ecbc9d89643d48753c8a0ab537f8dd38eb19e`

Captures réellement générées avant le failure tablette :
- `casablanca-maarif-390x844.png`
- `casablanca-maarif-local-390x844.png`
- `casablanca-maarif-430x932.png`
- `casablanca-maarif-local-430x932.png`

Pas de capture 768/1280 sur ce run : le validator s'arrête au débordement tablette.

## CE QUE LES VISUELS ACTUELS MONTRENT

Baseline #1037 :
- national desktop/mobile : carte Maroc découpée en régions, hiérarchie claire ;
- N3 : vue Maârif aérienne/3D avec rail à droite sur desktop et sheet mobile.

#1090 mobile :
- fond clair / cartographique ;
- contour administratif et labels contexte ;
- Twin Center visible comme landmark ;
- nouveau rail éditorial Maârif ;
- image hero actuelle = Wikimedia Maârif de rue, jugée insuffisante pour la cible premium ;
- besoin Product Owner : hero premium aérien Maârif avec Twin Center + Stade Mohammed V.

Important : le nouveau hero 4K demandé n'est **pas encore intégré**.

## ARCHITECTURE / TRUTH GATES

À préserver :
- aucun pin immobilier sans coordonnées exactes vérifiées ;
- Maârif boundary shadow ne doit pas être présenté comme vérité de production si non certifié ;
- labels contextuels ≠ frontières ;
- prix / métriques absents restent absents si non sourcés ;
- MapLibre / Overture / OSM : voie préférée open/free ;
- Esri imagery reste un point de licence/support à résoudre si encore utilisé ;
- aucun Vercel sans autorisation explicite.

## NEXT EXACT

1. Corriger le débordement **overview rail à 768×900** sur #1090.
2. Relancer uniquement les gates touchés / exact-head nécessaires.
3. Obtenir les 4 captures réelles :
   - Maroc entier / régions ;
   - ville ;
   - quartier ;
   - Maârif local/landmarks.
4. Montrer toutes les captures au Product Owner.
5. TARGET ↔ AFTER, même viewport.
6. Revue expert interne UX/UI + design 3D bâtiment :
   - score vs TARGET ;
   - directives concrètes ;
   - application immédiate ;
   - nouvelle capture ;
   - re-score.
7. Remplacer le hero Maârif par une image premium aérienne 4K crédible montrant le quartier, Twin Center et Stade Mohammed V — sans fausse présentation documentaire si image générée.
8. Garder #1090 DRAFT jusqu'au human merge gate.
9. Aucun Vercel sans autorisation.

## NE PAS FAIRE

- ne pas rouvrir l'ancien zoo de PRs Vivre Ici ;
- ne pas repartir de la branche Cesium v30 ;
- ne pas déclarer 9.x sans nouvelle revue visuelle ;
- ne pas inventer un artifact/capture manquant ;
- ne pas traiter Supabase quota comme un bug UI ;
- ne pas merger #1090 avant le human gate ;
- ne pas déployer Vercel.

## FICHIERS À LIRE À LA REPRISE

1. `docs/handovers/2026-09-28-vivre-ici-single-pr-handover.md`
2. `3-vivre-ici-akarfinder.md`
3. `app/map/page.tsx`
4. `components/map/MaarifTargetRail.tsx`
5. `components/map/MapLibreNeighborhood3D.tsx`
6. `app/map/quartier-target-couche1.css`
7. `app/map/quartier-target-couche2.css`
8. `app/map/quartier-target-couche3.css`
9. `scripts/audits/carte-lot8-casablanca-visual-after.mjs`

## REPRISE — PREMIÈRE ACTION

Vérifier :
- PR #1090 ;
- HEAD réel ;
- base main ;
- état des runs exact-head ;
- puis corriger le rail tablette 768×900.

Ne pas demander une nouvelle décision Product Owner avant ce correctif : la suite est déjà autorisée.
