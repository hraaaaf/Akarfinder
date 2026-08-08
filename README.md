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
- P1A.5 ✅ PR #365 — Territorial Explorer **Maroc → ville → quartier**, **9,3/10** ;
- P1A.6 ✅ PR #369 — Responsive hardening, **12 captures / 0 finding**, **9,2/10** ;
- P1B.1 ✅ PR #371 — AkarFinder Map Visual Layer, **3 captures / 0 finding**, **9,1/10** ;
- prochain UX : **P1B.2 — couches d’intelligence territoriale sourcées**.

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
- DATA-4.3A → H ✅ jusqu’à PR #377 : Dar Agadir certifié au cap **500**, plan `50+100+100+100+100+50`, TTL **14 jours**, Search **500/500**, technical display **500/500**, drift **0 %**, Registry inchangé ;
- DATA-4.3I ✅ PR #367 : ownership freshness multi-canal protégé ;
- DATA-4.3J ✅ PR #368 : ordre du trigger display corrigé.

### DATA-4.4 — Second Reservoir Expansion 🔴

**DATA-4.4A — qualification read-only du second réservoir.**

Snapshot actuel des candidats sitemap/canonical-link :

- `promoimmomarrakech.com` : **3 005** lignes, **3 000** normalized OK, **2 923** technical display, **2 996 seed_only** ;
- `limmobiliersansfrontieres.com` : 1 414 lignes ;
- `atlasimmobilier.com` : 793 lignes ;
- `aykana.ma` : 647 lignes.

Décision déterministe actuelle : **`promoimmomarrakech.com` = `PREFERRED_PENDING_REVALIDATION`**.

Cette qualification **n’autorise aucun write**. Le prochain sous-lot est **DATA-4.4B — Source Revalidation + Canary 50** : Registry + robots/sitemap + qualité + dedup + Search/display + rollback, puis seulement un premier batch persistant **≤50** si tous les gates sont verts.

## Décision DATA courante

**DATA-4.3H reste fermé à 500. DATA-4.4A sélectionne le second réservoir sans activation.** Aucun passage direct à 100/500 sur Promo Immo Marrakech n’est autorisé avant certification du canary 50 de DATA-4.4B.

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
