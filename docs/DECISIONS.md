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

## 2026-07-02 - PRODUCT-COMPLIANCE-TEST-SUITE-1

Status: Audit Complete (2 violations detected)

Decision:
- AkarFinder creates a comprehensive compliance test suite to lock Phase 1 doctrine.
- Suite contains 10 GUARD test groups with ~200 assertions across all motor-purity invariants.
- File: scripts/scrapers/__tests__/product-compliance.test.ts
- Tests cover: ingestion freeze, source registry, public read-model, /listings boundary,
  gateway-first model, thumbnail controls, /map intelligence, /quartiers first-party,
  risky wording absence, legal transparency.
- Compliance test suite prevents future regressions on core doctrine pillars.

Violations detected (2):
1. NEXT_PUBLIC_SEARCH_GATEWAY_THUMBNAILS_ENABLED=true in .env.local
   Should be: false or absent
   Impact: Risk of third-party thumbnail caching/hosting
2. avito included in gateway sources but classified as third_party_legacy
   Should be: Remove from gateway sources OR reclassify in source registry
   Impact: Gateway-first model broken if legacy data exposed live

Test results: 197/200 pass, 3 fail
- 2 real violations (above)
- 1 false positive (test too strict on dynamic /search URL generation)

Reason:
- Phase 1 doctrine must be protected by automated tests.
- Ingestion freeze, wording controls, and data boundaries are critical invariants.
- Manual review alone is insufficient; tests prevent silent regressions.
- Test suite captures all existing missions (motor-purity-freeze, source-access-registry,
  listing-detail-boundary, serp-gateway-first, neighborhood-pages, etc.) in one place.

Impact:
- Future PRs must pass `npm test` — violations in these 10 GUARD areas block merge.
- Phase 1 doctrine is now code-enforced, not documentation-only.
- Next phase (Phase 2+) will extend compliance suite for new features.
- Violations must be corrected before production Phase 1 soft launch.

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

## 2026-07-01 - AVITO-THUMBNAILS-RISK-ACTIVATION-1 — Provider thumbnails risk-accepted

Status: Validated

Decision:
- AkarFinder activates Avito provider thumbnails (via Serper Images API) under risk-accepted policy.
- ToS status: UNCLEAR (see docs/SERPER_TOS_THUMBNAILS_VALIDATION.md — audit SERPER-TOS-THUMBNAILS-VALIDATION-1).
- This is a business decision to accept residual risk. It is NOT a ToS validation.
- The terms "tos_validated", "legally_approved", "officially_authorized" MUST NEVER appear in code or docs for this feature.
- Activation requires two environment flags both set to "true":
    ENABLE_AVITO_PROVIDER_THUMBNAILS=true
    AVITO_THUMBNAILS_RISK_ACCEPTED=true
- Dual-gate prevents accidental activation. Single-flag = thumbnails stay OFF.
- Implementation mode: HOTLINK ONLY. No cache. No download. No rehosting.
- Invariants enforced in code (typed literal false):
    can_cache_thumbnail = false
    can_download_thumbnail = false
- Attribution "Source : Avito" visible on every result with thumbnail.
- CTA always redirects to original Avito URL (original_source_required=true).
- Forbidden CTAs: contact, WhatsApp, request_visit, gallery, multi-image.
- Graceful fallback: if gstatic.com URL breaks (onerror), thumbnail is hidden, falls back to thin result layout. No crash.
- If Avito or Serper formally objects: disable by setting flags to false. Zero code change needed.

Reason:
- Serper's business model is to power SERP products — returning thumbnailUrl implies usage authorization even if not stated explicitly.
- All major SERP API customers use gstatic.com thumbnail URLs commercially with no known enforcement action.
- Hotlink-only approach (no cache/download/rehost) is the legally safer position (server test, Perfect 10 v. Amazon 2007).
- Product benefit: visual search results improve user engagement and CTR on Avito listings.
- Risk is real but low in current enforcement landscape. AkarFinder at Moroccan startup scale is not a primary enforcement target.
- If risk materializes: immediate rollback via env flag, no code change.

Impact:
- indexed_result_with_provider_thumbnail mode activated in production when both flags true.
- display model: thumbnail_risk_accepted=true → production_allowed=true (was: false).
- display_reason: "Risque assumé (risk_accepted) — ToS provider unclear, décision business."
- SearchApiResultCard: shows thumbnail when mode=indexed_result_with_provider_thumbnail + production_allowed=true.
- Fallback: onerror → hide thumbnail → thin layout (no crash).
- Serper email still recommended: send support@serper.dev to convert risk_accepted → formally_validated.
- Files: lib/search/thumbnail-activation-config.ts, lib/search/search-result-display-model.ts,
         lib/search-api/search-api-to-serp-result.ts, components/search-api/SearchApiResultCard.tsx.

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

## 2026-06-30 - AkarFinder switches to Google-like first

Status: Validated

Decision:
- AkarFinder devient d'abord un moteur de recherche immobilier Google-like.
- Phrase produit officielle : "AkarFinder référence les annonces immobilières publiquement
  indexables au Maroc, les classe par fiabilité et redirige vers la source originale."
- Tout résultat immobilier publiquement indexable peut apparaître dans la SERP AkarFinder,
  avec un niveau de détail proportionnel au statut de la source.
- Avito et autres sources publiques ne restent plus invisibles par défaut : si une annonce
  est publiquement indexable proprement, elle peut apparaître en SERP (indexed_result).
- Le signal marché (signal_status Engine) est une couche interne — il ne devient pas
  automatiquement la limitation d'affichage utilisateur.
- Nouveau modèle de résultats SERP :
    full_partner_listing    → partenaires, fiche complète + contact + lead
    rich_authorized_result  → source autorisée, fiche riche
    indexed_result          → annonce publique indexable, aperçu limité + miniature + lien
    thin_indexed_result     → page partiellement indexable, titre + source + lien
    source_search_link      → lien vers recherche source, pas d'annonce individuelle
    suppressed              → source bloquée / login / captcha / noindex

Reason:
- Le positionnement moteur de recherche est plus fort qu'un portail classique.
- L'utilisateur doit pouvoir trouver toutes les annonces immobilières indexables,
  pas uniquement les partenaires.
- Les partenaires restent premium (fiche complète, contact, lead), mais ils ne doivent
  pas limiter l'ambition de couverture de la SERP.
- Avito et les portails publics indexables représentent une large part du volume disponible.

Impact:
- Avito peut apparaître en SERP si indexable proprement (indexed_result), sinon signal interne.
- Les fiches complètes / contact / lead restent réservés aux partenaires.
- Le lien vers la source originale devient obligatoire pour tous les résultats indexés.
- Signal marché devient une couche interne Engine, pas un format utilisateur par défaut.
- La doctrine no-bypass reste invariante (no proxy, no stealth, no captcha, respect robots.txt).
- SOURCE-POLICY-FOUNDATION-1 Data Engine reste pending (repo Engine séparé).
- Missions suivantes : WEB-INDEXING-ELIGIBILITY-1 → AVITO-GOOGLE-LIKE-AUDIT-1 →
  SEARCH-RESULT-DISPLAY-MODEL-1 → SERP-RANKING-RELIABILITY-1.

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

