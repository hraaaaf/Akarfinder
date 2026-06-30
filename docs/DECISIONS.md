DECISIONS.md - Validated Decisions

This file contains only validated decisions.

Do not add ideas here unless validated by the project owner and virtual associate.

Decision format

Use this format:

## YYYY-MM-DD - Decision title
Status: Validated / Rejected / Pending
Decision:
- ...
Reason:
- ...
Impact:
- ...

2026-06-19 - Project direction

Status: Validated

Decision:

* AkarFinder is a Moroccan real-estate search engine.
* It is not a luxury agency website.
* The core promise is: "Toutes les annonces immobilières du Maroc. Une seule recherche."

## 2026-06-25 - Direction artistique Kimi — Usage et limites

Status: Validated

Decision:
- La direction artistique du design Kimi (hero sombre immersif, palette noir/crème/doré, typo premium, search box centrale, footer noir) est utilisée comme inspiration visuelle pour la homepage AkarFinder.
- Les textes dangereux du design Kimi ne sont pas repris : stats inventées ("50 000 utilisateurs", "35% économies", "note 4.8"), claims non vérifiés ("vérifié", "garanti", "certifié"), CTA "Créer un compte gratuit" non aligné.
- AkarFinder conserve son positionnement de moteur de recherche immobilier intelligent, avec des données indicatives et sans claims non vérifiés.
- Les stats affichées proviennent exclusivement de /api/stats (données réelles) ou de labels produit indicatifs si les chiffres sont nuls.

Reason:
- Le design Kimi apporte une direction artistique premium pertinente pour le marché marocain.
- Les claims non vérifiés créeraient un risque juridique et une perte de crédibilité produit.
- AkarFinder doit rester différencié en tant que moteur, pas agence.

Impact:
- Homepage visuellement premium sans compromettre l'honnêteté produit.
- Inspiration = palette + layout + typographie. Pas les textes ni les chiffres.

Reason:

* The Moroccan market has fragmented real-estate listings.
* Users waste time across portals, agencies, Facebook, Google, and promoter channels.

Impact:

* Product must be search-first.
* Landing must not look like a generic luxury agency template.

## 2026-06-25 - P11D — Lead inbox : premier pont de monétisation

Status: Validated

Decision:
- P11D est le premier pont de monétisation entre l'onboarding acheteur (P12A) et le Pro dashboard (P11).
- Les soumissions de /onboarding deviennent des buyer leads consentis dans Supabase (table buyer_leads).
- Double consentement obligatoire avant tout enregistrement : consent_contact ET consent_indicative.
- La température du lead est recalculée côté serveur — la valeur client n'est pas acceptée.
- Le numéro WhatsApp est normalisé (espaces, tirets supprimés) avant insertion.
- /api/leads : POST uniquement — aucun GET public, aucun SELECT public via API.
- /pro/leads : accès par token URL (LEADS_ADMIN_TOKEN) — authentification complète repoussée.
- Distribution de leads non automatisée — transmission manuelle uniquement jusqu'à P11D-v2.
- Aucun lead n'est vendu sans opt-in clair et workflow de consentement documenté.

Reason:
- Valider la valeur B2B avant de construire un dashboard complexe avec auth complète.
- Le token URL est suffisant pour usage interne MVP ; l'exposition publique requiert Supabase Auth.
- Recalculer la température serveur-side évite la manipulation client du score.
- La table buyer_leads utilise RLS (service_role_all, no anon read/write) : sécurité par défaut.

Impact:
- Les leads P12A onboarding sont capturés en production dès que buyer_leads est créée.
- Le wording "préqualifié", "crédit garanti" etc. reste interdit dans tous les chemins lead.
- Next steps : appliquer db/supabase-leads-migration.sql, puis ajouter Supabase Auth.
- P11E (boosts), P11F (analytics), P12B (crédit), P13 (SEO) restent NON DÉMARRÉS.

## 2026-06-25 - P11D-C — Les demandes de visite sont des leads ultra-chauds, jamais des visites confirmées

Status: Validated

Decision:
- Les demandes de visite sont stockées dans `buyer_leads` avec `lead_type = visit_request`.
- Une demande de visite valide est traitée comme un lead ultra-chaud (`lead_temperature = chaud`) tant qu'elle contient consentement, contact et intention de créneau.
- AkarFinder n'affiche jamais "visite confirmée" dans ce MVP ; le bon wording est "Demande envoyée" et "En attente de confirmation".
- Pour les annonces `indexed_only`, AkarFinder stocke la demande en interne mais ne prétend pas notifier automatiquement le propriétaire, l'agence ou la source.
- Le suivi WhatsApp reste manuel depuis `/pro/leads`; aucun envoi automatique n'est déclenché.

Reason:
- Une demande de visite est le signal d'intention le plus fort avant contact commercial réel.
- Les annonces agrégées ne donnent pas à AkarFinder le droit de contacter automatiquement des tiers sans autorisation explicite.
- Confondre demande et confirmation créerait une promesse produit fausse et juridiquement risquée.

Impact:
- `/listings/[id]` peut capter des leads de visite à forte valeur sans mentir sur la disponibilité réelle.
- `/pro/leads` devient la boîte interne unique pour les dossiers acheteurs et les demandes de visite.
- La confirmation de visite, l'automatisation WhatsApp/SMS, la synchronisation calendrier et les notifications source restent hors scope jusqu'à validation explicite.

## 2026-06-25 - Phase 3 Supabase production vérifiée et close

Status: Validated

Decision:
- Phase 3 est déclarée COMPLÉTÉE suite à la vérification P3-QA du 2026-06-25.
- DATABASE_PROVIDER=supabase activé en production (env var serveur).
- SUPABASE_SERVICE_ROLE_KEY : serveur uniquement — jamais NEXT_PUBLIC_, jamais client.
- RLS activé sur les 4 tables (scrape_runs, raw_listings, property_listings, listing_sources).
- Politique anon_read non activée — toutes lectures via routes Next.js (service role).
- 82 listings + 83 sources en Supabase, 8/8 checks npm run check:supabase.
- /api/listings, /api/stats, /search, /listings/[id] : confirmés sur Supabase.
- Fallback SQLite (DATABASE_PROVIDER=sqlite) conservé pour dev local.
- Pas de stack trace exposée dans les réponses API.
- docs/SUPABASE_SETUP.md créé comme documentation de référence.

Reason:
- Le code Supabase (lib/db/) était déjà entièrement construit ; il manquait la vérification
  end-to-end et la documentation de clôture de phase.
