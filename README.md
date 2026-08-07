# AkarFinder

AkarFinder est un **moteur de recherche immobilier, un index national et une couche d’intelligence pour le marché marocain**.

- Produit public : <https://akarfinder.vercel.app>
- Cœur produit : `/search`
- Branche canonique : `main`
- Objectif long terme : **Property Graph du marché immobilier marocain**

## Documentation canonique

Le projet possède exactement trois documents de pilotage :

1. `README.md` — identité, doctrine et architecture ;
2. `docs/ROADMAP.md` — priorités et ordre d’exécution ;
3. `docs/SESSION.md` — état opérationnel courant.

Ordre de vérité :

`code mergé dans main → README.md → ROADMAP.md → SESSION.md → specs techniques → preuves historiques`.

## Doctrine produit

AkarFinder est **search-first / intelligence-first**. `/search` reste le moteur canonique. `/map` est son complément spatial et doit partager la même identité géographique canonique.

Pipeline :

`DISCOVERY → INGESTION/OBSERVATION → NORMALIZATION → CANONICALIZATION → FRESHNESS → DEDUPLICATION/CLUSTERING → ENRICHMENT → INTELLIGENCE → DISPLAY ELIGIBILITY → RANKING → PUBLICATION/SERP`

Principes :

- aucune donnée absente n’est inventée ;
- une annonce est une observation de source, pas automatiquement une propriété unique ;
- provenance et canonical URL restent explicables ;
- volume brut ≠ inventaire publiable ;
- scores fiabilité/prix/complétude restent séparés ;
- aucune source n’est appelée partenaire sans preuve ;
- aucune image/contact/coordonnée n’est réutilisée sans droit établi ;
- changements DATA/Search importants : `Shadow → Canary → certification → activation bornée` ;
- aucune géométrie ou proximité fabriquée.

## Doctrine d’acquisition

Doctrine **no-bypass absolue** :

- pas de stealth/proxy furtif/faux Googlebot/CAPTCHA solve ;
- pas de bypass login/rate-limit/restriction technique ;
- robots/sitemap = signaux techniques, jamais licence ;
- capability technique ≠ permission ;
- privacy policy ≠ CGU ≠ permission ;
- Source Registry obligatoire avant activation ;
- `DISCOVERED ≠ AUDITED ≠ POLICY_ASSIGNED ≠ ELIGIBLE ≠ INGESTIBLE ≠ DISPLAYABLE` ;
- contenu partenaire/autorisé ≠ résultat public indexé ≠ signal marché interne.

## Architecture active

- Next.js 15, React 19, TypeScript, Tailwind ;
- Supabase PostgreSQL ;
- Vercel ;
- MapLibre GL ;
- Geo Registry canonique ;
- migrations SQL versionnées ;
- CI GitHub Actions avec tests/build/gates DATA/UX/accessibilité.

## État UX acquis

- CARTE-QUARTIER-P1A.1 / PR #328 : Geo Canonical Core, score **9,5/10** ;
- CARTE-QUARTIER-P1A.2 / PR #334 : `district` structuré dans Search avec routing fail-closed ;
- CARTE-QUARTIER-P1A.3 / PR #349 : état Map piloté par URL, `city + district + layer=explore`, Back/Forward, continuité Search ↔ Map ↔ Quartier et `project_id`, score contractuel **9,3/10** ;
- prochain UX : **P1A.4 — Map Design System**.

## État DATA acquis

### DATA-1 — Web Census / Registry ✅

- réserve B3 : **37 009 URLs / 7 051 domaines** ;
- Common Crawl : **300/300 Parquet**, **8 727 registered domains** ;
- univers réconcilié : **15 238 domaines** ;
- `PRIMARY_SOURCE_CANDIDATE` : **230** ;
- `PORTAL_CANDIDATE` : **625** ;
- DATA-1.5 : 20 domaines P0 audités techniquement, 19 review-ready, score **9,4/10** ;
- DATA-1.6A : 19 policy reviews, score **9,5/10** ;
- DATA-1.6B : 19 lignes Registry appliquées, **0 source activée**, score **9,6/10**.

### DATA-4.0 — Large Reservoir Baseline ✅ PR #341

Avito + Mubawab : **35 134 normalized**, **3 588 technical display**, **0 policy-activable**.

### DATA-4.1A — Avito Internal Recovery Audit ✅ PR #343

Sur 22 227 Avito `unavailable`, seulement **73** lignes combinent type compatible + intent + geo ; prix/surface absents et **0 policy-activable**. Décision : pas de Shadow Recovery Avito maintenant.

### DATA-4.2 — Reservoir Prioritization ✅ PR #344

- gagnant `ADMISSIBLE_GROWTH` : **daragadir.com**, score 71,75 ;
- gagnant `PARTNERSHIP_UPSIDE` : **agenz.ma**, score 58,93 ;
- 0 write / 0 policy change / 0 activation.

### DATA-4.3A — Dar Agadir Canonical-Link Shadow ✅ PR #347

Sur **6 533** lignes : **5 `ELIGIBLE_SHADOW`**, **6 425 `SEED_ONLY_REVALIDATION_REQUIRED`**, 46 non normalisées, 57 insuffisamment structurées, 0 duplicate, 0 policy blocked. Aucun fetch ni write.

### DATA-4.3B — Dar Agadir Sitemap Revalidation ✅ PR #348

Revalidation live bornée via `public_sitemap` uniquement : robots/sitemaps same-origin, maximum 40 requêtes, aucune page détail, aucun content reuse, aucun write freshness/DB, aucune policy modifiée et aucune activation. La présence sitemap reste un signal distinct de la fraîcheur.

## Prochaine décision DATA

Lire la preuve DATA-4.3B puis, seulement si elle le justifie, concevoir un **freshness shadow/write séparé et borné**. Sinon passer au réservoir admissible suivant. En parallèle business : **Agenz = priorité partenariat/feed**, sans changement de comportement produit avant autorisation écrite.

## Règles d’exécution

Chaque lot :

- une responsabilité ;
- une branche ;
- une PR ;
- un merge ;
- migrations séparées du code applicatif ;
- tests et preuves avant merge ;
- aucun contournement temporaire présenté comme final ;
- double-check après chaque étape UX/UI ;
- score UX/UI minimum **9,0/10** ;
- fin de lot : `README.md`, `docs/ROADMAP.md`, `docs/SESSION.md` relus et alignés.

## Démarrage local

```bash
npm ci
npm run build
npm test
npm run dev
```

Variables : partir de `.env.local.example`. Ne jamais committer de secret ni utiliser une service-role côté client.