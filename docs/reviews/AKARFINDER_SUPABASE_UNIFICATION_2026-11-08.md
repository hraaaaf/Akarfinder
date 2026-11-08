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

### 08/11/2026 — Correctif candidat des audits Market Synthetic / Zillow UI (CI à recertifier)

**Point de départ vérifié** : PR #1196 Draft, HEAD `a47da9b6bf7c517f750e52fc6dd2af3cd263af8f` : 18 CI SUCCESS / 2 FAILURE / 1 SKIPPED. Market Synthetic [#42503162195](https://github.com/hraaaaf/Akarfinder/actions/runs/42503162195) est passé à Casablanca 390 et 1280 avant de bloquer sur l'ancien écran Rabat Explore ; Zillow UI [#42503162335](https://github.com/hraaaaf/Akarfinder/actions/runs/42503162335) attend un SVG Premium à la route Explore désormais MapLibre. Les deux builds ont produit des alertes Supabase sans secrets ; **cela n'établit aucune certification de données réelles**.

**Correction candidate** :
- Market Synthetic entre désormais sur `/map?city=rabat&layer=price` (même contrat de route que C7). Fixtures uniquement Playwright, modes Prix/Densité/Annonces, polygones interactifs, fiche et CTA Search toujours exigés ; capture sur échec Rabat.
- Zillow UI certifie **la route actuelle** `/map?layer=explore` sur les 4 tailles 390/430/768/1280 : MapLibre monté, style disponible, source et couche des villes, vraies features du fond, absence d'overflow, capture. Puis certifie **séparément** l'atlas historique en `/map?layer=premium` : 12 régions SVG, interactions accessibles, passage région→Casablanca→Maârif, absence de fausses statistiques locales, CTA, retour à Maroc, diagnostics et captures ; les assertions originales restent en place.
- **Statut** : code d'adaptation candidat uniquement, **aucune CI verte revendiquée tant que les nouveaux runs ne sont pas complets**. Workflows lourds inchangés ; aucune mutation BD, aucun merge, aucun déploiement Vercel. Si le parcours explicite Premium échoue sur un défaut réel, le traiter comme tel, sans neutralisation.

**Next exact** : examiner CI des deux scripts sur ce nouveau commit et leurs artefacts, réparer seulement sur preuve ; puis reprise des gates données autorisées → E2E réel → UX et intégration. Projet global non certifié.

### 08/11/2026 — Réparation basée sur capture du retour Zillow (2e candidat)

