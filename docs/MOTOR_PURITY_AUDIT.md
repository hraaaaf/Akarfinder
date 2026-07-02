AKARFINDER-MOTOR-PURITY-AUDIT-1 - BILAN FINAL

Date: 2026-07-02
Statut: audit complet livre, aucun scraping lance, aucune refonte code appliquee

Doctrine auditee

AkarFinder doit evoluer vers un moteur de recherche immobilier pur + intelligence quartier.
AkarFinder ne doit plus persister ni exploiter comme inventaire public des annonces tierces non autorisees.
Les annonces tierces doivent etre interrogees a la volee, affichees comme resultats externes minimaux, puis redirigees vers la source originale.
La base publique AkarFinder doit contenir uniquement: contenu first-party, contenu partenaire autorise, donnees quartier propres, donnees ouvertes/OSM, reperes de quartier, pages quartier, leads/espace pro/donnees internes.

1. Statut

Mission realisee comme audit + plan de migration.
Aucune ingestion, aucun scrape, aucun sync Supabase, aucune augmentation de volume DB.
Verifications effectuees:
- Lecture des docs obligatoires AGENTS/SESSION/START/PRODUCT/ROADMAP/ARCHITECTURE/SCRAPING/MONETIZATION/DECISIONS.
- Audit code cible sur ingestion, Search Gateway, surface publique, fiches, images, carte, donnees quartier.
- Lecture DB locale en read-only.
- Lecture Supabase en read-only, sans journaliser de secret.

2. Verdict global de compatibilite

Le systeme actuel est compatible a 42% avec la nouvelle doctrine moteur pur.

Pourquoi 42%:
- Compatible: Search Gateway a la volee, redirection source, absence de contact/gallery sur resultats externes, garde-fous images, briques quartier/OSM/proximite, benchmark Yakeey classe benchmark_source.
- Incompatible: la surface publique live repose encore majoritairement sur property_listings alimente par Mubawab persiste en DB, avec fiches internes, carte, home previews et API structurees.
- Ambigu: l'import CSV partenaire est techniquement bon mais ne prouve pas encore l'autorisation source; plusieurs modules "prix/fiabilite/doublons" sont utiles mais calcules sur un corpus tiers persiste.
- A stopper immediatement: tout flux automatique qui ecrit des annonces tierces non autorisees dans property_listings/listing_sources.

Evidence volume DB:
- Local SQLite: scrape_runs=9, raw_listings=460, property_listings=384, listing_sources=457.
- Local listing_sources: Mubawab=452; autres sources faibles: rabat_invest, meilleures_adresses, immo_sud, gerant_direct, agence_atlas.
- Local properties par source join: Mubawab=374, unknown=5, puis 1 par petite source.
- Supabase: scrape_runs=0, raw_listings=0, property_listings=139, listing_sources=144.
- Supabase listing_sources: Mubawab=139, puis 5 sources a 1 ligne.

3. Zones auditees

Ingestion tierce:
- package.json expose scrape:p0, scrape:ingest, enrich:p6, sync:supabase, nightly:ingest, mubawab:expand.
- scripts/scrapers/p0-run.ts scrape Avito, Mubawab, Sarouty.
- scripts/scrapers/ingest-clean-listings.ts ecrit raw_listings, property_listings, listing_sources.
- scripts/scrapers/enrich-p6.ts enrichit toute la table property_listings.
- scripts/nightly-ingestion-runner.ts orchestre scrape -> ingest -> enrich -> sync optional.
- scripts/mubawab-depth-expansion-run.ts ouvre une expansion Mubawab multi-ville/categorie et ingere.
- scripts/import-partner-csv.ts est un flux partenaire potentiel, pas un scrape, mais ecrit lui aussi property_listings/listing_sources.