- La vérification confirme que l'architecture dual-provider est opérationnelle sans fragilité
  de sécurité (pas de clé client-side, pas de policy ouverte sur INSERT/UPDATE).

Impact:
- Phase 4 (Typesense) et Phase 5 production (P10B-DB) sont maintenant débloquées.
- La Phase 5 production nécessite encore : lat/lng en DB (P10B-DB) + géocoding Nominatim (P10F).
- Les prix observés P10D restent sur dataset statique ; le calcul dynamique depuis Supabase
  est la dette technique P10D-LIVE documentée dans ROADMAP.md.

## 2026-06-24 - Image permission model (P10IMG)

Status: Validated

Decision:
- Real photos are only shown when image_permission_status === "allowed" AND source_access_level === "partner_full" | "preview_allowed".
- Scraped/indexed listings (indexed_only) always render ListingVisual SVG fallback, never a copied photo.
- Gallery display requires partner_full only (not preview_allowed).
- unknown or forbidden permission → always fallback, no exceptions.
- model typed in lib/listings/types.ts (ImagePermissionStatus, SourceAccessLevel, ImageFallbackType).
- Policy logic isolated in lib/listings/image-policy.ts (4 helpers, fully tested).
- image_url kept as legacy field; new primary field is main_image_url.

Reason:
- Scraping photos from portals without permission creates legal exposure.
- Citing the source (image_source) is NOT the same as having permission to reuse the image.
  An annonce can have image_source="Mubawab" and still be image_permission_status="unknown" —
  attribution tells users where to find the original, not that AkarFinder can host the photo.
- AkarFinder's core value is indexing + scoring, not photo rehosting.
- Partners (promoteurs, agencies) get a visible advantage: real photos and gallery.

Impact:
- 9/11 mock listings use indexed_only + unknown/forbidden (SVG fallback).
- 2/11 mock listings are demo partner_full (real photo shown).
- PhotoFirstListingCard and ListingDetail hero both use getListingImageMode().
- image_source is used for attribution display only, never as a permission signal.

## 2026-06-24 - Prix observé (P10D)

Status: Validated

Decision:
- AkarFinder uses "prix/m² observé" as an indicative market reference based on analyzed listings.
- It is not an official price, certified valuation, investment advice, or guaranteed market value.
- Allowed wording: "prix/m² observé", "repère marché indicatif", "basé sur annonces comparables", "confiance faible/moyenne/élevée".
- Forbidden wording: "prix officiel", "valeur garantie", "estimation certifiée", "Zestimate", "prix réel du marché".
- Confidence levels: élevée ≥ 30 annonces, moyenne 10–29, faible < 10.
- getListingObservedPriceComparison() returns one of 4 labels: "Prix cohérent", "Prix supérieur au repère observé", "Prix inférieur au repère observé", "Données insuffisantes".
- All blocks carry the disclaimer: "Données indicatives issues de l'analyse AkarFinder — non officielles."
- Dataset is static (lib/market/morocco-market-prices.ts). Live DB computation is deferred to Phase 3/Supabase.
- Static seed references must NOT be presented as live market data. The confidence badge and sample_count are shown to help users calibrate trust.
- When the source is a static seed (not computed from property_listings), the disclaimer "Données indicatives issues de l'analyse AkarFinder — non officielles" is mandatory and sufficient.

Reason:
- Buyers need market context without AkarFinder pretending to be a certified appraiser.
- Safe indicative wording builds trust; false precision destroys it.
- Static dataset avoids premature DB dependencies before Phase 3.

Impact:
- MarketReferenceBlock on /listings/[id] shows observed range + comparison + confidence.
- PhotoFirstListingCard shows compact badge: "Prix cohérent" / "Prix supérieur au repère" / "Repère faible" / "Données limitées".
- getListingObservedPriceComparison() provides programmatic comparison for any listing.

## 2026-06-25 - AkarFinder s'inspire de Zillow sans le copier

Status: Validated

Decision:
- AkarFinder s'inspire de Zillow uniquement pour les patterns produit utiles,
  mais priorise les fonctionnalités selon les réalités du marché marocain.
- L'ordre retenu (comparateur → shortlist → alertes → budget indicatif →
  historique d'annonce → marché local) est dicté par la valeur utilisateur
  immédiate, pas par la feature list Zillow.
- Chaque fonctionnalité conserve les guardrails AkarFinder : wording indicatif,
  aucune promesse bancaire, aucune promesse juridique, aucune garantie de
  disponibilité, consentement obligatoire avant toute notification.
- Les claims restent toujours indicatifs : "observé", "estimatif", "à confirmer".
- Aucune fonctionnalité MLS / "agent premier" / publicité forcée n'est introduite
  sans validation explicite du modèle économique.

Reason:
- Zillow a développé ses fonctionnalités pour le marché américain avec MLS,
  agents certifiés et financement standardisé. Ces prérequis n'existent pas au Maroc.
- Le marché marocain a des spécificités : décision familiale, acheteurs MRE,
  marché fragmenté, absence de données cadastrales publiques structurées.
- Copier Zillow sans adaptation créerait des features inadaptées et des claims
  impossibles à tenir.

Impact:
- P15A–P19B documentées dans ROADMAP.md avec guardrails adaptés Maroc.
- P11E, P11F, P12B, P13, P14 restent Not started.
- Aucun fichier applicatif modifié dans cette mission.

2026-06-19 - Geographic strategy

Status: Validated

Decision:

* AkarFinder covers all Morocco.
* The product emphasizes large cities and high-volume markets.

Priority cities:

* Casablanca
* Rabat
* Tanger
* Marrakech
* Agadir
* Fès
* Meknès
* Kénitra
* Mohammedia
* El Jadida

Reason:

* The opportunity is national.
* Big cities create stronger volume and better data.

Impact:

* Search and data model must support national coverage.
* UI should allow city prioritization without excluding smaller cities.

2026-06-19 - Primary monetization target

Status: Validated

Decision:

* Promoters are the first monetization target.
* Agencies are secondary.
* Buyers remain free at the beginning.

Reason:

* Promoters have projects, budgets, and measurable need for qualified leads.
* Sakan Expo creates a direct promoter acquisition channel.

Impact:

* MVP must include promoter value.
* Lead qualification and Sakan Expo integration are strategic.

2026-06-19 - Core data sources

Status: Validated

Decision:
AkarFinder may explore:

