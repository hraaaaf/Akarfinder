# AkarFinder — Session courante

**Mise à jour : 2026-08-22**

Ce fichier est un **handover opérationnel court**. Il ne crée ni priorité, ni pourcentage, ni statut global autonome.

## Autorité canonique

- `docs/ROADMAP.md` = **unique vérité canonique** pour l’état global, l’ordre des chantiers et leur progression.
- une issue GitHub = contrat de scope d’un chantier ; elle ne remplace pas la roadmap.
- une PR = implémentation + preuves d’un lot ; une PR ouverte n’est pas, à elle seule, un chantier actif.
- `docs/SESSION.md` = miroir de reprise uniquement ; en cas d’écart, la roadmap prévaut et SESSION doit être corrigé.
- toute PR doublon, superseded ou issue d’une ancienne architecture doit être fermée ou explicitement revalidée avant reprise.

## Chantier courant — Homepage Visual Reconciliation

Issue canonique de scope : `#849` — **Homepage Visual Reconciliation — HVR-1→HVR-5**.

Progression stricte : **0/5 lots CLOSED = 0 %**.

### HVR-1 — Header + HERO + Search + Intelligence

- PR : `#850` — **OPEN / DRAFT**
- HEAD observé : `010a067360b7e275cee66a76cc4b3b309afe1253`
- Goal : rapprocher la zone above-the-fold de la référence validée, sans métrique fictive ni changement backend/DB/ranking/source.
- BEFORE : P11 run `32559337861` — SUCCESS ; artifact `9472405507` ; digest `sha256:4dc2ca941ba81aac4f8d72f3a633989f6aff4f24f6bec9fd9d8beadd181351b2`.
- Viewports : 390 / 430 / 768 / 1280.
- État : implémentation HVR-1 présente sur la PR ; certification AFTER, score visuel et human gate restent requis avant fermeture.
- Next exact : vérifier le run HVR-1 exact-head, récupérer les AFTER, comparer BEFORE → référence → AFTER, corriger si nécessaire, scorer, human gate, puis seulement merge/closeout.

## Product Experience Reconciliation — fermé

Progression validée : **12/12 lots CLOSED = 100 %**.

- P0–P2 ✅ CLOSED
- P3 Accueil ✅ CLOSED
- P4 Search + Carte ✅ CLOSED
- P5 Listings ✅ CLOSED
- P6 Quartier / Ville ✅ CLOSED
- P7 Mon Projet ✅ CLOSED
- P8 Publication ✅ CLOSED
- P9 Professionnels ✅ CLOSED
- P10 Pages secondaires ✅ CLOSED
- P11 QA global / responsive / accessibilité / performance / nettoyage ✅ CLOSED

### Preuve P11 finale

- PR `#848` ✅ MERGED
- head certifié `bca9681d3f0d77b0f00ee7bcc3aba7591ba952e4`
- run `32559337861` — SUCCESS
- artifact `9472405507`
- digest `sha256:4dc2ca941ba81aac4f8d72f3a633989f6aff4f24f6bec9fd9d8beadd181351b2`
- 332/332 captures ; `findingCount = 0`
- score visuel final : **9,2/10**
- human visual gate : APPROVED le 2026-08-22
- merge `669d040162eb39f25e904da065c1b197c09dc039`
- aucun Vercel ; aucune migration DB.

## PR hygiene — 2026-08-22

- **26 PR historiques / doublons / superseded fermées** pendant le ménage GitHub.
- catégories retirées : ancienne chaîne SERP V2 preview, anciens micro-polish Search, audits remplacés par P4/P5/P11, anciennes réécritures de roadmap et doublon géométrie #794.
- les PR avec mutation Production déjà appliquée, dette Registry/DATA, sécurité ou réconciliation non prouvée restent ouvertes jusqu’à audit current-main ; elles ne sont pas considérées actives par simple présence dans l’onglet PR.

## Invariants

- UI/UX : BEFORE exact → Goal écrit → référence/mockup → implémentation → AFTER mêmes viewports → comparaison → score → human gate avant merge.
- aucune donnée, géographie, source, partenariat ou signal inventé.
- exact-head + preuve dédiée avant certification.
- CI en cours n’interrompt pas le travail indépendant.
- aucun déploiement Vercel sans autorisation explicite.