Surface publique:
- /search precharge et affiche les listings DB via searchListings.
- /api/search expose les listings DB structures.
- /api/listings expose les listings DB structures.
- /listings/[id] construit une fiche interne depuis queryListingById.
- /map charge searchListings({ limit: 500 }) et affiche les biens positionnes.
- HomeResultPreview et MarketPulse consomment /api/listings ou queryListings.
- Pages intentionnelles Acheter/Louer/Vendre/Favoris/Compare peuvent encore lier vers /listings/[id].

Search Gateway:
- /api/search/gateway appelle SEARCH_API_ENDPOINT a la volee.
- Aucun write DB detecte dans la route gateway.
- Resultats normalises en thin_indexed_result avec original_url, source, CTA original.
- can_show_contact=false, can_show_gallery=false, can_cache_thumbnail=false, can_download_thumbnail=false.
- Risque: toutes les sources gateway sont enabled=true; thumbnails provider sont risk_accepted=true et NEXT_PUBLIC_SEARCH_GATEWAY_THUMBNAILS_ENABLED=true localement.

Fiches internes:
- app/listings/[id]/page.tsx sert toute ligne DB par ID.
- ListingDetail applique canHaveInternalDetail/canShowContactActions pour limiter contact sur limited_preview/market_signal_only.
- Mais la fiche interne existe encore pour annonces tierces persistees; le comportement reste portail.

Images:
- Politique first-party/partner propre dans lib/listings/image-policy.ts.
- DB provider thumbnails existent mais sont coupes localement si NEXT_PUBLIC_DB_PROVIDER_THUMBNAILS_ENABLED absent.
- Gateway thumbnails sont actives localement par NEXT_PUBLIC_SEARCH_GATEWAY_THUMBNAILS_ENABLED=true.
- thumbnail_url est persiste dans property_listings pour Mubawab; non rehoste, mais encore image tierce affichable si flag public active.

Home / wording:
- Le hero est proche du moteur pur: "moteur de recherche immobilier", sources visibles, apercus limites.
- Incompatible ou a adapter: "centralise", "rassemble les annonces disponibles", "Index AkarFinder", "resultats observes recemment", "biens indexes".
- Les blocs sont structurellement reutilisables, mais doivent decrire la recherche a la volee + intelligence quartier plutot que l'inventaire public consolide.