* real-estate portals;
* agency CSV/XML imports;
* promoter imports;
* Facebook Marketplace;
* Facebook groups, intelligently filtered;
* Google-indexed public listings;
* Sakan Expo exhibitor inventory.

Reason:

* Moroccan real-estate supply is fragmented across many channels.

Impact:

* Scraping/import architecture must be modular.
* Source tracking is mandatory.
* Legal/credibility caution is required.

2026-06-19 - Particulier direct publishing

Status: Validated

Decision:

* Direct listing publication by individuals is not a V1 priority.

Reason:

* It adds moderation, fraud, and support complexity too early.

Impact:

* MVP focuses on aggregated listings, promoters, agencies, and Sakan Expo.

2026-06-19 - Reliability filter

Status: Validated

Decision:

* AkarFinder should include a reliability filter and reliability score.

Reason:

* Trust is a major pain in Moroccan real-estate search.
* Duplicate, old, and suspicious listings reduce user confidence.

Impact:

* Each listing should eventually have trust indicators.
* Deduplication and source freshness matter.

2026-06-19 - MRE filter

Status: Validated

Decision:

* AkarFinder should include MRE-oriented filters.

Reason:

* MRE buyers need trust, remote handling, WhatsApp contact, clear timelines, and verified promoters.

Impact:

* Search filters and lead forms must include MRE-specific fields.

2026-06-19 - Qualified lead strategy

Status: Validated

Decision:

* AkarFinder should sell qualified buyer intent, not generic contacts.

Lead fields:

* budget;
* city/quartier;
* property type;
* purchase timeline;
* MRE/resident status;
* country of residence if MRE;
* cash/credit;
* WhatsApp;
* lead temperature.

Impact:

* Lead scoring is part of the MVP logic.
* Promoter value depends on lead quality.

2026-06-19 - Level 0.5 workflow gate

Status: Validated

Decision:

* Level 0 is completed.
* Level 0.5 is added before Level 1.
* Codex must prove it follows the documentation workflow before implementation.

Reason:

* The repository needs an explicit workflow gate before product execution starts.
* Documentation discipline must be demonstrated before UI, scraping, or feature work begins.

Impact:

* Level 1 landing cleanup must not start yet.
* Repository work should stay focused on workflow normalization until Level 0.5 is complete.
* Future implementation missions must clearly align with AGENTS.md and docs/START.md first.

2026-06-19 - Level 0.5 completed and Level 1 authorized as next mission

Status: Validated

Decision:

* Level 0.5 is completed.
* Level 1 is authorized as the next mission.
* Codex passed the workflow-control test.

Reason:

* Codex proved it can read the required documentation, update control files, and avoid starting implementation without validation.

Impact:

* The repository is ready to begin Level 1 planning when explicitly requested.
* No implementation should start automatically from this decision alone.

2026-06-19 - Level 1A frontend app bootstrap added before Level 1

Status: Validated

Decision:

* Level 1A frontend app bootstrap is added before Level 1.

Reason:

* No frontend implementation existed in the repository.

Impact:

* A minimal frontend shell must be created before landing cleanup can begin.
* Level 1 remains pending until the frontend base exists.

2026-06-19 - Level 1A frontend bootstrap completed

Status: Validated

Decision:

* Level 1A frontend bootstrap is completed.
* The Next.js shell is now the production frontend starting point.

Reason:

* Frontend dependencies were installed successfully.
* The minimal app shell builds successfully in production mode.

Impact:

* The repository is ready for Level 1B landing implementation.
* Level 1 can now proceed on a validated frontend base.

2026-06-19 - Landing accepted as sufficient to move forward despite remaining homepage polish debt

Status: Validated

Decision:

* The landing is accepted as sufficient to move forward despite remaining homepage polish debt.
* Level 1E premium polish is completed.
* Level 2 - App shell and search UI is authorized as the next mission, but not started.

Reason:

* Desktop is strong enough to represent AkarFinder.
* Global landing quality is acceptable for moving forward.
* Further homepage polish would delay product development.
* Level 2 product work is now more important.

Impact:

* Homepage polish debt remains documented.
* Level 2 is authorized as the next mission.
* No Level 2 implementation starts until explicitly launched.

2026-06-19 - AkarFinder product experience pivots to Light Zillow Morocco

Status: Validated

Decision:

* External positioning: "La carte intelligente de l'immobilier marocain" (not "Zillow marocain" or "Zestimate")
* 2-column layout first, not 3-column
* Static premium map first, not fake Google Maps or interactive APIs
* WhatsApp-first conversion (primary CTA)
* Mock-only implementation before data work
* Price context label: "Repere marche indicatif" (not "fourchette estimee" or "Zestimate")
* Photo placeholders use CSS gradients per city with Moroccan-feel visual treatment

Reason:

* The Moroccan real-estate buyer needs trust signals, WhatsApp contact, and price/m² context.
* MRE buyers need remote-friendly flows and clear market context.
* Fake Google Maps or interactive map APIs are not available at this stage and would create false expectations.

Impact:

* /search is now the Light Zillow Morocco experience.
* Search shell, filters, listing cards, and map panel are all updated.
* Landing components are untouched per the freeze rule.

2026-06-19 - Current AkarFinder UI/UX state frozen before Zillow-style pivot

Status: Validated

Decision:

* The current landing UI/UX is frozen as a stable baseline before a planned Zillow-style redesign pivot.
* All components, design tokens, and section order from the 2026-06-22 redesign session are preserved.
* No component may be deleted or replaced until the Zillow pivot is explicitly launched as a named mission.

Reason:

* The redesign session produced a credible proptech product (score ~72/80) that represents useful, validated work.
* Starting a Zillow-style pivot without freezing the current state risks losing context and overwriting improvements that took multiple sprints to reach.
* Preserving the current state as a checkpoint ensures the next direction is intentional, not accidental.

Impact:

* Current landing UI becomes the official pre-Zillow baseline.
* The Zillow redesign direction can now be planned without erasing prior work.
* No components are deleted unless explicitly replaced by a validated Zillow-level equivalent.
* Next agent must explicitly receive a Zillow mission before touching any landing component.

2026-06-22 - Listing detail becomes a Zillow-style decision dossier (Level 2E direction)

Status: Validated

Decision:

