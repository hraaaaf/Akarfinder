# AKARFINDER — ROADMAP CANONIQUE

**Version : 2026-08-22**  
**Statut : ACTIVE — Homepage Visual Reconciliation**

Ce fichier est l’unique vérité canonique globale pour l’ordre des chantiers, leur état et leur progression.

- `README.md` = identité / doctrine durable.
- `docs/ROADMAP.md` = état global + priorités + progression.
- une issue GitHub = contrat de scope d’un chantier.
- une PR = implémentation et preuves d’un lot.
- `docs/SESSION.md` = handover court, aligné sur cette roadmap.

L’ancien ledger détaillé reste archivé immuablement dans Git : `main@05f74e8892b8d8958d86bbf2b2247e69b98d276f:docs/ROADMAP.md`.

---

## 1. Chantier actif P0 — Homepage Visual Reconciliation

**Issue canonique : #849 — Homepage Visual Reconciliation — HVR-1→HVR-6**

### Goal

Réconcilier la homepage `/` avec la référence visuelle validée et les meilleures pratiques des sites immobiliers de référence, sans données inventées ni régression des flux existants.

### Direction UX verrouillée

- Rightmove = référence principale de simplicité et d’architecture.
- Zillow / Redfin / Realtor.com = références complémentaires pour intelligence et profondeur fonctionnelle.
- AkarFinder conserve sa différenciation Maroc + compréhension du marché/quartier.
- Chaque section importante doit mener à une action réelle.

### Succès global

- homepage search-first, simple et actionnable ;
- villes = accès direct ;
- vrais biens visibles tôt avec wording truth-safe ;
- intelligence quartier compacte et utile ;
- 390 / 430 / 768 / 1280 sans overflow ;
- BEFORE → référence/mockup → AFTER ;
- exact-head tests ;
- benchmark final frais Zillow / Redfin / Realtor.com / Rightmove ;
- score final visé ≥ 9/10 ;
- human visual gate avant merge UI ;
- aucun changement backend/DB/ranking/source non justifié ;
- aucun déploiement Vercel sans autorisation explicite.

### Progression stricte

**5/6 lots CLOSED = 83,3 %.**

| Lot | Scope | État canonique | Preuve |
|---|---|---|---|
| HVR-1 | Header + HERO + Search + Intelligence | ✅ CLOSED | PR #850 ; merge `d6ef5fe970c3e9c71586a2686b0190a800c0e7f1` ; run `32563274184` SUCCESS ; score 9,0/10 ; human gate APPROVED |
| HVR-2 | Explorer le Maroc — villes en accès direct | ✅ CLOSED | PR #853 ; merge `a44ed88db1cc6c0b556fa7af9cda6f43fc1faf30` ; run `32568589072` SUCCESS ; score 9,2/10 ; human gate APPROVED |
| HVR-3 | Biens à découvrir — vraies annonces | ✅ CLOSED | PR #855 ; merge `414a50cc0d8753e4f7b37f5953783a574f164f71` ; run `32578052976` SUCCESS ; score 9,1/10 ; human gate APPROVED |
| HVR-4 | Intelligence quartier actionnable | ✅ CLOSED | PR #859 ; merge `993f3bc6d7107d3b9d08ce7efea1f1267c4e87cd` ; run `32579508071` SUCCESS ; score 9,3/10 ; human gate APPROVED |
| HVR-5 | Homepage complète + responsive polish | ✅ CLOSED | PR #860 ; merge `a85f2d04b34fe3d9383e8e26d17a2c756a60041d` ; HEAD certifié `6c1d95bfe49d93aa514114dcd03267f2dbeccba5` ; run `32583217515` SUCCESS ; artifact `9478356032` ; score 9,3/10 ; human gate APPROVED |
| HVR-6 | Benchmark final références | 🟡 ACTIVE | re-check frais Zillow / Redfin / Realtor.com / Rightmove → matrice → corrections réellement justifiées → exact-head → score final → human gate |

### HVR-5 — closeout verrouillé

