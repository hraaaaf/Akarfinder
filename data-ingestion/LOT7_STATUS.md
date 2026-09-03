# Lot 7 Status

**Status: 🟡 OPEN — sandbox foundation started while Lot 1 re-certification CI runs**

## Goal

Prouver que les données canoniques peuvent alimenter AkarFinder dans un environnement strictement isolé, sans toucher à la production ni à la base SQLite historique.

## Success

Progression contrôlée :

```text
20 annonces
→ 100 annonces
→ 1 000 annonces
```

Pour chaque palier, valider :

- import canonique ;
- recherche ;
- filtres ;
- ranking ;
- page détail ;
- provenance ;
- mise à jour idempotente ;
- désactivation ;
- purge `source=mubawab` ;
- absence d'impact sur toute donnée non-Mubawab / directe / partenaire.

## Safety boundary

Le Lot 7 utilise une base SQLite dédiée au sandbox.

Interdictions :

- ne jamais écrire dans `scripts/scrapers/output/akarfinder.db` ;
- ne jamais utiliser Supabase production ;
- aucun déploiement Vercel ;
- aucun write production ;
- aucun merge automatique.

Le sandbox doit être créé dans un chemin temporaire ou explicitement dédié au Lot 7 et détruisible sans effet collatéral.

## Existing AkarFinder integration surface

Le repository possède déjà :

- un provider DB `sqlite | supabase`, avec SQLite comme défaut ;
- un lecteur SQLite `property_listings` / `listing_sources` ;
- les filtres ville, type, transaction, prix, surface, chambres ;
- un accès détail par ID ;
- le Property Schema V1 ;
- le Collection Listing adapter ;
- le lifecycle / purge source du Lot 5.

Le Lot 7 doit réutiliser ces briques, pas créer un deuxième AkarFinder miniature.

## Phase 7A — sandbox store contract

À construire en premier :

1. créateur de DB SQLite sandbox isolée ;
2. schéma minimal compatible avec les lectures AkarFinder nécessaires au test ;
3. importer `CanonicalPropertyV1` vers ce store ;
4. source/provenance persistées séparément ;
5. import idempotent par clé source ;
6. purge par source ;
7. tests automatiques sans réseau et sans prod.

## Proof required for 7A

Un gate CI dédié doit démontrer au minimum :

- sandbox DB créée dans un répertoire temporaire ;
- 20 fixtures/canoniques importées ;
- re-import = 0 doublon supplémentaire ;
- filtres vente/location/type/ville/prix/surface fonctionnels ;
- détail accessible ;
- purge Mubawab retire uniquement Mubawab ;
- une fixture `agency_direct` ou `partner_feed` témoin reste intacte ;
- DB sandbox supprimable après test ;
- `production_writes = 0`.

## Parallel gate note

La re-certification Lot 1 continue en parallèle. Lot 7 peut être développé pendant cette CI, mais ne pourra être déclaré CLOSED si un gate amont requis échoue.

## Next exact

Construire le store SQLite sandbox et son test d'import/purge sur 20 annonces, puis créer le workflow `Data Ingestion Lot 7 Sandbox Gate`.