## 2026-06-30 - Brand theme blue/white v1

Status: Validated

Decision:
- AkarFinder adopte une direction visuelle majoritairement `blanc / bleu` en light theme et `navy / bleu` en dark theme.
- Le `gold / bronze` n'est plus une couleur majeure de l'interface ; il peut subsister seulement comme micro-accent non dominant.
- Le hero homepage conserve obligatoirement le claim `1er moteur de recherche immobilier au Maroc`.
- La photo hero et la search bar Google-like sont preservees.
- La migration doit prioriser les tokens globaux et l'heritage thematique plutot que des patches page par page.

Reason:
- Le produit doit ressembler davantage a un moteur de recherche immobilier fiable et accessible qu'a un site premium ferme a dominance doree.
- Le bleu renforce la lecture search/PropTech/confiance tout en restant compatible avec les sections dark premium deja presentes.
- Preserver le hero, la photo et la search bar garde la continuite produit tout en faisant evoluer l'identite.

Impact:
- `app/globals.css` et `tailwind.config.ts` deviennent la source principale de la nouvelle palette.
- Les anciens accents legacy `bronze/gold` sont remappes visuellement vers du bleu pour accelerer l'heritage global.
- Homepage, `/search`, `/acheter`, `/louer`, `/neuf` et `/onboarding` ont ete validees en QA light/dark desktop/mobile.
- Aucune mise en production automatique n'est autorisee : validation Achraf requise avant deploiement.

## 2026-07-01 - Homepage brand cleanup follow-up

Status: Validated

Decision:
- Les derniers modules homepage encore pigments en `gold/bronze` doivent etre convertis explicitement, meme si les tokens globaux ont deja bascule.
- `CityIntentGrid` ne doit plus dependre de collages images prebakes quand ils enferment une ancienne palette ; une composition en cards live est preferee.
- Les nouveaux visuels hero utilisateur sont references directement dans `GoogleLikeHero` et `ProductHero` sans toucher au wording du claim.

Reason:
- Certains assets et styles inline contournaient l'heritage des tokens et laissaient un residu bronze visible sur mobile.
- Une grille live gardera la palette future plus maitrisable qu'un asset composite exporte.

Impact:
- Homepage light est maintenant majoritairement blanc/bleu sur les sections `villes`, `carte intelligente` et `resultats observes`.
- Le hero conserve `1er moteur de recherche immobilier au Maroc` avec nouveaux backgrounds desktop/mobile.

## 2026-07-01 - Hero mobile lighten pass

Status: Validated

Decision:
- Le hero homepage peut avoir une direction mobile specifique plus claire que desktop, tant que la photo, le claim et la search bar restent identitaires.
- Les textes d'accompagnement mobile doivent etre plus courts que desktop quand ils ralentissent la lecture du premier ecran.
- Les exemples de recherche ne sont pas prioritaires sur mobile et peuvent etre masques pour privilegier clarte et contraste.

Reason:
- Le hero etait coherent mais encore trop sombre pour l'objectif blanc/bleu accessible.
- Le header et les exemples prenaient trop de hauteur utile sur iPhone Safari.

Impact:
- Overlay mobile eclairci, fumee autour du H1 reduite, search bar remontee visuellement dans le premier ecran.
- Header mobile et chips de navigation compacts sans casser la structure existante.
## 2026-07-01 - Source Candidate Audit foundation

Status: Validated

Decision:
- `docs/SOURCE_CANDIDATE_AUDIT.md` devient le registre central de qualification source cote site web.
- Une source ne devient pas `public_index_source` uniquement parce qu'elle existe ou repond en `200`.
- `public_index_source` n'est recommande que si la homepage, une page categorie publique, et idealement un detail ou un sitemap public ont ete verifies sans blocage critique.
- `audit_source` reste le statut par defaut pour toute source encore ambigue sur robots, ToS, challenge, ou profondeur de pages.
- `benchmark_source` et `social_signal_source` ne doivent jamais etre traites comme des listings.

Reason:
- Le produit a besoin d'une matrice source exploitable avant toute nouvelle extension SERP multi-source.
- Separer `candidate technique` et `production_allowed` evite de confondre accessibilite publique et droit d'usage produit.
- Les classified/agency networks marocains montrent des comportements heterogenes : 403, redirect, challenge, wildcard disallow, sitemaps partiels.

Impact:
- Mubawab reste la reference `public_index_source` active.
- Avito reste `audit_source` avec voie `thin_indexed_result` via Search API uniquement.
- Agenz et Logic-Immo Maroc deviennent les deux meilleurs candidats pour le prochain audit direct-source approfondi.
- Sarouty, MarocAnnonces et Yakeey restent dans un parcours audit-first sans ouverture prod immediate.

## 2026-07-01 - Yakeey price reference benchmark source

Status: Validated

Decision:
- Yakeey price reference is classified as `benchmark_source`.
- `not_listing_source = true`.
- `can_create_listing = false`.
- `can_compute_market_benchmark = true`.
- `can_compute_price_gap = true`.
- `attribution_required = true`.
- The source is used only for aggregated market price benchmark data.
- No listing creation, no contact collection, no image collection, no login bypass, no production frontend activation are part of this mission.

Reason:
- Yakeey exposes public city and quartier price tables that are structurally useful as a market benchmark layer.
- The source can support price-gap comparisons without becoming a listings source.
- The audit stayed within the no-bypass doctrine and avoided listings or contact data.

Impact:
- Yakeey can feed benchmark and price-gap computations in the Data Engine.
- The audit result supports `integrate_as_benchmark_source`.
- Production integration remains separate from this audit mission.

## 2026-07-01 - Yakeey benchmark wiring in Data Engine

Status: Validated

Decision:
- `lib/market/market-benchmark-registry.ts` exposes the validated Yakeey audit as a read-only benchmark registry.
- `lib/market/price-gap-calculator.ts` computes `price_per_m2`, `benchmark_price_per_m2`, `price_gap_percent`, `price_gap_score`, and a simple market position.
- The calculator supports city and neighborhood matching, apartment and villa types, and returns `insufficient_data` when any essential input or benchmark is missing.
- The benchmark source remains `yakeey` only; this wiring does not create listings, touch production DBs, or activate frontend badges.

Reason:
- The Data Engine needs a small, testable benchmark layer before any site exposure.
- Keeping the benchmark registry separate from listing pipelines preserves the source classification and avoids accidental product coupling.

Impact:
- The Data Engine can now compute market gap signals from the validated Yakeey reference data.
- Future site exposure can consume this layer without reworking the source audit.

## 2026-07-01 - Yakeey market price score product policy

Status: Validated

