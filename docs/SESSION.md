# AkarFinder — Session courante

**Mise à jour : 2026-08-10 20:25 +01:00**

Ce fichier est le handover court. Lire avant toute action :

1. `README.md` ;
2. `docs/ROADMAP.md` — **roadmap unique de toutes les fenêtres** ;
3. `docs/SESSION.md` ;
4. doc spécialisée seulement si nécessaire.

## Règle de travail désormais globale

Chaque étape significative doit avoir un **double check indépendant + note /10**. Aucun lot n’est fermé sous **9,0/10**. Si la note est <9, les findings sont ajoutés à la roadmap et corrigés avant certification. Cette règle vaut pour UX/UI, DATA, Search, Backend, Carte/Geo et sécurité.

## Main canonique de départ

`main@f4563602119c8c01298bf694285e35856097bbd6` — merge P1C.4A #472 au démarrage du chantier MASS-FIRST.

Toujours re-vérifier le vrai `main` avant tout nouveau lot.

## LOT actif P0 — MASS-FIRST Search / Quality Policy

- Branche : `feat/mass-first-search-quality-policy`.
- PR : **#474**.
- 5 lots codés : Source Policy gate ; Quality ≠ Eligibility ; Listing Power 0–100 ; Search ranking ; reclassification/certification.
- Auto-review a trouvé puis corrigé la fuite conceptuelle `AMBIGUOUS → eligible_secondary` ; seuls `LISTING + real_estate_likely` peuvent être publics.
- Head après ce correctif fonctionnel : `b6a911ecebc38b736e902e7fb6d9d51d0c7cad52`; les commits docs suivants ne changent pas la logique métier.
- Score double check provisoire : **8,8/10 — NON CERTIFIÉ**.
- Merge interdit tant que score final <9/10 ou qu’un gate CI/PostgreSQL/sécurité reste non prouvé.

### À terminer avant merge #474

1. CI exact-head complète ;
2. Canonical Compile + Baseline + Search Truth verts ;
3. migrations PostgreSQL/Supabase réellement testées ;
4. reports MASS-FIRST exécutés et compteurs contrôlés ;
5. audit ACL / `SECURITY DEFINER` / rôle consommateur Search ;
6. plan/performance Search ;
7. diff avant/après volume + sources + villes + qualité + fraîcheur + Power Score ;
8. tests Q0/Q1 valides toujours trouvables ;
9. tests prohibited/unverified/CATEGORY/AMBIGUOUS = zéro fuite ;
10. Reviewer technique ;
11. Release Certifier ;
12. re-note ≥9/10 ; sinon correction + nouvelle boucle ;
13. merge ;
14. vérification post-merge sur `main` ;
15. closeout README/ROADMAP/SESSION.

## DATA parallèle

- DATA-4.9A ✅.
- DATA-4.9B : **10 128 URL identities net-new → 2 326 candidate URL representations + 7 802 rejets** ; ce n’est pas un nombre de biens uniques.
- Prochain lot : **DATA-4.9C — Source Policy Decision & Registry Assignment**.
- Ensuite seulement : DATA-4.9D canary borné pour sources réellement autorisées.
- P1C.4A Carte attend également un lot DATA séparé de preuve exact-scope Registry + depth/freshness.

## UX/Search parallèle

- Mobile 2 colonnes : conserver.
- Prochain chantier densité après stabilisation #474 : **UX-SEARCH-DENSITY-2**.
- Cible : desktop large 4 cartes/ligne ; desktop intermédiaire 3 ; tablette 2 ; mobile 2.
- Double check visuel réel et scores mobile + desktop ≥9/10 obligatoires.
- `CONTEXTUAL-ILLUSTRATIONS-COVERAGE-AUDIT-1` reste read-only avant ajout de nouveaux assets.

## Carte / Geo

- P1C.4 : `NOT_CERTIFIABLE`.
- P1C.4A : `DESIGNED_NOT_PROVEN`.
- Offre quartier publique : **OFF**.
- P1C.5 : **LOCKED** jusqu’à preuve DATA exact-scope puis replay P1C.4A/P1C.4 et certification de représentativité.
- `docs/CARTE_ROADMAP.md` conserve le détail chronologique, mais `docs/ROADMAP.md` reste l’autorité globale.

## Invariants

No-bypass ; Source Registry autoritaire ; provenance réelle ; aucune donnée/géométrie inventée ; Search canonique ; une responsabilité/branche/PR/certification ; rollback avant mutation sensible ; exact-head CI ; double check ; **score final ≥9/10** ; mise à jour des 3 docs canoniques après merge.
