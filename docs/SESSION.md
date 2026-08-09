# AkarFinder — Session courante

**Mise à jour : 2026-08-09**

Ce fichier est le handover opérationnel court. `README.md` porte l'identité/doctrine et `docs/ROADMAP.md` reste l'unique roadmap canonique.

## Main / LOT actif

- Main de base du closeout Carte : `3a22c0830ee6afd8f05be7cdb25906f8d5462f78` — DATA-4.7C parallèle préservé.
- Lane Carte fermée : **P1B.9 — Tier A Registry Candidate Review ✅**.
- PR Carte : **#439**.
- Head exact certifié : `82709261dc4cd2b9e79cedf4d29d47eabb542a52`.
- Merge Carte : `1e1f8957b855fbcc86bd6319ff0247235b0183b3`.
- Specialized exact-head run `31334081514` / job `93296918424` : PASS.
- Exact-head global : **19/19 workflows PASS**.
- Post-merge push gate : run `31334197550` / job `93297231083` : PASS.

## UX / Carte — P1B.9 ✅ CLOSED

P1B.9 a rejoué en production la cohorte Tier A issue de P1B.8 sans aucune mutation :

- **Agadir — Hay Mohammadi : 5** listings Search-éligibles, bridge explicite, non résolus, **2 sources** (`mouldar.com`, `mubawab.ma`) ;
- **Agadir — Dakhla : 3** listings Search-éligibles, bridge explicite, non résolus, **2 sources** ;
- parent canonique `city_agadir` : **validated** ;
- preuve d'autorité indépendante : `agadir.ma`, héritée de P1B.8 et revalidée dans le contrat ;
- collisions Registry : **0 ID / 0 slug / 0 normalized_name / 0 exact alias** ;
- identité candidate proposée fail-closed : `validated`, mais `seo_eligible=false` et `map_eligible=false` tant qu'aucun lot séparé ne l'active ;
- **0 DB write, 0 Registry mutation, 0 alias/entity creation, 0 geo-resolution write**.

Verdict : **`TIER_A_REGISTRY_CANDIDATES_READY_FOR_BOUNDED_WRITE_DESIGN`**.

Ce verdict autorise uniquement la **conception d'un lot séparé et borné de mutation Registry** pour Hay Mohammadi + Dakhla. P1B.9 n'autorise aucune écriture par lui-même.

La couverture quartier reste celle de P1B.5 : **89 / 15 438 = 0,5765 %**. **Offre quartier reste OFF**.

## Prochaine action Carte

Formaliser un lot séparé **P1B.10 — Tier A Registry Write Design**, borné exclusivement à **Hay Mohammadi + Dakhla** : migration déterministe, entités + alias exacts, defaults publics fail-closed, preflight anti-collision, rollback exact, tests PostgreSQL, sans encore écrire de `geo_resolution_events`. Toute activation `map_eligible`/`seo_eligible` et toute résolution des 8 listings doivent rester des décisions séparées après certification Registry.

## DATA parallèle — état à ne pas écraser

La lane DATA avance indépendamment. Le main de base contient **DATA-4.7C — Residual Reservoir Requalification**. Les décisions DATA, les sources, les writes de fraîcheur et leurs preuves restent hors scope Carte et doivent être conservés tels quels dans README/ROADMAP lors du closeout documentaire.

## Invariants

No-bypass ; Source Registry autoritaire ; Geo Registry canonique ; provenance réelle ; Search canonique ; aucune donnée/géométrie inventée ; une responsabilité/branche/PR/merge par LOT ; rollback avant mutation ; exact-head CI verte avant write ; `Offre quartier = OFF` tant que couverture/fiabilité sont insuffisantes ; mise à jour README/ROADMAP/SESSION au closeout.