Decision:
- `below_market`, `near_market`, `above_market`, `overpriced`, and `insufficient_data` are product labels only; they are not UI code and do not change the calculator.
- The recommended presentation is a short user label, a one-line explanation, a color badge, and a confidence level derived from benchmark scope.
- `insufficient_data` must remain a neutral fallback and must not be framed as a market signal.
- The product wording must stay indicative and avoid claims such as official, certified, guaranteed, verified, or exact pricing truth.

Reason:
- The frontend needs a stable wording policy before any visual integration.
- A strict wording policy prevents the benchmark from being interpreted as a valuation service.

Impact:
- The next UI mission can reuse this policy directly.
- The Data Engine remains unchanged; only documentation is added.

## 2026-07-01 - Yakeey market price score frontend display

Status: Validated

Decision:
- The Yakeey market price score badge is displayed only on structured listing cards, not on `external_indexed_result` or Search Gateway results.
- The visible labels are limited to `Sous le marché`, `Aligné marché`, `Au-dessus du marché`, and `Fortement au-dessus`.
- `Données insuffisantes` stays hidden from the UI and is treated as a non-display state.
- The badge is derived from the existing Engine calculator; the frontend only maps the result to a cautious presentation.

Reason:
- The product needs a controlled market signal on structured ads without creating a hard valuation claim.
- Restricting the badge to structured cards avoids confusing public indexed results with benchmarked inventory.

Impact:
- Structured inventory pages can now show a cautious market-price signal.
- Search result cards and gateway results remain unchanged.

## 2026-07-01 - Existing ingestion base is canonical property_listings + listing_sources

Status: Validated

Decision:
- The current operational publication layer is the canonical pair `property_listings` + `listing_sources`.
- `scrape_runs` and `raw_listings` are audit/traceability tables, not the public read model.
- `sync:supabase` intentionally syncs only `property_listings` and `listing_sources`.
- `duplicate_group_id`, `duplicate_score`, `reliability_score`, `reliability_badge`, `reliability_reasons`, `source_name`, and `source_url` are the supported publication fields.
- `external_id` and `dedup_signature` are not part of the current model.
- No staging/publication queue exists yet for listings CSV/JSON imports.

Reason:
- The repo already has a working canonical listing layer, dedupe enrichment, and Supabase mirror.
- Rebuilding a massive staging pipeline now would duplicate functionality and increase production risk.

Impact:
- Future ingestion work should extend the existing canonical model instead of replacing it.
- Any new pipeline should be small, explicit, and validated against the current `/search` publication path.

## 2026-07-02 - `/search` server preloads DB results

Status: Validated

Decision:
- `/search` now preloads DB-backed listings on the server with `searchListings(buildSearchPageQuery(params))`.
- `LightZillowSearchShell` receives non-empty `initialListings` for the current route params, so the structured DB results are present in the initial DOM instead of waiting for hydration alone.
- The Search Gateway remains client-fetched and still renders after the DB block.

Reason:
- The previous `initialListings=[]` bootstrapping could leave the initial DOM empty on SSR.
- Server preloading fixes the product requirement without changing ingestion, ranking, or the badge system.

Impact:
- `/search` now has a stable SSR read-model for structured listings.
- The fix reduces the risk of an empty initial DOM and preserves the existing gateway integration.

## 2026-07-02 - SOURCE-ACCESS-REGISTRY-1 — Registre central de classification des sources

Status: Validated

Decision:
- AkarFinder dispose d'un registre central `lib/sources/source-access-registry.ts` classifiant toutes les sources connues.
- Cinq types : `first_party`, `partner_authorized`, `public_external_live`, `third_party_legacy`, `benchmark_source`.
- Seules les sources `first_party` et `partner_authorized` peuvent publier des annonces structurees AkarFinder.
- Les sources tierces legacy (mubawab, avito, sarouty) sont classees `third_party_legacy` : leurs lignes DB sont gelees, elles ne sont plus publiables.
- Les sources Search Gateway (serper, *_serper, search_gateway) sont `public_external_live` : interrogation a la volee uniquement, jamais persistees, jamais publiables comme annonces structurees.
- Yakeey est `benchmark_source` : prix de reference uniquement, jamais listing.
- Toute source inconnue retourne `third_party_legacy` par defaut (jamais auto-promue).

Reason:
- Ce registre prepare la migration vers un read-model public `authorized_only` (mission suivante : PUBLIC-READMODEL-AUTHORIZED-ONLY-1).
- La classification centrale evite la duplication de logique de garde dans les differents modules.

Impact:
- `canPublishStructuredListing()` et `canShowInternalListingDetail()` : guards partageables par tous les modules futurs.
- Aucun affichage public reffont dans cette mission : le registre seul, branchements futurs.
- Search Gateway inchangee. Aucune purge DB. Aucune refonte produit.

## 2026-07-02 - AkarFinder motor purity doctrine

Status: Validated

Decision:
- AkarFinder migre vers un modele `moteur de recherche immobilier pur + intelligence quartier`.
- AkarFinder ne doit plus persister ni exploiter publiquement des annonces tierces non autorisees comme inventaire structure.
- Les annonces tierces non autorisees doivent passer par une interrogation a la volee, un affichage externe minimal, et une redirection vers la source originale.
- La base publique AkarFinder doit etre reservee au contenu first-party, partenaire autorise, donnees quartier propres, donnees ouvertes/OSM, reperes quartier, leads/espace pro et donnees internes.

Reason:
- Le modele moteur pur reduit le risque de rehebbergement de contenu tiers et aligne le produit avec la valeur recherche + quartier.
- Les partenaires gardent la richesse listing/contact/images lorsqu'une autorisation existe.

Impact:
- Les flux d'ingestion tierce legacy doivent etre geles avant toute nouvelle evolution produit.
- `/search`, `/listings/[id]`, `/map`, home previews et APIs listings doivent migrer vers un read-model public `authorized_only`.
- Search Gateway et intelligence quartier deviennent les briques centrales de la prochaine migration.

## 2026-07-02 - PUBLIC-READMODEL-AUTHORIZED-ONLY-1 — Read-model public limité aux sources autorisées

Status: Validated

Decision:
- Les surfaces publiques structurées AkarFinder (/api/listings, /api/search, /search, /map, home previews) n'exposent désormais que les listings de sources `first_party` ou `partner_authorized`.
- Les sources `third_party_legacy` (mubawab, avito, sarouty), `public_external_live`, `benchmark_source` et inconnues sont filtrées avant mapping, donc invisibles en tant qu'annonces structurées.
- Implémentation : `lib/listings/public-listing-access.ts` — `canPublishListingToPublicSurface()` et `canPublishDbRowToPublicSurface()`.
- Filtre appliqué en deux points :
  - `lib/search/database-search.ts` → couvre /api/search, /search SSR + client, /map.
  - `app/api/listings/route.ts` → couvre home previews (HomeResultPreview) et tout consommateur /api/listings.
