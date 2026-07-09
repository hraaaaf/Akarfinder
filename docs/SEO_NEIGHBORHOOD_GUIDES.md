# SEO Neighborhood Guides — SEO-NEIGHBORHOOD-GUIDES-1

## 1. Objectif SEO quartier

Créer des pages quartier utiles pour Google et pour l'utilisateur :
- Expliquer comment rechercher dans un quartier
- Guider vers les bons CTA `/search`
- Présenter les types de biens recherchables
- Lier ville ↔ quartiers (maillage interne)
- Renforcer le référencement SEO local

## 2. Pages créées

11 pages quartier V1 :

| Route | Quartier | Ville |
|-------|----------|-------|
| /immobilier/casablanca/maarif | Maârif | Casablanca |
| /immobilier/casablanca/racine | Racine | Casablanca |
| /immobilier/casablanca/ain-diab | Aïn Diab | Casablanca |
| /immobilier/casablanca/bourgogne | Bourgogne | Casablanca |
| /immobilier/rabat/agdal | Agdal | Rabat |
| /immobilier/rabat/souissi | Souissi | Rabat |
| /immobilier/rabat/hay-riad | Hay Riad | Rabat |
| /immobilier/marrakech/gueliz | Guéliz | Marrakech |
| /immobilier/marrakech/hivernage | Hivernage | Marrakech |
| /immobilier/tanger/malabata | Malabata | Tanger |
| /immobilier/agadir/founty | Founty | Agadir |

## 3. Pourquoi volume limité en V1

Mieux vaut 11 pages propres, utiles et prudentes que 100 pages faibles.
Chaque page contient du contenu statique unique, pas de contenu généré dynamiquement.

## 4. Wording autorisé

- Moteur de recherche immobilier
- Résultats immobiliers publics
- Source originale
- Vérifier sur la source originale
- Aperçu limité
- Explorer les annonces
- Comparer les sources
- Recherche immobilière au Maroc
- Quartier recherché
- Zone de recherche
- Résultats liés à ce quartier

## 5. Wording interdit

- Marketplace
- Toutes les annonces / Meilleures annonces
- Annonces vérifiées / Annonces fiables
- Prix officiel / Prix réel / Prix de marché / Meilleur prix
- Bon plan garanti / Disponible confirmé / Source certifiée
- Quartier sûr / Quartier dangereux / Quartier riche / Quartier pauvre
- Investissement garanti / Rentable garanti
- Sous le marché / Au-dessus du marché

## 6. Doctrine Gateway

- Aucun appel Serper/Gateway au chargement des pages SEO quartier
- Les CTA pointent uniquement vers `/search?q=...`
- Le clic utilisateur déclenche la recherche existante via `/search`
- Gateway, cache, Supabase : intacts et non modifiés

## 7. Sitemap

- `/sitemap.xml` inclut les 11 pages quartier
- `/sitemap.xml` inclut toujours les 6 pages SEO ville
- `/search` exclu
- `/demo/*` exclu
- `/listings/*` exclu

## 8. Robots / Canonical

- Pages quartier : `index: true, follow: true`
- Canonical unique par page : `https://akarfinder.vercel.app/immobilier/[city]/[district]`
- `/demo/*` reste `noindex, nofollow`
- `/search` reste exclu/noindex

## 9. JSON-LD utilisé

- **BreadcrumbList** : Immobilier → Ville → Quartier
- **WebPage** : nom, description, URL, isPartOf WebSite AkarFinder

Non ajouté :
- RealEstateListing
- Offer / AggregateOffer
- priceRange
- review/rating

## 10. Données utilisées

Données statiques contrôlées dans `lib/seo-neighborhood-pages/neighborhood-seo-data.ts` :
- Nom du quartier
- Ville associée
- Types de biens recherchables
- Quartiers voisins (liens internes)
- Description prudente

## 11. Données interdites

- value_low / value_median / value_high
- evidence_ref / source_registry
- Dataset interne de prix
- Contenu généré depuis Serper

## 12. Limites V1

- 11 quartiers seulement
- Pas de contenu dynamique
- Pas de données de prix
- Pas de reviews/ratings
- Pas de photos de quartier
- Pas de données de proximité avancées

## 13. Tests

22 tests dédiés dans `scripts/scrapers/__tests__/seo-neighborhood-pages.test.ts` :
- Validation slugs ville/quartier
- Mismatched city+district → null
- Invalid district → null
- Metadata title/description/canonical
- Safety checks (wording interdit, data exposure, Serper calls)
- CTA search generation
- Contenu unique par quartier
- nearbyDistricts validity

## 14. Prochaines étapes

- V2 : ajouter plus de quartiers si V1 performant en SEO
- Envisager données de proximité (écoles, transports) si pertinent
- PUBLIC-WORDING-CLEANUP-1 pour dette existante
- PRICE-POSITION-REFERENCE-V2 (95% → 96.5%)