Donnees quartier:
- lib/proximity/*: OSM/static, no live API production, disclaimers.
- lib/geo/morocco-centroids.ts: city/neighborhood centroids approximatifs.
- /map et SearchMapPanel: cartographie deja en place.
- lib/market/market-benchmark-registry.ts + price-gap-calculator.ts: Yakeey benchmark_source, not_listing_source=true.
- Ces briques sont le meilleur socle de la nouvelle orientation.

4. Logiques tierces encore actives

Actives techniquement:
- npm run scrape:p0: Avito, Mubawab, Sarouty vers fichiers JSON.
- npm run scrape:ingest: fichiers clean vers raw_listings/property_listings/listing_sources.
- npm run enrich:p6: enrichissement DB de toutes les annonces.
- npm run sync:supabase: copie property_listings/listing_sources vers Supabase.
- npm run nightly:ingest: orchestre ingestion et peut sync si NIGHTLY_SYNC_SUPABASE=true.
- npm run mubawab:expand: expansion Mubawab puis ingestion/enrich.

Actives produit:
- Supabase live contient encore 139 property_listings et 139 listing_sources Mubawab.
- /search, /map, /listings/[id], /api/search, /api/listings, home previews utilisent ce read-model.

Flags existants:
- NEXT_PUBLIC_SEARCH_GATEWAY_ENABLED=true: active gateway.
- NEXT_PUBLIC_SEARCH_GATEWAY_THUMBNAILS_ENABLED=true local: active thumbnails gateway.
- NEXT_PUBLIC_DB_PROVIDER_THUMBNAILS_ENABLED absent local: coupe thumbnails DB.
- NIGHTLY_INGESTION_ENABLED absent: nightly n'est pas explicitement desactive.
- NIGHTLY_SYNC_SUPABASE absent: sync nightly non active par defaut.
- ENABLE_AVITO_PROVIDER_THUMBNAILS / AVITO_THUMBNAILS_RISK_ACCEPTED absents local: anciens flags Avito provider non actifs localement.

5. Pages / composants incompatibles

Incompatibles en l'etat:
- /search: DB structured results first, puis gateway. Doit devenir SERP moteur pur avec gateway comme coeur et DB limitee aux partenaires/first-party.
- /listings/[id]: fiche interne pour annonces tierces persistantes. Doit 404/redirect/limited-shell selon source.
- /map: marqueurs de biens tiers persistants. Doit devenir carte quartier/zone + partenaires autorises.
- HomeResultPreview: preview de biens indexes depuis /api/listings. A remplacer par exemples de requetes, resultats externes minimalistes ou modules quartier.
- MarketPulse: "annonces analysees" depuis property_listings. A couper ou convertir en signaux agreges non-listing.
- /api/listings et /api/search: doivent filtrer first-party/partner autorise ou passer en API interne.
- SearchListingCardDark / PhotoFirstListingCard / ResultCard: CTA "Voir le bien" trop fort pour tiers limited_preview.
- Compare/Favorites/intention pages: liens vers /listings/[id] pour listings non autorises a neutraliser.

6. Elements deja compatibles

- Search Gateway a la volee.
- ExternalIndexedResultCard: lien original, pas de contact, pas de galerie.
- search-gateway-normalizer: filtre domaine source + filtre immobilier + no cache/download thumbnails.
- Image policy: real images seulement si permission allowed + partner_full/preview_allowed.
- Listing boundary: canHaveInternalDetail et canShowContactActions existent.
- Demande de retrait: route dediee presente.
- Partner CSV import: base technique conservable pour donnees autorisees.
- Yakeey benchmark: correctement separe de listing_source.
- Proximite OSM/static et centroids: base nouvelle orientation.

7. Elements a conserver

- Search Gateway, mais avec source registry et kill switches plus stricts.
- ExternalIndexedResultsSection/Card comme format SERP externe minimal.
- /api/search/gateway comme route moteur a la volee.
- image-policy.ts et DbProviderThumbnail fallback, mais DB thumbnails tiers doivent rester off pour lancement moteur pur.
- proximity-engine, morocco-proximity, centroids, map foundations.
- market-benchmark-registry + price-gap-calculator, avec attribution et wording indicatif.
- partner CSV import, apres validation source/contrat et etiquetage partenaire.
- leads/pro/onboarding, uniquement pour contenu AkarFinder/partenaire ou demande generale acheteur.

8. Elements a desactiver immediatement

Priorite P0:
- Desactiver scrape:p0 en production/ops pour Avito/Mubawab/Sarouty.
- Desactiver nightly:ingest ou imposer NIGHTLY_INGESTION_ENABLED=false.
- Desactiver mubawab:expand.
- Interdire sync:supabase apres ingestion tierce non autorisee.
- Garder NEXT_PUBLIC_DB_PROVIDER_THUMBNAILS_ENABLED=false/absent.
- Desactiver NEXT_PUBLIC_SEARCH_GATEWAY_THUMBNAILS_ENABLED pour lancement pur si le risque ToS thumbnails n'est pas revalide.

Ne pas supprimer tout de suite:
- Ne pas dropper property_listings: elle peut servir a migration, audit, partenaires, first-party et rollback.
- Ne pas supprimer listing_sources/raw_listings/scrape_runs: utiles pour traçabilite et purge controlee.

9. Elements a refactorer

- Ajouter une classification source canonique: first_party, partner_authorized, public_external_live, third_party_persisted_legacy, benchmark_source.
- Ajouter un filtre read-model public: seules sources first_party/partner_authorized peuvent alimenter structured listings.
- Refactorer /search pour separer clairement:
  - resultats AkarFinder autorises;
  - resultats web externes a la volee;
  - intelligence quartier.
- Refactorer cards: pour tiers, CTA primaire "Voir sur source", jamais "Voir le bien".
- Refactorer /listings/[id]: 404/redirect pour tiers legacy; full detail uniquement partenaires/first-party.
- Refactorer /map: mode quartier/zone par defaut; markers biens uniquement partenaires/first-party.
- Refactorer wording home/footer/pages intentionnelles.

10. Elements a reconstruire

- SERP moteur pur comme experience centrale.
- Source policy registry operationnel, lisible par ingestion, gateway et UI.
- Pages quartier / ville first-party: OSM, proximite, prix indicatifs, repères, liens recherche.
- Couche partenaire autorisee: schema ou flags qui prouvent l'autorisation avant fiche complete.
- Admin/data monitoring oriente source compliance: flux actifs, derniere collecte, source_type, autorisation.
- Migration/purge des annonces tierces persistantes legacy.

11. Risques produit / logique identifies

- Risque principal: AkarFinder peut encore ressembler a un portail d'annonces tierces grace a /search + /listings + /map.
- Risque juridique/ToS: persistance et affichage de contenu Mubawab non autorise comme inventaire structure.
- Risque image: thumbnails provider/gateway et thumbnail_url DB sont hotlink-only, mais restent des visuels tiers.
- Risque discours: "centralise", "index", "biens indexes" peut suggerer un inventaire propre.
- Risque data: fiabilite/doublons/prix sont utiles mais calcules sur un corpus tiers legacy; ne pas les presenter comme base publique future.
- Risque conversion: visites/leads sur annonces non partenaires peuvent laisser croire qu'AkarFinder gere l'intermediaire.

12. Flags utiles deja existants

- NEXT_PUBLIC_SEARCH_GATEWAY_ENABLED: garder true pour moteur a la volee.
- NEXT_PUBLIC_SEARCH_GATEWAY_THUMBNAILS_ENABLED: mettre false pour phase de purete stricte.
- NEXT_PUBLIC_DB_PROVIDER_THUMBNAILS_ENABLED: garder false/absent.
- NIGHTLY_INGESTION_ENABLED: mettre false explicitement.
- NIGHTLY_SYNC_SUPABASE: garder false.
- DATABASE_PROVIDER=supabase: garder, mais filtrer le read-model.
- SEARCH_API_ENDPOINT/SEARCH_API_KEY: garder server-side only.

Flags/manques recommandes:
- PUBLIC_STRUCTURED_LISTINGS_MODE=authorized_only
- THIRD_PARTY_DB_INGESTION_ENABLED=false
- LEGACY_THIRD_PARTY_LISTINGS_PUBLIC=false
- PARTNER_IMPORTS_ENABLED=true
- SEARCH_GATEWAY_ALLOWED_SOURCES=...

13. Plan de migration recommande

Phase 0 - Freeze ingestion tierce
- Objectif: empecher tout nouveau contenu tiers persiste.
- Actions: flags explicites, scripts documentes comme disabled, guard dans nightly/mubawab expansion/p0-run.
- Impact: aucune perte UI immediate si on ne purge pas encore.

Phase 1 - Classifier les sources et le read-model
- Objectif: savoir ce qui est first-party/partner/legacy tiers.
- Actions: registry source minimal + helper canPublishStructuredListing().
- Impact: base technique pour filtrer sans drop DB.

Phase 2 - Neutraliser publication DB tierce
- Objectif: /api/search, /api/listings, /search, /map ne publient plus Mubawab legacy comme inventaire AkarFinder.
- Actions: filtrage authorized_only; fallback vers gateway externe.
- Impact: baisse volume structured, mais alignement doctrine.

Phase 3 - Transformer /search en SERP moteur pur
- Objectif: gateway externe devient coeur visible; structured cards uniquement first-party/partner.
- Actions: CTA source primaire, pas de fiche interne pour tiers, resultats externes minimalistes.
- Impact: experience moteur pur claire.

Phase 4 - Neutraliser /listings tiers
- Objectif: supprimer l'effet portail.
- Actions: 404/redirect source/limited interstitial pour legacy tiers; full detail reserve first-party/partner.
- Impact: reduit risque rehosting.

Phase 5 - Assainir home + wording + footer + pages legales
- Objectif: aligner discours public.
- Actions: remplacer centralisation/index inventaire par "recherche a la volee", "sources externes", "redirection source", "intelligence quartier".
- Impact: confiance produit.

Phase 6 - Recentrer /map sur intelligence quartier
- Objectif: carte quartier d'abord, annonces autorisees ensuite.
- Actions: zones, OSM, proximite, reperes marche indicatifs; markers annonces seulement autorises.
- Impact: differenciation produit.

Phase 7 - Couche partenaire first-party
- Objectif: recréer la richesse listing legalement.
- Actions: importer CSV partenaires autorises, flags partner_full, photos autorisees, leads.
- Impact: volume qualitatif et monetisable.

Phase 8 - Purge ou archivage legacy tierce
- Objectif: assainir Supabase et SQLite sans perte de traçabilite.
- Actions: exporter audit, marquer legacy_third_party, retirer du public, puis purge controlee si validee.
- Impact: base propre.

14. Ordre des prochaines missions

1. MOTOR-PURITY-FREEZE-INGESTION-1
   Ajouter des guards explicites pour bloquer p0-run, nightly et mubawab:expand hors override local documente.

2. SOURCE-ACCESS-REGISTRY-1
   Creer un registry source minimal avec first_party/partner_authorized/third_party_legacy/public_external_live/benchmark_source.

3. PUBLIC-READMODEL-AUTHORIZED-ONLY-1
   Filtrer /api/search, /api/listings, /search SSR et /map pour exclure third_party_legacy du public.

4. SERP-PURE-GATEWAY-FIRST-1
   Recomposer /search: resultats web externes a la volee + structured uniquement autorise.

5. LISTING-DETAIL-BOUNDARY-HARDENING-1
   404/redirect/limited shell pour /listings/[id] tiers legacy.

6. HOME-MOTOR-PURITY-WORDING-1
   Rewriter hero, Why, HowItWorks, MarketPulse/HomeResultPreview/footer autour moteur pur + quartier.

7. MAP-NEIGHBORHOOD-INTELLIGENCE-1
   Transformer /map en carte quartier/zone first-party.

8. PARTNER-INVENTORY-AUTHORIZED-IMPORT-1
   Garder import CSV, mais exiger source autorisee et droits d'image/contact.

9. LEGACY-THIRD-PARTY-DATA-ARCHIVE-1
   Marquer, exporter puis retirer du public les lignes Mubawab/Sarouty/Avito legacy.

15. Decision finale: chemin de migration valide oui/non

Decision recommandee: OUI, chemin de migration valide sous reserve d'une validation proprietaire avant implementation.

Ce qu'on garde:
- Search Gateway a la volee.
- Intelligence quartier OSM/proximite/centroids.
- Benchmark source Yakeey comme donnees marche indicatives, pas listings.
- Partner CSV import et espace pro/leads pour sources autorisees.
- Garde-fous images/contact/gallery.

Ce qu'on coupe:
- Ingestion tierce non autorisee vers property_listings/listing_sources.
- Expansion Mubawab.
- Publication publique de DB tiers legacy.
- Fiches internes completes pour tiers.
- Miniatures tierces pour lancement pur si risque non revalide.

Ce qu'on migre:
- /search vers SERP moteur pur.
- /map vers intelligence quartier.
- Home vers discours moteur pur + redirection source + quartier.
- DB vers authorized_only + legacy archive.

Ordre precis:
1. Freeze ingestion.
2. Registry source.
3. Filtre public authorized_only.
4. SERP gateway-first.
5. Boundary /listings.
6. Wording public.
7. Carte quartier.
8. Partenaires autorises.
9. Archive/purge legacy.
