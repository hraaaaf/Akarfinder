# Akarfinder — unification vers nouvelle Supabase (08/11/2026)

## Décision et cible

**Utilisateur a ordonné de mettre tout sur Supabase et de choisir la nouvelle base vide.** Destination `AkarfFnder` Supabase ref `mgqsckxsqdqbzqwkgvwo` (eu-west-1), créée 04/11/2026, ACTIVE_HEALTHY et initialement **0 table métier / 0 migration**. Ancienne Supabase `AqarFinder` ref `kusfiyimwvxblvsrhaes` est INACTIVE et inaccessible : ne jamais prétendre avoir migré ses leads.

## DB nouvelle — appliqué et prouvé

- **12 migrations Supabase enregistrées** le 08/11/2026 (toute série `akarfinder_unified_*`) : fondation `public.property_listings` 41 colonnes, `public.listing_sources` 17 colonnes (correspondance source historique Neon, PK/FK et index) ; `buyer_leads` ; brouillons vendeur, photos, modération, publication ; `owner_listing_representations`, fonctions et triggers de projections ; bucket `seller-property-drafts` privé ; dernier lot de sécurité `akarfinder_unified_security_hardening_v1`.
- **PROOF** : `list_tables(public)` : 9 tables, toutes RLS true et à 0 ligne ; `has_table_privilege` confirme 0 droit SELECT anon/authenticated, SELECT service_role autorisé ; les six fonctions sensibles de publication ont 0 droit EXECUTE anon/authenticated, service_role autorisé ; Supabase Security Advisors **0 WARN** après durcissement, 9 messages INFO `rls_enabled_no_policy` correspondant à la politique volontaire service-only.
- La source Neon et les données existantes restent intactes ; **0 annonce, 0 source, 0 lead transférés**. Le vrai endpoint PROD Neon n'est pas identifié ; stock historique 151900 annonces n'implique pas droit de republication, ne pas importer aveuglément. Les tarifs fictifs du test précédent ne sont pas dans la nouvelle base.

## Application — branche candidate

- `lib/db/index.ts` possède déjà `DATABASE_PROVIDER=supabase` et les fonctions `querySupabaseListings`, `querySupabaseListingById`, `querySupabaseStats`, sans nécessité de modifier le serveur Vercel pour la PR.
- Dans cette branche, le code propriétaire `syncOwnerListingProjection` et `searchOwnerListings` sélectionne désormais les **RPC Supabase service-role** lorsque `DATABASE_PROVIDER=supabase`, et garde la voie Neon en rollback non actif sur la destination ; `OWNER_LISTINGS_PUBLIC_SEARCH_ENABLED` reste *false* par défaut.
- La lecture Supabase des annonces prend d'abord une source active `first_party`/`partner_authorized` lorsqu'il y en a une, évitant le bug source historique de la lecture Neon, mais **sans ajouter de nouvelles permissions**. Pour lecture non publique, priorité antérieure préservée. Les gardes métier `canPublishDbRowToPublicSearchSurface` restent applicables.

## Succès / limites / gates

- **SUCCÈS DB-01/02** : schéma privé créé et contrôlé, données d'origine non altérées. **SUCCÈS code candidat** seulement après CI owner-search, Search page, TypeScript, build.
- **NON ATTEINT** : totalité de la migration des données, lecture HTTP Supabase avec la nouvelle clé service_role depuis Vercel, origine DB PROD vérifiée, flux UI de bout en bout, quartier administratif Maârif certifié, contours, sources d'annonces autorisées réelles.
- **Ne pas faire** : déployer Vercel sans autorisation explicite ; modifier les variables d'environnement de Production sans preuve et gate ; désactiver RLS ; ouvrir les tables de leads ou vendeur au public ; copier 151900 annonces tierces comme publiables ; supprimer l'ancienne base ou Neon.
- **Next exact** : CI de la branche candidate et typecheck → contrat Supabase Public Search (source prioritaire) → rendre le pipeline Search entier compatible sans Neon (`public-search-cursor` et autres RPC Neon restent à remplacer) → qualifier la vraie source de données et migrer **uniquement avec droits et réconciliation** → Preview avec clé service-role sécurisée → preuves UI E2E avec nettoyage → décision explicite pour déploiement.


