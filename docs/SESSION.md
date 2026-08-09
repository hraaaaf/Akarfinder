# AkarFinder — Session courante

**Mise à jour : 2026-08-09**

Ce fichier est le handover opérationnel court. `README.md` porte l'identité/doctrine et `docs/ROADMAP.md` reste l'unique roadmap canonique.

## Main / LOT actif

- Main de départ du LOT : `0019f33e6a10a58d76a6db4521c681861067c651` — merge DATA-4.7A PR #433.
- LOT actif : **DATA-4.7B — LSF Controlled Expansion Write**.
- PR : **#435**.
- Exact write head certifié avant mutation : `f3f72f6b4e7e7f877df4eb67fa6c31f0140e81b3`.
- Specialized CI : run `31330561506` PASS — contract + TypeScript + static safety + live dry-run.
- Rollback artifact : `sha256:d791172e8036d0b475cbf2119dca0c497938940f87563923dbcbf68370398672`, **250 apply rows / 250 rollback rows**, 0 write pendant CI.

## DATA-4.7A ✅

LSF qualification live :

- 1 414 seeds ; 99 fresh-confirmed ; 1 315 seed-only au départ ;
- sitemap courant : 1 423 URLs ;
- 1 064 identités URL sûres ; 174 groupes collision DB exclus fail-closed ;
- 983 seed-only encore présentes dans le sitemap ;
- **353** candidates `seed_only + normalized + display eligible + Public Search` ;
- tier C long-tail accepté comme `eligible_secondary`, sans exiger prix/surface ni fabriquer de donnée ;
- 0 mutation.

PR #433 mergée : `0019f33e6a10a58d76a6db4521c681861067c651`.

## DATA-4.7B — write production certifié ✅ (merge PR encore à faire)

Preflight exact avant write :

- 250/250 URLs exactes présentes ;
- 250/250 encore `seed_only` ;
- 250/250 sans `public_sitemap_presence` précédent ;
- 250/250 sans ancien `freshness_evidence` ;
- digest exact URL set : `79e3982f128c4e639197a64a29766e9c`.

Résultat production :

- write atomique : **250/250** ;
- fresh-confirmed : **250/250** ;
- `public_sitemap_presence` : **250/250** ;
- normalized : **250/250** ;
- technical display : **250/250** ;
- Public Search : **250/250** ;
- Thin Index freshness projection : **250/250** ;
- rollback : disponible, **non requis** ;
- Registry/policy : inchangés.

LSF après write : **1 414 total / 349 fresh-confirmed / 1 065 seed-only / 250 public_sitemap_presence**.

## Sources en attente

- Promo Immo : `BLOCKED_EXTERNAL_SOURCE` — DNS/source directe ; ne pas contourner.
- Dar Agadir : `BLOCKED_SOURCE_DRIFT` — robots ne déclare plus le sitemap historique ; ne pas réutiliser une preuve ancienne comme preuve live.

## Prochain DATA

Après merge/closeout de #435 : **DATA-4.7C — Residual Reservoir Requalification**, read-only. Revalider le résiduel LSF (103 candidates seulement dans la preuve pré-write, donc chiffre à recalculer) et le comparer au prochain réservoir admissible, Aykana en premier candidat. Aucun second write automatique.

## Autres lanes

- UX/Search : convergence BENCHMARK-SERP-1 et lots Search majeurs certifiés ; Search reste canonique.
- UX/Carte : P1B.8 ✅ ; prochain lot carte documenté = P1B.9 Tier A Registry Candidate Review ; Offre quartier reste OFF.

## Invariants

No-bypass ; Source Registry autoritaire ; provenance réelle ; Search canonique ; aucune donnée/géométrie inventée ; une responsabilité/branche/PR/merge par LOT ; rollback avant mutation ; exact-head CI verte avant write ; mise à jour README/ROADMAP/SESSION au closeout.
