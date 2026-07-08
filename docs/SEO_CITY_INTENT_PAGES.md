# SEO-CITY-INTENT-PAGES-1 — Moteur de recherche par ville

**Version:** 2026-07-08  
**Status:** Preview/Code  
**Roadmap:** 90%→93% (if production validated)

## 1. Objectif SEO

Créer des pages SEO publiques indexables par ville pour positionner AkarFinder comme **moteur de recherche immobilier au Maroc**, pas comme marketplace, pas comme source exhaustive, pas comme source officielle.

Routes créées V1 :
- `/immobilier` (landing)
- `/immobilier/casablanca`
- `/immobilier/rabat`
- `/immobilier/marrakech`
- `/immobilier/tanger`
- `/immobilier/agadir`

Routes intentionnelles (V2, non incluses V1) :
- `/immobilier/[city]/acheter` (optionnel)
- `/immobilier/[city]/louer` (optionnel)

## 2. Pourquoi pages limitées en V1

Stratégie :

```
5 pages ville solides > 50 pages faibles
```

Raison : Contenu mince (thin content) tue l'autorité SEO. Mieux valoir 5 pages convaincantes et pérennes qu'une usine à pages fragiles.

V2 expandable : une fois V1 validé en production, ajouter progressivement intentions (acheter/louer) et quartiers si contenu reste non-promissif et non-dupliqué.

## 3. Wording autorisé

Pages SEO utilisent seulement :

- Moteur de recherche immobilier
- Résultats immobiliers publics
- Source originale
- Vérifier sur la source originale
- Aperçu limité
- Explorer les annonces
- Comparer les sources
- Recherche immobilière au Maroc

## 4. Wording interdit

Jamais dans le contenu public des pages SEO :

- Toutes les annonces
- Annonces vérifiées
- Annonces fiables
- Annonces certifiées
- Prix officiel
- Prix réel
- Prix de marché
- Meilleur prix
- Bon plan garanti
- Disponible confirmé
- Source certifiée
- Marketplace

## 5. Doctrine Gateway préservée

Ces pages SEO :

- ✅ Ne modifient pas le ranking Search Gateway
- ✅ Ne modifient pas le cache Gateway
- ✅ N'appellent pas Serper directement
- ✅ Linken uniquement vers `/search?q=...` (pré-remplie)
- ✅ N'exposent pas value_low/value_median/value_high
- ✅ N'exposent pas evidence_ref ou source_registry
- ✅ Ne créent pas de pages /listings internes
- ✅ Ne font pas de vérifications d'annonces

## 6. Sitemap

Pages ajoutées à `app/sitemap.ts` :

```
/immobilier
/immobilier/casablanca
/immobilier/rabat
/immobilier/marrakech
/immobilier/tanger
/immobilier/agadir
```

Routes exclues intentionnellement :
- `/search` (noindex, contenu dynamique dupliqué par querystring)
- `/demo/*` (noindex,nofollow, pages mockup partenaire)
- `/listings/***` (404 par doctrine)

## 7. Robots / Canonical

Pages SEO :
- `robots: index,follow`
- `canonical: https://akarfinder.vercel.app/immobilier/[city]`

Préservé :
- `/search` : noindex
- `/demo/*` : noindex,nofollow
- `/robots.txt` : 200 OK (auto-generated via API)

## 8. JSON-LD utilisé

Chaque page ville inclut :

```json
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Immobilier à Casablanca",
  "description": "Explorez des résultats immobiliers publics...",
  "url": "https://akarfinder.vercel.app/immobilier/casablanca"
}
```

**Pas de** :
- RealEstateListing schema (reserved for Gateway)
- AggregateOffer
- Offer
- priceRange officiel
- review/rating inventé

## 9. Données utilisées

Contrôlées via `lib/seo-city-pages/city-seo-data.ts` :

```ts
export const CITY_METADATA: Record<string, CityMetadata> = {
  casablanca: {
    slug: "casablanca",
    displayName: "Casablanca",
    description: "AkarFinder aide à explorer des résultats...",
    neighborhoods: ["Anfa", "Maarif", ...],
    popularSearches: ["appartement Casablanca", ...],
  },
  // ... 4 autres villes
};
```

Toutes les données sont **statiques et maintenables**. Pas de génération Serper au build.

## 10. Données interdites

Jamais exposées sur pages SEO :

- `value_low`, `value_median`, `value_high` (dataset marché interne)
- `evidence_ref` (source provenance)
- `source_registry` (registre interne)
- `internal/manual-review` ou `internal/portal-review` (flags internes)
- Prix du dataset de référence
- Scores d'annonce internes

Validé par `assertSeoCityPageSafety()` et `assertNoSerperInSeoPages()` au test.

## 11. Limites V1

- Pas d'intention pages en V1 (acheter/louer séparés)
- Pas de quartiers linkés en V1
- Pas de pagination
- Pas de facettes/filtres
- Pas de prix affichés
- Pas de nombres de listings
- Pas de contenu généré par IA (statique uniquement)
- Pas d'appels API au build (contenu pré-défini)

Raison : Garder le scope étroit, éprouver le modèle en production, puis expandre.

## 12. Tests

`scripts/scrapers/__tests__/seo-city-pages.test.ts` (14 tests) :

```bash
npm test
```

Couvre :

- Validation des slugs
- Génération de métadonnées non-promissive
- Absence de wording interdit
- Absence d'appels Serper
- Absence d'exposition dataset
- Génération des queries de recherche

Tous les tests passent (1437/1437).

## 13. Build & Sitemap

Le build génère 6 pages SEO :

```bash
npm run build
→ routes /immobilier, /immobilier/[city] et 4 autres
→ app/sitemap.ts génère URLs sitemap
→ next.js exécute generateStaticParams et prerender pages
```

Vérification :

```bash
npm run build 2>&1 | grep -E "^●|^ƒ" | grep immobilier
```

Expected : Pages statiques (●) ou SSG.

## 14. Next Steps

- **Preview** : `vercel deploy` (test routes, métadonnées, no Serper calls)
- **Production GO** : Attendre GO explicite avant `vercel deploy --prod`
- **V2** : Ajouter `/immobilier/[city]/acheter` et `/immobilier/[city]/louer` si V1 validé
- **V3** : Ajouter quartiers si contenu reste non-promissif

Après production validée : **90% → 93%**  
Next mission : **SEO-NEIGHBORHOOD-GUIDES-1** (93% → 95%)
