# AKARFINDER — ROADMAP CANONIQUE

**Version : 2026-08-22**
**Statut : ACTIVE — Homepage Visual Reconciliation**

Ce fichier est **l’unique vérité canonique globale** pour l’ordre des chantiers, leur état et leur progression.

- `README.md` = identité / doctrine durable.
- `docs/ROADMAP.md` = état global + priorités + progression.
- une **issue GitHub** = contrat de scope d’un chantier.
- une **PR** = implémentation et preuves d’un lot ; une PR ouverte n’est pas automatiquement un chantier actif.
- `docs/SESSION.md` = handover court ; il doit refléter cette roadmap et ne peut pas la contredire.

L’ancien ledger détaillé reste conservé immuablement dans Git :
`main@05f74e8892b8d8958d86bbf2b2247e69b98d276f:docs/ROADMAP.md`.

Aucune information historique n’est déclarée perdue par cette compaction : le SHA ci-dessus est la référence d’archive exacte.

---

## 1. Chantier actif P0 — Homepage Visual Reconciliation

**Issue canonique : #849 — Homepage Visual Reconciliation — HVR-1→HVR-5**

### Goal

Réconcilier la homepage `/` avec la référence visuelle validée : densité, hiérarchie et ordre des modules, sans copier de métriques fictives ni casser les flux existants.

### Succès global

- direction visuelle validée reprise sans données inventées ;
- 390 / 430 / 768 / 1280 sans overflow ;
- BEFORE → référence → AFTER sur les mêmes viewports ;
- tests proportionnels + exact-head ;
- score visuel final visé ≥ 9/10 ;
- human visual gate avant merge final ;
- aucun changement backend/DB/ranking/source non justifié ;
- aucun déploiement Vercel sans autorisation explicite.

### Progression stricte

**0/5 lots CLOSED = 0 %.**

| Lot | Scope | État canonique | Preuve / Next |
|---|---|---|---|
| HVR-1 | Header + HERO + Search + Intelligence | 🟡 EN COURS — PR #850 DRAFT | HEAD observé `82499728bab79851811f5199884bafe24d08bd25`; AFTER + inspection + score + human gate requis |
| HVR-2 | Explorer le Maroc + Biens récents | ⏸️ À VENIR | démarre après closeout HVR-1 |
| HVR-3 | Comprendre + CTA acheteur/vendeur + Professionnels | ⏸️ À VENIR | dépend de HVR-2 |
| HVR-4 | Iconographie + design system + bandeau bénéfices | ⏸️ À VENIR | dépend de HVR-3 |
| HVR-5 | Responsive + polish + certification finale | ⏸️ À VENIR | 390/430/768/1280 + comparaison + score + human gate |

### BEFORE canonique

P11 Product Experience :
- run `32559337861` — SUCCESS ;
- artifact `9472405507` ;
- digest `sha256:4dc2ca941ba81aac4f8d72f3a633989f6aff4f24f6bec9fd9d8beadd181351b2` ;
- captures homepage 390 / 430 / 768 / 1280.

### Next exact

**HVR-1 uniquement** : obtenir la preuve exact-head utile, récupérer les AFTER, comparer BEFORE → référence → AFTER, corriger les écarts HVR-1, scorer, human gate, puis merge/closeout. Ne pas ouvrir HVR-2 comme vérité concurrente avant le closeout HVR-1.

---

## 2. Chantiers fermés — références stables

### Product Experience Reconciliation ✅ CLOSED

**12/12 lots CLOSED = 100 %.**

- P0–P2 ✅
- P3 Accueil ✅
- P4 Search + Carte ✅
- P5 Listings ✅
- P6 Quartier / Ville ✅
- P7 Mon Projet ✅
- P8 Publication ✅
- P9 Professionnels ✅
- P10 Pages secondaires ✅
- P11 QA global ✅