## 08/11/2026 — Lot DB-03 : le moteur public utilise la base cible sans appeler Neon

- La lecture `querySupabaseListings({public_search_only:true})`, lorsque la publication OpenSERP externe n'est pas activée, applique `listing_sources!inner` + `is_active=true` + identifiants de sources autorisées **avant** `COUNT(*)` et pagination PostgREST. Cela corrige le risque `total:5,listings:[]` dû à un comptage de lignes brutes dans la voie Supabase. La garde de publication métier reste en place. Si l'option OpenSERP externe est activée, l'ancien chemin de contrôle distinct reste utilisé ; couverture exhaustive à certifier avant l'activation.
- Le Thin Index ODM version 2 est **absent** de la nouvelle base. `searchPublicRepresentations` refuse explicitement toute tentative hors fournisseur Neon avec `public_search_index_unavailable` (même contrat qu'une fonction absente). `routePublicSearch` doit revenir au moteur Legacy structuré Supabase et l'API Search Gateway conserver sa dégradation explicite. Cela évite une lecture silencieuse de Neon via `DATABASE_URL`. **Ce n'est pas une migration de l'ODM / thin index** ; la reconstruction de ce dernier reste un lot séparé, sans réemploi d'URLs tierces comme fiches autorisées.
- Deux tests de contrat ajoutés ; réussite réelle dépend de la CI de cette branche.


## 08/11/2026 — Baseline immobilier conservé dans GitHub

**Nouvelle preuve de reproductibilité partielle** : le schéma des deux tables immobilières `property_listings` et `listing_sources` (41 + 17 colonnes, 7 contraintes, 3 index opérationnels, RLS et droits private-only) a été relu depuis **le catalogue PostgreSQL du Supabase cible**, puis figé en SQL dans `db/baselines/akarfinder_supabase_property_foundation_2026-11-08.sql` (sans données ni secrets). Tests hors-ligne `scripts/scrapers/__tests__/akarfinder-supabase-property-foundation.test.ts` pour structure et interdiction de grants public. Le fichier est volontairement conservé dans `db/baselines`, **pas** au milieu des 214 migrations historiques qui ont 5 collisions de versions et exigent des dépendances manquantes. Il ne couvre PAS à lui seul les 7 tables vendeur/propriétaire : celles-ci proviennent des migrations existantes référencées dans le manifeste de cette revue.

**Gates** : vérifier la CI de ce commit, puis replay du baseline + chaîne vendeur dans un Supabase local jetable pour certifier la reconstruction complète. Le SQL n'a PAS été réappliqué au Supabase cible : uniquement lecture de son catalogue ; aucune écriture de données, aucun merge, aucun Vercel deploy.


## 08/11/2026 — Backup local retrouvé, compatibilité source alignée

**Source physique lue sur ordinateur autorisé** : backup PostgreSQL gzip du **13/10/2026** à l'emplacement Desktop, SHA256 déclaré dans manifeste `cb0da8c09b81217cb2202b9f2a8ba66276c2ab2faa413e9dbfce8a99e8597e60`, 109510569 octets. Le dossier local contient les extraits `property_listings.copy.sql.gz` (19616 lignes) et `listing_sources.copy.sql.gz` (19621 lignes), ainsi que le manifeste local, les archives et la banque L0 ; **aucune donnée brute téléchargée ni envoyée vers GitHub/Notion/cloud**. Le script en lecture seule a extrait la définition SQL de `listing_sources`, sans lignes personnelles.

**Diff de colonnes réel** : `property_listings` backup = 40 colonnes, cible = 41 (cible possède `thumbnail_url` supplémentaire nullable) ; `listing_sources` backup = 21, cible initiale = 17. Les quatre champs absents ont été ajoutés au Supabase cible via migration enregistrée `akarfinder_unified_legacy_source_columns_v1` : `canonical_kind text`, `canonical_eligible boolean`, `canonical_hygiene_version smallint`, `canonical_classified_at timestamptz`. La requête `information_schema.columns` a confirmé les types. La cible est désormais 41/21 ; autres tables vendeur inchangées, **0 enregistrement migré**.

**Contrôle sémantique** : le `canonical_eligible` du backup ne signifie qu'une hygiène d'URL, pas un contrat de publication. Les permissions de toutes les sources historiques restent inconnues/non prouvées ; ne pas confondre sauvegarde propriétaire et droits de republier des offres provenant d'autres sites. Les 231818 clés L0 et 95825 URL de delta de l'archive privée ne sont pas des biens actifs ni des mandats. Les rapports locaux donnent `reuse_rights=NOT_PROVEN` et `current_listing_status=UNKNOWN`.

**Trace source contrôlée** : DDL additif dans `db/baselines/akarfinder_supabase_source_backup_compat_2026-11-08.sql` + test hors ligne dans `scripts/scrapers/__tests__/akarfinder-supabase-property-foundation.test.ts`. Le backup source reste sur l'ordinateur, non modifié ; l'ancienne Supabase et Neon sont conservés ; rien n'a été connecté à Vercel. **Human gate avant import massif** : clarifier les droits et la provenance, vérifier la fraîcheur et la non-duplication, puis importer uniquement dans un modèle privé avec audit et quotas. Le replay total du patrimoine historique n'est pas certifié.


## 08/11/2026 — Test réel du workflow vendeur en Supabase cible, sans données résiduelles

**QA SQL exécutée directement dans `AkarfFnder`, ref `mgqsckxsqdqbzqwkgvwo`**, sur DB vide : un faux lead marqué TEST (aucun client ni vrai téléphone), brouillon Maârif sans photo, tentative de publication `live` avant modération **bloquée par le trigger** ; passage ensuite en `review_status=approved` et publication live, représentation propriétaire synchronisée mais **`display_eligibility_reason=photo_required`** ; RPC de recherche propriétaire ne retourne aucune fiche fictive. La commande `DO` avec assertions a réussi sans erreur puis supprimé le lead en cascade, y compris brouillon/publication/représentation. **Contrôle SQL séparé après exécution** : `buyer_leads=0, seller_property_drafts=0, seller_listing_publications=0, owner_listing_representations=0, property_listings=0, listing_sources=0`. RLS et interdictions anon/authenticated vérifiées à nouveau, bucket vendeur privé.

**Portée** : c'est la preuve d'intégration de la BD et des triggers réels, **pas** un E2E HTTP/React, et cela n'a pas validé un fichier photo uploadé ni un vendeur humain. Un script QA reproductible avec préflight plus restrictif (base *totalement vide*) est ajouté en `scripts/db/qa_supabase_owner_publication_failclosed_2026-11-08.sql`, mais **cette variante avec préflight n'a pas été réexécutée** et doit rester à usage explicitement autorisé sur environnement sacrifiable.

**Capacité et provenance** : organisation Supabase AqarFinder associée au projet cible = **plan Free** au 08/11. Sauvegarde du 13/10/2026 de l'ancien Supabase contient 19616 fiches/19621 liens sources, et archives L0 plus volumineuses. **Aucune estimation certifiée** du volume Postgres final, quotas et coûts ; ne pas lancer la copie de 151900/321173 enregistrements sans capacité, preuve de droits, qualité/fraîcheur et déduplication. Le poste local connecté n'a ni Docker, ni CLI Supabase, ni psql en PATH (Python et Git présents) : replay local complet indisponible via ces outils sans installation/autorisation distincte.

**Statut** : 13 migrations enregistrées dans le Supabase neuf, 9 tables RLS=true et vides ; code cible toujours PR Draft ; ni merge, ni déploiement Vercel. Unification complète non certifiée : dépendances Neon Market/ODM restantes, données réelles non qualifiées et E2E navigateur non fait.


## 08/11/2026 — Lot DB-05 : Market observations côté Supabase, zéro lecture croisée Neon

- **Fonction server-only** appliquée à la DB nouvelle Supabase `mgqsckxsqdqbzqwkgvwo` via migration `akarfinder_unified_market_authorized_observations_v1` : `public.read_market_observations_v1(p_city,p_district_variants,p_authorized_sources,p_max_rows)`. JOIN uniquement sur les `listing_sources` actives figurant dans les sources explicitement first_party/partner_authorized ; sélection de leur URL autorisée, ville/quartier exacts en casse normalisée, au plus **10 001** lignes. RPC `SECURITY INVOKER`, `search_path=''`, **EXECUTE réservé à service_role**, anon/authenticated refusés.
- **Proof DB réelle** : SELECT RPC Maârif sur table vide retourne 0. Test SQL éphémère dans la vraie DB de destination : 2 annonces fictives marquées TEST, une avec ancienne source tierce et source `partner_csv` autorisée, l'autre uniquement source tierce. RPC a renvoyé **exactement 1 observation**, source `partner_csv`, et 0 sur district Agdal. La transaction a supprimé les deux biens et trois sources ; **requête indépendante** après coup : `property_listings=0`, `listing_sources=0`.
- **Code candidat** : `lib/map/neon-listing-market-observations.ts` (nom historique conservé pour rollback) dispatche d'abord selon `DATABASE_PROVIDER` ; sur `supabase`, RPC privée Supabase ; sur `neon`, requête d'origine conservée, sans traversée cachée. Sur autre provider, erreur explicite. L'API Market existante rend 503 si la nouvelle RPC échoue, au lieu de chiffres inventés ; agrégation Maârif reste fondée sur observations `fresh:false`.
- **Contrat / sécurité** dans `db/baselines/akarfinder_supabase_market_authorized_observations_2026-11-08.sql` et `scripts/scrapers/__tests__/akarfinder-supabase-market-routing.test.ts`. L'accès serveur réel via HTTPS/SDK Supabase et l'interface Map n'ont PAS encore été testés ; CI de branche à vérifier sur nouveau SHA. **Il n'y a pas de vraies observations marché importées** : ne pas prétendre afficher des prix certifiés.
- **Next exact** : CI Supabase Unified + code TS, audit de toutes les autres importations directes de `queryNeonRows` et comportement sur DB vide. Ensuite trajectoire d'un seul fournisseur et données autorisées réelles avant tout merge/deploy Vercel.


### Suivi CI / correctif architectural DB-05

Le premier commit de DB-05 `46dd11203fcaaf66041392a2b75d07a1b7824156` a été rejeté par [Neon-only Runtime P0 #42499657734](https://github.com/hraaaaf/Akarfinder/actions/runs/42499657734) : il référençait Supabase dans `lib/map/neon-listing-market-observations.ts`, pourtant protégé comme module exclusivement Neon. **Le test était légitime ; nous ne l'avons pas désactivé.**

Correction : module Neon restauré **strictement** à la version pure avant DB-05 ; nouveau `lib/map/supabase-listing-market-observations.ts` implémente uniquement l'appel à la fonction privée Supabase et la conversion en observations ; `lib/map/market-listing-observations.ts` décide explicitement via `DATABASE_PROVIDER`, sans bascule cachée ; `city-market-intelligence-live.ts` n'importe que ce routeur neutre. Les tests du module Neon restent inchangés et le test de contrat Supabase a été adapté à cette séparation. Ne pas déclarer les nouvelles CI vertes avant d'avoir leurs résultats.


## 08/11/2026 — Deux CI navigateur rouges, correctifs candidats

- [Lot8 #42499949711](https://github.com/hraaaaf/Akarfinder/actions/runs/42499949711) a échoué sur Fès 430 en attendant deux réponses OpenFreeMap haute résolution dans les 20 s. Après l'état MapLibre `ready`, le contrôle corrigé vérifie **source disponible, vraies géométries de basemap rendues hors focus, zoom réel ≥ 9, fournisseur identifié**, conserve les réponses HTTP comme télémétrie, captures, rail et handoff exact ; photographie l'échec si besoin. Il ne revendique pas qu'une réponse réseau = une carte rendue.
- [C7 #42499949762](https://github.com/hraaaaf/Akarfinder/actions/runs/42499949762) attendait l'ancien endpoint `/api/geo/rabat-market-intelligence` et une ancienne UI C3 tandis que `/map?city=rabat&layer=price` utilise désormais l'interface générique et `/api/geo/market-intelligence`. Correction : audit **Rabat** aux 4 viewports 390/430/768/1280 des modes Prix/Densité/Annonces, métriques Agdal, navigation Search précise, dimensions, overflow, erreurs navigateur, captures ; fixture interceptée dans Playwright, jamais écrite en DB. Référence C0-C6 contractuelle conservée, anciennes interactions C3 non revendiquées.
- L'ensemble est **candidat en CI**, pas un succès prouvé. Aucun Vercel deploy.


### 08/11/2026 — Diagnostic par captures Lot8/C7 et correction du test réel

**Artefacts réels inspectés**, sans inférence à partir d'un timeout seul :
- [Lot8 #42501553863, artefact #13625348006](https://github.com/hraaaaf/Akarfinder/actions/runs/42501553863/artifacts/13625348006), capture `failure-fes-iphone14promax.png` 430×932 : **la ville Fès est cartographiée avec une fiche Ville Nouvelle disant que les repères récents sont indisponibles**. Le composant quartier `data-maplibre-spike` n'apparaît PAS, parce que `NationalMapRouter` ne monte ce composant que lorsque `/api/geo/national-territories` retourne un centre de quartier vérifié `sourceKinds=osm_neighborhood_label`. Sinon, il garde la carte nationale/cité réelle. **C'est une protection produit légitime**, pas un renderer en panne. L'ancien test exigeait à tort la carte de quartier pour toute ville.
- [C7 #42501553892, artefact #13625683533](https://github.com/hraaaaf/Akarfinder/actions/runs/42501553892/artifacts/13625683533), capture `failure-mobile-390.png` 390×844 : la route Rabat `?layer=price` montre bien l'interface Premium spécifique Rabat (Prix/Densité/Annonces). Le code `MapNeighborhoodClient` branche explicitement `RabatMarketIntelligenceExperience`, qui demande `/api/geo/rabat-market-intelligence`, pas l'API générique. Le timeout à la ligne 198 correspondait à une légende absente, conséquence directe de l'interception du **mauvais endpoint** par notre adaptation précédente. L'ancienne C7 avait initialement échoué parce qu'elle ouvrait **`/map?city=rabat` sans `layer=price`** et tombait donc sur la carte Explore.
- **Correction candidat** : Lot8 interroge la même source V5 que le router, exige strictement le rendu MapLibre quartier si et seulement si le centre est qualifié, sinon vérifie carte nationale avec vraies features de fond, sans centre inventé, puis rail, CTA Search quartier exact, tailles/overflow et capture sur chaque ville/viewport. C7 **restaure entièrement l'audit C7 historique**, ses polygones/fiche riche, sa fixture sur l'API Rabat réelle, ses 4 viewports, avec seule modification de l'URL initiale `?city=rabat&layer=price` et capture diagnostique à chaque échec. La CI ciblée reste à valider après commit. Aucun déploiement Vercel.


### 08/11/2026 — Lot8 UX réel 1280×900 : dépassement 12 px, correction CSS ciblée

[Lot8 #42502479682 FAILED](https://github.com/hraaaaf/Akarfinder/actions/runs/42502479682), artefact [#13625159435](https://github.com/hraaaaf/Akarfinder/actions/runs/42502479682/artifacts/13625159435) inspecté : **Fès** 430×932 et 390×844 réussissent désormais le fallback V5 honnête ; sur **1280×900**, capture `fes-ville-nouvelle-1280x900.png` montrée à l'utilisateur et `report.json` prouvent `panelBox={x:918,y:76,width:350,height:836}` : **panneau déborde de 12px** (bottom=912 vs viewport=900), bien que l'overflow document soit zéro. C'est un VRAI bug visuel, pas un oracle CI trompeur. La source du bug est `app/map/market-convergence-correction.css` : conteneur Desktop National Map a `padding:12px`, mais panneau a `height:100%`, qui déborde sous le viewport.

**GOAL visuel** : sur écran 1280×900, garder le panneau à y≈76, garantir **≥10px de marge inférieure** et le CTA Search totalement visible ; préserver exactement les mises en page Fès 390/430 (déjà GREEN) et les autres villes. **Référence/mockup** = capture BEFORE ci-dessus avec simple correction de hauteur de panneau, pas d'invention géographique.

**Correction candidate** : uniquement pour le rail desktop de `[data-p4-map-layout]:has([data-akarfinder-national-map])`, calculer `height/max-height:calc(100svh - 88px)` (64 header + 12 padding top + 12 padding bottom), `box-sizing:border-box`, scroll interne conservé ; les modes MapLibre quartier ont déjà leur propre rail CSS. Lot8 conserve l'assertion bbox stricte et ajoute une exigence `bottomBreathingRoom>=10` pour les city fallbacks à 1024+. **AFTER et score visuel restent à certifier sur le même viewport via CI**, ne pas déclarer avant preuve. Aucun Vercel déployé.
