# AkarFinder — Session courante

**Mise à jour : 2026-08-08**  
**Lane DATA : DATA-4.4B 🔴 Promo Immo Marrakech Source Revalidation + Canary 50**  
**Lot DATA acquis : DATA-4.4A ✅ PR #379, merge `43d8086c`**  
**Lot UX acquis : P1B.2 — Sourced Territorial Intelligence ✅ PR #376 — 9,2/10**  
**Prochain UX : audit des métriques territoriales avant définition du prochain lot canonique**

Ce fichier est le handover opérationnel court. `docs/ROADMAP.md` reste l’unique roadmap canonique.

# Main canonique

Acquis récents :

- DATA-4.3H certification finale ✅ PR #377 — Dar Agadir 500/500, Search 500/500, display 500/500, drift 0 % ;
- DATA-4.4A ✅ PR #379, merge `43d8086c` — scorer déterministe + audit Supabase live read-only, Promo Immo Marrakech sélectionné `PREFERRED_PENDING_REVALIDATION`, 0 write ;
- P1A.5 ✅ PR #365, **9,3/10** ;
- P1A.6 ✅ PR #369, **9,2/10** ;
- P1B.1 ✅ PR #371, **9,1/10** ;
- P1B.2 ✅ PR #376, **9,2/10**.

Invariants : no-bypass, capability ≠ permission, Source Registry avant activation, volume technique ≠ inventaire public, Search canonique, Map complément spatial, Geo Registry unique source de vérité.

# UX — état courant

P1B.2 est acquis avec `layer=price`, benchmarks quartier exacts uniquement, aucune interpolation/fallback ville, audit final 430/768/1280 sans finding. Le prochain lot UX reste conditionné à un audit préalable des métriques territoriales réelles : offre, fraîcheur, confiance DATA et extension des prix exacts.

# DATA — DATA-4.3H ✅ CERTIFIÉ À 500

Dar Agadir reste fermé au cap :

- total : **6 533** ;
- `fresh_confirmed` : **605** ;
- `seed_only` : **5 928** ;
- cohorte contrôlée : **500/500** ;
- Public Search : **500/500** ;
- technical display : **500/500** ;
- drift : **0 %** ;
- Registry inchangé.

# DATA — DATA-4.4A ✅ Second Reservoir Qualification

PR #379 a certifié, en lecture seule, le classement suivant :

| Source | Total | Normalized OK | Technical display | Fresh | Seed only | Review |
|---|---:|---:|---:|---:|---:|---|
| `promoimmomarrakech.com` | **3 005** | **3 000** | **2 923** | 9 | **2 996** | due_soon |
| `limmobiliersansfrontieres.com` | 1 414 | 563 | 573 | 94 | 1 320 | due_soon |
| `atlasimmobilier.com` | 793 | 414 | 420 | 2 | 791 | due_soon |
| `aykana.ma` | 647 | 467 | 472 | 62 | 585 | due_soon |

Décision : **Promo Immo Marrakech = `PREFERRED_PENDING_REVALIDATION`**. Qualification ≠ activation.

# DATA — DATA-4.4B 🔴 ACTUEL

Objectif : revalider Promo Immo depuis les signaux publics actuels et produire un canary exact de **50**, rollbackable, sans write dans le PR.

Contrat du dry-run :

1. Registry exact + review `current|due_soon` + TTL 14 j ;
2. `robots.txt` live et sitemap same-origin uniquement ;
3. population sitemap actuelle et intersection normalized ;
4. canary seulement `seed_only`, normalized, **Marrakech**, type/intention présents ;
5. quality tier **A/B** uniquement ; C et non-Marrakech audités mais exclus ;
6. 50/50 déjà dans Public Search et technical display avant mutation ;
7. collisions cross-source exactes exclues ; aucun fuzzy-match inventé ;
8. contrôle Property Graph pour les liens existants ; cluster multi-membre connu = blocage ;
9. manifests apply/rollback exacts **50/50** ;
10. aucune mutation Registry/policy/freshness, aucun detail-page fetch, aucune réutilisation contenu/image en CI.

Run id proposé : `data-4-4b-promoimmo-canary-50-v1`.

Après merge du dry-run uniquement, le write éventuel devra être transactionnel **50/50**, avec preflight exact, Search/display avant→après, drift ≤1 % et rollback immédiat sur anomalie.

Aucun passage à 100 ou 500 n’est autorisé avant certification persistante de ces 50.

# Business parallèle

**Agenz = priorité partenariat/feed** : hidden/internal-only tant qu’aucune autorisation écrite n’autorise une évolution Registry/produit.