- **CI Market Synthetic** : [#42509042927 SUCCESS](https://github.com/hraaaaf/Akarfinder/actions/runs/42509042927) sur `776d08a253d052989b440aa24bd4a7550991b1fa`. Son parcours Rabat Prix/Densité/Annonces est certifié en synthetic-fixture uniquement, jamais comme marché réel.
- **CI Zillow** : [#42509042844 FAILURE](https://github.com/hraaaaf/Akarfinder/actions/runs/42509042844), [capture/rapport artefact #13628208003](https://github.com/hraaaaf/Akarfinder/actions/runs/42509042844/artifacts/13628208003). API réelle 341 localités, 292 contours et 10799 quartiers ; la carte MapLibre actuelle est chargée et la navigation Premium jusqu'à Maârif fonctionne en 390 px. Le clic du CTA de Maârif ouvre légitimement la route quartier Explore, puis le bouton retour renvoie à `/map?layer=explore` et affiche la carte moderne. **Erreur de notre assertion** : on attendait alors l'atlas SVG Premium au lieu du MapLibre Explore réellement monté. Capture `failure-390.png` examinée : carte nationale moderne visible, pas d'indice de régression de ce retour.
- **Correction candidate suivante** : à la sortie d'une fiche Maârif Explore, exiger le retour vers la carte moderne nationale, style MapLibre prêt et capture ; puis recharger explicitement `?layer=premium` et vérifier les 12 régions. Si le chemin n'a pas quitté Premium, conserver le contrôle original du fil d'Ariane. Aucun contrôle retiré, seules les exigences de retour ont été alignées sur le produit.
- **Gate** : ne déclarer Zillow GREEN qu'après nouvelle CI et captures sur 390/430/768/1280 ; PR reste Draft, données non migrées, aucun merge/déploiement Vercel.

### 08/11/2026 — Closeout auditeurs hérités : Market Synthetic / Zillow UI GREEN

**Preuve GitHub commune au commit `c61d84718b818cc2a10a248386b32a01bebd7fc3`** :
- [Market Synthetic CI #42509593231 — SUCCESS](https://github.com/hraaaaf/Akarfinder/actions/runs/42509593231) ; [artefact #13628758720](https://github.com/hraaaaf/Akarfinder/actions/runs/42509593231/artifacts/13628758720) : `report.json.ok=true`, 4 cas (Casablanca 390/1280 Prix, Rabat 390/1280 Prix-Densité-Annonces+fiche), `truthScope=synthetic-ui-only`, CTA /search Rabat/Hassan contrôlé et capture pour chaque mode. **Pas** de données marché réelles certifiées.
- [Zillow UI CI #42509593139 — SUCCESS](https://github.com/hraaaaf/Akarfinder/actions/runs/42509593139) ; [artefact #13627949592](https://github.com/hraaaaf/Akarfinder/actions/runs/42509593139/artifacts/13627949592) : `report.json.ok=true`, **4/4 viewports 390/430/768/1280**, vraie carte MapLibre nationale avec source/couche villes et ≥1 feature de fond rendue, zéro débordement, atlas SVG explicite Premium avec `topologyState=ready`, 12 régions + 12 boutons, navigation Casablanca→Maârif→retour MapLibre puis réouverture Premium, screenshots. Inventaire API 341 villes / 292 contours / 10799 quartiers. Aucun `pageerror`; les requêtes annulées `ERR_ABORTED` sont tracées mais exclues des échecs critiques (navigation/prefetch).
- [Policy Efficiency CI #42509593129 — SUCCESS](https://github.com/hraaaaf/Akarfinder/actions/runs/42509593129). Aucun seuil supprimé, aucune désactivation de tests ni modification de workflows lourds.

**Limite visuelle explicite** : les deux screenshots `modern-morocco-390-after.png` et `modern-morocco-1280-after.png` ont été inspectés. Le 390 affiche encore un texte « Desktop : survolez ou cliquez. Mobile : touchez... » non ciblé selon appareil ; point UX éditorial séparé à corriger sans confondre avec les deux anciennes pannes CI. La certification d'un contrat navigateur n'est pas un score de fidélité au mockup, ni preuve des prix de marché ou du E2E Supabase réel.

**Sous-lot audits hérités** : GREEN sur SHA de code `c61d8471` avec rapports et artefacts. **Lot migration Supabase toujours ouvert** : sources publiables réelles non qualifiées, Thin Index/ODM Neon restant, E2E HTTP/UI sans secrets de la nouvelle base, quotas et déploiement. Cette mise à jour documentaire n'autorise ni migration de données, ni merge, ni déploiement Vercel.

**Next exact** : contrôler CI de la PR sur le HEAD docs-only, puis qualifier les seules sources réutilisables légalement avant E2E Supabase isolé. Aucun avancement global en % certifié.

### 08/11/2026 — Audit migration DB-06 préparatoire : garde Thin Index legacy + paramètres SQL

**Preuves source GitHub lues au HEAD `5577bb95` avant changement :**
- `lib/search-gateway/public-search-cursor.ts` bloque déjà les appels à `search_public_representations_v2` lorsque `DATABASE_PROVIDER !== neon`, avec `public_search_index_unavailable`. `app/api/search/gateway/route.ts` dégrade explicitement dans ce cas ; un autre chemin `appendSeedThinIndexResults` peut toutefois être appelé en cas d'autres erreurs.
- `lib/search-gateway/seed-thin-index.ts` contient deux appels `queryNeonRows` sans test de fournisseur à l'entrée, donc risque de lecture ancienne DB en dégradation hors fournisseur Neon. De plus, le filtre des `listing_sources` construisait les tokens SQL `IN (1, 2, ...)` au lieu de placeholders liés `IN ($1, $2, ...)`, incompatibles avec la colonne URL texte.
- `/api/search` utilise le moteur structuré sélectionné par `lib/db/index.ts` en dégradation ; la reconstruction du Thin Index sur Supabase **n'est pas faite**.

**Correctif candidat en code PR (aucune mutation DB) :** garde `getDbProvider() === "neon"` immédiatement en tête de `searchSeedThinIndexPage`, avant toute requête ; refus explicite `public_search_index_unavailable` pour les autres providers, sans utiliser le mot Supabase dans le module historique Neon-only ; helper `positionalSqlPlaceholders` limité à 1..200 et générant les marqueurs `$n` pour `queryNeonRows`. Tests `neon-only-runtime-critical-paths.test.ts` étendus : vérifier les marqueurs 1/3, les bornes invalides, l'ordre du garde et le comportement avec `DATABASE_PROVIDER=supabase` et `sqlite`. CI Neon-only doit certifier sans modification du workflow.

**Lecture réelle DB cible** : le projet `AkarfFnder/mgqsckxsqdqbzqwkgvwo` répond `ACTIVE_HEALTHY`, une lecture SQL distincte montre `property_listings=0`, `listing_sources=0`, `buyer_leads=0` et `owner_listing_representations=0`. L'advisor sécurité rapporte 9 `INFO rls_enabled_no_policy` (modèle volontaire privé) et aucun `WARN` dans la réponse ; 9 tables ont RLS selon l'advisor. **Aucune donnée migrée / aucune écriture BD.**

**Statut** : correctif candidat tant que CI `Neon-only Runtime P0` + validations de branche non GREEN. Ne pas interpréter cette garde comme migration de l'index ODM ou autorisation de réutilisation des offres tierces. Next : certifier CI sur HEAD puis inventaire juridique et qualité des sources avant vrai E2E.

### 08/11/2026 — DB-06 source isolation : 20 CI SUCCESS, 1 SKIPPED ; droits externes bloquants

**Code certifié :** HEAD `df2371e5d913136a92d78e256e9fdfc8d8738d4b`, PR #1196 Draft, non fusionnée. **20/20 workflows exécutés SUCCESS et 1 SKIPPED, aucun FAILURE** ; preuve exacte par `fetch_commit_workflow_runs`.
- [Neon-only P0 #42510785171 SUCCESS](https://github.com/hraaaaf/Akarfinder/actions/runs/42510785171) teste effectivement le refus du lecteur Thin Index legacy avec `DATABASE_PROVIDER=supabase/sqlite` et les placeholders numérotés ; garde avant SQL, pas de requête Neon possible hors Neon.
- [Supabase Unified Read #42510785208 SUCCESS](https://github.com/hraaaaf/Akarfinder/actions/runs/42510785208), [Efficiency #42510785122 SUCCESS](https://github.com/hraaaaf/Akarfinder/actions/runs/42510785122), [C7 #42510785062 SUCCESS](https://github.com/hraaaaf/Akarfinder/actions/runs/42510785062), [Lot8 Multi-city #42510785261 SUCCESS](https://github.com/hraaaaf/Akarfinder/actions/runs/42510785261), [Zillow UI #42510785119 SUCCESS](https://github.com/hraaaaf/Akarfinder/actions/runs/42510785119), [Market Synthetic #42510785246 SUCCESS](https://github.com/hraaaaf/Akarfinder/actions/runs/42510785246). Toutes les 21 conclusions de ce HEAD ont été contrôlées.

**Preflight source en lecture seule, source locale privée** (Desktop `AkarFinder-DataMass-2026-11-07`, pas de transfert de lignes ni vers GitHub ni vers Notion) :
- `manifest.json` indique le backup Supabase du 13/10/2026, `property_listings=19 616` et `listing_sources=19 621` (inventaire de l’archive, pas stock actif certifié). `Q1C_STAGING_RESULT.manifest.json` : 95 825 URL candidates, 95 696 nouvelles, `reuse_rights=NOT_PROVEN`, `current_listing_status=UNKNOWN`, déduplication physique inconnue. Les archives URLs ne sont pas des mandats.
- `Q1E_DESCRIPTION_REVIEW_RESULT.manifest.json` : l’ancienne table Neon a 151 900 lignes, 14 950 descriptions non vides en SQL source, **zéro** description récupérée dans l’export local (projection absente), une revue de 100 entrées avec **zéro adjudication indépendante** du prix/type/surface, `certified=false` et `neon_import_authorized=false`. Ni chiffres d’annonce active ni droit de diffusion établis.
- Vérifications primaires externes : [Mubawab CGU](https://www.mubawab.ma/fr/privacy) interdit extraction/réutilisation commerciale ou reproduction sans autorisation ; [MarocImmo CGU du 24/10/2026](https://www.marocimmo.com/fr/conditions-utilisation) interdit extraction automatique des annonces/photos/données sans accord ; [Sarouty conditions](https://www.sarouty.ma/conditions-generales-dutilisation/) prévoit notamment consentement préalable pour insérer/référencer leurs documents. Les CGU ne valent pas licence et ne préjugent pas d’accords privés distincts.

**GO/NO-GO DATA : NO-GO** tant qu’aucun contrat/mandat/permission vérifiable n’établit la source autorisée, son périmètre exact (métadonnées, liens, textes, images, coordonnées), la fraîcheur et la validité. Ne pas republier les 151 900 lignes historiques, ni importer 95 825 URLs comme offres actives. Les données de tiers peuvent éventuellement être conservées en preuve privée selon autorisations applicables ; aucun nouveau partage décidé ici.

**Gates restants :** (1) licences/provenances documentées + échantillon source de première main ou partenaire autorisé ; (2) inventaire qualité/fraîcheur/dédoublonnage et capacité DB Free ; (3) migration contrôlée de cet échantillon sur base test privée avec rollback et RLS ; (4) E2E Next/API/UI sur Supabase sans Vercel déployé ; (5) revue UX/résultats ; (6) décision humaine de bascule Production. **Aucune DB écrite, aucun merge, aucun Vercel déployé**.

**État :** sous-lot isolation du Thin Index GREEN sur HEAD code certifié ; migration Supabase globale et pourcentage projet toujours non certifiés.


### 08/11/2026 — DB-07 : reprise réelle des 9 990 observations et audit privé de disponibilité (READ-ONLY)

**GOAL** : rechercher la cohorte existante dans les anciennes PR plutôt que supposer un besoin de réacquisition. **Résultat prouvé** : [PR #1176](https://github.com/hraaaaf/Akarfinder/pull/1176) contient l'union de **9 990 observations historiques détaillées**, avec provenance source, champs économiques et horodatages ; [PR #1095](https://github.com/hraaaaf/Akarfinder/pull/1095) démontre une **autre cohorte** de 8 367 fiches V4.11 importées en Neon isolé le 26/09. **Ne jamais additionner ces deux nombres sans jonction contrôlée.**

**Audit effectivement exécuté DEUX fois sur le PC privé connecté**, depuis `observations_detailed_union_20261107.jsonl.gz` ; script privé `_q1b_audit_9990_20261108.py`, résultat agrégé privé `Q1B_9990_READINESS_AGGREGATES_20261108.json` :
- SHA-256 entrée gzip inchangé sur les deux passes : `76635208549dbce618cf0de9de5e3109f0ac39deefb08f83a330a882fed5f1ee` ; 9 990 enregistrements parsés sans erreur, 9 990 clés (domaine, ID, observation_ts) distinctes, **9 967 identités domaine/ID**, 9 990 URL canoniques distinctes ; **0 champ obligatoire manquant** et 0 prix/surface non positifs dans cet export.
- `rights_status=unknown_not_proven` : **9 990/9 990**, soit **0 droit de réutilisation prouvé par la pièce**. `quality_status=historical_detailed` : 9 990/9 990 ; cela qualifie **la structure du registre, pas la précision à la source ni une licence**.
- Date d'observation au 08/11/2026 : **0 ≤30 jours**, **6 307 entre 31 et 90 jours**, **3 683 >90 jours**. Dernière vue : **0 ≤30 jours**, **8 625 entre 31 et 90 jours**, **1 365 >90 jours**. **Aucune offre actuellement active n'est certifiée**.
- Sources historiques par domaine (uniquement agrégats) : Mubawab **6 355**, Domio **2 048**, DarAgadir **1 255**, Sarout **287**, Mouldar **21**, Agenz **16**, Masaken **5**, 1Immo **3** ; somme = 9 990. Les 9 990 ne prouvent pas 9 990 biens physiques uniques.
- Aucun enregistrement brut, URL, capture, coordonnée vendeur ni PII téléchargé hors du PC privé ; ni export GitHub/Notion des fiches source.

**Corroboration Neon Recovery indépendante (SQL SELECT uniquement)** : branche `br-cold-mouse-b2a50yaa`, base `AkarFinder` : **151 900 `listing_sources`**, `is_active=true` pour **151 900** mais **0 `last_seen_at` depuis le 09/10/2026**, **98 525 `last_seen_at` NULL**, maximum `2026-09-26T23:59:59Z` ; **0 origine explicitement `first_party` ou `partner_authorized`**. Ici, `is_active` n'est **pas** une preuve de disponibilité actuelle.

**Décision DATA : GO inventaire/préparation interne, NO-GO publication/import commercial** : le corpus existe et son format est techniquement réutilisable pour contrôle privé ; aucune annonce n'est certifiée « prête à publier ». Les labels de conformité/activité ne remplacent ni autorisation source ni preuve datée d'offre active. Nouvelle Supabase reste vide, aucune requête d'écriture sur DB, aucune production, merge ou déploiement Vercel.

**Next exact** : bâtir la matrice stricte `source_domaine × preuve_contractuelle × droits_autorisés × observation_récente × identité × contrôle_humain` ; sur les **9 990 existantes**, sélectionner un échantillon **dont les droits réels sont prouvés** (et non seulement les champs complets), vérifier fraîcheur et unicité physique, effectuer import **privé isolé** avec rollback + E2E avant toute demande de bascule prod. Si aucun accord documenté : *zéro import* et contractualiser un flux first-party/partner. **% global non certifié**.


#### DB-07B — rapprochement exact entre les deux cohortes, sans double comptage

**Nouvelle preuve, audit privé répété deux fois** : script local `_q1b_v411_exact_url_overlap_20261108.py`, résultat agrégé privé `Q1B_V411_EXACT_URL_OVERLAP_20261108.json`. Source 1, `observations_detailed_union_20261107.jsonl.gz` SHA-256 `76635208549dbce618cf0de9de5e3109f0ac39deefb08f83a330a882fed5f1ee` ; source 2, `neon_recovery_export_20261107.jsonl.gz` SHA-256 `c3d8a8c9476602baa7663d1e9903e6015cb7300d6e7539183bf48b735cb76b08`. Comparaison **strictement des chaînes URL stockées** `Q1B.canonical_url == Neon.listing_url`, sans réécriture/fuzzy matching, sans transfert de lignes ni PII :
- 9 990 URLs distinctes Q1B ; 8 367 URLs distinctes de la cohorte `compliance_status=recovery_certified_v4_11` dans les 151 900 lignes Neon.
- **2 335 URL exactes communes**, donc **6 032 URL V4.11 absentes de l'union Q1B** et **7 655 URL Q1B absentes de V4.11** ; total **16 022 URLs distinctes** dans l'union Q1B∪V4.11.
- Contrôle témoin : les **3 740** observations détaillées Neon incluses dans Q1B ont toutes une URL exacte dans l'export Neon de 151 900 ; cela confirme l'appariement exact des chaînes sur leur source historique.
- Répartition V4.11 : `marocimmo.com=4 473`, `domio.ma=3 462`, `sarout.ma=432`. Les **6 032 URLs supplémentaires sont seulement des représentations historiques non encore rapprochées en bien physique**, et **non 6 032 nouvelles annonces fraîches/contractuellement autorisées**.

**Verdict** : baseline technique potentielle **16 022 liens immobiliers distincts**, **0 volume publiable certifié**. Pas de migration Supabase, ni changement de politique de diffusion. Le contrôle juridico-commercial doit agir au niveau source/mandat et offre datée, et pas seulement sur l'URL.
