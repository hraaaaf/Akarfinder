# AkarFinder — Architecture technique

**Version : 2026-08-03**  
**Statut : architecture réelle de Production**

## 1. Principes

- Search-first : `/search` est le cœur produit.
- Provenance-first : chaque résultat garde sa source et son URL originale.
- Fail-closed : une preuve, une permission ou une configuration manquante bloque l’activation concernée.
- Legacy fallback : une évolution DATA/Search ne retire pas le chemin stable avant certification.
- Additif et réversible : migrations, flags et rollbacks sont privilégiés aux bascules irréversibles.
- No-bypass : aucun contournement d’accès, CAPTCHA, login, rate limit ou robots.

## 2. Stack active

### Application

- Next.js 15 App Router ;
- React 19 ;
- TypeScript ;
- Tailwind CSS ;
- composants serveur et client selon responsabilité ;
- Vercel pour build et exécution Production.

### Données

- Supabase PostgreSQL comme base canonique Production ;
- RLS et restrictions service-role sur les tables internes ;
- SQLite/PGlite uniquement pour développement, fixtures ou validation locale ;
- migrations SQL versionnées sous `supabase/migrations/`.

### Cartographie

- MapLibre GL ;
- données et couches séparées de la présentation ;
- aucun affichage géographique plus précis que la preuve disponible.

### Tests

- tests Node/TypeScript ;
- contrats SQL et migrations ;
- CI GitHub Actions ;
- Playwright pour parcours et rendu ;
- gates dédiés par LOT.

## 3. Surfaces publiques

- `/` — entrée produit ;
- `/acheter`, `/louer`, `/vendre` — hubs d’intention ;
- `/search` — SERP principale ;
- `/api/search` — contrat de recherche structuré ;
- `/api/search/gateway` — résultats externes indexés et read model public ;
- `/listings/[id]` — uniquement pour les contenus qui disposent d’un droit et d’un modèle interne compatibles ;
- pages professionnelles, profils et démonstrations selon leurs politiques d’indexation.

Les résultats externes limités redirigent vers la source originale et ne créent pas artificiellement une fiche interne complète.

## 4. Architecture Search

### 4.1 Chemin historique

`searchListings(query)` sert le modèle structuré historique à partir de `property_listings` et des projections associées.

Il reste le fallback lorsque :

- le Canary ODM ne sélectionne pas la requête ;
- une variable d’approbation manque ;
- le stop switch est actif ;
- le read model ODM échoue.

### 4.2 Read model ODM

`searchPublicRepresentations(...)` interroge la projection publique issue du Thin Index et des règles de qualité/display.

Le read model public applique notamment :

- vertical classification ;
- `document_kind=LISTING` ;
- display eligibility ;
- source attribution ;
- interdiction contacts/galerie ;
- retour vers l’URL originale ;
- pagination et curseurs stables.

### 4.3 Canary

Le contrôleur :

- calcule un bucket déterministe sur une clé stable de recherche ;
- exige `ODM_PUBLIC_CANARY_ENABLED=true` ;
- exige `ODM_PUBLIC_CANARY_APPROVED=true` ;
- respecte `ODM_PUBLIC_CANARY_STOP` ;
- refuse tout pourcentage absent, invalide ou supérieur au cap ;
- a un cap actuel de 10 % ;
- retombe sur le legacy en cas d’erreur.

`/search` et `/api/search` doivent construire la même requête canonique et la même clé stable. Cette parité est un invariant testé.

### 4.4 Dual-read

Le dual-read exécute ODM en arrière-plan après la réponse legacy pour mesurer divergences et latence sans modifier la réponse. Il est activé séparément et doit rester sans PII ni requête brute exploitable.

## 5. Architecture DATA

### 5.1 Discovery

Canaux possibles :

- sitemaps publics ;
- Common Crawl ;
- résultats publics indexés ;
- OpenSERP/Serper selon politique ;
- feeds partenaires ;
- imports agences/promoteurs ;
- sources autorisées ;
- Sakan Expo et première partie.

Discovery ne vaut pas autorisation de fetch, stockage, réutilisation ou publication.

### 5.2 Observation et Thin Index

- `source_offer_seeds` conserve les représentations découvertes ;
- `thin_index_search_documents` est une projection de recherche ;
- une ligne Thin Index est une représentation de source, pas une propriété unique ;
- les catégories, pages de recherche et URLs ambiguës sont classifiées séparément ;
- les éléments non immobiliers restent conservés pour audit mais sont inéligibles.

### 5.3 Modèle structuré historique

- `property_listings` ;
- `listing_sources` ;
- read models API ;
- scoring et display policy.

Ce modèle reste public tant que le read model ODM n’a pas atteint la parité et la profondeur requises.

### 5.4 Market Index et Property Graph

- `property_clusters` ;
- `property_cluster_members` ;
- `source_offer_observations` ;
- Observation Ledger ;
- Freshness/Lifecycle ;
- provenance et versions.

Un cluster ne devient jamais une certitude uniquement parce que plusieurs champs se ressemblent.

## 6. Source Registry

Chaque source possède des décisions indépendantes pour :

1. discovery ;
2. détail/fetch ;
3. extraction et stockage ;
4. réutilisation de contenu et images ;
5. affichage public ;
6. citation/redirection ;
7. fréquence et expiration ;
8. statut légal/opérationnel.

Statuts possibles : partenaire, autorisé, index public limité, signal interne, revue légale, bloqué.

## 7. Display Eligibility

La publication publique dépend de :

- domaine et source connus ;
- URL canonique valide ;
- vertical immobilier ;
- vraie page annonce ;
- fraîcheur compatible ;
- qualité minimale ;
- règles de contenu/image/contact ;
- absence de contradiction bloquante ;
- source originale accessible.

Le ranking ne doit jamais rendre publiable une représentation inéligible.

## 8. Visuels

- vraies photos autorisées pour un bien réel ;
- illustrations Option A pour les six types de biens approuvés ;
- fallback générique pour type inconnu ;
- icônes Lucide pour actions fonctionnelles ;
- aucune image source téléchargée ou réhébergée sans permission.

## 9. Sécurité

- `SUPABASE_SERVICE_ROLE_KEY` serveur uniquement ;
- aucune clé service role dans un bundle client ;
- tables internes protégées par RLS/revocations ;
- secrets hors dépôt ;
- aucune PII externe réexposée ;
- logs de télémétrie bornés et sans termes de recherche bruts lorsque cela n’est pas nécessaire ;
- endpoints d’écriture protégés par secrets et flags explicites.

## 10. Répertoires principaux

```text
app/                    routes et API Next.js
components/             UI et expériences produit
lib/search/             recherche historique et parsing
lib/search-gateway/     read model public, curseurs et Gateway
lib/odm/                dual-read, Canary, divergence et adaptation
lib/market-index/       observations, clusters et intelligence
lib/source-registry/    politiques de source
scripts/                acquisition, audits, tests et certifications
supabase/migrations/    schéma et fonctions PostgreSQL
docs/                   doctrine, lots, preuves et runbooks
data/audits/             rapports générés ou connectés
public/                  assets locaux autorisés
```

## 11. Invariants d’évolution

- aucun changement de contrat Search sans test de parité ;
- aucune migration Production hors fichier versionné ;
- aucune activation massive sans canary ;
- aucune suppression de données d’audit quand une quarantaine suffit ;
- aucun résultat externe transformé en contenu première partie ;
- aucune fusion de propriétés sans explication et rollback ;
- aucune métrique marketing dérivée d’un volume brut non qualifié.
