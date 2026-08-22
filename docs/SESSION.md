# AkarFinder — Session courante

**Mise à jour : 2026-08-22**

Ce fichier est un **handover opérationnel court**. `docs/ROADMAP.md` reste l’unique vérité canonique globale.

## Chantier courant — Homepage Visual Reconciliation

Issue canonique : `#849` — **HVR-1→HVR-6**.

Progression stricte : **2/6 lots CLOSED = 33,3 %**.

### HVR-1 — CLOSED

- PR `#850` ✅ MERGED
- merge `d6ef5fe970c3e9c71586a2686b0190a800c0e7f1`
- runtime HEAD certifié `49877cf7924e3e757cc9f52902050b9c7572157f`
- run `32563274184` SUCCESS ; artifact `9473438871`
- 4/4 viewports ; findingCount 0 ; 0 overflow ; 0 console error
- score **9,0/10** ; human gate APPROVED

### HVR-2 — CLOSED

- PR `#853` ✅ MERGED
- merge `a44ed88db1cc6c0b556fa7af9cda6f43fc1faf30`
- HEAD certifié `3485a95fd27b8bb8c3c1b1d062373686d0c37e0d`
- run `32568589072` SUCCESS
- artifact `9474791842`
- digest `sha256:8b7ee6df252175209bdc40a72cb729b46bdbcd3054a07e944102b9625c14fab7`
- 6/6 destinations villes ; 4/4 viewports ; 0 finding ; 0 overflow ; 0 console error
- score **9,2/10** ; human gate APPROVED

### HVR-3 — ACTIVE

Goal : afficher **Biens à découvrir** juste après `Explorer le Maroc`, avec de vraies représentations publiques, sans faux signal de récence ou de recommandation.

- branche : `agent/homepage-visual-reconciliation-hvr3`
- PR : `#855` DRAFT
- BEFORE : HVR-2 AFTER certifié 390 / 430 / 768 / 1280
- wireframe : `docs/HVR_3_DISCOVER_LISTINGS.md`
- source : moteur public `searchListings()` ; aucun mock
- max 4 cartes
- politique image existante conservée ; fallback local si image non autorisée
- wording verrouillé : `Biens à découvrir`
- Rightmove = référence principale de simplicité ; Zillow / Redfin / Realtor.com = compléments pour intelligence ; benchmark frais réservé à HVR-6

### Lots suivants

- HVR-4 : Intelligence quartier actionnable ; reconstruire la grosse section passive.
- HVR-5 : simplification homepage complète + responsive polish.
- HVR-6 : benchmark final frais Zillow / Redfin / Realtor.com / Rightmove, score final visé ≥ 9/10.

## Next exact

HVR-3 : implémentation → tests source → TypeScript/build → audit 390/430/768/1280 → AFTER → inspection → score → human gate → merge/closeout.

## Invariants

- UI/UX : BEFORE → Goal → référence/wireframe → implémentation → AFTER mêmes viewports → comparaison → score → human gate.
- aucune donnée, source, métrique ou signal inventé.
- CI en cours n’interrompt pas le travail indépendant.
- aucun déploiement Vercel sans autorisation explicite.
