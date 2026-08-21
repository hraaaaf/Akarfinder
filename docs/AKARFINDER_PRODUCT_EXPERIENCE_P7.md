# AkarFinder Product Experience — P7 Mon Projet

Date : 2026-08-21
Base produit : `main@c6e3591fd7cd854a3638e6e5effa76d5796edc95`
Statut : **CERTIFIED — MERGED**

## Goal

Faire converger `/mon-projet` vers le parcours canonique P1-B1 :

`1 question à la fois → progression 1/8 → réponses transformées en critères → recherche structurée`

sans réécrire ni simplifier artificiellement le state machine existant.

## Succès

1. les 8 étapes existantes restent présentes et fonctionnelles ;
2. desktop affiche un rail latéral 1→8 ;
3. mobile/tablette affiche une carte de progression compacte ;
4. l’écran initial pose une seule question ;
5. quatre objectifs principaux sont visibles : Acheter / Louer / Investir / Neuf ;
6. `explore` reste disponible comme action secondaire truth-safe, pas comme cinquième carte principale ;
7. après choix de l’objectif, l’usage est demandé séparément avant toute transition API ;
8. les événements `answer_objective`, `answer_usage`, `answer_location`, `answer_budget`, `answer_type`, `answer_preferences`, `answer_priorities`, `answer_compromise`, `confirm_profile` restent préservés ;
9. la continuité `/api/me/continuity` et la conversion `companionProfileToSearchParams` restent intactes ;
10. header blanc exact, logo canonique, un seul H1/main et 0 overflow ;
11. 4/4 captures AFTER et 0 finding ;
12. aucun déploiement Vercel.

## BEFORE exact

Branche : `agent/product-experience-p7-mon-projet-before`
PR : `#840` — **CLOSED / PROOF ONLY / NEVER MERGE**
HEAD : `30c46c92f52291f909caef18b16c62f75afc6d76`
Run : `32498442898` — **SUCCESS**
Artifact : `9452563469`
Digest : `sha256:d0286c8a221cb66d084c5daa048f2663f02fc9a32c7608d1b35bea961ca5c7a6`
Route : `/mon-projet`
Viewports : 390×844 / 430×932 / 768×900 / 1280×900
Résultat : **4/4 captures, 0 finding, 0 overflow**.

### Écart observé

Le runtime BEFORE est techniquement propre et possède déjà les 8 étapes, mais :
- desktop utilise une barre de progression horizontale au lieu du rail canonique 1→8 ;
- mobile utilise une bande sticky pleine largeur ;
- l’écran initial présente cinq cartes principales ;
- la sélection de l’objectif révèle immédiatement une deuxième question dans le même panneau ;
- le CTA `Continuer` appartient au même écran que les deux questions ;
- le lien vers les projets enregistrés flotte au-dessus du wizard et ajoute du bruit vertical.

## Référence visuelle

Référence P1-B1 certifiée :
- artifact `9420359227` ;
- `mon-projet-390x844.png` ;
- `mon-projet-1280x900.png`.

La référence impose la composition et la hiérarchie, pas la suppression de fonctions métier déjà utiles.

## Implémentation certifiée

- rail desktop 220 px avec 8 étapes et étape active ;
- progression mobile/tablette compacte ;
- wording canonique `Une question à la fois. Vos réponses deviennent directement des critères de recherche.` ;
- quatre cartes objectifs principales ;
- `explore` déplacé en action secondaire ;
- sous-question Usage isolée dans le même Step 1 pour préserver les 8 étapes et le contrat du state machine ;
- lien `Mes projets enregistrés` réintégré dans le panneau, sans bloc de page séparé ;
- aucun changement DB, ranking, source, search semantics ou Vercel.

## Certification finale

PR : `#841`
Exact HEAD certifié : `07c76b279d8ebe50d2433d4ece538d60df48a3d5`
Run : `32499657147` — **SUCCESS**
Artifact : `9453049204`
Digest : `sha256:d34ceca949f2e7f539bb144a72df30a35717fd40748c738cd24a667066785d5f`
Résultat : **4/4 captures AFTER, 0 finding, 0 overflow**.
Contrats P7 : **PASS**.
Audit syntaxique `node --check` : **PASS**.
TypeScript : **PASS**.
Build production : **PASS**.
Chromium / runtime `/mon-projet` : **PASS**.
Inspection humaine 390 / 430 / 768 / 1280 : **PASS**.
Score UX/UI : **9,4/10**.
Human gate : **PASS**.

## Merge

PR `#841` squash-merged le 2026-08-21.
Merge main : `368f8d7baad53914e4bd093e410bef1330dbeef8`.
Aucun déploiement Vercel.

## Suite canonique

P7 est fermé. Prochain lot Product Experience : **P8 — Publication**.
