# AkarFinder

AkarFinder est un **moteur de recherche immobilier, un index national et une couche d’intelligence pour le marché marocain**.

- Produit public : <https://akarfinder.vercel.app>
- Cœur produit : `/search`
- Branche canonique : `main`
- Objectif long terme : **Property Graph du marché immobilier marocain**

## Documentation canonique

1. `README.md` — identité, doctrine, architecture et état macro ;
2. `docs/ROADMAP.md` — ordre d’exécution ;
3. `docs/SESSION.md` — handover opérationnel court.

Ordre de vérité : `code mergé → README → ROADMAP → SESSION → specs/preuves historiques`.

## Doctrine

Pipeline :
`DISCOVERY → INGESTION/OBSERVATION → NORMALIZATION → CANONICALIZATION → FRESHNESS → DEDUPLICATION → ENRICHMENT → INTELLIGENCE → DISPLAY ELIGIBILITY → RANKING → PUBLICATION/SERP`

Invariants : aucune donnée inventée ; provenance explicable ; volume brut ≠ inventaire publiable ; robots/sitemap/capability ≠ permission ; no-bypass absolu ; Source Registry obligatoire ; `Shadow → Canary → certification → activation bornée` ; un lot = une responsabilité/branche/PR/merge.

## Architecture active

Next.js 15 / React 19 / TypeScript / Tailwind ; Supabase PostgreSQL ; Vercel ; MapLibre GL ; Geo Registry ; Source Registry v2 ; pipeline Observation/Freshness/quality/dedup ; CI GitHub Actions.

## État UX

- P1A.1 ✅ PR #328 — Geo Canonical Core, 9,5/10 ;
- P1A.2 ✅ PR #334 — Search Geo Contract ;
- P1A.3 ✅ PR #349 — Map State & Navigation, 9,3/10 ;
- prochain : **P1A.4 — Map Design System**.

## État DATA acquis

- DATA-1 ✅ : census/Registry, 15 238 domaines, 230 primary-source candidates, 625 portal candidates ;
- DATA-4.0 ✅ PR #341 : Avito + Mubawab = 35 134 normalized, 3 588 technical display, 0 policy-activable ;
- DATA-4.1A ✅ PR #343 : Avito unavailable = 95,06 % bruit ; 73 core-récupérables, 0 policy-activable ;
- DATA-4.2 ✅ PR #344 : Dar Agadir gagne `ADMISSIBLE_GROWTH`, Agenz `PARTNERSHIP_UPSIDE` ;
- DATA-4.3A ✅ PR #347 : 5 `ELIGIBLE_SHADOW`, 6 425 revalidation-required ;
- DATA-4.3B ✅ PR #348 : 5 905 URLs sitemap, 5 673 seed-only encore présentes ;
- DATA-4.3C ✅ PR #351 : 5 566 `SHADOW_READY`, dont 5 564 seed-only ;
- DATA-4.3D ✅ PR #353 : 100-row reversible dry-run, `public_sitemap_presence`, TTL 14 jours, 100/100 rollback, 20/20 gates, 0 write/activation ;
- **DATA-4.3E ✅ PR #355** : premier write freshness production borné sur 10 URLs, 10/10 apply, 10/10 verify, 10/10 rollback, retour exact à `seed_only`/NULL/`[]`/metadata originale. Les 10 URLs restent dans `public_search_representations_v1` après rollback, donc cette présence publique préexistait au canary. Seule trace non restaurée : `updated_at`, ce qui est documenté.

## Décision DATA courante

**DATA-4.3F — Controlled Promotion Design** : définir comment promouvoir progressivement le signal `public_sitemap_presence` au-delà du canary, avec batchs bornés, TTL/expiration, rollback, observabilité et aucune activation publique implicite.

En parallèle business : **Agenz = priorité partenariat/feed**, sans changement Registry ou produit avant autorisation écrite.

## Règles d’exécution

Un lot n’est terminé que si : scope respecté, tests/build/gates verts, preuves disponibles, Registry respecté, aucun bypass, PR mergée, production vérifiée si write, rollback vérifié si mutation, et les 3 MD canoniques alignés.

## Démarrage local

```bash
npm ci
npm run build
npm test
npm run dev
```

Partir de `.env.local.example`. Ne jamais committer de secret ni utiliser une service-role côté client.