* /listings/[id] will be enriched into a "mini decision dossier" inspired by Zillow's listing page, while staying mock-only.
* The listing page structure is fixed as: (1) hero photo with price/quartier/prix-m²/badges, (2) WhatsApp-first conversion CTA (sticky), (3) résumé rapide (surface/chambres/sdb/source-fraîcheur), (4) Repère marché indicatif with a position label (cohérent / élevé / bas) and disclaimer, (5) Quartier & proximité (mock, indicatif), (6) Historique annonce (mock: prix initial/actuel, variation %, source), (7) Biens similaires (derived from existing mock data), (8) Bloc MRE.
* Price context wording stays "Repère marché indicatif" — never "Zestimate", "fourchette estimée", or "estimation officielle".
* Proximity/neighborhood values are mock and explicitly labelled indicatif; no Google Maps or live distance APIs.
* This is sequenced as Level 2E, before Level 3 data ingestion.

Reason:

* Zillow's strength is not showing a listing but turning each property into a decision dossier (core facts, market value estimate clearly labelled, price history, neighborhood data).
* For the Moroccan market the decisive question is not only "what is this worth?" but "is this listing real, recent, well located, fairly priced, and can I reach someone fast on WhatsApp?".
* Price history and proximity blocks are highly credible and useful in Morocco (listings often stay online too long), and can be built convincingly with mock data before real data exists.

Impact:

* Level 2E is added to the roadmap before Level 3.
* New optional mock fields may be added to the listing type (year_built, lot_size, status, price_history, amenities) with safe fallbacks.
* Credibility guardrails are mandatory: no fake official estimates, no scientifically-claimed scores, no unsourced automatic distances, no scraping.
* The differentiator vs Zillow is explicit: fiabilité + WhatsApp + MRE + source analysée + repère quartier + Sakan Expo (not Zestimate + MLS + mortgage).

2026-06-22 - Homepage credibility cleanup before data work (Level 2D)

Status: Validated

Decision:

* The homepage must not promise more than the product delivers. It is refactored to prepare exactly for /search and /listings.
* No fake volume: remove "+150 000 annonces indexées" and any unverified numeric claim; KPI-style figures are replaced by qualitative labels.
* No current AI estimation promise: remove "Estimation IA" / "Valeur estimée …" as a present feature; only "Repère marché indicatif" wording is used. Never "Zestimate".
* No named third-party portal brands or logos on the homepage; sources are described generically (portails immobiliers, agences, promoteurs, annonces publiques).
* No fake partnerships; Sakan Expo / promoteurs is presented as a future professional bridge only.
* Visual baseline is the white/blue Light Zillow system (consistent with /search and /listings); navy/gold survive as accents only, not as the dominant homepage background.

Reason:

* The listing detail (Level 2E) and search (Level 2C.3) are credibility-safe; the homepage still carried older marketing claims that contradicted them (fake volume, AI estimation, named portals).
* A product is only as credible as its weakest visible claim; the entry page must match the restraint of the rest of the product.

Impact:

* Homepage rebuilt around ProductHero + WhySection (3 pillars) + ListingPreview + HowItWorks + MreTrustSection + HomeFinalCTA.
* siteStats, sources, whyReasons and the nav were cleaned in lib/site.ts; StatsBar/PartnersBar/AlertCTA/ToolBlocks/MoroccoMapSection/Hero are no longer rendered.
* The white/blue Light Zillow system is now the confirmed baseline across home, search, and detail.

2026-06-23 - Homepage hero restored from Level 1E visual direction

Status: Validated

Decision:

* The homepage hero should reuse the stronger Level 1E Casablanca visual direction.
* The hero keeps a dominant real-estate search panel above the fold.
* The current credibility-safe product context remains mandatory: no fake volume, no named portal logos, no real-time claim, no AI estimation promise, and no fake partnership.

Reason:

* Human review preferred the Level 1E hero because it felt more premium, national, and closer to a serious Moroccan real-estate search engine.
* The later homepage had stronger product structure, but the hero had lost some emotional impact.

Impact:

* Level 2G restores the Casablanca hero while keeping the newer /search, /listings, and signature Morocco map sections.
* /search and /listings remain stable.
* Level 3 data work remains not started until explicitly launched.

2026-06-23 - Final AkarFinder logo direction integrated

Status: Validated

Decision:

* The new AF building/compass mark is adopted as the AkarFinder brand mark in the website header, footer, and app icon metadata.
* The site keeps the AkarFinder wordmark as live text beside the mark for readability, responsiveness, and crisp rendering.

Reason:

* Human review provided a final approved logo direction and requested integration into the site.
* The supplied image is a presentation board, so the usable web asset was extracted from it rather than embedding the full board.

Impact:

* AkarFinder gains a more premium, ownable brand identity across homepage, search, listings, footer, and browser icon.
* A vector/source logo file should replace the extracted PNG before public launch if available.
* No product scope, backend, scraping, data ingestion, or new dependency is introduced by this branding pass.

2026-06-23 - Homepage accepted after marketplace-first ordering

Status: Validated

Decision:

* The homepage hero is preserved.
* The homepage below the hero is accepted after moving marketplace discovery before product explanation.
* Further homepage redesign work should stop for now.
* The next product polish priority is /search and /listings/[id].

Reason:

* The revised order shows property discovery immediately after the hero.
* City and intent discovery now make the homepage feel more like a real-estate marketplace entry point.
* The homepage score improved from 7.2/10 to 8.1/10.
* Continuing to polish the homepage would create diminishing returns compared with improving the search and listing experience.

Impact:

* Homepage polish debt remains documented but is no longer blocking.
* Future missions should avoid redesigning the homepage unless a specific issue is validated.
* Search and listing pages become the next recommended experience focus.
* Level 3 remains not started until explicitly launched.

2026-06-23 - Scraping P0 test pipeline and Agenz policy

Status: Validated

Decision:

* A P0 scraping pipeline is implemented in test mode to prove clean, polite ingestion (public pages only, clear research User-Agent, 5–10s delays, max 30/source, robots.txt respected, no login/captcha/private API, no phone/email, no image storage — images_count only).
* Sources scraped in P0: Avito, Mubawab, Sarouty.
* Agenz is NOT scraped automatically; its status is "partnership_or_csv_import_only" (placeholder only).

Reason:

* Level 3 needs proof the ingestion pipeline runs cleanly and fails safely before any scale-up.
* Polite, transparent, non-aggressive acquisition protects credibility and respects sources.

Impact:

* New scripts/scrapers/ module with normalizers, utils, sources, and JSON output.
* Goal is pipeline correctness, not volume; scaling, JS rendering, and partner feeds remain future work.

