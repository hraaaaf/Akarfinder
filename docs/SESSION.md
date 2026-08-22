# AkarFinder — Session courante

**Mise à jour : 2026-08-22**

`docs/ROADMAP.md` reste l’unique vérité canonique globale.

## Chantier courant — DATA MASS-INDEX

Issue : `#854`.

Progression stricte : **4/8 lots CLOSED = 50 %**.

### CLOSED
- M0 : baseline current-main/Supabase certifiée dans `docs/MASS_INDEX_M0_AUDIT.md`.
- M1 : Universal candidate promotion ; run `32577296107` SUCCESS ; 33 872 candidates acceptées ; 0 write.
- M2 : External Index natif OpenSERP/Serper MASS ; run `32580352867` SUCCESS ; canary réel 10/10 ; Search inchangé.
- M3 : PR #863 ; merge `fe6740ff40872e57789f67d12b02a5b43ea412d6` ; run final qualité `32594176513` SUCCESS ; artifact `9481117150` ; digest `sha256:8a8c8d9947e35940571e8a359cb0bbfa7bb9aa87f3d7ec18a76167cecd74b388`.

### M3 — résultat final
- 10 domaines mesurés ;
- 350 canonical candidates ;
- 77 fiches détail valides ; rendement agrégé 22 % ;
- 7 sources positives : `marocannonces.com`, `domio.ma`, `sakane.ma`, `1000-annonces.com`, `housing.place`, `expat.com`, `milkiya.ma` ;
- 3 sources hors wave 1 : `yakeey.com`, `2p.ma`, `portail-immobilier.ma` ;
- 0 write DB, 0 source fetch, 0 activation Search, 0 provider relabel, 0 mutation policy.

## M4 — ACTIVE

Goal : matérialiser nationalement les fiches validées des 7 sources positives via le writer M2 existant, en net-new seulement, avec canary/rollback et Search toujours OFF.

Succès : manifest national exact -> write-plan -> canary -> batches bornés -> before/after DB -> aucune activation publique accidentelle.

### Potentiel structurel observé avant M4
- marocannonces.com : 473 detail-like ; 403 vues <=30j ;
- sakane.ma : 193 ; 97 <=30j ;
- milkiya.ma : 131 ; 129 <=30j ;
- expat.com : 104 ; 100 <=30j ;
- 1000-annonces.com : 76 ; 76 <=30j ;
- housing.place : 22 ; 22 <=30j ;
- domio.ma : 5 ; 1 <=30j.

Ces nombres sont des plafonds structurels d’URLs, pas encore des listings M4 validés ni des propriétés uniques.

## Chantier suspendu
Homepage Visual Reconciliation #849 : HVR-1→HVR-5 CLOSED, HVR-6 SUSPENDED ; progression conservée 5/6 = 83,3 %.

## Next exact
1. construire le manifest M4 national read-only M1 + garde M3 sur les 7 sources ;
2. calculer `INSERT_NATIVE` / `PRESERVE_EXISTING` ;
3. canary borné ;
4. vérifier Thin Index + Search inchangé ;
5. batches M4 + accounting before/after ;
6. closeout M4 puis M5.

## Invariants
- aucun Vercel sans autorisation explicite ;
- aucun bypass technique ;
- aucune métrique propriété unique avant dédup ;
- provenance réelle et rollback obligatoires.
