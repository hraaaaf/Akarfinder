# AKARFINDER — VIVRE ICI — TERRITORY DICTIONARY — HANDOVER CANONIQUE

**Date : 2026-09-18**  
**Repo : `hraaaaf/Akarfinder`**  
**Branche : `feat/vivre-ici-territory-dictionary`**  
**PR : #1038 — `feat(vivre-ici): territory dictionary and progressive map reveal`**  
**Canonique principal : `3-vivre-ici-akarfinder.md`**

## 1. GOAL

Clore proprement la phase Territory Dictionary / Progressive Map Exploration après certification complète du moteur :

`Maroc → villes → quartiers → repères`.

Succès atteint sur le produit certifié :
- LOT1 → LOT9 terminés ;
- 23/23 quartiers canoniques ont au moins un landmark vérifié ;
- zoom national progressif : 6 flagship → 8 villes ;
- stabilité labels / collision / densité certifiées ;
- N3 Casablanca → Maârif préservé ;
- aucun write Supabase ;
- aucun déploiement Vercel.

## 2. ÉTAT CERTIFIÉ

**Progression : 53 / 53 pts ✅**

### LOT9 — Final map certification
- HEAD produit : `ad65a371a027ce2fe53c73cdf838d63c201dae25`
- Contract run : `35348279560` ✅
- Visual run : `35348279557` ✅
- Artifact : `10547579617`
- Digest : `sha256:670ca0b80662816140df5ec608f87d9d4dc9ea94eb5d4f557a46b497a2fbcabc`
- viewports : `390×844 / 430×932 / 768×900 / 1280×900`
- initial : 6 flagship visibles
- zoom : 8/8 villes réellement visibles
- overlap : 0
- overflow horizontal : 0
- Supabase requests : 0
- page errors : 0

### LOT4 — Landmark dictionary final
- HEAD produit certifié : `7251abf030eb5d08f96a899a4a8d3585657b411a`
- Contract run : `35353870995` ✅
- Visual run : `35353871008` ✅
- couverture : **23 / 23 quartiers canoniques**
- enrichment queue : vide
- Visual artifact : `10550934957`
- Visual digest : `sha256:82e2f1e6287d24fdca55dc11151579b04e7f6cd0c0b15668b66e77b1b6558d09`

## 3. ÉTAT GIT / PR AU HANDOVER

Au dernier contrôle :
- branche HEAD docs : `383866aae321e5ac92be5cac4dcfebdec589d408`
- parent produit/docs certifié : `9243af391436d822e78215b14d5cb07abff58bd0`
- commit canonique 53/53 : `383866aae321e5ac92be5cac4dcfebdec589d408`
- main actuel : `ee2cb2da49752ea0f96536876f6c0dc0a02fc659`
- PR #1038 : OPEN, non-draft, mergeable=true, mergeable_state=unstable
- branche vs main : **52 commits ahead / 3 behind / 25 fichiers**
- aucun merge autorisé sans instruction explicite
- aucun Vercel deploy autorisé sans instruction explicite

Le `mergeable_state=unstable` doit être re-vérifié après synchronisation avec `main`; ne pas le traiter comme un conflit produit sans preuve.

## 4. VISUELS DURABLES — GOOGLE DRIVE

Dossier handover :
https://drive.google.com/drive/folders/1V6FnbadKblHaeivRv0ipLHnRbGRKL4Ri

TARGET LOCK :
https://drive.google.com/file/d/1XccjWJ1dOda4Y6UHHgAzgnCsBsrJl_SJ/view?usp=drivesdk

AFTER zoom 768×900 :
https://drive.google.com/file/d/1NUY7ujy9PKCrs-fcIBLeeinfW_cM6hqF/view?usp=drivesdk

AFTER zoom 1280×900 :
https://drive.google.com/file/d/1VuwBD8Qju-Mj41s312VTF_fXFkCfW2mS/view?usp=drivesdk

AFTER final complet — artifact ZIP :
https://drive.google.com/file/d/1ZRjm5t3mYUkOvnwB8BGTZEICU_bFSDlL/view?usp=drivesdk

BEFORE durable — artifact ZIP :
https://drive.google.com/file/d/1cKbf_v5IbSweYWs1i3jOLBnAOAuoV2Hv/view?usp=drivesdk

TARGET SHA-256 historique vérifié :
`c552bc2d4ef669394694f71027c9852a6c56d155b7853a27f2e9e672942637c8`

## 5. LIMITES / GATES OUVERTS

- Supabase live : `exceed_egress_quota`; live data non certifiable tant que quota non restauré.
- Provider imagery : licence/support/attribution prod encore à verrouiller.
- Sécurité Next/npm : lot séparé ; aucun `npm audit fix --force` aveugle.
- Vercel : aucun deployment sans autorisation explicite.
- PR #1025 reste historique/source ; ne pas merger directement.

## 6. NEXT EXACT — NOUVELLE CONVERSATION

1. Lire ce fichier.
2. Lire `3-vivre-ici-akarfinder.md`.
3. Re-vérifier `main`, branche, PR #1038 et CI.
4. Synchroniser la branche avec le `main` courant si elle est toujours behind, sans écraser le travail Territory Dictionary.
5. Vérifier le diff attendu / scope 25 fichiers.
6. Rejouer/attendre uniquement les CI indispensables du HEAD synchronisé ; aucune attente passive.
7. Si vert : mettre PR #1038 + canonique en cohérence finale.
8. **Human gate : merge PR #1038 uniquement sur instruction explicite d’Achraf.**
9. Après merge explicite : post-merge checks, aucune activation Vercel sans autorisation.
10. Puis ouvrir le lot suivant seulement après closeout complet.

## 7. START PROMPT POUR LA NOUVELLE FENÊTRE

Reprendre AkarFinder — Vivre Ici / Territory Dictionary à partir de :
`docs/handovers/2026-09-18-vivre-ici-territory-dictionary-handover.md`.

Le moteur Territory Dictionary est certifié 53/53 et les 23/23 quartiers canoniques ont au moins un landmark vérifié. Ne refaire ni la recherche landmarks ni la certification LOT9 sans nouvelle preuve de régression.

Commencer par vérifier :
- main actuel ;
- branche `feat/vivre-ici-territory-dictionary` ;
- PR #1038 ;
- HEAD ;
- diff ahead/behind ;
- CI exact-head.

Au dernier handover, la branche était 52 commits ahead / 3 behind main, PR mergeable=true mais unstable. Synchroniser proprement avec main, revalider, puis s’arrêter au human merge gate. Aucun deploy Vercel sans autorisation explicite.

## 8. RÈGLE DE REPRISE

Ce fichier est le **handover canonique de reprise** pour cette phase.

`docs/handovers/2026-09-18-vivre-ici-territory-dictionary-handover.md — Vivre Ici / Territory Dictionary — 53/53 pts`