2026-06-23 - P3 DB ingestion: SQLite local + Supabase-ready schema

Status: Validated

Decision:

* P3 persists p0-clean-listings.json into a local SQLite database (akarfinder.db) using the built-in node:sqlite module (Node.js ≥ 22.5.0 — no native compilation required).
* Schema: 4 tables — scrape_runs, raw_listings, property_listings, listing_sources.
* Deduplication in P3 is approximate via canonical_fingerprint (city|type|tx|price_bucket|surface_bucket|bedrooms). Perfect deduplication (duplicate groups + reliability score) is deferred to P4.
* Idempotency guaranteed by source_file_hash in scrape_runs: re-running with the same file is a no-op.
* The SQL schema is also provided as db/supabase-migration.sql (PostgreSQL dialect) so Supabase can be connected at any time without changing the ingest logic.
* The same constraints as P0/P1/P2 apply: no phone/email, no image URLs, images_count only, field_confidence and data_completeness_score preserved in the DB.

Reason:

* JSON files are ephemeral; a DB makes listings queryable, historised, and ready for frontend integration.
* SQLite first avoids Supabase account/billing setup while the pipeline is still being validated.
* The schema is designed once for PostgreSQL (Supabase-native types: JSONB, TIMESTAMPTZ, BIGINT IDENTITY) and translated to SQLite for local use — migration is a single SQL file apply.

Impact:

* npm run scrape:ingest ingests the latest clean listings into the DB.
* npm run test:scrapers covers the full pipeline P0→P3 (58 tests).
* P4 recommended next step: duplicate group detection + reliability score on top of property_listings.

2026-06-23 - P4 exposes SQLite first before Supabase

Status: Validated

Decision:

* P4 exposes local SQLite first through Next.js so the product and UI can be validated with real ingested listings before any Supabase integration.
* /api/listings is the first bridge between ingestion and frontend.
* /search and /listings/[id] keep mock fallback when the default SQLite DB is absent or unavailable.

Reason:

* The frontend needs real listing shapes and stable filtering before introducing hosted infrastructure.
* SQLite keeps the feedback loop local, cheap, and debuggable while the product model is still being validated.
* Supabase migration is already prepared from P3 and should come only after the frontend model is confirmed.

Impact:

* API and UI can be tested today against local SQLite or a controlled test DB.
* The fallback mock experience remains available in development when akarfinder.db is missing.
* Supabase stays explicitly deferred to the next validated phase.

2026-06-23 - Roadmap refonte en 9 phases produit et business

Status: Validated

Decision:

* La roadmap AkarFinder est restructurée en 9 phases claires séparant :
  produit public, data intelligence, infrastructure production, search avancée,
  carte interactive, monétisation B2B, partenariats financiers, lancement, et
  internationalisation.
* Phase 1 (MVP crédible public) est considérée comme COMPLÉTÉE (P0–P6 + frontend L0–2Z-B).
* Phase 2 (Data intelligence) est EN COURS (P5/P6 livrés ; score opportunité et
  tableau data homepage restent à construire).
* Phases 3–9 sont NON DÉMARRÉES et s'enchaînent dans l'ordre défini.

Reason:

* L'ancienne roadmap par "Levels" (0 à 9) était orientée exécution technique séquentielle.
* La croissance du projet nécessite une roadmap qui sépare clairement le produit public,
  la data, l'infrastructure, et le business (monétisation, partenariats, lancement, scale).
* Des axes manquaient dans l'ancienne roadmap :
  banques, OPCIM, simulateur crédit, campagne MRE, Sakan Expo package commercial,
  carte interactive dédiée, et stratégie internationale.

Impact:

* docs/ROADMAP.md est entièrement réécrit avec la structure en 9 phases.
* docs/PRODUCT.md est mis à jour pour refléter l'état post-P6 et les nouvelles orientations.
* docs/MONETIZATION.md est mis à jour avec les nouveaux flux de revenus (banques, crédit,
  OPCIM, publicité native, leads financement).
* docs/BUSINESS_MODEL.md est créé (SWOT, acteurs, modèle économique, BCG simplifié).
* docs/GO_TO_MARKET.md est créé (branding, acquisition utilisateurs, acquisition B2B,
  plan de lancement, Sakan Expo, MRE).
* Aucune nouvelle feature technique n'est démarrée par cette décision.
* La prochaine phase technique recommandée est la fin de Phase 2 :
  score opportunité + tableau data homepage + préparation Supabase.
* La prochaine phase business recommandée est la préparation commerciale Phase 6 :
  one-pager promoteur + identification premiers cibles B2B.

2026-06-23 - Phase 1 MVP déclarée complétée (P0–P6 + frontend)

Status: Validated

Decision:

* La Phase 1 (MVP crédible public) est officellement déclarée COMPLÉTÉE.
* Livrables validés :
  - Pipeline scraping/data P0 → P6 (110 tests verts)
  - API /api/listings (22 tests verts)
  - Homepage + /search + /listings/[id] (build OK, 0 erreur TypeScript)
  - Scoring : reliability_score, duplicate_score, reliability_badge, reliability_reasons
  - /search wired à SQLite avec fallback mocks
  - UX premium responsive (desktop + mobile)

Reason:

* Toutes les composantes du MVP crédible sont en place et validées.
* Les 132 tests passent.
* Le pipeline complet tourne (npm run scrape:p0 → scrape:ingest → enrich:p6).

Impact:

* La Phase 2 devient la phase active.
* La priorité technique immédiate est le score d'opportunité et le tableau data homepage.
* La priorité business immédiate est la préparation de l'offre commerciale promoteurs.

2026-06-24 - AkarFinder évolue vers une expérience "package score"

Status: Validated

Decision:

AkarFinder évolue vers une expérience "package score" :
l'utilisateur ne compare plus seulement des annonces, mais un ensemble composé de :
* qualité de l'annonce (fiabilité, complétude, doublon, source) ;
* fiabilité de la source (scoring P5/P6 déjà en place) ;
* proximité utile au Maroc (souk, transport, école, pharmacie, mosquée…) ;
* prix/m² observé (calculé depuis les annonces analysées, pas une valeur officielle) ;
* cohérence avec le quartier (comparaison prix vs repère marché) ;
* lisibilité pour les MRE (confiance à distance, package score avant contact).

La carte interactive et le package score deviennent des piliers produit
après validation de la Phase 3 (Supabase).