- PR #860 MERGED ; merge `a85f2d04b34fe3d9383e8e26d17a2c756a60041d` ;
- HEAD certifié `6c1d95bfe49d93aa514114dcd03267f2dbeccba5` ;
- run `32583217515` SUCCESS ; artifact `9478356032` ;
- digest `sha256:af95257d826691a2a2028eca600c49c250f65493a2abd6b4322a8dcca163bad3` ;
- contrats HVR-1→HVR-5 + TypeScript + build + responsive proof verts ;
- 4/4 destinations `/search`, `/compagnon`, `/vendre`, `/pro` ; 4/4 captures ; 0 overflow ; 0 console error ;
- `HowItWorks`, `MreTrustSection` et `HomeFinalCTA` retirés de la composition homepage et remplacés par `HomeActionGrid` compact ;
- aucune valeur de démonstration budget/favoris/compteur dans le nouveau funnel ;
- score visuel 9,3/10 ; human gate APPROVED 2026-08-22 ;
- aucun Vercel.

### HVR-6 — Goal verrouillé

Benchmark final frais de la homepage current-main contre les quatre références retenues, puis correction uniquement des écarts réellement utiles à AkarFinder.

**Succès :**
- quatre références re-checkées à frais ;
- matrice clarté / recherche / densité / listings / contexte local / actions secondaires / mobile / confiance ;
- aucun copier-coller décoratif ni métrique fictive ;
- BEFORE HVR-5 certifié ;
- si correction visuelle : mockup/référence avant code, AFTER mêmes viewports ;
- exact-head final + 390/430/768/1280 ;
- score final ≥ 9/10 justifié par preuves ;
- human gate final avant merge/closeout.

### Next exact

**HVR-6** : fresh benchmark → matrice → décisions/corrections → exact-head → AFTER 390/430/768/1280 → score final → human gate → merge/closeout issue #849.

---

## 2. Chantiers fermés — références stables

### GitHub Hygiene & Single Source of Truth ✅ CLOSED
PR #851, merge squash `9359034d8587ee12e0bd2fce72bf791582b90a5c`. Ancien ledger roadmap conservé par SHA. Aucun DB/ranking/Vercel.

### Product Experience Reconciliation ✅ CLOSED
12/12 lots CLOSED. Preuve finale P11 : PR #848 ; run `32559337861` SUCCESS ; artifact `9472405507` ; 332/332 captures ; findingCount 0 ; score 9,2/10 ; human gate APPROVED ; merge `669d040162eb39f25e904da065c1b197c09dc039`.

### DATA MASS ✅ CLOSED
MASS-X5 : PR #609 ; merge `3f1724faf03fd3c93fdafc2f522d61465d377e5b` ; run `31762998799` SUCCESS. Toute nouvelle ingestion/mutation production est un chantier séparé.

### Audit Toutes Pages v1 ✅ CLOSED
A1→A5 fermés ; closeout #635.

### Bibliothèque visuelle quartiers Rabat P0→P2 ✅ CLOSED
P2 : PR #605 ; merge `997d60dad5fdcd2ad6b081b299834daa9a59bed2` ; human gate 9,2/10.

---

## 3. État produit / infra important mais non actif

### Search Ranking v2
PR #629 MERGED ; migration production appliquée ; déploiement applicatif non certifié historiquement. **BLOCKED / HUMAN GATE** pour tout déploiement. Aucun Vercel sans autorisation explicite.

### PR historiques / réconciliation
Les anciennes PR UI, GEO, DATA, Source Policy, Search et sécurité restent `REVALIDATE`, `RECONCILIATION`, `BLOCKED`, `SECURITY BACKLOG` ou `HISTORICAL` jusqu’à preuve current-main. Ne jamais merger une branche historique aveuglément, surtout si une migration ou mutation production a déjà été appliquée.

Repères à préserver : #822, #797, #671, #653, #645, #644, #628, #796, #785, #752, #487, #622, #474, #478, #454, #319, #289, #255, #133, #113, #54, #126, #125, #124, #121, #118, #115, #110, #310, #383.

---

## 4. Règles d’exécution permanentes

### Vérité unique
1. Toute initiative significative se rattache à cette roadmap.
2. Une issue porte le scope ; une PR porte l’implémentation et les preuves.
3. Une seule PR d’implémentation active par lot exact.
4. `docs/SESSION.md` reflète uniquement le chantier actif.
5. Les pourcentages viennent uniquement de lots réellement CLOSED.

### UI / UX
`BEFORE exact → Goal → référence/mockup → implémentation → AFTER mêmes viewports → comparaison → tests → score → human gate → merge`.

### DATA / DB / sécurité
Fail-closed ; migration/write production = preuve + rollback + validation proportionnée ; sécurité = revalidation current-main.

### CI
Une CI queued/pending/in_progress n’arrête pas le travail indépendant. Pas de polling ni d’attente active.

### Vercel
**Aucun déploiement Vercel sans autorisation explicite de l’utilisateur.**
