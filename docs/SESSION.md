# AkarFinder — Session courante

**Mise à jour : 2026-08-22**

`docs/ROADMAP.md` reste l’unique vérité canonique globale.

## Chantier courant — Homepage Visual Reconciliation

Issue canonique : `#849` — **HVR-1→HVR-6**.

Progression stricte : **5/6 lots CLOSED = 83,3 %**.

### CLOSED

- HVR-1 : PR #850 ; merge `d6ef5fe970c3e9c71586a2686b0190a800c0e7f1` ; run `32563274184` SUCCESS ; score 9,0/10.
- HVR-2 : PR #853 ; merge `a44ed88db1cc6c0b556fa7af9cda6f43fc1faf30` ; run `32568589072` SUCCESS ; score 9,2/10.
- HVR-3 : PR #855 ; merge `414a50cc0d8753e4f7b37f5953783a574f164f71` ; run `32578052976` SUCCESS ; score 9,1/10.
- HVR-4 : PR #859 ; merge `993f3bc6d7107d3b9d08ce7efea1f1267c4e87cd` ; run `32579508071` SUCCESS ; score 9,3/10.
- HVR-5 : PR #860 ; merge `a85f2d04b34fe3d9383e8e26d17a2c756a60041d` ; HEAD certifié `6c1d95bfe49d93aa514114dcd03267f2dbeccba5` ; run `32583217515` SUCCESS ; artifact `9478356032` ; digest `sha256:af95257d826691a2a2028eca600c49c250f65493a2abd6b4322a8dcca163bad3` ; score 9,3/10 ; human gate APPROVED.

### HVR-6 — ACTIVE

Goal : benchmark final frais de la homepage current-main contre Rightmove / Zillow / Redfin / Realtor.com, puis corrections uniquement si elles améliorent réellement clarté, actionnabilité, densité ou confiance sans inventer de données.

Succès :
- quatre références re-checkées à frais ;
- matrice comparative documentée ;
- BEFORE = HVR-5 certifié ;
- corrections visuelles précédées d’une référence/mockup ;
- AFTER 390/430/768/1280 ;
- exact-head final ;
- score final ≥ 9/10 justifié ;
- human gate final avant merge/closeout.

## Next exact

Fresh benchmark → matrice → corrections justifiées → exact-head → AFTER → score final → human gate → merge/closeout issue #849.

## Invariants

- aucune donnée, métrique ou recommandation inventée ;
- benchmark externe final uniquement HVR-6 ;
- CI en cours n’interrompt pas le travail indépendant ;
- aucun déploiement Vercel sans autorisation explicite.
