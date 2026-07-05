# SEO Roadmap AkarFinder

Mission : ROADMAP-SEARCH-VOLUME-SEO-ALIGNMENT-1 (2026-07-05)
Objectif SEO : attirer l'utilisateur avant qu'il contacte les portails
classiques — uniquement via des pages utiles, éditoriales et honnêtes.

## Principes

1. **Indexer les pages utiles uniquement**
   - accueil, /acheter, /louer, /neuf, /pro
   - guides et pages éditoriales
   - pages villes et pages quartiers
   - pages partenaires autorisées (quand elles existeront en live)
   - /profil-recherche (outil réel, indexable)

2. **Ne jamais indexer la démo**
   - /demo/* reste noindex/nofollow (déjà en place, à préserver dans
     chaque nouvelle page demo)

3. **Ne jamais indexer de fausse annonce**
   - aucune page listing interne pour un résultat web externe
   - /listings/137 doit rester 404 (vérifié : 404 en local, preview, prod)
   - aucune page générée qui simule une annonce inexistante

4. **Ne pas faire croire que les annonces externes appartiennent à AkarFinder**
   - les résultats Gateway restent des aperçus limités avec lien source
     originale ; ils ne produisent aucune URL interne indexable
   - l'attribution source reste visible

## Pages indexables (cible)

| Catégorie | Exemples | Statut |
| --- | --- | --- |
| Cœur produit | /, /acheter, /louer, /neuf, /pro, /profil-recherche | indexables aujourd'hui |
| Villes × intention | acheter appartement Casablanca, louer appartement Rabat, programme neuf Bouskoura | à créer (SEO-CITY-INTENT-PAGES-1) |
| Quartiers | guide quartiers Casablanca, guide quartiers Rabat | existants partiellement (/quartiers/*), à enrichir (SEO-NEIGHBORHOOD-GUIDES-1) |
| Guides | immobilier pour MRE, frais achat immobilier Maroc, crédit immobilier Maroc, checklist visite appartement | à créer |
| Partenaires | pages partenaires autorisées | après activation partenaires live |

## Pages noindex (verrouillées)

- /demo et toutes les sous-routes /demo/*
- toute future page de prévisualisation ou de test
- aucune SERP interne paramétrée indexable en masse (pas de spam
  d'URLs /search?q=... dans le sitemap)

## Structured data

Autorisée (prudente) :
- Organization, WebSite (accueil)
- BreadcrumbList (navigation)
- FAQPage pour les guides — uniquement si le contenu FAQ est réel
- RealEstateListing **uniquement** pour les fiches partenaires autorisées

Interdite :
- RealEstateListing sur un résultat Gateway externe (l'annonce ne nous
  appartient pas)
- tout markup laissant croire à un inventaire propre exhaustif
- AggregateRating / avis inventés

## Fondations techniques (SEO-FOUNDATION-1, 80% → 83%)

- titles/meta uniques et descriptifs par page
- canonical propres (pas de duplication paramétrée)
- sitemap.xml limité aux pages utiles indexables
- robots.txt cohérent avec la politique noindex
- OpenGraph/Twitter cards sur les pages cœur
- structured data safe (liste ci-dessus)
- audit des pages actuellement indexables pour vérifier qu'aucune page
  demo/préversion ne fuit

## Stratégie pages villes × intention (SEO-CITY-INTENT-PAGES-1, 83% → 87%)

- pages éditoriales + moteur de recherche intégré, jamais de fausses pages
  d'annonces
- contenu par page : repères de prix indicatifs, quartiers pertinents,
  points à vérifier, lien vers la recherche pré-filtrée, CTA profil de
  recherche
- exemples cibles : acheter appartement Casablanca, louer appartement
  Rabat, programme neuf Casablanca/Bouskoura, immobilier Marrakech
- vocabulaire conforme : repères indicatifs, couverture progressive,
  source originale ; jamais "toutes les annonces" ni "annonces vérifiées"

## Stratégie guides quartiers (SEO-NEIGHBORHOOD-GUIDES-1, 87% → 90%)

- adaptés au Maroc : prix indicatifs, mobilité, écoles, mosquées, services,
  style de vie, points à vérifier, recherche liée
- s'appuyer sur l'existant /quartiers/[citySlug]/[neighborhoodSlug]
  (17 pages déjà générées) et l'enrichir
- chaque guide relie vers la recherche et le profil de recherche

## Risques

- Sur-indexation de pages minces → pénalité qualité : ne publier une page
  ville/quartier que si elle a du contenu réel.
- Confusion annonce externe / contenu propre → strictement interdit par la
  doctrine, verrouillé par l'absence de page détail interne pour l'externe.
- Wording : aucun superlatif interdit dans les meta/titles (pas de
  "meilleur", "vérifié", "officiel", etc.).
- Cannibalisation : les pages ville × intention doivent pointer vers
  /search avec paramètres, pas dupliquer la SERP.