Phases correspondantes : P10A (geo foundation) → P10B (carte MVP) →
P10C (proximité Maroc) → P10D (prix observé) → P10E (package score).

Reason:

* L'expérience actuelle (~8.0/10) agrège des annonces mais ne les contextualise pas.
* Le marché marocain est fragmenté ; les acheteurs (surtout les MRE) ont besoin
  d'un tiers de confiance qui analyse avant eux.
* Aucun acteur marocain ne combine aujourd'hui : carte + proximité adaptée + prix
  observé + scoring fiabilité dans une même interface.
* L'argument "package score" crée un différenciateur fort pour la monétisation B2B
  (agences, promoteurs, banques, rapports data).

Impact:

* Le positionnement produit passe de "agrégateur d'annonces" à "moteur de décision".
* Zillow-like (recherche) + Airbnb-like (carte) + AkarFinder trust layer (fiabilité
  et proximité marocaine).
* Terminologie réservée : "Score vie quotidienne", "Prix/m² observé",
  "Package AkarFinder", "Indice AkarFinder".
* Aucune terminologie copiée de marques tierces (pas de "Walk Score", "Zestimate").
* Les contraintes de transparence (observé, indicatif, approximatif) s'appliquent
  à toutes les phases P10 sans exception.

2026-06-24 - P10B limité à la carte produit MVP sans DB ni géocoding externe

Status: Validated

Decision:

* P10B construit uniquement l'expérience carte visible : page /map, markers prix, clusters, filtres, panneau liste, et lien /search vers /map.
* P10B utilise geoEnrichedMockListings et l'asset Maroc premium existant.
* Les migrations SQLite/Supabase geo sont repoussées à P10B-DB.
* Le géocoding Nominatim est repoussé à P10F avec cache, limite stricte, User-Agent, attribution, et fallback local.

Reason:

* Le premier objectif est de prouver l'expérience Airbnb/Booking/Zillow-like sans complexifier la data.
* Nominatim public n'est pas adapté à un géocoding massif régulier sans contrôle strict.
* Ajouter DB + géocoding + carte + UX dans une même mission augmenterait le risque de régression.

Impact:

* /map peut être validée rapidement avec données mock enrichies.
* Level/P10 suivant peut choisir entre P10B-DB, P10F, ou polish map selon le retour humain.
* Aucune nouvelle source, aucun backend geo, aucune clé API, aucune carte live n'est introduite par P10B.

2026-06-24 - Direction produit AkarFinder après audit Zillow

Status: Validated

Decision:

AkarFinder ne sera pas un simple site d'annonces immobilières.
Il deviendra un système d'exploitation immobilier adapté au Maroc :
* Recherche/carte pour l'acquisition
* Couche de confiance pour la différenciation
* Package score pour la qualité de décision
* AkarFinder Pro pour la monétisation
* Sakan Expo pour l'acquisition B2B
* Prix observés comme data moat long terme
* MRE comme niche premium

Phases documentées correspondantes :
* P10A–P10E : expérience carte, proximité, prix observé, package score
* P11 : AkarFinder Pro (côté offre B2B)
* P12 : Financement immobilier (adaptation Maroc)
* P13 : SEO et contenu villes/quartiers
* P14 : Assistant de recherche AkarFinder

Reason:

* L'audit Zillow a montré que Zillow n'est pas un site d'annonces — c'est
  un système d'exploitation immobilier complet (recherche, carte, promotion,
  financement, SEO, IA).
* AkarFinder doit construire un équivalent adapté au Maroc, sans copier
  les éléments non pertinents (Zestimate, MLS, mortgage US).
* Les différenciateurs marocains sont : WhatsApp-first, souk/hanout/mosquée,
  MRE diaspora, Sakan Expo B2B, prix observés (jamais officiels).

Impact:

* Les docs ROADMAP.md, PRODUCT.md, BUSINESS_MODEL.md, GO_TO_MARKET.md
  et SESSION.md ont été mis à jour pour refléter cette vision.
* Phases P11, P12, P13, P14 ajoutées comme NON DÉMARRÉES.
* Contradiction Phase 5 / P10B-REAL clarifiée :
  P10B-REAL était autorisée comme validation produit locale/mock.
  La Phase 5 production (P10B-DB + Supabase) reste à faire.
* Aucune feature technique démarrée par cette décision.

## 2026-06-24 - Package Score AkarFinder (P10E)

Decision: Synthétiser les 3 signaux indépendants (fiabilité annonce, vie quotidienne, repère prix marché) en un label de package global.

Labels autorisés :
"Excellent package", "Bon package", "Package correct", "À analyser", "Données insuffisantes"

Mots INTERDITS dans tout texte lié au package (UI, tests, code) :
"Bonne affaire", "Investissement sûr", "Rentable", "Garanti", "Prix officiel",
"Opportunité garantie", "Sous-évalué", "Surcoté", "bon investissement",
"acheter maintenant", "prix garanti", "valeur sûre"

Règles de calcul :
* Signal fiabilité : high ≥80, medium ≥50, low <50 (ou duplicate_score ≥0.7), insufficient si reliability_available=false
* Signal proximité : high ≥8 cat. ≤15min, medium ≥5, low ≥3, insufficient <3 points
* Signal prix : coherent+élevée/moyenne=high, coherent+faible=medium, supérieur+élevée=low, supérieur autres=medium, insufficient=insufficient
* Label global (avg) : ≥2.7=Excellent, ≥2.3=Bon, ≥1.5=Correct, <1.5=À analyser, <2 calculables=Données insuffisantes

Règle badge card :
Si overall_label !== "Données insuffisantes" → afficher le badge package score sur la card, masquer le badge marché P10D (subsumed).
Si overall_label === "Données insuffisantes" → afficher le badge marché P10D comme fallback.

Filtre "Bon package" :
Filtre client-side uniquement. Ne modifie pas l'API. Autorise "Excellent package" et "Bon package".

Raison :
* AkarFinder ne fait pas de conseil financier. Tous les labels sont indicatifs.
* La synthèse est informative : elle aide à détecter les outliers, pas à prescrire un achat.
* Le disclaimer "Synthèse indicative basée sur les données disponibles — à vérifier avant décision." est obligatoire sur chaque bloc.

## 2026-06-24 - P10E-FINAL — Statut normatif du Package Score

Decision:
AkarFinder Package Score est une synthèse indicative de la fiabilité de l'annonce,
de la qualité de vie de proximité et du repère de prix observé.