- Le filtre est une pré-étape avant mapDbRowToListing (coût CPU réduit sur les gros volumes).
- Pas de purge DB. Aucun enregistrement supprimé. Le filtre est applicatif uniquement.
- Aucune ingestion réactivée. Motor purity guard inchangé.
- Search Gateway inchangée — les résultats external live restent disponibles en parallèle.
- L'état vide (/search sans listings autorisés) affiche "Aucune annonce structurée AkarFinder" + "Des résultats du web sont disponibles ci-dessous" si la gateway est active.

Reason:
- Le read-model public ne doit contenir que du contenu qu'AkarFinder peut légitimement présenter comme inventaire propre.
- Les listings tiers legacy gelés ne disparaissent pas de la DB mais cessent d'être présentés comme annonces AkarFinder.
- Cette mission complète la doctrine motor purity (freeze ingestion + registre sources + read-model authorized_only).

Impact:
- 966 tests (915 scrapers + 51 API), 0 échec. Build OK.
- 30 tests dédiés dans `scripts/scrapers/__tests__/public-listing-access.test.ts`.
- Toute source inconnue ou legacy insérée dans property_listings sera silencieusement filtrée côté public.
- Les partenaires (partner_csv) et sources first_party (akarfinder, internal) restent pleinement publiés.
- Prochaine migration : HOME-MOTOR-PURITY-WORDING-1 — nettoyage wording home page.

## 2026-07-02 - SERP-PURE-GATEWAY-FIRST-1 — /search gateway-first

Status: Validated

Decision:
- /search recomposé en SERP moteur pur : Search Gateway comme cœur visible, annonces structurées en section secondaire.
- Nouvel ordre de la colonne liste :
    1. ExternalIndexedResultsSection (PRIMARY — Sources originales, résultats web à la volée)
    2. PartnerListingsSection ou PartnerEmptyNote (SECONDARY — uniquement si first_party/partner_authorized)
- isGatewayLoading initialisé à `true` quand gateway activée : supprime le flash de contenu vide avant le premier fetch.
- PartnerEmptyNote : "Aucune annonce partenaire AkarFinder pour cette recherche. Voici les résultats sur les sources originales ci-dessus." — ne masque jamais les résultats gateway.
- Wording nettoyé :
    Supprimé : "annonces analysées", "biens analysés", "annonces AkarFinder à [City]"
    Ajouté : "Sources originales", "Résultats immobiliers à [City]", "Annonces partenaires AkarFinder"
- Compteur hero : total gateway + structured (jamais "biens analysés").
- Fallback sans gateway : structured listings restent primaires (comportement inchangé si NEXT_PUBLIC_SEARCH_GATEWAY_ENABLED=false).
- Gateway runtime (normalizer, policy, sources, ranking) : inchangée.
- Ingestion, motor purity guard, source registry, DB schema : inchangés.

Reason:
- Après PUBLIC-READMODEL-AUTHORIZED-ONLY-1, la DB publique ne contient plus d'annonces legacy.
  Sans gateway-first, /search serait vide pour les utilisateurs sans partenaires dans la DB.
- Le moteur doit rester utile et crédible même avec zéro annonce partenaire en DB.
- La gateway fournit un volume immédiat (avito, sarouty, agenz, logic-immo, mubawab, yakeey via Serper).

Impact:
- 1027 tests (976 scrapers + 51 API), 0 fail. Build OK.
- 61 tests dédiés dans `scripts/scrapers/__tests__/serp-gateway-first.test.ts`.
- /search affiche la gateway dès le premier render (isGatewayLoading=true → skeleton immédiat).
- CTA externe = "Voir sur [source]" — jamais de fiche interne, contact, WhatsApp, galerie.
- Miniatures contrôlées par NEXT_PUBLIC_SEARCH_GATEWAY_THUMBNAILS_ENABLED (layout propre si OFF).
- partner_csv / first_party si présents → section "Annonces partenaires AkarFinder" visible.
- Prochaine mission : HOME-MOTOR-PURITY-WORDING-1.

## 2026-07-02 - LISTING-DETAIL-BOUNDARY-HARDENING-1 — /listings/[id] réservé first_party + partner_authorized

Status: Validated

Decision:
- /listings/[id] applique désormais un guard au niveau de la route SSR.
- Toute annonce dont la source n'est pas first_party ou partner_authorized
  retourne 404 avant que ListingDetail ne soit chargé.
- Guard : canShowInternalListingDetail(listing.source_name ?? "") importé de source-access-registry.
- Sources bloquées : mubawab, avito, sarouty (third_party_legacy),
  agenz, logic-immo (public_external_live), yakeey (benchmark_source), source inconnue.
- Sources autorisées : akarfinder, internal, first_party, partner_csv (partner_authorized).
- Fallback mock (getListingById) protégé aussi : mock listings ont source_name="Mubawab" → 404.
- La double protection dans ListingDetail (canHaveInternalDetail sur display_depth) est conservée.
- canShowInternalListingDetail était déjà défini dans source-access-registry.ts — pas de nouvelle fonction.

Reason:
- Après SERP-PURE-GATEWAY-FIRST-1, les CTA externes pointent vers la source originale.
  Il restait une porte d'entrée directe : /listings/[id] pour les annonces legacy.
  AkarFinder ne réhéberge pas les annonces tierces non autorisées.

Impact:
- /listings/137 (mubawab legacy) → 404 (NotFound).
- 1084 tests (1033 scrapers + 51 api), 0 fail. Build OK.
- 57 tests dédiés dans scripts/scrapers/__tests__/listing-detail-boundary.test.ts.
- /search, /map, home inchangés et fonctionnels.

## 2026-07-02 - FOOTER-LEGAL-TRANSPARENCY-1 — Footer propre + pages légales cohérentes moteur pur

Status: Validated

Decision:
- Aucun lien footer ne pointe vers # (audit terminé, SiteFooter clean).
- Description footer texte : "centralise" / "doublons" → "vous aide à chercher" / "repères du quartier".
- Disclaimer footer : "aucun partenariat revendiqué" → "repères indicatifs + source visible + lien direct".
- Meta description app/layout.tsx : "centralise" → moteur pur + repères quartier.
- 7 pages légales corrigées pour wording cohérent :
  - /a-propos : "rassemble" → "affiche des résultats"
  - /demande-retrait : "indexe" → "affiche"
  - /faq : "indexe" → "affiche des résultats"
  - /conditions-utilisation : "rassemble" → "affiche + partenaires"
  - /comment-ca-marche : OK (déjà aligné)
  - /contact : OK (déjà aligné)
  - /politique-confidentialite : OK (déjà aligné)
- Wording interdit supprimé de partout : centralise, rassemble, indexe, doublons
- Footer structure conservée (pas de refonte UI).
- Toutes les pages retournent 200.

Reason:
- Après 6 missions Phase 1 alignées sur moteur pur + intelligence quartier,
  les pages légales et footer encore contenaient du wording "annonces centralisées"
  incompatible avec la doctrine.
- Avant lancement public, la transparence doit être claire : sources originales,
  retrait possible, contact fonctionnel, indicatif (non garanti).

