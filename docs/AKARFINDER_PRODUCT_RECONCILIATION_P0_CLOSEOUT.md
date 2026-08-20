# AkarFinder Product Experience Reconciliation — P0 Closeout

Date : 2026-08-20
Base vérifiée : `main@ec0a23e3d07d2815175ac7e14c1032e3a0d718d9`
Statut : **CLOSED — audit + référentiel + baseline + cible visuelle validés**

## Goal

Verrouiller l'état réel et le référentiel de convergence avant toute nouvelle implémentation Search/Carte.

## Succès

1. audit du dernier état réel ;
2. inventaire des acquis Carte 11/11 ;
3. roadmap Carte/Search définitive ;
4. référentiel UX/UI/navigation Search ↔ Carte ↔ Listing ;
5. baseline réelle Search/Carte sur 390 / 430 / 768 / 1280 ;
6. cible visuelle Search + Carte validée humainement avant code.

## Preuves

- Carte historique : 11/11 CLOSED ;
- Lot 11 merge : `f0c051e533806b841f5af07bd0e17c16c312f009` ;
- closeout Carte merge : `49b80c4c1deffb1f1999f91412b5092151ac63c5` ;
- HEAD Carte certifié : `3db92d158ca2c388e5d53857089fce304348899b` ;
- artifact UI global : run `32267867957`, artifact `9371334718`, digest `sha256:cdbb98b51619ececd9e3739c3a49a89fb20312997f798236258cc1c0a8b8dfd9` ;
- 48 captures = 12 routes × 4 viewports, 0 finding statique automatisé ;
- comparaison `aed9e9e7ce88eb221980d27a16b221eee597f117..ec0a23e3d07d2815175ac7e14c1032e3a0d718d9` : aucun changement Search/Map/header/CSS ;
- baseline Search/Carte explicitement validée par le propriétaire produit le 20/08/2026 ;
- cible P0-5B Search + Carte explicitement validée par le propriétaire produit le 20/08/2026.

La validation humaine de la cible visuelle est un gate de gouvernance de session, pas une preuve machine indépendante.

## Doctrine verrouillée

`Zillow mechanics × AkarFinder intelligence`

Hiérarchie :

`Territoire → Marché → Vie locale → Biens → Décision`

Search et Carte restent deux surfaces distinctes mais deviennent deux vues d'une même session immobilière.

## Règle visuelle

Pour tout lot ayant un impact visible :

`BEFORE réel → Goal écrit → cible/mockup → validation humaine → implémentation → AFTER mêmes viewports → validation humaine → fermeture`.

Aucun lot visuel ne peut être fermé sans les deux validations humaines.

## Hors scope P0

- implémentation du nouveau shell ;
- mutation DB ;
- activation source ;
- déploiement Vercel.
