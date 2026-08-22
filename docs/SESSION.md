# AkarFinder — Session courante

**Mise à jour : 2026-08-22**

Ce fichier est un **handover opérationnel court**. `docs/ROADMAP.md` reste l’unique vérité canonique globale.

## Chantier courant — Homepage Visual Reconciliation

Issue canonique : `#849` — **HVR-1→HVR-6**.

Progression stricte : **4/6 lots CLOSED = 66,7 %**.

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
- score **9,1/10** ; human gate APPROVED

### HVR-4 — CLOSED

- PR `#859` ✅ MERGED
- merge `993f3bc6d7107d3b9d08ce7efea1f1267c4e87cd`
- HEAD certifié `cd5385984712b2aaabdf07d9ff4ab760fe44959c`
- run `32579508071` SUCCESS ; artifact `9477494308`
- digest `sha256:f3f1c32d3d7a7a4d9f9f5558ec7594938fc21a894d988ebafb0e2bff4d42c1f9`
- 3/3 destinations quartier ; 4/4 viewports ; findingCount 0 ; 0 overflow ; 0 console error
- score **9,3/10** ; human gate APPROVED
- grosse section passive supprimée au profit de `Comprendre le quartier avant de visiter`

### HVR-5 — ACTIVE

Goal : simplifier la deuxième moitié de la homepage selon le principe **peu de blocs, chacun actionnable**, tout en conservant les accès utiles pour recherche, projet, vendeur/publication et professionnels.

Candidats principaux déjà audités :
- `HowItWorks` / `Votre recherche, simplement` : trop explicatif, aucune action directe principale ;
- `MreTrustSection` : trop volumineux et contient des valeurs d’exemple qui ne doivent pas ressembler à des données réelles ;
- `HomeFinalCTA` : utile mais peut absorber davantage de conversion vendeur/Pros.

BEFORE HVR-5 = HVR-4 AFTER certifié : run `32579508071`, artifact `9477494308`, viewports 390 / 430 / 768 / 1280.

HVR-6 reste le seul benchmark final frais contre Zillow / Redfin / Realtor.com / Rightmove.

## Next exact

HVR-5 : créer branche current-main → Goal + wireframe → implémentation simplification globale → contrats/TypeScript/build → AFTER 390/430/768/1280 → comparaison → score → human gate → merge/closeout.

## Invariants

- UI/UX : BEFORE → Goal → référence/wireframe → implémentation → AFTER mêmes viewports → comparaison → score → human gate.
- aucune donnée, source, métrique ou signal inventé.
- CI en cours n’interrompt pas le travail indépendant.
- aucun déploiement Vercel sans autorisation explicite.