Ce score N'EST PAS :
* un conseil financier
* un conseil en investissement
* une évaluation officielle du bien
* une recommandation d'achat

Le score DOIT toujours :
* afficher séparément ses 3 signaux composants (fiabilité, proximité, prix)
* montrer le niveau de confiance pour chaque signal
* inclure le disclaimer "Synthèse indicative basée sur les données disponibles — à vérifier avant décision."
* ne jamais masquer les signaux insuffisants ou faibles derrière le label global

Statut QA validé 2026-06-24 :
* Zéro occurrence de wording interdit dans tout le code P10E (grep confirmé)
* Filtre "Bon package" inclut correctement "Excellent package" ET "Bon package"
* 3 signaux toujours visibles indépendamment dans PackageScoreBlock
* 254/254 scrapers ✅, 51/51 API ✅, build clean ✅
* 4 screenshots générés et validés

## 2026-06-24 - P11A — AkarFinder Pro landing page

Decision:
AkarFinder Pro commence par une page landing B2B et des demandes d'accès manuelles
avant de construire des dashboards, des imports, des paiements ou une boîte réception leads.

Raison :
* Valider l'intérêt B2B sans infrastructure back-end coûteuse.
* Accumuler une liste d'attente qualifiée (agences, promoteurs, Sakan Expo) avant de builder.
* Permettre la personnalisation des offres pilotes au cas par cas.
* Éviter la complexité prématurée (authentification, RGPD, gestion leads) avant confirmation du segment.

Contraintes techniques appliquées :
* Aucun backend — page purement statique (Next.js Server Component, ○ static).
* Formulaire visuel désactivé — aucune donnée collectée ni stockée.
* Navigation : "Alertes" remplacé par "Espace Pro" dans navItems (lib/site.ts).
* Aucune modification de la homepage, de /search, ni des APIs existantes.

Wording interdit sur cette page :
"partenaire officiel", "leads garantis", "ventes garanties",
"badge vérifié" (sauf décrit comme futur/process), "meilleur site immobilier du Maroc"

Wording autorisé utilisé :
"offre pilote", "données indicatives", "leads qualifiés",
"visibilité sponsorisée clairement labellisée", "process de validation"

Séquençage P11 validé :
P11A (landing) → P11B (import agence) → P11C (pages projet promoteur) → P11D (leads CRM) → P11E (boost) → P11F (analytics)
Chaque sous-phase requiert une décision produit séparée avant démarrage.

## 2026-06-25 - P12A — Onboarding acheteur indicatif

Décision :
L'onboarding AkarFinder est un profil de recherche indicatif, pas une préqualification
hypothécaire, pas une approbation bancaire, pas un engagement de crédit.

Raison :
* Aucun partenaire bancaire validé à ce stade.
* Toute simulation de préqualification sans partenaire réel est mensongère et illégale.
* L'objectif est de qualifier l'intention d'achat (chaud / tiède / froid) pour les professionnels
  qui reçoivent des leads, pas de certifier une capacité d'emprunt.