Preuve finale P11 :
- PR #848 MERGED ;
- head certifié `bca9681d3f0d77b0f00ee7bcc3aba7591ba952e4` ;
- run `32559337861` SUCCESS ;
- artifact `9472405507` ;
- **332/332 captures**, `findingCount=0` ;
- score visuel final **9,2/10** ;
- human gate APPROVED 2026-08-22 ;
- merge `669d040162eb39f25e904da065c1b197c09dc039` ;
- aucun Vercel, aucune migration DB dans P11.

### DATA MASS ✅ CLOSED

Le programme DATA MASS / MASS-X5 est fermé dans l’historique canonique. Toute nouvelle activation, ingestion ou mutation production constitue un **nouveau chantier séparé** et ne réouvre pas DATA MASS implicitement.

Référence de closeout MASS-X5 : PR #609, merge `3f1724faf03fd3c93fdafc2f522d61465d377e5b`, run `31762998799` SUCCESS.

### Audit Toutes Pages v1 ✅ CLOSED

A1→A5 fermés ; closeout #635. Les anciens audits non mergés ne sont pas des chantiers actifs.

### Bibliothèque visuelle quartiers Rabat P0→P2 ✅ CLOSED

P0 Souissi → P2 Visual Resolver intégration fermés ; P2 PR #605, merge `997d60dad5fdcd2ad6b081b299834daa9a59bed2`, human gate 9,2/10.

---

## 3. État produit / infra important mais non actif

### Search Ranking v2 — code + DB acquis, déploiement applicatif non certifié

- PR #629 MERGED ;
- migration production `search_ranking_v2` appliquée ;
- le déploiement applicatif correspondant n’était pas certifié dans l’ancien ledger faute de canal Vercel authentifié.

**État canonique : BLOCKED / HUMAN GATE.**

Aucun déploiement Vercel n’est autorisé par cette roadmap. Toute reprise exige une autorisation explicite de l’utilisateur puis une vérification production dédiée.

---

## 4. PR ouvertes — classification canonique

Règle : **seules les PR explicitement marquées ACTIVE ci-dessous sont sur le chemin critique.** Toutes les autres PR ouvertes sont `REVALIDATE`, `RECONCILIATION`, `BLOCKED`, `SECURITY BACKLOG` ou `HISTORICAL` jusqu’à preuve current-main.

### ACTIVE

- **#850 — HVR-1** : ACTIVE / DRAFT, chantier #849.
- **#851 — GitHub Hygiene & Single Source of Truth** : GOVERNANCE / DRAFT jusqu’au merge de cette compaction.

### REVALIDATE AVANT REPRISE — UI / produit

Ces PR ne doivent pas être mergées depuis leur branche historique sans comparaison contre `main` actuel :

- #822 — Map + Listing Standard N0 ;
- #797 — ancienne référence `Refonte carte` ;
- #671 — Favoris convergence ;
- #653 — promoter canonical truth fix ;
- #645 / #644 — anciens lots B2B partner pages ;
- #628 — Casablanca / Maârif neighborhood visuals.

Motif : Product Experience P0→P11 a depuis modifié/certifié de larges surfaces UI. Toute valeur résiduelle doit être reconstruite sur current-main ou fermée comme superseded.

### RECONCILIATION — GEO / données avec preuve potentiellement unique

À conserver ouverts jusqu’à audit current-main ; aucune activation implicite :

- #796 — Diour Jamaa geometry evidence, rights-blocked ;
- #785 — Rabat Poste Maroc locality evidence ;
- #752 — C8D Rabat DB authority proposal, proposal-only ;
- #487 — Rabat neighborhood visual library foundation, migration production déjà appliquée.

### RECONCILIATION / BLOCKED — DATA / Source Policy / Search

À ne pas fermer ni merger aveuglément, car certaines PR mentionnent des migrations ou mutations production déjà appliquées :

- #622 — REAL-LISTINGS-ONLY, migration production appliquée ;
- #474 — MASS-FIRST, `BLOCKED_BY_SOURCE_POLICY_READINESS` dans sa propre preuve historique ;
- #478 — repair DATA-4.4B empilé sur #474 ;
- #454 — DATA-4.9C, mutation restrictive Registry Agadir déjà appliquée ;
- #319 — DATA-COVERAGE-2 ;
- #289 — A5.4 recovery ;
- #255 — Honest Listing Depth baseline ;
- #133 — ODM-10C4 public-index delta ;
- #113 — ODM-09 Search Gateway activation gate ;
- #54 — Bulk Seed Confirmation v1.

