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

Ordre de vérité :

`code mergé dans main → README.md → ROADMAP.md → SESSION.md → specs techniques → preuves historiques`.

## Doctrine

Pipeline :

`DISCOVERY → INGESTION/OBSERVATION → NORMALIZATION → CANONICALIZATION → FRESHNESS → DEDUPLICATION/CLUSTERING → ENRICHMENT → INTELLIGENCE → DISPLAY ELIGIBILITY → RANKING → PUBLICATION/SERP`

Principes non négociables :

- aucune donnée absente n’est inventée ;
- provenance et canonical URL restent explicables ;
- volume brut ≠ inventaire publiable ;
- robots/sitemap/capability ≠ permission ;
- no-bypass absolu ;
- Source Registry obligatoire avant activation ;
- `DISCOVERED ≠ AUDITED ≠ POLICY_ASSIGNED ≠ ELIGIBLE ≠ INGESTIBLE ≠ DISPLAYABLE` ;
- partner/autorisé ≠ public-indexed ≠ signal interne ;
- `Shadow → Canary → certification → activation bornée` pour les changements DATA/Search importants ;
- une responsabilité, une branche, une PR, un merge par lot.

## Architecture active

- Next.js 15 / React 19 / TypeScript / Tailwind ;
- Supabase PostgreSQL ;
- Vercel ;
- MapLibre GL ;
- Geo Registry canonique ;
- Source Registry v2 ;
- Observation/Freshness/quality/dedup pipeline ;
- CI GitHub Actions avec gates DATA, UX, accessibilité et build.

## État UX

- CARTE-QUARTIER-P1A.1 ✅ PR #328 — Geo Canonical Core, **9,5/10** ;
- P1A.2 ✅ PR #334 — `district` structuré dans Search ;
- P1A.3 ✅ PR #349 — Map state/navigation pilotés par URL, **9,3/10** ;
- P1A.4 ✅ PR #350 — Map Design System, cockpit flottant map-first ;
- P1A.5 ✅ PR #365 — Territorial Explorer **Maroc → ville → quartier**, navigation URL canonique, responsive **390 / 430×932 / 768 / 1280**, **9,3/10** ;
- P1A.6 ✅ PR #369 — Responsive hardening, audit natif **3 états × 4 viewports = 12 captures / 0 finding**, chevauchement cockpit↔explorer corrigé, **21/21 tests**, TypeScript/build/gates verts, **9,2/10** ;
- P1B.1 ✅ PR #371 — **AkarFinder Map Visual Layer** : basemap générique fortement atténuée, 16 arrondissements Casablanca issus du dataset OSM shadow rendus en preview-canary avec palette territoriale différenciée, contours/labels AkarFinder, couleurs explicitement non sémantiques, audit natif **430 / 768 / 1280 = 3 captures / 0 finding**, **21/21 tests**, TypeScript/build/tous gates verts, contrôle humain **9,1/10** ;
- P1B.2 ✅ PR #376 — **Sourced Territorial Intelligence** : état URL `layer=price`, benchmarks exacts quartier pour appartement/achat seulement, médiane + fourchette + échantillon + confiance + période visibles, aucun fallback ville présenté comme prix quartier, aucune interpolation/heatmap vers les polygones, audit final **430 / 768 / 1280 = 3 captures / 0 finding**, tous les workflows du head verts, contrôle humain **9,2/10** ;
- prochain UX : auditer les métriques territoriales réellement disponibles avant de définir le prochain lot canonique ; aucune couche offre/fraîcheur/confiance ne sera ajoutée sans granularité et provenance certifiables.

## État DATA acquis

### DATA-1 — Census / Registry ✅

- réserve B3 : **37 009 URLs / 7 051 domaines** ;
- Common Crawl : **300/300 Parquet**, **8 727 registered domains** ;
- univers réconcilié : **15 238 domaines** ;
- 230 `PRIMARY_SOURCE_CANDIDATE` ;
- 625 `PORTAL_CANDIDATE` ;
- DATA-1.5 → DATA-1.6B : capability + policy + Registry, **0 activation non autorisée**.

### DATA-4 — Reservoir Strategy

- DATA-4.0 ✅ PR #341 : Avito + Mubawab = **35 134 normalized**, **3 588 technical display**, **0 policy-activable** ;
- DATA-4.1A ✅ PR #343 : Avito `unavailable` = 95,06 % bruit/non-immobilier ; seulement **73** core-récupérables ;
- DATA-4.2 ✅ PR #344 : `daragadir.com` gagne la lane `ADMISSIBLE_GROWTH`, `agenz.ma` la lane `PARTNERSHIP_UPSIDE` ;
- DATA-4.3A → H ✅ PR #347/#348/#351/#353/#355/#358/#362/#364, puis durcissements #372/#373/#375 : Dar Agadir a atteint le cap contrôlé de **500 lignes persistantes certifiées** selon le plan `50+100+100+100+100+50`, batch max **100/run**, TTL **14 jours**, snapshots/rollbacks et revalidation Registry+sitemap avant chaque batch ;
- certification finale DATA-4.3H : **6 533 lignes totales**, **605 fresh_confirmed**, **5 928 seed_only**, **502** lignes globales avec `public_sitemap_presence`, cohorte contrôlée **500/500**, Public Search **500/500**, technical display **500/500**, **0 % drift**, Registry inchangé, aucun rollback nécessaire ;
- DATA-4.3I ✅ PR #367 : ownership fraîcheur multi-canal protégé ; OpenSERP/Yandex ne peut plus effacer/dégrader un canal tiers tel que `public_sitemap_presence` ;
- DATA-4.3J ✅ PR #368 : ordre du trigger display corrigé (`zzz_thin_index_display_policy_write`) pour calculer l’éligibilité après quality/purity ; migration-only, pas de changement de policy function ni backfill.

## Décision DATA courante

**DATA-4.3H est fermé au cap 500.** Aucune promotion supplémentaire Dar Agadir n’est autorisée par ce lot. Toute extension au-delà de 500 doit être définie comme une nouvelle décision DATA dans `docs/ROADMAP.md`, avec nouvelle certification bornée ; aucun bypass du cap n’est permis.

En parallèle business : **Agenz = priorité partenariat/feed**, sans changement Registry ou produit avant autorisation écrite.

## Règles d’exécution

Un lot n’est terminé que si : scope respecté, tests/build/gates verts, preuves disponibles, Registry respecté, aucun bypass, PR mergée, production vérifiée si write, rollback disponible si mutation, et les 3 MD canoniques alignés.

## Démarrage local

```bash
npm ci
npm run build
npm test
npm run dev
```

Partir de `.env.local.example`. Ne jamais committer de secret ni utiliser une service-role côté client.
