# AkarFinder — Session courante

**Mise à jour : 2026-08-07**  
**Lot DATA acquis : DATA-4.3E — First Bounded Freshness Write Canary ✅ PR #355**  
**Prochain lot DATA : DATA-4.3F — Controlled Promotion Design**  
**Lot UX acquis : CARTE-QUARTIER-P1A.3 ✅ PR #349**  
**Prochain UX : CARTE-QUARTIER-P1A.4 — Map Design System**

# Main canonique

Acquis DATA récents : #341 → #343 → #344 → #347 → #348 → #351 → #353 → **#355**.

Invariants : no-bypass ; capability ≠ permission ; Source Registry avant activation ; volume technique ≠ inventaire public ; Search reste canonique.

# DATA-4.3E — résultat certifié

PR #355 : **20/20 gates verts**.

Dry-run CI :

- pool seed-only éligible : **5 564** ;
- canary déterministe : **10 URLs** ;
- canal : `public_sitemap_presence` ;
- TTL : **14 jours** ;
- apply/rollback manifests : 10/10 ;
- 10 source requests ;
- 0 DB/freshness write en PR ;
- 0 policy/display change ;
- 0 détail/content reuse/activation.

Rehearsal production après merge `41e2b57` :

1. préflight : **10/10** toujours `seed_only`, metadata attendue, Registry `public_sitemap_only → canonical_link_only → external_tail_link_only` ;
2. apply : **10/10** passées à `fresh_confirmed` avec canal `public_sitemap_presence` ;
3. verify : **10/10** exactement dans l’état proposé ;
4. rollback : **10/10** restaurées ;
5. post-rollback : **10/10 `seed_only`**, `fresh_last_seen_at=NULL`, `fresh_channels=[]`, metadata originale, aucune `freshness_evidence` ;
6. les **10 restent présentes dans `public_search_representations_v1` après rollback**, donc cette présence publique préexistait au write canary et n’a pas été créée par la promotion freshness.

Limite observée : `updated_at` a changé lors du rehearsal et n’était pas capturé dans le snapshot initial. La freshness/evidence est restaurée exactement, mais pas l’ancien timestamp d’audit. DATA-4.3F doit résoudre explicitement ce point.

# Prochain lot DATA — DATA-4.3F

## Controlled Promotion Design

Objectif : concevoir le passage d’un rehearsal 10-row à des batchs persistants bornés, sans promotion massive implicite.

À verrouiller :

- snapshot complet des colonnes mutables (`updated_at` inclus ou explicitement non rollbackable) ;
- batch size/plafond ;
- idempotence et préconditions exactes ;
- TTL 14 jours + aging/expiration ;
- observabilité applied/skipped/drifted/rolled-back ;
- vérification Search/display avant/après ;
- arrêt fail-closed sur drift Registry/robots/sitemap ;
- aucune modification de display policy dans le même lot ;
- aucune page détail/content reuse ;
- jamais 5 564 lignes en une seule opération.

Gate fondamentale : 4.3F prépare un **premier batch persistant séparé**. Il ne doit pas transformer tout le reservoir Dar Agadir en inventaire public d’un coup.

# Business parallèle

**Agenz = priorité partenariat/feed** : 4 490 normalized, 1 227 fresh, 1 146 decision-structured, hidden/internal-only.

# UX

Prochain : **P1A.4 — Map Design System**, audit visuel réel et score ≥9/10.
