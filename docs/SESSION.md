# AkarFinder — Session courante

**Mise à jour : 2026-08-22**

Ce fichier est un **handover opérationnel court**. `docs/ROADMAP.md` reste l’unique vérité canonique globale.

## Chantier courant — Homepage Visual Reconciliation

Issue canonique : `#849` — **HVR-1→HVR-6**.

Progression stricte : **3/6 lots CLOSED = 50,0 %**.

### HVR-1 — CLOSED

- PR `#850` ✅ MERGED
- merge `d6ef5fe970c3e9c71586a2686b0190a800c0e7f1`
- run `32563274184` SUCCESS ; artifact `9473438871`
- score **9,0/10** ; human gate APPROVED

### HVR-2 — CLOSED

- PR `#853` ✅ MERGED
- merge `a44ed88db1cc6c0b556fa7af9cda6f43fc1faf30`
- run `32568589072` SUCCESS ; artifact `9474791842`
- score **9,2/10** ; human gate APPROVED

### HVR-3 — CLOSED

- PR `#855` ✅ MERGED
- merge `414a50cc0d8753e4f7b37f5953783a574f164f71`
- HEAD certifié `3549d5258b900b5c9cd6cb1b0b09c48c99a06bb5`
- run `32578052976` SUCCESS ; artifact `9477075713`
- digest `sha256:54f83da468ee468078de32c3c86177c5fec4e56a8d40e284cadaf572ca1a8846`
- 4/4 viewports ; contrats + TypeScript + build + responsive proof verts
- score **9,1/10** ; human gate APPROVED
- runtime via read-model public canonique ; aucun faux signal de récence/recommandation

### HVR-4 — ACTIVE

Goal : remplacer la grosse section passive `Un bien ne se résume pas à ses mètres carrés` par un module court **Comprendre le quartier avant de visiter** où chaque quartier mène directement à sa page.

- branche : `agent/homepage-visual-reconciliation-hvr4`
- BEFORE : HVR-3 AFTER, run `32578052976`, artifact `9477075713`
- Goal + wireframe : `docs/HVR_4_NEIGHBORHOOD_ACTION.md`
- quartiers canoniques : Agdal / Maârif / Guéliz
- chaque carte = lien direct, aucun état sélectionné intermédiaire
- densité plafonnée : 2 repères + 3 tags + 1 signal prix
- suppression du wording passif, carte stylisée, étoiles futures et `bientôt disponible`
- benchmark frais complet réservé à HVR-6

### Lots suivants

- HVR-5 : simplification homepage complète + responsive polish type Rightmove.
- HVR-6 : benchmark final frais Zillow / Redfin / Realtor.com / Rightmove, score final visé ≥ 9/10.

## Next exact

HVR-4 : source contracts → TypeScript/build → audit 390/430/768/1280 → AFTER → comparaison BEFORE/mockup/AFTER → score → human gate → merge/closeout.

## Invariants

- UI/UX : BEFORE → Goal → référence/wireframe → implémentation → AFTER mêmes viewports → comparaison → score → human gate.
- aucune donnée, source, métrique ou signal inventé.
- CI en cours n’interrompt pas le travail indépendant.
- aucun déploiement Vercel sans autorisation explicite.