Impact:
- / + 7 pages légales : 8/8 en 200.
- 0 lien footer #.
- Footer + meta description alignés moteur pur.
- Pages légales mentionnent : source, retrait, correction, indicatif.
- 1193 tests (1142 scrapers + 51 api), 0 fail. Build OK.
- Prochaine décision : MAP-NEIGHBORHOOD-INTELLIGENCE-1 pour actif quartier.

## 2026-07-02 - HOME-MOTOR-PURITY-WORDING-1 — Refonte wording home (moteur pur + intelligence quartier)

Status: Validated

Decision:
- La home AkarFinder supprime tout wording "annonces analysées", "biens analysés", "données analysées",
  "index AkarFinder", "biens indexés", "résultats observés récemment", "doublons détectés",
  "sources analysées" et assimilés.
- Positionnement cible établi : moteur de recherche immobilier pur + intelligence quartier.
- HomeResultPreview (mur d'annonces) supprimé de app/page.tsx.
- MarketPulse ticker filtre désormais vers les sources autorisées uniquement
  (canPublishDbRowToPublicSurface avant mapDbRowToListing).
- Fallback shortDetail : "Annonce analysée" → "Repère disponible".
- Hero : chip → "Moteur de recherche immobilier au Maroc",
  subtitle → "Cherchez dans l'immobilier marocain. Comprenez le quartier avant de contacter."
- Photo hero, design global, palette, animations : CONSERVÉS.
- Composants modifiés : GoogleLikeHero, WhySection, DataProofBlock, CityIntentGrid,
  SignatureMapSection, HomeFinalCTA, MreTrustSection, MarketPulse,
  get-market-pulse-listings.ts, app/page.tsx.
- Tests dédiés : scripts/scrapers/__tests__/home-motor-purity.test.ts (109 tests).

Reason:
- LISTING-DETAIL-BOUNDARY-HARDENING-1 a bouclé la protection du read-model.
  Il restait un écart de cohérence produit : la home utilisait encore des labels
  hérités du modèle "agrégateur d'annonces" incompatibles avec le positionnement moteur pur.
- Un moteur pur ne "centralise" pas les annonces, il redirige vers les sources originales.
  Le wording doit refléter cela.

Impact:
- 1193 tests (1142 scrapers + 51 api), 0 fail. Build OK.
- HTTP 200 confirmé sur /. 14/14 vérifications HTML clean.
- Aucun lien /listings/ interne sur la home pour sources non autorisées.
- /search, /map, /listings, /onboarding, ingestion, gateway, registry : inchangés.
- Prochaine décision à anticiper : QA-PROD-MOBILE-FINAL avant P18A (Alertes MVP).

## 2026-07-02 - MCP-SERVERS-INSTALLATION-1 - Installation et configuration de serveurs MCP (Figma, Playwright, Chrome DevTools, 21st.dev)

Status: Validated

Decision:
- Ajout de serveurs MCP (Model Context Protocol) pour Figma, Playwright, Chrome DevTools et 21st.dev.
- Configuration effectuée localement dans le fichier `.mcp.json` du projet.
- Configuration effectuée globalement dans le fichier `mcp_config.json` de l'environnement Gemini.

Reason:
- Permettre à l'agent de développement d'automatiser des tests E2E via Playwright, d'inspecter et débugger le DOM/réseau via Chrome DevTools, et de concevoir des intégrations de design conformes à partir de Figma.

Impact:
- Les configurations locales et globales contiennent les définitions de serveurs Figma, Playwright, Chrome DevTools et 21st-dev magic.

## 2026-07-02 - MAP-NEIGHBORHOOD-CORRECTION-1 - `/map` devient une carte d'intelligence quartier

Status: Validated

Decision:
- `/map` ne publie plus les listings tiers legacy.
- L'ancien contrat P10B "carte d'annonces géolocalisées" est superseded pour la Phase 1 moteur pur.
- `searchListings` et `applyGeoEnrichment` restent hors `/map`.
- `minReliabilityScore` n'est plus un filtre `/map`.
- `reliability_score` global reste disponible hors `/map` pour les surfaces autorisées.

Reason:
- La Phase 1 AkarFinder doit rester un moteur pur + intelligence quartier.
- La carte sert à l'exploration de quartiers avec repères indicatifs, pas à la publication de listings legacy géolocalisés.

Impact:
- `/map` s'appuie sur `lib/map/neighborhood-data.ts` et l'expérience `MapNeighborhoodExperience`.
- Les tests et la documentation sont alignés avec la nouvelle carte quartier.

## 2026-07-02 - NEIGHBORHOOD-DATA-FIRST-PARTY-1 - Couche quartier first-party centralisée

Status: Validated

Decision:
- AkarFinder maintient une couche quartier first-party, indépendante des annonces tierces legacy.
- Usage autorisé: `/map`, futures pages quartier, CTA `/search`, repères quartier.
- Non-usage: pas de scoring d'annonces tierces, pas de densité d'annonces, pas de prix/m² inventés.
- Les helpers de quartier exposent des slugs, des CTA `/search` encodés, des coordonnées représentatives et des labels prudents.

Reason:
- La surface quartier doit pouvoir servir `/map` puis les futures pages quartier sans dépendre de listings legacy.
- La source de vérité doit rester centralisée et testée pour éviter la dérive de labels, slugs et CTA.

Impact:
- `lib/map/neighborhood-data.ts` devient la couche centrale.
- Les tests vérifient l'encodage des slugs, les CTA `/search`, les limites géographiques plausibles et l'absence de wording risqué.


## 2026-07-02 - NEIGHBORHOOD-PAGES-MVP-1 - Pages quartier MVP first-party

Status: Validated

Decision:
- AkarFinder cr�e des pages quartier MVP bas�es uniquement sur la donn�e quartier first-party valid�e.
- Usage: expliquer le quartier, afficher des rep�res prudents, proposer des CTA `/search` et soutenir l'exploration quartier.
- Non-usage: pas de fiches annonces tierces, pas de `/listings`, pas de statistiques invent�es, pas de prix/m� invent�s.

Reason:
- La surface quartier doit rester informative et prudente avant la recherche sur les sources originales.
- Le MVP doit r�utiliser la couche quartier existante sans r�activer les logiques listings legacy.

Impact:
- Nouvelles routes `/quartiers` et `/quartiers/[citySlug]/[neighborhoodSlug]`.
- Tests d�di�s pour verrouiller les helpers, le routing, les CTA et le wording risqu�.

## 2026-07-04 - PHASE-1-PUBLIC-LAUNCH-APPROVED - Phase 1 ready for public announcement

Status: Validated

Decision:
AkarFinder Phase 1 can be publicly announced because the Search Gateway returns external web results while preserving source-original redirection and enforcing no third-party listing persistence.

Doctrine compliance verified:
- No third-party listings created or stored
- No contacts/WhatsApp/galleries copied from external sources
- No third-party thumbnails exposed
- All external results link to original sources
- Wording "Resultat web externe" used consistently
- /listings/[id] access restricted to internal only

Reason:
- 9/9 production routes tested
- 129 external results validated
- 0 wording violations
- 0 blocking bugs
- API and UI coherent

Impact:
- Public announcement ready
- Next phase focuses on coverage optimization and ranking refinement after initial user feedback


## 2026-07-04 - STRATEGIC-REALITY-ALIGNMENT-1 - Search Gateway as traffic layer, demand capture as business bridge

Status: Validated

Decision:
After external strategic review, AkarFinder must reposition from "maximum annonces" to "qualified search intentions."

Search Gateway is validated as traffic acquisition layer, but shall NOT be presented as the final moat.

Gateway role:
- attracts qualified searches
- measures intentions by city/neighborhood/type
- shows source diversity
- redirects to original source

Gateway is NOT:
- a marketplace
- an exhaustive listings database
- a proprietary property asset sufficient alone
- a promise of "all Moroccan listings"

Business bridge priorities:
1. Demand capture (alerts, search relaunches, buyer dossiers)
2. Lead qualification (intent, budget, timeline, profile)
3. Promoter/agency pilot validation (paid partnership test)
4. Market intelligence (neighborhood data, market indicators)

New public promise:
"AkarFinder helps you search more widely, compare more quickly, and always contact the original source."

Never promise:
- exhaustive inventory
- "all listings in Morocco"
- marketplace status

Guarantee:
- external results always link to original source
- search intentions are captured to improve data
- no third-party listing persistence
- no third-party contact/WhatsApp/gallery copying

Reason:
External audit identified risk of gap between public promise and actual product architecture. Aligning expectations prevents credibility loss and enables clearer business model (demand access, not listings ownership).

Impact:
- Roadmap reordered: Demand capture before Gateway optimization
- Business model clarified: sell access to qualified intentions, not annonces inventory
- Product messaging aligned: traffic layer + intelligence + partner bridge
- Short-term validation: promoter/agency pilot becomes top priority
- MRE market becomes strategic niche (values clarity, preparation, original source)

Next phase:
SERP-PURITY-ALIGNMENT-1 (remove marketplace traces from UI)
→ PROMISE-REALITY-ALIGNMENT-1 (align public texts)
→ ALERTS-DEMAND-CAPTURE-MVP-1 (capture qualified intent)
→ SAKAN-PROMOTER-PILOT-OFFER-1 (test B2B revenue model)


## 2026-07-04 - DEMO-SHOWCASE-MODE-STRATEGY-1 - Demo layer for B2B sales and product vision

Status: Approved

Decision:
AkarFinder adds a demonstration layer to the roadmap, clearly separated from live production.

Purpose:
- Show promoters/agencies what authorized partner presence could look like
- Support B2B sales conversations and Sakan Expo interactions
- Demonstrate target experience for Buyer / Seller / Renter with rich content
- Provide sales support before having many real partners

Scope:
Demo Showcase is a sales and product vision tool, not an inventory system.

Rules:
- All demo content must be clearly labeled "Demo" or "Example"
- No fake partners presented as real
- No fake listings presented as live inventory
- No fake leads presented as real leads
- No simulated data confused with production data
- Demo mode does NOT reactivate marketplace logic
- Demo mode does NOT create /listings external entries
- Demo mode does NOT store third-party results
- Demo mode does NOT bypass Phase 1 doctrine

Demo pages to showcase:
1. Example promoter page
2. Example agency page
3. Example Buyer experience (rich)
4. Example Seller experience (rich)
5. Example Renter experience (rich)

Allowed wording:
- "Mode démo"
- "Exemple de page promoteur"
- "Exemple d'expérience Acheter"
- "Données fictives à titre d'illustration"
- "Aperçu de l'expérience partenaire"
- "Maquette fonctionnelle"

Forbidden wording:
- "partenaire vérifié"
- "annonce vérifiée"
- "annonce fiable"
- "inventaire réel"
- "données réelles"
- "leads réels"
- "résultats garantis"
- "toutes les annonces"
- "marketplace"
- "exhaustif"
- "officiel"
- "certifié"
- "prix réel"

Timing:
Demo Showcase follows demand capture MVP (alerts + dossier acheteur).
Demo Showcase precedes promoter pilot offer.
Target launch: before Sakan Expo.

Reason:
External sales conversations with promoters/agencies benefit from seeing a complete picture of what partnership could unlock. Demo mode supports these conversations without creating marketplace confusion or false promise of exhaustive inventory.

Impact:
- Roadmap additions: 4 demo showcase missions
- New phase inserted before B2B monetization pilot
- Sales enablement improved
- Vision clarity for stakeholders

## 2026-07-04 - PARTNER-LISTING-STANDARD-1 - Standard de fiche partenaire structuree

Status: Validated

Decision:
- AkarFinder adopte un standard de fiche partenaire structuree pour les promoteurs, agences premium et agences partenaires.
- Un partenaire ne peut pas beneficier d'un affichage premium simplement parce qu'il paie ou parce qu'il est partenaire.
- Le principe produit est: pertinence d'abord, partenaire ensuite, qualite de fiche ensuite, source externe en dernier.
- Les fiches partenaires doivent fournir une identite claire, une autorisation explicite, un quartier obligatoire, une localisation exploitable, un modele prix clair, une surface, des regles medias, des regles contact et des enrichissements autorises.
- Les resultats web externes restent limites: sans images, sans contact direct, sans galerie, avec source originale et apercu limite.
- Les resultats partenaires autorises peuvent afficher des images autorisees, details enrichis, proximite, mobilite, quartier, CTA partenaire, page projet ou fiche partenaire uniquement si l'autorisation est claire.
- Les niveaux internes de qualite sont: `limited`, `standard`, `enriched`, `premium_ready`.
- Les labels publics autorises sont: `Informations limitees`, `Fiche structuree`, `Fiche enrichie`, `Presentation premium`.
- Les termes publics interdits restent: verifie, certifie, officiel, fiable, meilleur, garanti, prix reel, annonce verifiee, annonce fiable, agence de confiance, partenaire officiel.
- La regle future de ranking est documentee mais non implementee: un partenaire ne passe jamais devant si son resultat n'est pas pertinent.

Reason:
- AkarFinder prepare l'arrivee de partenaires autorises sans redevenir une marketplace ni melanger partenaires autorises et resultats web externes.
- La qualite des fiches partenaires doit devenir un avantage produit mesurable, pas un simple statut commercial.
- La separation stricte protege la credibilite: le partenaire apporte des donnees propres et autorisees; AkarFinder apporte structure, recherche, contexte et qualification.

Impact:
- Documentation creee: `docs/PARTNER_LISTING_STANDARD.md`.
- Fondation code isolee: `lib/partners/partner-listing-types.ts`, `partner-listing-standard.ts`, `partner-listing-quality.ts`, `partner-listing-examples.ts`.
- Aucun changement DB, Supabase, Search Gateway, ingestion, API partenaire, auth ou ranking.
- Mission suivante naturelle: `PARTNER-RANKING-POLICY-1`, uniquement comme politique avant implementation.

## 2026-07-04 - PARTNER-LISTING-FLOORPLAN-STANDARD-1 - Plans 2D dans le standard partenaire

Status: Validated

Decision:
- AkarFinder introduit le plan 2D comme composant important du standard de fiche partenaire.
- Pour les promoteurs partenaires, programmes neufs, residences, projets en vente sur plan et projets avec unites types, le plan 2D est fortement recommande.
- Pour promoteur ou programme neuf, `premium_ready` requiert un signal de plan 2D autorise ou disponible sur demande.
- Le plan doit etre autorise par le partenaire et presente comme document fourni par le partenaire.
- AkarFinder ne presente jamais un plan comme certifie, officiel, verifie ou garanti par AkarFinder.
- Pour les agences, le plan 2D est optionnel: il peut ameliorer la fiche pour villas, grands appartements, bureaux et locaux, mais ne bloque pas `premium_ready` si le reste est complet.
- Si `floor_plan_authorized=false`, AkarFinder ne doit pas afficher le plan.

Reason:
- Les projets neufs et ventes sur plan necessitent plus de structure que de simples photos.
- Le plan 2D aide a comprendre la distribution, l'orientation indicative et les surfaces avant contact, sans devenir une promesse contractuelle.
- Le standard renforce la valeur promoteur tout en gardant un wording prudent et une autorisation claire.

Impact:
- Types ajoutes: `PartnerFloorPlanType`, `PartnerFloorPlanDisplayMode`, `PartnerFloorPlanSource`, `PartnerFloorPlanScope`, `PartnerFloorPlanStandard`.
- Qualite mise a jour: promoteur/projet neuf sans plan 2D ne peut pas atteindre `premium_ready`; agence complete peut toujours atteindre `premium_ready` sans plan.
- Tests partenaires integres a `npm test` via `package.json`.
- Aucun upload, backend, stockage fichier, DB, Supabase, Search Gateway, page live ou ranking reel.

## 2026-07-04 - PARTNER-PAGES-ZILLOW-LIKE-DEMO-EXPERIENCE-1 - Pages partenaires demo enrichies

Status: Validated

Decision:
- AkarFinder cree une experience demo premium pour montrer la cible des pages partenaires promoteurs et agences.
- Les pages partenaires enrichies sont autorisees uniquement si les donnees respectent le standard AkarFinder.
- Pour les promoteurs: page promoteur, page projet, tranches, typologies, plans 2D, appartement temoin, galerie autorisee, localisation exploitable, proximite, mobilite, quartier, disponibilite et CTA autorises.
- Pour les agences: agence virtuelle, biens structures, zones couvertes, specialites, contact autorise, demandes qualifiees et lecture quartier.
- Les resultats partenaires peuvent etre enrichis; les resultats web externes restent limites avec source originale et apercu limite.
- La demonstration ne cree aucun backend, aucune API, aucun vrai contact, aucun upload, aucun ranking reel et aucune donnee partenaire reelle.

Reason:
- Les partenaires doivent comprendre la valeur d'une fiche structuree au-dela d'une simple annonce.
- Les promoteurs ont besoin de presenter projets, tranches, typologies et plans 2D dans un format lisible.
- Les agences ont besoin de montrer zones, specialites et biens structures tout en recevant des demandes mieux qualifiees.

Impact:
- Creation de la route demo `/demo/projet`.
- Enrichissement de `/demo/promoteur`, `/demo/agence`, `/demo` et `/demo/acheter`.
- Documentation creee: `docs/PARTNER_PAGES_EXPERIENCE.md`.
- Aucun changement Search Gateway, DB, Supabase, ingestion ou production.

## 2026-07-05 — PARTNER-QUALITY-SCORING-POLICY-1

Decision:
AkarFinder introduit un scoring interne de qualite partenaire en 5 axes
(search_relevance, partner_listing_quality, authorization, location_completeness,
freshness), tous en [0,100], implementes en logique pure dans lib/partners.

Regle centrale:
AkarFinder ne score pas "la verite" d'une annonce. Il score la qualite, la
structure, l'autorisation et l'exploitabilite d'une fiche partenaire.

Regles:
- Ce scoring ne s'appelle jamais "score de fiabilite".
- Seuls les labels publics existants sont exposables (Informations limitees /
  Fiche structuree / Fiche enrichie / Presentation premium).
- Un mismatch de transaction plafonne la pertinence a 20: un partenaire non
  pertinent ne passe jamais devant un resultat pertinent.
- web_external reste la source la plus basse: apercu limite, source originale,
  sans image ni contact.
- Les regles plan 2D (promoteur premium_ready exige un signal plan autorise,
  agence non bloquee) restent la source de verite du niveau qualite.

Scope:
- Types et fonctions pures + tests uniquement. Pas de DB, pas de Search
  Gateway, pas d'API, pas de page live, pas de ranking live.

## 2026-07-05 — PARTNER-RANKING-POLICY-MVP-1

Decision:
AkarFinder implemente son moteur de classement partenaire en module isole
(lib/partners/partner-ranking-policy.ts), sans branchement a la SERP live.

Regle absolue:
Pertinence d'abord, partenaire ensuite, qualite de fiche ensuite, source
externe en dernier. Un partenaire non pertinent ne passe jamais devant un
resultat pertinent.

Raison du non-branchement live:
Le Search Gateway est gele (motor purity) et sa modification est interdite
hors phase explicitement autorisee. Le moteur est donc demontre sur les pages
demo uniquement (DemoPartnerResultStack calcule desormais l'ordre au lieu de
le hardcoder). Le branchement live sera une mission dediee.

Droits d'affichage:
web_external reste sans image / sans contact / sans galerie avec lien source
originale obligatoire, quel que soit le descripteur. Les partenaires
n'affichent image et contact que sous autorisation explicite.

## 2026-07-05 — SEARCH-PROFILE-ONBOARDING-MVP-1

Decision:
AkarFinder introduit un profil de recherche guide en 8 etapes sur
/profil-recherche, en MVP frontend uniquement.

Regles:
- Aucun backend, aucune DB: etat local + localStorage
  (akarfinder.search-profile.v1).
- Aucun contact reel requis, rien n'est envoye.
- L'onboarding n'est pas force sur la homepage: entree discrete depuis
  /search ("Creer mon profil de recherche").
- Resume indicatif et non contractuel, avec points a verifier par projet
  (achat / location / vente) et CTA internes (/search construit depuis le
  profil, alerte demo, accompagnement).

## 2026-07-05 — DEMAND-CAPTURE-MVP-1

Decision:
Le profil de recherche peut devenir une "demande qualifiee" structuree
(SearchDemandProfile), en MVP prudent sans aucun envoi.

Regles:
- Aucun envoi automatique, aucune API, aucune DB: la demande reste locale
  et doit etre confirmee avant tout partage futur.
- Contact utilisateur optionnel; sans consentement explicite (case cochee),
  le contact n'entre jamais dans le payload — la demande reste anonyme.
- Cote partenaire, l'apercu (QualifiedDemandPreview) montre budget, zone,
  intention, urgence, criteres et non-negociables; le contact n'apparait
  qu'avec consentement.
- Demonstration fictive sur /demo/demande (noindex), construite via le vrai
  builder pour montrer le payload reel.

## 2026-07-05 — PARTNER-INTAKE-DEMO-KIT-1

Decision:
AkarFinder publie un kit partenaire demo sur /demo/partenaire (noindex) pour
montrer a un promoteur ou une agence le modele a respecter pour apparaitre
proprement sur AkarFinder.

Contenu:
- Standard de fiche partenaire (5 piliers), localisation 3 niveaux, photos
  autorisees, plan 2D, contact autorise.
- Checklist promoteur (8 items) et checklist agence (8 items).
- Renvois vers les exemples complets (/demo/bien, /demo/projet, /demo/agence).
- Exemple fictif de demande qualifiee recue (QualifiedDemandPreview).
- Benefices sans promesse de volume ni garantie de resultats.
- Aucun backend, CTA demonstration uniquement.

## 2026-07-05 — ROADMAP-SEARCH-VOLUME-SEO-ALIGNMENT-1

Decision 1 :
AkarFinder priorise maintenant le volume commercialement visible, sans casser
la doctrine. Baseline mesuree : 15,1 resultats/requete (insuffisant), cible
court terme 30-50 resultats publics affichables sur les grandes requetes.

Decision 2 :
Les resultats Gateway servent de couverture publique externe, mais restent en
apercu limite avec source originale — sans image, sans contact, sans galerie,
sans page detail interne.

Decision 3 :
La pertinence prime toujours sur le badge partenaire. Ordre : pertinence
d'abord, badge ensuite, qualite de fiche ensuite, Gateway en fallback volume.

Decision 4 :
Le SEO devient un axe produit prioritaire, mais uniquement via des pages
utiles, editoriales, ville/intention/quartier, et pages partenaires
autorisees (docs/SEO_ROADMAP.md).

Decision 5 :
Aucune page demo ou fausse annonce ne doit etre indexee. /demo/* reste
noindex/nofollow ; aucun resultat externe ne produit de page interne
indexable ; /listings/137 reste 404.

## 2026-07-05 — DEMO-PROMOTER-AGENCY-REALISTIC-MOCKUP-1

Decision:
Les pages /demo/promoteur et /demo/agence deviennent des mock-ups commerciaux
realistes : le partenaire fictif est presente comme s'il etait deja client
("Atlas Residences" promoteur, "Rabat Select Immobilier" agence), au lieu
d'une page explicative "voici ce que vous auriez".

Regles maintenues:
- Mention demo discrete conservee (bandeau DemoShell + DemoBadge + note
  "contenu fictif, non contractuel" en pied de page).
- Jamais de partenaire reel, de contact reel, de WhatsApp, d'email, d'image
  externe ou d'annonce copiee. Prix toujours indicatifs.
- Badges neutres uniquement (Page partenaire demo, Plans 2D disponibles,
  Fiches structurees...) — jamais verifie/certifie/officiel/meilleur/garanti.
- Scores quartier fictifs avec mention "Reperes indicatifs pour
  demonstration. A confirmer sur place." — jamais de score securite.

## 2026-07-05 — BUY-RENT-SERP-RELEVANCE-TUNING-1

Decision:
Le Search Gateway conserve son volume acquis, mais ajoute un scoring interne
de pertinence pour mieux ordonner Acheter / Louer sans changer la doctrine
publique.

Regles:
- Score interne uniquement — jamais expose publiquement, jamais presente
  comme score de fiabilite.
- Signaux pris en compte : match d'intention, match ville, match type de bien,
  qualite de page, penalites achat/location, penalites pages nationales,
  penalites pages prix/referentiel, penalites pages generiques.
- Les requetes location ne doivent pas injecter d'achat ; les requetes achat
  ne doivent pas injecter de location.
- Les requetes ville doivent pousser vers le bas les pages nationales ou faux
  matchs de ville lorsqu'une meilleure page locale existe.
- Les requetes neuf doivent pousser vers le bas les pages de location
  mensuelle meme si elles mentionnent "neuf".
- Le cout provider ne doit pas augmenter : `num=10`, round 2 conditionnel si
  `<30`, budget total borne `<=12` appels.

Doctrine inchangee:
- Resultat web externe = apercu limite + source originale obligatoire.
- Aucun contact, aucune galerie, aucune image tierce, aucune page detail
  interne pour un resultat externe.
- `/listings/137` doit rester `404`.

## 2026-07-05 - BUY-RENT-TUNING-CODE-RECONCILIATION-1

Decision:
Un tuning Search Gateway n'est deployable que s'il est present dans un HEAD
committe et si la preview de revue correspond a ce HEAD.

Regles:
- Un etat stash-only n'est jamais un candidat production.
- Une preview validee contre un etat stash-only n'est pas tracable.
- La gate de release est : HEAD committe d'abord, preview tracable ensuite,
  GO production explicite en dernier.
- La roadmap production reste a `73%` tant que cette chaine de tracabilite
  n'est pas complete et approuvee.

## 2026-07-06 - SEO-FOUNDATION-1

Decision:
Poser la fondation SEO technique (sitemap, robots, canonical, metadata,
structured data prudent) sans creer de contenu SEO massif et sans toucher au
Search Gateway ni a sa doctrine.

Regles:
- `metadataBase` doit toujours pointer vers l'URL reellement servie
  aujourd'hui (`https://akarfinder.vercel.app`), jamais vers un domaine futur
  non branche. `akarfinder.ma` reste documente (`lib/seo/site.ts`,
  `futureDomain`) mais inactif tant que le domaine n'est pas reellement
  connecte.
- Pas de `title.template` global : chaque page du site suffixe deja son
  propre titre avec "— AkarFinder" manuellement ; un template global aurait
  double ce suffixe sur toutes les pages existantes (constate lors de cette
  mission via la documentation Next.js sur l'heritage des titres).
- `/demo/**` reste `noindex, nofollow` via meta uniquement — jamais de
  `Disallow: /demo` dans `robots.txt`, sinon Google ne peut plus lire le
  noindex.
- `/search` reste `noindex, follow` : resultats Gateway dynamiques/tiers,
  contenu variable par querystring. Ne devient pas la base SEO principale ;
  les pages SEO ville/quartier/prix proprietaires arriveront avec
  SEO-CITY-INTENT-PAGES-1.
- Sitemap limite a `/`, `/pro`, `/profil-recherche` — jamais `/demo`,
  `/search`, ou `/listings/**`.
- Structured data limite a `Organization` et `WebSite`/`SearchAction`.
  Interdiction absolue de `RealEstateListing`, `Offer`, `AggregateRating`,
  `Review` sur des resultats Gateway externes.
- Ecart de nombre signale, non resolu unilateralement : l'ODM de mission
  citait "Production : 76%" alors que le dernier etat reellement deploye et
  documente est `73%` (voir BUY-RENT-TUNING-CODE-RECONCILIATION-1
  ci-dessus). A reconcilier par Achraf.
