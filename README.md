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
- prochain UX : **P1A.3 — Map State & Navigation**.

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

Avito + Mubawab :

- **35 134 normalized** ;
- **3 588 technical display** ;
- **0 policy-activable** ;
- Avito : **22 227 unavailable** ;
- Mubawab : gap public→normalized borné **95 738**, sans permission implicite de crawl.

### DATA-4.1A — Avito Internal Recovery Audit ✅ PR #343

Sur **22 227** Avito `unavailable` :

- immobilier canonique : **1 098** ;
- bruit/non-immobilier : **21 129 (95,06 %)** ;
- type catégorie-compatible : **804** ;
- type compatible + intent + geo : **73** ;
- evidence insuffisante : **1 025** ;
- prix : **0** ; surface : **0** ;
- policy-activable : **0**.

Décision : ne pas lancer maintenant un Shadow Recovery Avito pour seulement 73 lignes internes et non publiables.

### DATA-4.2 — Reservoir Prioritization ✅ PR #344

Preuve live paginée :

- **56 803** normalized evidence rows ;
- **22 426** display evidence rows ;
- **35** Registry rows ;
- **14** candidats ;
- DB writes / source requests / policy changes / public activations : **0**.

**Gagnant ADMISSIBLE_GROWTH : `daragadir.com`**

- 6 533 normalized ;
- 6 319 `city + property_type + intent` ;
- 6 528 technical display ;
- score **71,75** ;
- Registry : `public_sitemap_canonical_link / canonical_link_only / external_tail_link_only`.

**Gagnant PARTNERSHIP_UPSIDE : `agenz.ma`**

- 4 490 normalized ;
- 1 227 fresh ;
- 1 146 decision-structured ;
- score **58,93** ;
- Registry : `internal_signal_only / hidden`.

Un minimum de **500 lignes normalisées** est requis pour gagner la lane partenariat afin de privilégier les multiplicateurs capables d’aider réellement le passage vers 20K.

## Prochain lot DATA

**DATA-4.3A — Dar Agadir Bounded Canonical-Link Activation Audit**.

Objectif : mesurer ce qui peut être représenté utilement à partir des observations déjà détenues dans la frontière actuelle du Registry, sans fetch détail ni réutilisation de contenu.

`canonical_link_only` = lien sortant borné + provenance explicite, jamais fiche partenaire ni contenu réhébergé.

En parallèle business : **Agenz = priorité partenariat/feed**, sans changement de comportement produit avant autorisation écrite.

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