Avant toute reprise : comparer au current-main + état production réel, préserver les mutations réellement appliquées, isoler le résidu utile, reconstruire une PR current-main si nécessaire.

### RECONCILIATION — anciennes fondations DATA avec état Supabase déclaré

- #126 — Transactional Recrawl Activation ;
- #125 — Authorized Source Adapter ;
- #124 — Recrawl Scheduler ;
- #121 — Freshness & Lifecycle ;
- #118 — Observation Ledger ;
- #115 — Property Intelligence Backfill ;
- #110 — Property Intelligence Foundation.

Ces PR ne sont **pas** considérées actives. Elles contiennent des déclarations de migrations / écritures historiques et doivent être auditées contre Supabase + current-main avant fermeture ou reconstruction.

### SECURITY BACKLOG

- #310 — Professional auth/session/RLS hardening.

Ne jamais merger la branche historique directement. Re-audit current-main + tenant isolation + RLS/RPC ; reconstruire si le finding existe encore.

### GOVERNANCE LEGACY

- #383 — Permanent agent governance.

Ancienne base. Réutiliser uniquement les capacités réellement absentes de current-main ; sinon fermer comme superseded après comparaison.

---

## 5. PR hygiene — état vérifié 2026-08-22

**26 PR historiques / doublons / superseded ont été fermées** pendant le ménage initial.

Catégories retirées :
- ancienne chaîne SERP V2 preview LOT 1→6 ;
- anciens micro-polish Search ;
- anciens audits remplacés par P4/P5/P11 ;
- anciennes réécritures concurrentes de roadmap ;
- doublon géométrie #794.

Aucune PR comportant une mutation Production déjà appliquée, une dette Registry/DATA ou un risque sécurité n’a été fermée uniquement pour faire baisser le compteur.

---

## 6. Règles d’exécution permanentes

### Vérité unique

1. Toute nouvelle initiative significative est d’abord inscrite ici ou rattachée à une entrée existante.
2. Une issue porte le scope détaillé, jamais un état global concurrent.
3. Une seule PR d’implémentation active par **lot exact**.
4. Une reconstruction/rebase qui remplace une PR ferme explicitement la PR superseded.
5. `docs/SESSION.md` reflète uniquement le chantier actif + repères de reprise.
6. Les pourcentages viennent uniquement de lots réellement CLOSED avec preuve.

### Goal / Succès / Preuve

Pour chaque lot significatif :
- Goal exact ;
- Succès observable ;
- Preuve vérifiable.

Ne jamais déclarer CLOSED/CERTIFIED/production-ready sans preuve.

### UI / UX

Obligatoire :
`BEFORE exact → Goal → référence/mockup → implémentation → AFTER mêmes viewports → comparaison → tests → score → human gate → merge`.

### DATA / DB / sécurité

- Source Registry et permissions restent fail-closed ;
- aucune autorisation déduite d’un sitemap, robots, volume ou capacité technique ;
- migration/write production : preuve + rollback + validation proportionnée ;
- sécurité : revalidation current-main et preuve réelle avant conclusion.

### CI

Une CI queued/pending/in_progress n’arrête pas le travail indépendant. Pas de polling, pas de sleep, pas d’attente active.

### Vercel

**Aucun déploiement Vercel sans autorisation explicite de l’utilisateur.**

---

## 7. Prochaine action exacte

1. Finaliser **HVR-1 #850** selon son gate visuel et exact-head.
2. Fermer/merger HVR-1 seulement après score + human gate.
3. Mettre à jour cette roadmap au closeout HVR-1.
4. Ouvrir HVR-2 seulement comme lot suivant du même chantier.

Les PR `REVALIDATE/RECONCILIATION/BLOCKED` ne deviennent prioritaires qu’après décision explicite inscrite dans cette roadmap.