* Les données collectées ne sont pas transmises (pas de backend, pas d'API).

Guardrails techniques appliqués :
* Client-side uniquement — aucune donnée envoyée nulle part.
* Double consentement obligatoire avant de finaliser le dossier.
* Disclaimer visible sur le résumé : "à confirmer avec votre banque".
* Aucun score n'est présenté comme "officiel" ou "certifié".

Wording définitivement interdit dans tout le tunnel P12A et ses évolutions futures :
"préqualifié", "préqualification bancaire", "crédit accepté", "crédit garanti",
"taux officiel", "accord bancaire assuré", "capacité d'achat certifiée",
"vous pouvez acheter", "banque partenaire validée" (sauf si partenaire réel documenté)

Quand ces restrictions peuvent être levées :
* P12B (simulateur crédit) : uniquement si labellisé "simulation indicative" avec disclaimer fort.
* "Préqualification possible" : uniquement si un partenaire bancaire signe un accord formel.

Lead temperature — règle permanente :
* Jamais présenter la température comme une "garantie de concrétisation".
* Les labels (Projet actif / En cours / Veille) décrivent l'intention, pas la solvabilité.


## 2026-06-25 - P11D-D — CRM interne minimal : mise à jour statut + notes internes sans exposer les clés serveur

Status: Validated

Decision:
- Le PATCH /api/leads/[id] n'accepte que le token admin (x-leads-admin-token header ou ?token= query).
- Pas de GET public : les leads restent invisibles sans authentification admin.
- SUPABASE_SERVICE_ROLE_KEY reste exclusivement côté serveur (route handler Next.js, runtime nodejs).
- Le token admin est passé de la page serveur au LeadCrmCard client via prop — acceptable pour un outil interne MVP.
- Les champs CRM : status (6 valeurs), visit_status (6 valeurs), internal_notes (max 2000 chars), next_follow_up_at (date ISO), mark_contacted (bool → last_contacted_at = now()).
- Aucun stack trace dans les réponses d'erreur API.
- LeadStatus étendu : visit_confirmed, reschedule_requested (aligné avec VisitStatus existant).
- WhatsApp reste manuel ; aucun envoi automatique, aucune API WA Business.

Reason:
- L'inbox read-only ne permettait pas de traiter les leads — statut bloqué sur "new" à vie.
- Le CRM minimal (notes + statut + date de suivi) transforme l'inbox en outil de travail réel.
- La sécurité service_role serveur-only est impérative avant toute mise en production publique.
- Prop drilling du token est acceptable dans un outil interne — à remplacer par Supabase Auth en P11E-auth.

Impact:
- /pro/leads passe de read-only à CRM minimal opérationnel.
- Migration db/supabase-p11d-d-migration.sql à appliquer pour persister notes/follow-up en base.
- P11E, P11F, P12B, P13, P14 restent NON DÉMARRÉS.
## 2026-06-25 - UI-MARKET-PULSE - bande "Dernieres annonces analysees"

Status: Validated

Decision:
- AkarFinder affiche sur la homepage premium une bande "Dernieres annonces analysees" pour montrer l'activite recente du moteur.
- La feature ne revendique ni temps reel ni verification officielle.
- Les items affiches proviennent uniquement des listings suffisamment complets et presentables.
- Le wording autorise reste : "Dernieres annonces analysees", "Biens recemment integres a l'index AkarFinder", "Prix observe disponible", "Score indicatif disponible".
- Les wordings interdits restent exclus : "temps reel", "donnees verifiees", "annonce verifiee", "prix certifie", "disponibilite garantie", "bien confirme".

Reason:
- La homepage premium devait gagner un signal de vie produit sans introduire de fausse promesse.
- Une bande courte et dynamique renforce la perception de moteur immobilier vivant sans ajouter de nouveau backend ni de nouvelle table.
- Le filtrage qualite evite de pousser des annonces trop incompletes ou douteuses dans une zone tres visible.

Impact:
- La homepage premium affiche une bande sous le hero, non sticky, coherente avec la palette noir/creme/dore.
- La source des donnees suit la couche provider existante : Supabase, SQLite fallback, mocks uniquement si aucun provider n'est disponible.
- `prefers-reduced-motion` est respecte : le marquee desktop se coupe automatiquement en mode motion reduce.

## 2026-06-25 - Hub Carte intelligente actionnable

Status: Validated

Decision:
- La page "Carte intelligente" (SignatureMapSection) devient un hub d'exploration du Maroc.
- Elle ne sert pas seulement à montrer une carte de marque, mais à orienter l'utilisateur vers les villes, la carte réelle, la recherche, le dossier acheteur et les demandes de visite.
- Les repères restent indicatifs et ne constituent pas des données officielles.

Reason:
- La section était contemplative (1 seul CTA "Explorer la carte" → /search).
- Les utilisateurs n'avaient pas de chemin clair vers /map, #villes ou /onboarding.
- Le texte ne mentionnait pas les fonctionnalités clés (prix observés, fiabilité, proximité).

Impact:
- 3 CTAs visibles : carte interactive, villes, dossier acheteur.
- Descriptions villes visibles dans CityIntentGrid.
- Bloc "visite" pédagogique sans formulaire intégré.
- P15A / P15B / P16 restent Not started.
## 2026-06-25 - Visuels de section generes localement

Status: Validated

Decision:
- Les visuels generes utilises comme images de section doivent rester locaux, autorises et documentes dans le repo.
- Aucun hotlink ni lien externe n'est autorise pour ces visuels.
- Si une image contient du texte integre, l'interface doit fournir des liens accessibles separes ou des zones cliquables avec `aria-label`.

Reason:
- Le rendu premium peut dependre d'un visuel image, mais l'accessibilite et la maintenabilite ne doivent pas dependre du texte rasterise.
- Garder les assets locaux evite les regressions de chargement et les risques de droits ou de disponibilite.

Impact:
- `CityIntentGrid` peut utiliser un collage image premium local avec hotspots cliquables.
- Les parcours villes restent accessibles aux lecteurs d'ecran et aux utilisateurs clavier.

## 2026-06-25 - P15A Comparateur de biens — MVP localStorage

Status: Validated

Decision:
- P15A comparateur est un MVP localStorage.
- Il compare des signaux indicatifs entre biens (fiabilité, prix observé, package score, proximité, doublons) et ne fournit pas de conseil financier, juridique ou d'investissement.
- Pas de persistance serveur, pas d'auth, pas de favoris persistants.

Reason:
- L'objectif est "Comparez avant de contacter" — la valeur est dans les signaux indicatifs côte à côte, pas dans la persistance longue durée.
- localStorage suffit pour un MVP : léger, sans Supabase, sans migration.

Impact:
- /compare fonctionne avec 2 à 4 biens issus de localStorage.
- CompareToggleButton sur /search et /listings/[id].
- CompareBar flottante visible dès 1 bien ajouté.
- Wording interdit respecté : pas de "meilleur choix garanti" / "investissement sûr" / "estimation certifiée".
- P15B/P16/P17 restent Not started.

## 2026-06-25 - Restructuration roadmap produit P16→P21

Status: Validated

Decision:
- La roadmap produit POST-P15A est restructurée pour insérer les pages thématiques (P16A/B/C) et la monétisation promoteurs (P17A/B) avant les alertes et le calculateur.
- Les anciens P16A/B, P17A/B, P18A/B, P19A/B deviennent P18A/B, P19A/B, P20A/B, P21A/B.
- P15C (Notes personnelles) reste documenté mais hors ordre de priorité immédiat.
- P15B (Favoris) reste la prochaine feature produit officielle.

Reason:
- Les pages par intention (P16A/B/C) et les packs promoteurs (P17A/B) créent de la
  valeur commerciale et SEO avant que les couches avancées (alertes, historique) soient nécessaires.
- L'ordre chercher → pages intention → promoteurs → alertes → historique → SEO marché
  est plus cohérent avec le parcours de monétisation B2B.

Impact:
- Aucun code ne change — restructuration documentaire uniquement.
- Le Track Data Engine reste une piste parallèle indépendante (DATA-A→DATA-H).
- P15B/P16A ne démarrent pas maintenant.

## 2026-06-30 - V9.5 Source Display Policy — adoption et durcissement

Status: Validated

Decision:
- `deriveSourceDisplayPolicy()` est la fonction unique de calcul des droits d'affichage par source.
- Mubawab → `public_index_source` / `public_indexed` / `limited_preview`.
- Avito → `audit_source` / `market_signal` / `market_signal_only`.
- Source inconnue / null → `{}` (aucun badge, aucun CTA par défaut).
- `display_images` est un champ séparé de `image_urls` — `image_urls` n'est jamais muté.
- `SourceBadge` et `ReliabilityBadge` sont deux composants orthogonaux : un score élevé
  ne peut pas élargir les droits d'affichage d'une source.
- `contact`, `whatsapp`, `request_visit`, `request_brochure`, `view_full_listing` sont
  interdits dans `allowed_ctas` pour toute source non `partner_source`.
- `premium_partner` et `authorized_source` ne sont jamais assignés par fallback.

Reason:
- Séparer la politique d'affichage de l'évaluation de la fiabilité permet d'évoluer
  les deux dimensions indépendamment.
- Calculer la policy runtime (pas de migration DB) permet d'ajouter de nouvelles sources
  sans toucher le schéma.
- Exporter `deriveSourceDisplayPolicy()` rend la policy testable et auditablee.

Impact:
- 31 tests unitaires couvrent les invariants de la policy.
- Guard UI actif dans SearchListingCardDark + PhotoFirstListingCard.
- SITE-SOURCE-BADGES-HARDENING-1 complétée : 534/534 PASS, build OK.
- SOURCE-POLICY-FOUNDATION-1 (Engine, repo séparé) : complétée indépendamment.
- Prochaine source à mapper : Yakeey, Sarouty (un bloc `if` dans deriveSourceDisplayPolicy).
