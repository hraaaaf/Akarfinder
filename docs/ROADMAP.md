ROADMAP.md — AkarFinder Roadmap Produit & Business
Version : 2026-06-30 — GOOGLE-LIKE-FIRST-STRATEGY-DOCS-1 + V9.5 Source Display Policy + SITE-SOURCE-BADGES-HARDENING-1

====================================================
GOOGLE-LIKE FIRST STRATEGY — Décision stratégique 2026-06-30

====================================================

AkarFinder devient d'abord un moteur de recherche immobilier Google-like.

Phrase produit officielle :
"AkarFinder référence les annonces immobilières publiquement indexables au Maroc,
les classe par fiabilité et redirige vers la source originale."

----------------------------------------------------
DOCTRINE PRODUIT

Tout résultat immobilier publiquement indexable doit pouvoir apparaître dans la
recherche AkarFinder. Le niveau de détail dépend du statut source.

La SERP doit englober :
* Résultats partenaires complets
* Sources publiques indexables (aperçu limité + miniature + source + lien original)
* Liens source (pour les sources partiellement accessibles)
* Signaux internes (couche Engine — non exposée directement en SERP)

La priorité produit devient : indexation + ranking + fiabilité + redirection source.

----------------------------------------------------
NOUVEAU MODÈLE DE RÉSULTAT SERP

full_partner_listing
  Pour agences/promoteurs partenaires.
  → fiche complète, galerie, contact, WhatsApp, demande visite, brochure, lead AkarFinder

rich_authorized_result
  Pour source explicitement autorisée.
  → fiche riche, source affichée, lien source, comparaison possible

indexed_result
  Pour annonce publique indexable.
  → miniature unique, titre, prix si disponible, surface/ville si disponible,
    score fiabilité, source visible, lien vers annonce originale
  → INTERDIT : contact, WhatsApp, lead AkarFinder, galerie

thin_indexed_result
  Pour page publique partiellement indexable.
  → titre ou résumé court, source, lien original, peu ou pas de données structurées
  → pas de miniature si non disponible/propre

source_search_link
  Pour source dont les pages détail ne sont pas indexables mais dont une page
  recherche/catégorie est utile.
  → lien vers la recherche sur la source, pas d'annonce individuelle

suppressed
  Pour source bloquée / captcha / login / noindex / interdiction / risque.
  → non affiché en SERP, utilisation interne éventuelle comme signal

----------------------------------------------------
AVITO — NOUVELLE DÉCISION STRATÉGIQUE

Ancienne logique : Avito = market_signal_only partout (trop restrictif)

Nouvelle logique :
  Avito annonce publiquement indexable proprement
  → search_result_display_mode = indexed_result
  → source_badge = public_indexed
  → thumbnail_policy = single_thumbnail_allowed si image proprement disponible
  → CTA principal = Voir l'annonce originale sur Avito
  → INTERDIT : contact, WhatsApp, galerie complète

  Avito non indexable / bloqué / challenge / noindex
  → search_result_display_mode = suppressed ou source_search_link
  → signal marché interne uniquement

----------------------------------------------------
SIGNAL MARCHÉ — COUCHE INTERNE ENGINE

signal_status (Engine) ≠ search_result_display_mode (SERP utilisateur)

Une source peut être :
  audit_source côté Engine
  ET produire un indexed_result côté SERP si certaines annonces sont indexables proprement.

Le signal marché est une notion interne Engine, pas une limitation produit par défaut
pour les résultats de recherche.

----------------------------------------------------
WORDING AUTORISÉ GOOGLE-LIKE

À utiliser :
  "Résultat indexé"
  "Source publique indexée"
  "Aperçu limité"
  "Voir l'annonce originale"
  "Prix observé"
  "Score de fiabilité"
  "Source affichée"
  (lien source obligatoire)

À ne JAMAIS utiliser :
  "AkarFinder copie toutes les annonces"
  "AkarFinder possède toutes les annonces"
  "Annonces vérifiées" (si non partenaire)
  "Prix officiel"
  "Annonce certifiée"

----------------------------------------------------
TRI SERP

La SERP est triée par :
  1. Pertinence de la requête
  2. reliability_score
  3. freshness_score
  4. completeness_score
  5. source confidence
  6. Cohérence prix/m²
  7. Duplicate risk
  8. Display eligibility

Règle : le score de fiabilité ne donne jamais plus de droits d'affichage.
Règle : le badge source ne remplace jamais le score de fiabilité.

Exemples de labels SERP :
  "Source publique indexée · Fiable 82/100"
  "Source publique indexée · À vérifier 61/100"
  "Partenaire premium · Très fiable 94/100"

----------------------------------------------------
DOCTRINE NO-BYPASS (invariante, même en mode Google-like first)

  no bypass
  no proxy
  no stealth
  no fake Googlebot
  no captcha solving
  no login
  respect robots.txt / source status
  respect noindex / nosnippet / noimage si détecté
  pas de contact vendeur pour sources publiques
  pas de galerie complète pour sources publiques
  source visible
  lien original obligatoire
  opt-out / retrait source à prévoir

----------------------------------------------------
ROADMAP MISSIONS GOOGLE-LIKE FIRST

1. GOOGLE-LIKE-FIRST-STRATEGY-DOCS-1   ← COMPLÉTÉE 2026-06-30
   Documentation stratégique du switch Google-like first.

2. WEB-INDEXING-ELIGIBILITY-1           ← COMPLÉTÉE 2026-06-30
   Module pur computeWebIndexingEligibility() — types, règles, 45 tests.
   lib/indexing/web-indexing-eligibility.ts · 559/559 PASS · Build OK
   docs/WEB_INDEXING_ELIGIBILITY.md créé.

3. AVITO-GOOGLE-LIKE-AUDIT-1            COMPLETEE 2026-06-30
   Audit propre : Avito peut-il produire indexed_result limite ?
   Regle : aucun scraping massif, no bypass, no proxy.
   Resultat : robots.txt OK (categories immobilier autorisees) mais HTTP 403
   sur la page categorie avec AkarFinderBot/0.1. Doctrine no-bypass respectee.
   Verdict : suppressed / market_signal_only maintenu. Ne pas promouvoir vers indexed_result.
   614/614 tests PASS. Build OK.
   Outputs : data/audits/avito-google-like/avito_google_like_audit.json
             docs/AVITO_GOOGLE_LIKE_AUDIT.md
   Modules : scripts/audits/avito-audit-helpers.ts
             scripts/audits/audit-avito-google-like.ts
             scripts/scrapers/__tests__/avito-google-like-audit.test.ts

3b. AVITO-SITEMAP-DETAIL-AUDIT-1         COMPLETEE 2026-06-30
    Deuxieme voie : sitemap public Avito.
    robots.txt OK, 1 sitemap declare (sitemap.xml).
    sitemap.xml → HTTP 403 Forbidden avec AkarFinderBot/0.1.
    Doctrine no-bypass respectee : arret immediat.
    Verdict : suppressed confirme — Avito bloque systematiquement les requetes
    non-navigateur sur sitemap ET pages categorie.
    675/675 tests PASS. Build OK.
    Outputs : data/audits/avito-sitemap-detail/avito_sitemap_detail_audit.json
              docs/AVITO_SITEMAP_DETAIL_AUDIT.md
    Modules : scripts/audits/avito-sitemap-helpers.ts
              scripts/audits/audit-avito-sitemap-detail.ts
              scripts/scrapers/__tests__/avito-sitemap-detail-audit.test.ts

3c. SEARCH-API-AVITO-RESULTS-AUDIT-1     COMPLETEE 2026-06-30
    Troisieme voie : Search API autorisee (index tiers).
    Mode fixture_only (aucune cle API configuree) — aucun appel reseau.
    Normalizer valide : 8/12 resultats bruts passes, 3 login/profil rejetes, 1 non-avito rejete.
    Classification : 3 indexable_possible (avec miniature), 5 thin_indexable (sans miniature).
    Recommandation : provider_not_configured — configurer SEARCH_API_KEY pour resultats reels.
    745/745 tests PASS. Build OK.
    Outputs : data/audits/search-api-avito/search_api_avito_audit.json
              docs/SEARCH_API_AVITO_RESULTS_AUDIT.md
    Modules : lib/search-api/search-api-types.ts
              lib/search-api/search-api-normalizer.ts
              scripts/audits/audit-search-api-avito-results.ts
              scripts/scrapers/__tests__/search-api-avito-results-audit.test.ts

3d. SEARCH-API-PROVIDER-REAL-AUDIT-1    COMPLETEE 2026-06-30
    Quatrieme voie : adapter multi-shape + audit provider reel.
    Provider adapter cree (lib/search-api/search-api-provider-adapter.ts) :
      Shape A SerpAPI/ValueSERP (organic_results[].link + thumbnail.src)
      Shape B Generic results[] (url + thumbnailUrl)
      Shape C Generic items[] (url)
      Shape D Bing Search v7 (webPages.value[].url + thumbnailUrl)
      Shape E Serper.dev (organic[].link + imageUrl)
    Script audit separe (audit_type: "search_api_avito_real_provider").
    Mode sans cle : provider_not_configured propre, 0 reseau, 0 secret logue.
    Mode avec cle : 4 requetes site:avito.ma, extract + normalize + classify.
    20 tests (5 provider shapes + invariants + PII + secrets + eligibility).
    .gitignore verifie : .env, .env.local, .env.*.local couverts.
    765/765 tests PASS. Build OK.
    Outputs : data/audits/search-api-avito/search_api_avito_real_provider_audit.json
              docs/SEARCH_API_AVITO_REAL_PROVIDER_AUDIT.md
    Modules : lib/search-api/search-api-provider-adapter.ts
              scripts/audits/audit-search-api-avito-real-provider.ts
              scripts/scrapers/__tests__/search-api-provider-real-audit.test.ts

3e. SEARCH-API-AVITO-REAL-RUN-1         COMPLETEE 2026-07-01
    Run reel avec Serper.dev (2500 credits free tier, 4 requetes utilisees).
    Loader .env.local integre dans le script (Node.js 24, pas de dotenv).
    Shape E detectee automatiquement (Serper organic[].link).
    40 resultats bruts / 33 normalises / 0 miniatures / 0 cle loggee.
    CONSTAT : Search API retourne pages de categories Avito, pas fiches individuelles.
      Exemples : /fr/casablanca/appartements-a_vendre (11641 annonces)
                 /fr/rabat/immobilier (11291 annonces)
    Classification : 33 thin_indexable (pas de miniature Serper pour site: queries).
    Recommandation : thin_indexed_result_possible_via_search_api.
    Verdict : Avito via Search API viable pour thin_indexed_result.
              Ne pas marquer indexed_result avant validation ToS + miniatures.
    765/765 tests PASS. Build OK.
    Outputs : data/audits/search-api-avito/search_api_avito_real_provider_audit.json (mis a jour)
              docs/SEARCH_API_AVITO_REAL_PROVIDER_AUDIT.md (mis a jour)

3f. SEARCH-API-THUMBNAIL-PROVIDER-AUDIT-1  COMPLETEE 2026-07-01
    Audit miniatures pour resultats Avito via Search API images.
    Shape F ajoutee au provider adapter : Serper Images API images[].{title, link, thumbnailUrl}.
    thumbnailUrl = proxy Google (gstatic.com) / imageUrl direct Avito IGNORE (doctrine).
    lib/search-api/thumbnail-provider-policy.ts cree : types + fonctions pures.
      evaluateThumbnailResult() / classifyThumbnailResult() / ThumbnailProviderAuditReport
    Invariants types literaux : can_cache_thumbnail=false, can_download_thumbnail=false.
    40 resultats bruts / 37 normalises / 37 miniatures (100% -- proxy Google).
    Classification : tos_review_required (ToS Serper non valide formellement).
    Recommandation : tos_review_required -- miniatures disponibles, validation ToS requise.
    Pour indexed_result_with_provider_thumbnail : valider ToS Serper + politique Avito.
    781/781 tests PASS. Build OK.
    Outputs : data/audits/search-api-thumbnails/search_api_thumbnail_provider_audit.json
              docs/SEARCH_API_THUMBNAIL_PROVIDER_AUDIT.md
    Modules : lib/search-api/thumbnail-provider-policy.ts
              scripts/audits/audit-search-api-thumbnail-providers.ts
              scripts/scrapers/__tests__/search-api-thumbnail-provider-audit.test.ts

4. SEARCH-RESULT-DISPLAY-MODEL-1        COMPLETEE 2026-07-01
   Modele SERP Google-like unifie : SearchResultDisplayMode + SearchResultDisplayPolicy.
   lib/search/search-result-display-model.ts : computeSearchResultDisplayPolicy() -- module pur.
   lib/search-api/search-api-to-serp-result.ts : normalizedResultToSerpResult().
   Arbre de decision 10 regles : partner→full_partner / Mubawab→indexed_result /
     Avito direct→suppressed / Avito search_api sans thumb→thin_indexed_result /
     Avito search_api + provider thumb→indexed_result_with_provider_thumbnail.
   UI guards : can_show_result=false → return null. production_allowed=false en prod → return null.
   Invariants : can_cache_thumbnail=false, can_download_thumbnail=false (typed literals).
   Avito thumbnails en prod bloquees tant que ToS Serper non valide (tos_review_required).
   21 tests PASS. 802/802 suite complete. TypeScript OK.
   Composants mis a jour : SearchListingCardDark, PhotoFirstListingCard, HomeResultPreview.

4b. SERPER-TOS-THUMBNAILS-VALIDATION-1  COMPLETEE 2026-07-01 (VERDICT: unclear)
    Audit ToS Serper pour usage commercial des thumbnails (encrypted-tbn0.gstatic.com).
    Verdict : unclear — 3 gaps bloquants identifies.
    Gap 1 (BLOQUANT) : Serper ToS n'autorise pas explicitement l'affichage commercial des thumbnailUrl.
    Gap 2 (BLOQUANT) : Clause B2B Serper — ambiguité sur l'exposition aux consommateurs finals.
    Gap 3 (RISQUE) : CGU Avito inaccessibles (403) — politique third-party display inconnue.
    Attenants positifs : hotlink-only (pas de cache/download), server test (Perfect 10), attribution conforme.
    Email Serper pret : docs/SERPER_TOS_THUMBNAILS_VALIDATION.md#email-serper-support
    Action requise : envoyer email → attendre confirmation ecrite → passer thumbnail_tos_review_required=false.
    Docs : docs/SERPER_TOS_THUMBNAILS_VALIDATION.md
           data/audits/legal/serper_tos_thumbnails_validation.json

4c. AVITO-THUMBNAILS-RISK-ACTIVATION-1  COMPLETEE 2026-07-01
    Activation miniatures provider Avito en mode "risk-accepted" (pas de validation ToS formelle).
    Decision : docs/DECISIONS.md (2026-07-01).
    Flags requis : ENABLE_AVITO_PROVIDER_THUMBNAILS=true + AVITO_THUMBNAILS_RISK_ACCEPTED=true.
    Invariants : can_cache_thumbnail=false / can_download_thumbnail=false / hotlink only.
    Attribution "Source : Avito" + redirection Avito sur chaque resultat.
    Fallback gracieux : onerror → thin layout, pas de crash.
    6 tests ajoutes (Suite 8, tests 22-27). 27/27 PASS.
    Fichiers : lib/search/thumbnail-activation-config.ts
               lib/search/search-result-display-model.ts (Rule 6 + thumbnail_risk_accepted)
               lib/search-api/search-api-to-serp-result.ts (options signature)
               components/search-api/SearchApiResultCard.tsx

----------------------------------------------------
SEARCH-INTELLIGENCE-UX STRATEGY — Expérience de recherche enrichie
Version : 2026-07-02 — SEARCH-INTELLIGENCE-UX-ROADMAP-1

====================================================

Après stabilisation du Search Gateway provider et couverture externe, AkarFinder
doit enrichir l'expérience de recherche pour aider l'utilisateur à comprendre
l'adéquation réelle entre sa situation et les résultats proposés.

Principe : Pas seulement afficher des résultats, mais aider à décider intelligemment.

Vocabulaire clé (jamais utiliser les termes interdits) :
  ✓ Score d'adéquation                 ✗ Score de fiabilité (si externe)
  ✓ Points d'attention                 ✗ Points d'inconvénient
  ✓ Confiance indicative               ✗ Prix certifié
  ✓ Repères quartier                   ✗ Quartier dangereux
  ✓ Résultats web externes             ✗ Annonces indexées
  ✓ Source originale                   ✗ Données consolidées
  ✓ Aperçu limité                      ✗ Annonce vérifiée

Dépendance critique :
  Cette initiative démarre APRÈS :
    • SEARCH-GATEWAY-PROVIDER-CONFIG-1 (API key + endpoint configurés)
    • SEARCH-GATEWAY-COVERAGE-OPTIMIZE-2 (couverture multi-source stable)
  
  Raison : Pas de résultats externes = pas de base pour le scoring d'adéquation.

----------------------------------------------------
MISSIONS SEARCH-INTELLIGENCE-UX

1. USER-PROFILE-SEARCH-MODES-1          Planned
   
   Objectif :
   Ajouter un mode de recherche temporaire permettant à l'utilisateur
   de définir son profil pour enrichir les recommandations.

   Scope :
   - Créer widget profil sur /search (sélectionneur radio/boutons)
   - Profils proposés :
     • Jeune actif / studio
     • Jeune couple
     • Famille avec enfants
     • Famille nombreuse
     • MRE
     • Investisseur
     • Changement de logement familial
   
   - Associer chaque profil à des priorités UX :
     budget, surface, calme, écoles, parking, transport,
     centralité, liquidité, sécurité perçue, gestion à distance, services
   
   - Stocker choix en sessionStorage uniquement (pas de data personnelle)
   - Utiliser profil pour influencer le score d'adéquation (mission 3)

   Hors scope :
   - Pas de persistance DB au MVP
   - Pas de ML de profil utilisateur
   - Pas de recommandation push basée sur profil
   - Pas d'enrichissement des fiches /listings au MVP

   Garde-fous :
   - Aucune data personnelle stockée
   - Profil = mode temporaire, réinitialisé en refresh
   - Ne pas influencer les droits d'affichage (uniquement UI/score)

   Critère de réussite :
   - Widget visible et sélectionnable sur /search
   - Profil stocké en sessionStorage
   - Interface claire et accessible

   ----

2. NEIGHBORHOOD-ATTENTION-POINTS-1      Planned
   
   Objectif :
   Maintenir un référentiel de points d'attention quartier pour guider
   les utilisateurs sur les spécificités locales.

   Scope :
   - Définir base de données "attention points" :
     • Stade proche (bruit, événements, circulation saisonnière)
     • Écoles/crèches nombreuses (congestion matin/soir, parking)
     • Zone commerciale dense (bruit, livraisons, parking limité)
     • Axes routiers importants (bruit, circulation)
     • Zone en développement (travaux, poussière, voirie incomplète)
     • Zone touristique (saisonnalité, bruit, location courte durée)
     • Périphérie (dépendance voiture, services moins proches)
     • Zones d'expansion immobilière (futurs changements)
   
   - Données first-party curated (no scraping, no assumptions)
   - Chaque point = description neutre, jamais "bon/mauvais"
   - Associer points à villes/quartiers via données first-party
   
   - API interne pour récupérer points par (city, neighborhood)
   - Afficher sur carte /map et sur cartes résultats /search

   Hors scope :
   - Pas de scraping OSM au MVP
   - Pas de données utilisateur agrégées
   - Pas de notation "quartier sûr/dangereux"
   - Pas de données de criminalité ou violence

   Garde-fous :
   - Données curated only (first-party, audités)
   - Formulation neutre ("point d'attention" pas "inconvénient")
   - Pas de conclusion définitive (= "à vérifier lors de la visite")
   - Attribution de source si données proviennent d'OSM/public

   Critère de réussite :
   - Table quartier_attention_points créée
   - Minimum 30 quartiers couverts
   - UI affiche 2-3 points pertinents par résultat
   - Zéro affirmations absolues ("quartier X est mauvais")

   ----

3. RESULT-FIT-SCORE-GATEWAY-1           Planned
   
   Objectif :
   Calculer un score indicatif sur les résultats Search Gateway indiquant
   l'adéquation entre le résultat et le profil utilisateur + contexte quartier.

   Scope :
   - Créer fonction computeResultFitScore(result, userProfile, neighborhood) → [0, 100]
   
   - Facteurs pris en compte :
     • Cohérence profil choisi (ex: famille → surface ≥ 80m²)
     • Cohérence ville/quartier détecté vs requête
     • Cohérence type de bien vs requête
     • Prix détecté vs budget range du profil
     • Surface détectée vs surface target du profil
     • Source originale visible (bonus)
     • Cohérence titre/requête (pas de bruit)
     • Points d'attention quartier (facteur négatif si critiques pour profil)
     • Confiance du repère quartier (fiable → poids plus fort)
   
   - Score ne représente PAS la "fiabilité annonce"
   - Représente l'adéquation result/profil/quartier
   
   - Affichage recommandé :
     "Score d'adéquation indicatif : 78/100"
     "Basé sur votre profil de recherche et les repères quartier disponibles"
     "À vérifier auprès de la source originale et lors de la visite"

   Hors scope :
   - Pas de prédiction ML (score règle-basé, déterministe)
   - Pas de scoring de la "fiabilité de l'annonce"
   - Pas de garant de qualité

   Garde-fous :
   - Aucune promesse de certitude (formulation = "indicatif")
   - Disclaimer clair ("À vérifier auprès du vendeur et lors de la visite")
   - Score basé sur data observable seulement (pas d'heuristiques floues)
   - Pas de discrimination (pas de score pour quartier/ethnie/etc)
   - Pas de conclusion "trop risqué / ne pas acheter"

   Critère de réussite :
   - Fonction pure testable, 25+ tests
   - Score visible sur ExternalIndexedResultCard
   - Répartition score : 90-100 (8%), 80-89 (12%), 70-79 (15%), < 70 (65%)
   - Users ne confondent pas avec "annonce sûre/vérifiée"

   ----

4. SEARCH-UX-RICH-EXPERIENCE-1          Planned
   
   Objectif :
   Intégrer profil, points d'attention et score d'adéquation dans l'UI /search.

   Scope :
   - Widget profil en haut /search (sticky ou visible)
   - Chaque résultat externe affiche :
     • Titre, prix détecté, surface
     • Source originale (badge + lien)
     • Score d'adéquation (couleur: rouge < 60, orange 60-79, vert 80+)
     • Points favorables (2-3 éléments)
     • Points d'attention (2-3 éléments si pertinents pour profil)
     • Confiance indicative du repère ("Très fiable", "À vérifier", "Signal faible")
     • CTA "Voir sur la source originale"
   
   - Responsif (mobile, tablet, desktop)
   - Pas de lien /listings pour résultats externes
   - Pas de contact/WhatsApp/galerie de sources externes
   - Thumbnails tierces OFF sauf décision séparée

   Hors scope :
   - Pas de redesign global /search
   - Pas de changement /map
   - Pas de changement /quartiers

   Garde-fous :
   - Aucun lien /listings pour externe
   - Aucun contact/WhatsApp copié
   - Source originale toujours visible
   - Disclaimer clair sur score
   - Pas de formulation "annonce certifiée"

   Critère de réussite :
   - ExternalIndexedResultCard affiche profil + score + attention points
   - UI lisible sur mobile (max 3 points d'attention visibles)
   - Tests: externe ne produit jamais /listings link
   - A/B test : utilisateurs comprennent que c'est un score indicatif (survey)

   ----

5. DATA-GOVERNANCE-SEARCH-INTELLIGENCE-1  Planned
   
   Objectif :
   Définir et documenter les garde-fous de données et éthique pour la couche
   Search Intelligence.

   Scope :
   - Document docs/SEARCH_INTELLIGENCE_DATA_GOVERNANCE.md :
     • Principe zéro-stockage des résultats Search Gateway
     • Principe zéro-stockage du profil utilisateur au MVP
     • Pas de data personnelle sensible
     • Pas de scoring discriminatoire
     • Pas de promesse de certitude
     • Pas de conclusion "bon/mauvais quartier"
     • Attribution de source pour points d'attention si data publique
     • Source originale toujours visible
     • Disclaimer reproductible sur chaque résultat
   
   - Audit checklist :
     ✓ Aucun résultat gateway stocké en DB
     ✓ Aucun profil utilisateur stocké en DB (session only)
     ✓ Score calculé au runtime, pas pré-calculé
     ✓ Pas de ML discriminatoire
     ✓ Wording conforme (pas "annonce vérifiée", "prix réel", etc.)
     ✓ Disclaimer visible et compréhensible
     ✓ Source originale linké sur chaque résultat externe
     ✓ Pas de contact/WhatsApp/galerie de source externe
   
   - Processus de révision :
     • Chaque PR touching Search Intelligence → review docs/SEARCH_INTELLIGENCE_DATA_GOVERNANCE.md
     • Wording checker : grep scan pour termes interdits
     • Test: Aucun /listings link pour résultat externe

   Hors scope :
   - Pas de décision RGPD Europe (AkarFinder = marché Maroc)
   - Pas de décision politique publique (quartier = neutral)

   Garde-fous :
   - Documenté et accessible
   - Partagé avec équipe légale
   - Disclaimer testé auprès d'utilisateurs
   - Révision semestrielle

   Critère de réussite :
   - Document > 500 mots, clair et actionnable
   - Checklist implémentée en code review template
   - 0 terme interdit détecté dans codebase post-merge

----

ORDRE ROADMAP RECOMMANDÉ
(après Search Gateway Provider stable) :

1. SEARCH-GATEWAY-PROVIDER-CONFIG-1         [infrastructure dépendance]
2. SEARCH-GATEWAY-COVERAGE-OPTIMIZE-2       [couverture stable]
3. USER-PROFILE-SEARCH-MODES-1              [foundation UX]
4. NEIGHBORHOOD-ATTENTION-POINTS-1          [data première-partie]
5. RESULT-FIT-SCORE-GATEWAY-1               [calcul scoring]
6. SEARCH-UX-RICH-EXPERIENCE-1              [intégration UI]
7. DATA-GOVERNANCE-SEARCH-INTELLIGENCE-1    [audit + compliance]

----

5. SERP-RANKING-RELIABILITY-1           Not started
   Trier la SERP par pertinence + fiabilité + fraîcheur + complétude + eligibility.
   Implémenter le modèle de tri multi-critères.

6. SOURCE-OPT-OUT-POLICY-1              Not started
   Préparer mécanisme de retrait / opt-out source.
   Format : fichier ou API interne, applicable par domaine ou par annonce.

7. DATA-ENGINE-SOURCE-POLICY-FOUNDATION-1  Not started (repo Engine séparé)
   Remonter la display policy dans le Data Engine.
   SOURCE-POLICY-FOUNDATION-1 côté Engine reste pending.

====================================================
V9.5 — SOURCE DISPLAY POLICY ENGINE + SITE BADGES — État consolidé 2026-06-30

====================================================
MISSIONS COMPLÉTÉES (contexte précédent — sessions V9.5)

SOURCE-POLICY-FOUNDATION-1   : COMPLÉTÉE côté Engine (repo séparé — DATA Engine)
ENGINE-DISPLAY-POLICY-EXPORT-1: COMPLÉTÉE (export policy runtime depuis Engine)
SITE-SOURCE-BADGES-1          : COMPLÉTÉE (badges SourceBadge + SourceAttribution branchés côté site)
DATA-BRIDGE-V9.5-SOURCE-BADGES-1: COMPLÉTÉE (/api/listings retourne champs V9.5)
SOURCE-BADGES-PREPROD-QA-1    : COMPLÉTÉE (QA badges en preprod validée)
SITE-SOURCE-BADGES-HARDENING-1: COMPLÉTÉE 2026-06-30 (voir section détail ci-dessous)
GOOGLE-LIKE-HOMEPAGE-1        : COMPLÉTÉE (homepage Google-like search UX validée)
HERO-PHOTO-RESTORE-1          : COMPLÉTÉE (photo premium hero restaurée sans casser le search UX)
TUNNEL-CTA-CONTAINMENT-1      : COMPLÉTÉE (0 fuite /search depuis pages /acheter /louer /vendre)

====================================================
ÉTAT V9.5 CONSOLIDÉ — Source Display Policy

Mubawab → public_index_source / public_indexed / limited_preview
* source_display_type : "public_index_source"
* source_badge        : "public_indexed"
* display_depth       : "limited_preview"
* thumbnail_policy    : "single_thumbnail_allowed"
* display_images.policy : "single_thumbnail_allowed"
* allowed_ctas        : ["view_original", "view_source", "compare"]
* original_source_required : true
* INTERDIT : contact, whatsapp, request_visit, full_gallery, premium_partner

Avito → audit_source / market_signal / market_signal_only
* source_display_type : "audit_source"
* source_badge        : "market_signal"
* display_depth       : "market_signal_only"
* thumbnail_policy    : "no_listing_image"
* display_images.policy : "no_listing_image"
* allowed_ctas        : ["view_market_signal", "view_source"]
* original_source_required : true
* INTERDIT : fiche annonce, photo annonce, contact, whatsapp, view_full_listing

Source inconnue / null → {} (aucun badge, aucun CTA, aucun droit)

Invariants vérifiés :
* SourceBadge ≠ ReliabilityBadge — concepts orthogonaux
* reliability_score élevé ne peut pas élargir display_depth
* premium_partner jamais assigné par fallback
* authorized_source jamais assigné par fallback
* image_urls jamais muté — display_images est un champ séparé
* Guard display_images.policy === "no_listing_image" actif dans SearchListingCardDark + PhotoFirstListingCard

Tests : 534/534 PASS (483 scrapers + 51 API). Build OK.
31 tests unitaires dédiés : scripts/scrapers/__tests__/source-display-policy.test.ts

====================================================
SITE-SOURCE-BADGES-HARDENING-1 — Completed 2026-06-30

Statut : COMPLÉTÉE
Objectif : Durcir la display policy V9.5 — corriger Avito mapping, enrichir Mubawab,
           ajouter guards UI, 31 tests unitaires, documentation.

Livré :
* lib/listings/map-db-listing.ts
  — V95DisplayPolicy type étendu (thumbnail_policy + display_images)
  — deriveSourceDisplayPolicy() exportée (testable)
  — Avito : valeurs swappées corrigées (source_display_type="audit_source", display_depth="market_signal_only")
  — Mubawab : thumbnail_policy + display_images.policy peuplés
* components/search/SearchListingCardDark.tsx
  — Guard : display_images.policy === "no_listing_image" → force fallback_visual
* components/listings/PhotoFirstListingCard.tsx
  — Guard identique
* scripts/scrapers/__tests__/source-display-policy.test.ts (31 tests, 4 suites)
* docs/SITE_SOURCE_BADGES_POLICY.md (créé)
* package.json : source-display-policy.test.ts ajouté à test:scrapers

Build : OK (0 erreur TypeScript)
Tests : 534/534 PASS
Commit : acffa1a

====================================================
GOOGLE-LIKE-HOMEPAGE-1 — Completed

Statut : COMPLÉTÉE
Objectif : Homepage style Google search — barre de recherche centrale, photo premium, sections premium.

Livré :
* GoogleLikeHero — barre de recherche centrale, chips rapides, exemples de recherche
* Photo premium akar-residence-sunset-desktop.webp + mobile — restaurée avec overlay stack
  (top fade navy, bottom vignette, radial veil, bronze halo, tint global #061027/38)
* Sections premium conservées (stats, villes, carte signature, MRE, CTA final)
* UX validée : recherche de type Google avec photo de fond lisible

====================================================
HERO-PHOTO-RESTORE-1 — Completed

Statut : COMPLÉTÉE
Objectif : Restaurer photo premium dans GoogleLikeHero sans casser le search UX.

Livré :
* <picture> en background absolu (desktop .webp + mobile .webp)
* Overlay stack : top fade → bottom vignette → radial veil → bronze halo → tint global
* HomeSearchBar + chips + exemples préservés intacts
* fetchPriority="high" + decoding="async"
Commit : fb88e35

====================================================
TUNNEL-CTA-CONTAINMENT-1 — Completed

Statut : COMPLÉTÉE
Objectif : 0 fuite vers /search depuis les pages tunnel /acheter /louer /vendre.

Livré :
* components/intent/AcheterPageShell.tsx — searchHref → /acheter?property_type=...
* components/location/LouerPageShell.tsx — searchHref → /louer?budget_max=... ou /louer?property_type=...
* components/vendre/VendrePageShell.tsx — CTA "Voir des biens comparables" → /acheter
* components/vendre/SellerLeadForm.tsx — "Comparer avec le marché" → /vendre
Commit : 9fb65a9

====================================================
PROCHAINE ÉTAPE V9.5

1. PROD-DEPLOY — déployer prod avec validation Achraf (vercel --prod)
2. MVP-RC-1 final — validation release candidate complète

====================================================
Version originale : 2026-06-26 — P17B-0 Cadrage Packs Promoteurs completed

====================================================
P17B-0 — CADRAGE PACKS PROMOTEURS — Completed 2026-06-26

Statut : COMPLÉTÉE — documentation et cadrage produit uniquement
Objectif : Définir sans pricing chiffré les 4 packs promoteurs AkarFinder,
           la matrice des droits, les métriques reporting futures et le wording autorisé.
Nature : Documentation uniquement. Aucun fichier applicatif modifié.
         Aucun paiement. Aucune auth. Supabase untouched. DATA-A untouched.

Livré :

---------------------------------------------------------------------
PACKS PROMOTEURS AKARFINDER — CADRAGE V1 (sans prix chiffré)
---------------------------------------------------------------------

Pack Starter
Destination : promoteur débutant, 1 projet, découverte de la plateforme.
* Page promoteur dédiée (/promoteurs/[slug])
* 1 page projet (/projets/[slug])
* CTA WhatsApp ou formulaire de rappel
* Formulaire lead simple (nom, téléphone, message, consentement)
* Badge "Projet partenaire" sur la page projet
* Mention "Données fournies par le promoteur"
* Visibilité standard (pas de mise en avant /neuf)
* Pas de reporting (inclus ultérieurement)

Pack Pro
Destination : promoteur actif avec plusieurs projets, besoin de leads qualifiés.
* Page promoteur dédiée (/promoteurs/[slug])
* Jusqu'à 3 pages projets (/projets/[slug])
* CTA WhatsApp + formulaire lead
* Badge "Projet partenaire" sur toutes les pages projets
* Reporting simple : vues pages, clics WhatsApp, leads reçus (quand implémenté)
* Statistiques vues / clics / formulaires envoyés
* Mention "Données fournies par le promoteur" sur chaque page

Pack Premium
Destination : promoteur établi, programmes majeurs, visibilité maximale.
* Page promoteur dédiée (/promoteurs/[slug])
* Nombre de pages projets étendu
* Mise en avant sur /neuf (bloc "Projets partenaires")
* Badge "Projet partenaire" renforcé
* Landing projet premium (galerie autorisée si partner_full)
* Campagne lead-gen dédiée
* Reporting avancé : leads qualifiés, source, campagne, période
* Export leads (quand implémenté)
* Visibilité renforcée dans les résultats de recherche

Pack Expo / Launch
Destination : lancement commercial d'un projet, présence salon (Sakan Expo).
* Page projet dédiée (/projets/[slug])
* QR code salon pointant vers la page projet
* Formulaire lead rapide adapté au contexte salon
* Reporting post-événement : leads générés, profils, source="sakan_expo"
* Campagne dédiée sur la durée de l'événement
* Accompagnement lancement commercial AkarFinder
* Mention source_channel = "sakan_expo" sur chaque lead tracé

---------------------------------------------------------------------
MATRICE DES DROITS PAR PACK
---------------------------------------------------------------------

Droit / Feature             | Starter | Pro | Premium | Expo/Launch
----------------------------|---------|-----|---------|------------
Page promoteur (/promoteurs)| ✅      | ✅  | ✅      | —
Page(s) projet (/projets)   | 1       | ≤ 3 | Étendu | 1 dédiée
Nombre de projets           | 1       | ≤ 3 | Étendu | 1
CTA WhatsApp                | ✅      | ✅  | ✅      | ✅
Brochure PDF                | —       | ✅  | ✅      | ✅
Formulaire lead             | Simple  | ✅  | ✅      | Rapide
Mise en avant /neuf         | —       | —   | ✅      | —
Reporting                   | —       | Simple | Avancé | Post-event
QR code salon               | —       | —   | —       | ✅
Campagne événementielle     | —       | —   | ✅      | ✅
Export leads                | —       | —   | ✅      | ✅
Accompagnement lancement    | —       | —   | —       | ✅

Note : aucun prix chiffré défini à ce stade (P17B-0).
Note : aucun volume de leads garanti. "leads qualifiés" = leads consentis avec profil complet.

---------------------------------------------------------------------
MÉTRIQUES REPORTING FUTURES
---------------------------------------------------------------------

Objectifs produit futurs — non tous implémentés à ce stade.
Implémentation progressive à mesure que DATA-F et P17B full avancent.

* vues page promoteur (par période)
* vues page projet (par période)
* clics CTA WhatsApp (comptage événement click)
* demandes de rappel (formulaire rappel soumis)
* formulaires lead envoyés (total)
* leads qualifiés (score chaud/tiède/froid)
* source du lead (web / carte / Sakan Expo / QR scan / /neuf)
* campagne associée (si campagne dédiée active)
* QR code salon (source_channel = "sakan_expo" tracé)
* période de mesure (jour / semaine / mois / post-événement)

Wording obligatoire dans les rapports :
"Données indicatives issues de l'analyse AkarFinder — non officielles."
"Leads consentis — non garantis en volume."

---------------------------------------------------------------------
WORDING AUTORISÉ / INTERDIT — PACKS PROMOTEURS
---------------------------------------------------------------------

Autorisé
* Projet partenaire
* Données fournies par le promoteur
* leads qualifiés
* reporting
* campagne dédiée
* page projet
* page promoteur
* visibilité renforcée
* leads consentis
* reporting indicatif
* biens positionnés
* biens partenaires

Interdit
* leads garantis
* ventes garanties
* projet vérifié
* promoteur certifié
* prix officiel
* résultats garantis
* exclusivité garantie
* audience certifiée
* données officielles
* partenaire officiel (sans accord signé)

Bilan
* Packs Starter/Pro/Premium/Expo/Launch documentés : OUI
* Matrice droits/livrables créée : OUI
* Métriques reporting futures documentées : OUI
* Prix chiffré absent : OUI
* Promesse de leads garantis absente : OUI
* Fichiers applicatifs modifiés : NON
* Supabase untouched : OUI
* Scraper untouched : OUI
* DATA-A untouched : OUI
* P17B full started : NON
* Tests lancés : NON (documentation uniquement)
* Vercel déployé : NON (documentation uniquement)

Dettes restantes P17B-0
* P17B full (implémentation packs dans le produit) : Not started
* Reporting réel (métriques live) : dépend de DATA-F
* Export leads : dépend de P17B full + auth
* QR code salon : dépend de P17B full (source_channel déjà tracé dans buyer_leads)
* Pricing chiffré : à valider avec les premiers partenaires avant P17B full

====================================================
P17A-2 — DÉMO INTERNE PROMOTEURS/PROJETS — Completed 2026-06-26

Statut : COMPLÉTÉE
Objectif : Démo interne non publique via ?preview=demo.
Build : OK · Tests : 452 scrapers + 51 API (0 fail)
URLs demo : /promoteurs/promoteur-demo-akarfinder?preview=demo · /projets/residence-demo-akarfinder?preview=demo

Livré :
* getDemoPromoter / getDemoPromoterProjects / getDemoProject — getters dédiés demo
* app/promoteurs/[slug]/page.tsx — force-dynamic + handler ?preview=demo
* app/projets/[slug]/page.tsx — force-dynamic + handler ?preview=demo
* PromoterPageShell — bandeau ⚠ + CTA "Demander une page promoteur" en mode démo
* ProjectPageShell — bandeau ⚠ + lien retour promoteur avec ?preview=demo
* 14 tests P17A-2 demo (isolation, qualité données, wording)
* Sans preview → 404 propre · Avec preview=demo → 200 + bandeau orange
* noindex/nofollow sur pages demo · Aucun faux partenaire public
* Supabase untouched · Scraper untouched · P17B untouched · DATA-A untouched

P17A full remains In progress (pas de vraie page active publique).

====================================================
HOTFIX-MAP-UX — Completed 2026-06-26

Statut : COMPLÉTÉE
Objectif : Carte cliquable, géographiquement crédible, sans frontières internes.

Livré :
* Cluster markers → liens <a href="/search?city=City"> avec aria-label
* Titre "Carte AkarFinder · MapLibre" → "Carte indicative · Repères simplifiés"
* Disclaimer → "Carte indicative — repères simplifiés pour l'exploration"
* Code pour masquer les layers de frontières administratives internes après map load
* Positions des villes inchangées (déjà correctes via CITY_FLY_TARGETS avec vraies coordonnées)
* Aucune nouvelle lib cartographique · Supabase untouched · Scraper untouched

====================================================
HOTFIX-NAV-INTENT — Completed 2026-06-26

Statut : COMPLÉTÉE
Objectif : Navigation mobile intentions + contraste desktop corrigé.

Livré :
* SiteHeader — contraste corrigé : isDark || transparentActive → isDark || isTransparent
  (fix "black on black" au scroll sur homepage transparent header)
* Chips mobile ajoutées dans SiteHeader (lg:hidden) :
  Acheter / Louer / Neuf / Promoteurs / Recherche
  → Horizontal scroll, aria-labels, focus ring, état actif deepblue/bronze
* BrandLogo variant corrigé sur header scrollé transparent
* Espace Pro + "Se connecter" contraste corrigé pour tous états transparency
* Supabase untouched · Scraper untouched · P17A/P17B untouched · DATA-A untouched

====================================================
Version : 2026-06-25 — UI-PREMIUM-HOMEPAGE completed

====================================================
UI-PREMIUM-HOMEPAGE — Completed 2026-06-25

Statut : COMPLÉTÉE
Objectif : Refonte visuelle premium homepage inspirée du design Kimi.
Build : OK · Tests : 388 scrapers + 51 API (0 fail)
Screenshots : 5 captures public/screenshots/ui-premium-home-*.png

Livré :
* Hero pleine hauteur (min-h-[100dvh]) avec photo Casablanca, titre premium, search box, animations CSS
* Header transparent scroll-aware (fixed overlay sur hero → dark glass après 60px scroll)
* Section "Notre différence" 01/02/03 sur fond crème (#FBFAF5)
* Section stats dark (#0C0C0C) avec vraies données API ou labels indicatifs
* Section villes premium (Casa/Marrakech/Rabat/Tanger/Agadir) avec cards aspect-[3/4]
* CTA final dark premium 3 boutons (Voir biens / Dossier acheteur / Espace Pro)
* Footer pur noir (#0C0C0C)
* Aucune stat fake · Wording interdit respecté · Positionnement moteur de recherche conservé
* Routes existantes non cassées (/search, /listings/[id], /map, /onboarding, /pro, /pro/leads)

Ne pas modifier : P11E, P11F, P12B, P13, P14

====================================================
ROADMAP.md — AkarFinder Roadmap Produit & Business
Version originale : 2026-06-23 — Refonte complète post-P6

====================================================
PHILOSOPHIE

La roadmap est divisée en 9 phases claires.
Chaque phase a un objectif unique, un périmètre strict et un statut.
Ce qui n'est pas dans la phase active ne se construit pas.
Un agent IA ou un développeur doit pouvoir lire ce fichier et comprendre
immédiatement où en est AkarFinder, ce qu'on construit, et ce qu'on ne
construit pas encore.

====================================================
ÉTAT ACTUEL AU 2026-06-23

Pipeline scraping/data : P0 → P6 complétés et validés.
Frontend produit : homepage + /search + /listings/[id] complétés.
Tests : 110 tests scrapers (0 fail) + 22 tests API (0 fail).
Build : OK (0 erreur TypeScript).

Acquis techniques validés :
* scraping public safe (Mubawab ; Avito/Sarouty en attente partner feed)
* normalisation prix / surface / ville / type
* export propre + quality report
* ingestion SQLite (scrape_runs, raw_listings, property_listings, listing_sources)
* duplicate_group_id + duplicate_score
* reliability_score + reliability_badge + reliability_reasons
* enrichissement persistant full DB (P6)
* API /api/listings (Node.js runtime, SQLite → frontend)
* /search wired to SQLite avec fallback mocks propre
* /listings/[id] wired to SQLite
* homepage data proof

====================================================
PHASES

====================================================
PHASE 1 — MVP crédible public

Statut : COMPLÉTÉE EN LOCAL / PRÉ-PRODUCTION

Objectif
Avoir un moteur immobilier public crédible avec données réelles.

Ce qui est livré
* Homepage premium (design "moteur de recherche immobilier du Maroc")
* /search avec listings SQLite réels + fallback mocks propre
* /listings/[id] dossier de décision style Zillow Morocco
* Scoring visible (reliability_score, reliability_badge)
* Badges fiabilité (élevée / moyenne / faible) + MRE badge
* Prix/m² sur toutes les fiches
* Source visible + fraîcheur
* Fallback mocks si DB absente
* UX premium responsive (desktop + mobile)
* Build 0 erreur TypeScript
* 132 tests verts (110 scrapers + 22 API)

Contraintes respectées
* Aucune claim fausse (pas de "+150 000 annonces", pas d'"Estimation IA")
* Pas de nom de portail tiers sans accord
* "Repère marché indicatif" uniquement — jamais "Zestimate" ou "certifié"
* WhatsApp comme CTA principal
* Crédibilité safe pour le lancement

====================================================
PHASE 2 — Data intelligence

Statut : EN COURS (partiellement livré — voir détail ci-dessous)

Objectif
Transformer AkarFinder en moteur intelligent : les données enrichissent
l'expérience utilisateur et créent un avantage concurrentiel visible.

Ce qui est déjà livré (P5/P6)
* duplicate_group_id (groupes de doublons détectés)
* duplicate_score (score de doublon par annonce)
* reliability_score (0–100, déterministe)
* reliability_badge (élevée / moyenne / faible)
* reliability_reasons (liste des raisons du score)
* enrichissement full DB persistant (enrich:p6)
* prix/m² calculé et stocké

Ce qui reste à construire
* Score opportunité : prix/m² vs repère quartier → signal "en dessous du marché"
* Filtres avancés wiring complet : tri par fiabilité, tri par opportunité
* Nouvelles sources safe : partenariats CSV/XML agences ou promoteurs
* Extension scraping : Sarouty via Playwright, Avito via partner feed
* Carte de chaleur par quartier (préparation données lat/lng)
* Score de complétude visible côté UI (data_completeness_score)
* Tableau data premium sur la homepage : top villes, repères prix/m²
  (données indicatives issues du scraping, disclaimées)

Contraintes
* Pas de "carte interactive production" avant Phase 5 / P10B-DB (Supabase prod + DB geo requis)
  → Exception documentée : P10B-REAL a été livrée comme validation produit locale/mock
    (MapLibre + geoEnrichedMockListings) sans DB migration ni clé API — autorisée et complétée.
* Pas de prix garantis, pas de fourchettes officielles
* Tout affichage data : labellisé "Données indicatives issues de l'analyse"

====================================================
PHASE 2.5 — Data Proof UI (P6.5)

Statut : NON DÉMARRÉE

Prérequis : Phase 2 complétée (score opportunité calculé en DB)

Objectif
Rendre visible dans le produit public ce que le pipeline data a déjà produit.
Pas de nouvelle feature backend — uniquement brancher l'UI sur les données
que P5/P6 ont déjà calculées et stockées.

Ce que cette phase apporte
* Tri par reliability_score dans /search (les plus fiables d'abord)
* Filtre par reliability_badge dans /search (Élevée / Moyenne / Faible)
* Tri par score d'opportunité (opportunite_score DESC)
* Bloc "Repères marché" sur la homepage : prix/m² médian par ville,
  repères marché issus de sources publiques externes, répartition types de biens
  (données indicatives issues du scraping AkarFinder, disclaimées)
* Mise en avant des annonces les plus fiables (bloc "Sélection AkarFinder"
  ou tri automatique par fiabilité en position haute)
* data_completeness_score visible côté UI (badge ou tooltip sur fiche)

Ce que cette phase n'est PAS
* Pas de nouvelle source de données
* Pas de Supabase (Phase 3)
* Pas de Typesense (Phase 4)
* Pas de carte interactive (Phase 5)
* Pas d'espace B2B (Phase 6)

Libellé obligatoire sur tous les blocs data homepage
"Données indicatives issues de l'analyse AkarFinder — non officielles."

Exit criteria
* /search peut être trié par fiabilité et filtré par badge
* /search peut être trié par score d'opportunité
* Homepage affiche un bloc data indicatif avec prix/m² par ville
* Les annonces les plus fiables sont mises en avant visuellement
* Build passe, 0 erreur TypeScript
* Aucune claim non vérifiée n'est introduite

====================================================
PHASE 3 — Supabase / production

Statut : COMPLÉTÉE — 2026-06-25

Objectif
Sortir du SQLite local. Passer AkarFinder en infrastructure production-ready.

Périmètre livré
* Supabase PostgreSQL — schéma appliqué (scripts/scrapers/db/supabase-migration.sql)
* DATABASE_PROVIDER : switch sqlite (dev) / supabase (prod) via variable d'environnement
* Sync SQLite → Supabase : scripts/sync-supabase.ts (upsert idempotent par canonical_fingerprint)
* Vérification : scripts/check-supabase.ts (npm run check:supabase — 8/8 OK)
* RLS activé sur toutes les tables ; politique service_role_all (full access backend)
* Politique anon_read commentée — toutes les lectures passent par les routes Next.js serveur
* SUPABASE_SERVICE_ROLE_KEY : serveur uniquement — jamais NEXT_PUBLIC_, jamais client
* /api/listings, /api/search, /api/stats : tournent sur Supabase en production
* /search et /listings/[id] : données réelles Supabase confirmées
* Build clean (0 erreur TypeScript) — 265/265 scrapers, 51/51 API
* Documentation : docs/SUPABASE_SETUP.md créé

Ce qui N'est PAS dans cette phase
* Typesense (Phase 4)
* Carte interactive production (Phase 5 / P10B-DB)
* Espaces B2B (Phase 6)
* Rate limiting / CI/CD / monitoring (non bloquants — reportés)

Vérification P3-QA (2026-06-25)
* check:supabase   : 8/8 ✅ (82 rows property_listings, 83 listing_sources)
* Sécurité         : NEXT_PUBLIC_SUPABASE absent partout ✅
* service_role     : absent de app/ et components/ ✅
* RLS              : activé sur les 4 tables ✅
* /api/stats       : { total_listings: 82 } ✅
* /api/listings    : données réelles Supabase ✅
* /listings/137    : HTTP 200 ✅
* /search          : HTTP 200 ✅
* Stack traces     : non exposées dans les réponses API ✅
* .env.local.example : placeholders uniquement ✅

====================================================
PHASE 4 — Search avancée / Typesense

Statut : NON DÉMARRÉE

Prérequis : Phase 3 complétée (Supabase en prod)

Objectif
Recherche rapide, filtrage premium, et tri par intelligence.

Périmètre
* Intégration Typesense (ou Meilisearch — à valider selon volume)
* Indexation des property_listings dans Typesense
* Tri par fiabilité (reliability_score DESC)
* Tri par opportunité (score_opportunite DESC)
* Filtres : ville / surface / prix / type / transaction / score / MRE
* URL sync des filtres (bookmarkable, shareable)
* Recherche naturelle basique : "Appartement Casablanca moins de 1M"
* Pagination propre

Ce qui N'est PAS dans cette phase
* NLP avancé (Phase 9+)
* Recherche vocale
* Recommandations personnalisées

====================================================
PHASE 5 — Carte interactive production (P10B-DB requis)

Statut : NON DÉMARRÉE (production)

CLARIFICATION IMPORTANTE — historique carte :
* P10A (geo foundation) : COMPLÉTÉE — champs lat/lng préparés sur le type frontend
* P10B (carte mock/enriched) : COMPLÉTÉE — carte statique CSS avec asset Maroc premium
* P10B-QA : COMPLÉTÉE (2026-06-24) — validation visuelle, 168/168 tests, 51/51 API
* P10B-REAL (MapLibre MVP) : COMPLÉTÉE (2026-06-24) — vraie carte MapLibre GL JS
  avec tuiles OSM live, pan/zoom natif, markers prix HTML, clusters, side panel,
  bottom sheet mobile. Input : geoEnrichedMockListings. Sans DB migration ni clé API.

P10B-REAL était autorisée comme validation produit locale/mock avant Supabase.
Elle prouve l'expérience utilisateur sans dépendre d'une infrastructure production.

La Phase 5 en production (Phase 5 / P10B-DB) nécessite encore :
* Phase 3 complétée (Supabase prod)
* Colonnes lat/lng persistées en DB (P10B-DB)
* Géocoding Nominatim contrôlé avec cache (P10F)

Prérequis production : Phase 3 complétée + P10B-DB + P10F

Objectif production
Exposer la carte MapLibre sur des données réelles Supabase avec géolocalisation
persistée, géocoding Nominatim supervisé, et attribution OSM conforme.

Périmètre production (au-delà du MVP P10B-REAL déjà livré)
* Migrations SQLite/Supabase pour lat/lng, geo_precision, geo_label, geo_source
* Géocoding Nominatim avec cache obligatoire, limite stricte, User-Agent, attribution
* Centroïdes de fallback (ville/quartier) persistés en DB
* Carte /map branchée sur Supabase (remplace geoEnrichedMockListings)
* Heatmap densité optionnelle (quand volume suffisant)

Contraintes importantes
* Pas de promesse de données officielles
* Pas de "carte en temps réel" sans pipeline continu validé
* Coordonnées approximatives au niveau quartier, jamais à l'adresse exacte
* Libellé : "Localisation approximative — à vérifier avant visite"
* Attribution "© OpenStreetMap contributors" obligatoire (déjà présente dans P10B-REAL)

====================================================
PHASES P10 — CARTE INTERACTIVE + PROXIMITÉ + PACKAGE SCORE
Objectif : expérience produit 8.7/10

Ces phases s'intercalent entre Phase 3 (Supabase) et Phase 6 (B2B).
Elles transforment AkarFinder d'un agrégateur d'annonces en moteur de décision
immobilière : carte Airbnb-like, proximité adaptée au Maroc, prix observé,
et package score multi-dimensionnel.

Ordre recommandé : P10A → P10B/P10B-REAL → P10C → P10IMG (si besoin visuel) → P10D → P10E.
P10IMG peut être lancé avant P10D si le niveau visuel des annonces bloque la conversion.
Prérequis production : Phase 3 (Supabase prod) pour brancher les données réelles ;
exceptions locales/mock déjà validées : P10A, P10B, P10B-QA, P10B-REAL, P10C.

====================================================
P10A — GEO FOUNDATION

Statut : COMPLÉTÉE

Objectif
Préparer les données géographiques propres pour alimenter la carte interactive
et les blocs de proximité. Aucune interface à construire dans cette phase.

Champs à calculer et stocker en DB
* latitude             — coordonnée géographique (float, nullable)
* longitude            — coordonnée géographique (float, nullable)
* geo_label            — label textuel de localisation résolu
* geo_precision        — "exact" | "neighborhood" | "city" | "null"
* geo_source           — "geocoding_nominatim" | "centroid_city" | "centroid_neighborhood" | "manual" | null
* centroid_ville       — centroïde de la ville (fallback si quartier absent)
* centroid_quartier    — centroïde du quartier (plus précis si disponible)
* fallback             — ville si quartier absent, null si localisation insuffisante

Règle produit fondamentale
NE JAMAIS inventer une position exacte.
Si la position est approximative (centroïde ville ou quartier), l'interface DOIT
afficher "Position approximative".
Si la localisation est insuffisante, la valeur est null et le bien n'apparaît
pas sur la carte (mais reste visible dans la liste).

Source de geocoding pour le MVP
Nominatim (OpenStreetMap) — gratuit, sans clé API.
Google Maps / Mapbox uniquement si décision explicite future validée
(coût et dépendance à évaluer).

Exit criteria
* Tous les property_listings en DB ont latitude/longitude ou null justifié
* geo_precision renseigné sur chaque entrée
* Aucune position inventée : si doute → null
* Libellé "Position approximative" documenté dans le design system

====================================================
P10B — CARTE INTERACTIVE MVP

Statut : COMPLÉTÉE (MVP mock/enriched, sans DB migration)

Prérequis : P10A complétée (geoEnrichedMockListings disponibles)

Objectif
Créer une vraie expérience carte type Airbnb/Booking.com adaptée au Maroc.
L'utilisateur cherche un bien sur la carte, filtre par fiabilité,
comprend rapidement les zones intéressantes.

À construire

Page et navigation
* Page /map dédiée
* Navigation "Carte" vers /map
* Lien /search → /map avec filtres utiles transmis en query params

Carte
* Carte produit statique interactive basée sur l'asset Maroc premium existant
* Aucune tuile live chargée, aucun bulk downloading, aucune clé API
* Markers prix (afficher le prix DH sur chaque marker)
* Clusters par ville / zone active
* Recalage visuel contrôlé des pins pour éviter les points hors carte

Side panel (desktop)
* Liste des listings visibles dans la vue carte
* Sélection liste ↔ marker (interaction bidirectionnelle)
* Filtres : ville / type / budget / fiabilité / score min / masquer doublons

Bottom sheet (mobile)
* Panneau mobile empilé sous la carte
* Liste visible et bien sélectionné affichés sans horizontal overflow
* Draggable sheet repoussé à un polish ultérieur

Filtres sur la carte
* Slider score de confiance 0–100
* Masquer les doublons (duplicate_score > seuil)
* Type de bien
* Budget min/max

Credibility guardrails
* Libellé "Position approximative" visible sur les markers non-exacts
* Aucun "carte en temps réel" sans pipeline continu validé
* Coordonnées au niveau quartier, jamais à l'adresse exacte
* Attribution / note OpenStreetMap prévue si tuiles live activées plus tard

Contraintes techniques
* Pas de migration SQLite/Supabase dans P10B
* Pas de Nominatim dans P10B
* Pas de nouvelle dépendance cartographique dans P10B
* Google Maps / Mapbox uniquement si décision future validée
* Pas de dépendance npm privée non auditée

Exit criteria
* /map existe et build
* Markers et clusters visibles sur les 5 villes principales
* Interaction liste ↔ carte fonctionnelle
* Filtres fiabilité opérationnels sur la carte
* "Position approximative" affiché là où nécessaire
* /search pointe vers /map sans régression
* Build 0 erreur TypeScript

----------------------------------------------------
P10B-QA — VALIDATION VISUELLE MAP MVP

Statut : COMPLÉTÉE (2026-06-24)

Résultats
* 4 screenshots générés : desktop, mobile, desktop-selected, mobile-selected
* 1 bug visuel corrigé : grille filtres mobile trop haute (5 colonnes → 2 colonnes)
* Tests : 168/168 scrapers, 51/51 API
* Build : OK (0 erreur TypeScript)
* Verdict /map MVP : Accepté

Fichier modifié
* components/map/MapExperience.tsx — grille filtres 2 colonnes mobile

P10B-DB : Non démarrée
P10F : Non démarrée

----------------------------------------------------
P10B-REAL — MAPLIBRE REAL INTERACTIVE MAP

Statut : COMPLÉTÉE (2026-06-24)

Objectif
Remplacer la carte mock (canvas statique + image Maroc) par une vraie
expérience MapLibre GL JS avec tuiles OSM live, pan/zoom natif,
markers HTML prix interactifs, clusters dynamiques, side panel desktop,
et bottom sheet mobile.

Ce qui a été construit
* MapLibre GL JS v5.24.0 installé (maplibre-gl, no API key required)
* Tuiles : OpenFreeMap style "liberty" (OSM, gratuit, no key)
* Carte plein viewport (calc(100vh - 64px))
* Initialisation au Maroc (lng: -6.3, lat: 31.8, zoom: 5.5)
* Pan/zoom natif MapLibre (mouse + touch)
* Attribution "© OpenStreetMap contributors" visible bottom-right
* Custom HTML price markers ("850 k DH") via MapLibre Marker API
* Marker sélectionné : couleur bronze/AkarFinder, ring visible
* "Position approximative" tooltip sur markers non-exact
* Click marker → select listing in side panel + flyTo
* Clusters de villes quand zoom < 8 (count + prix moyen)
* Click cluster → zoom vers la ville
* Zoom >= 8 → markers individuels prix
* Side panel desktop (lg) scrollable, bidirectionnel avec carte
* Bottom sheet mobile : collapsed (prix + badge) / expanded (full card)
  — drag handle, "Voir le bien" CTA, WhatsApp button
* City filter → flyTo city centroid (zoom 10–12)
* Réinitialiser → flyTo Morocco overview
* Disclaimer "Localisations approximatives — à vérifier avant visite"
* Dynamic import avec ssr: false (wrapper client MapExperienceClient)

Contraintes respectées
* Aucune migration SQLite/Supabase
* Aucun Nominatim
* Aucune clé API (NEXT_PUBLIC_MAPS_KEY etc.)
* Aucune nouvelle route backend
* Source : geoEnrichedMockListings uniquement
* P10C / P10D / P10E non démarrées

Fichiers créés
* components/map/MapExperience.tsx — remplacement complet (MapLibre)
* components/map/MapBottomSheet.tsx — mobile bottom sheet
* components/map/MapSidePanel.tsx — desktop side panel
* components/map/MapExperienceClient.tsx — wrapper client (ssr: false)
* scripts/screenshot-map.js — Playwright screenshot generator

Fichiers modifiés
* app/map/page.tsx — utilise MapExperienceClient + dynamic import
* lib/map/listing-map.ts — ajout FlyToTarget, MOROCCO_OVERVIEW, CITY_FLY_TARGETS, getCityFlyTarget
* app/globals.css — import 'maplibre-gl/dist/maplibre-gl.css'
* package.json — maplibre-gl@5.24.0 dans dependencies

Tests
* npm run test:scrapers : 168/168
* npm run test:api : 51/51
* Build : OK (0 erreur TypeScript)

Screenshots générés (public/screenshots/)
* p10b-real-map-desktop.png (1280x800)
* p10b-real-map-mobile.png (390x844)
* p10b-real-map-selected-desktop.png (1280x800, Casablanca + side panel)
* p10b-real-map-selected-mobile.png (390x844, bottom sheet expanded)

Score estimé /map après MapLibre
* Desktop : 8.8/10
* Mobile : 8.2/10

P10B-DB : Non démarrée
P10F : Non démarrée
P10C : Non démarrée

====================================================
P10C — À PROXIMITÉ MAROC

Statut : COMPLÉTÉE (2026-06-24)

Prérequis : P10A complétée (lat/lng en DB)

Objectif
Adapter l'expérience "vie autour du bien" au contexte marocain.
Ne pas copier un "Walk Score" occidental : créer une terminologie AkarFinder
qui reflète les besoins réels des acheteurs au Maroc.

Terminologie AkarFinder
"Score vie quotidienne" ou "Score proximité"
(ne pas utiliser "Walk Score" — marque déposée + non adapté au Maroc)

Bloc "Vie autour du bien" à construire
Catégories à inclure (données indicatives issues de sources ouvertes) :
* Marché / souk traditionnel
* Supermarché (grande surface)
* Hanout / commerces de proximité
* Station de taxis
* Bus / tram / gare
* Pharmacie
* École / crèche / collège
* Mosquée
* Clinique / médecin / hôpital
* Banque / ATM
* Parking
* Café / boulangerie / snack
* Espace vert / plage / corniche (selon ville : mer à Agadir, montagne à Ifrane…)

Chaque lieu doit afficher
* Catégorie (icône + libellé)
* Distance indicative (en minutes à pied ou en voiture, selon la distance)
* Niveau de confiance de la donnée (élevé / moyen / indicatif)
* Source si pertinente (OpenStreetMap, Nominatim, etc.)

Règles produit
* Libellé obligatoire : "Données indicatives — à vérifier avant décision"
* Pas de promesse de données en temps réel
* Pas de Foursquare / Google Places sans partenariat validé
  → Source ouverte (Overpass API / OSM) privilégiée pour le MVP
* Les lieux spécifiquement marocains (souk, hanout, mosquée) sont prioritaires
  sur les catégories standard importées de modèles occidentaux

Exit criteria
* Bloc "Vie autour du bien" visible dans /listings/[id] ✓
* Au moins 8 catégories couvertes pour les biens géolocalisés ✓
* Disclaimer "données indicatives" affiché ✓
* Score vie quotidienne calculé et visible (si suffisamment de données) ✓

Résultats (2026-06-24)
* lib/proximity/types.ts, morocco-proximity.ts, get-listing-proximity.ts créés
* components/listings/ProximityBlock.tsx créé
* ListingDetail.tsx intégré (bloc après NeighborhoodAmenities)
* 14 quartiers couverts × 13 catégories chacun + fallback 6 villes
* 39 tests p10c-proximity.test.ts — 207/207 scrapers, 51/51 API
* Build : OK (0 erreur TypeScript)
* Screenshots : p10c-proximity-desktop.png, p10c-proximity-mobile.png
* P10C-B polish validé humainement : wording "repères disponibles", badges confiance lisibles,
  tri prioritaire des catégories marocaines, CSS final validé sur captures manuelles

====================================================
P10IMG — REAL LISTING IMAGES FOUNDATION

Statut : COMPLÉTÉE — 2026-06-24

Objectif
Préparer l'utilisation progressive de vraies photos d'annonces sans fragiliser
AkarFinder juridiquement, techniquement ou en crédibilité.
AkarFinder garde l'ambition "tout l'immobilier marocain en une seule recherche",
mais distingue clairement indexation, preview et publication complète.

Principe produit
Tout peut être indexé.
Tout ne peut pas être recopié.
AkarFinder indexe, normalise, compare et score les annonces scrappées.
AkarFinder affiche complètement les annonces uniquement quand la source est
autorisée ou partenaire.

Statuts d'accès source
* indexed_only
  - annonce scrappée ou analysée publiquement ;
  - infos normalisées, score, lien source, fallback visuel premium ;
  - pas de galerie copiée ;
  - pas de téléphone/email scrapé ;
  - CTA principal : "Voir l'annonce source" ou contact indirect selon accord.

* preview_allowed
  - thumbnail/preview autorisée ou risque validé ;
  - image affichée avec source claire ;
  - lien vers la source ;
  - fallback SVG si l'image casse ou si le statut devient incertain.

* partner_full
  - agence, promoteur, exposant Sakan Expo ou import autorisé ;
  - photos réelles + galerie complète ;
  - contact direct / WhatsApp ;
  - leads AkarFinder ;
  - analytics et boost possibles.

Champs média à prévoir
* main_image_url
* gallery_image_urls[]
* image_source
* image_source_url
* image_permission_status :
  - allowed
  - source_link_only
  - unknown
  - forbidden
* image_last_checked_at
* image_fallback_type
* image_attribution_label
* source_access_level :
  - indexed_only
  - preview_allowed
  - partner_full

Règles photos
* Citer la source ne suffit pas à autoriser la réutilisation d'une image.
* Ne pas rehoster de photos scrappées sans accord clair.
* Ne pas copier une galerie complète depuis un portail sans accord.
* Les annonces partenaires peuvent utiliser vraies photos + galerie.
* Les annonces scrappées sans droit clair gardent ListingVisual / fallback SVG.
* Les photos cassées retombent automatiquement sur fallback SVG premium.
* La source doit rester visible sur toute preview image.
* Aucun logo/source tiers ne doit suggérer un partenariat non signé.

Sources prioritaires pour vraies photos
1. Promoteurs partenaires
2. Agences premium avec import CSV/XML autorisé
3. Exposants Sakan Expo
4. Biens de démonstration validés
5. Plus tard : propriétaires vérifiés avec consentement explicite

Traitement des annonces scrappées
Les annonces scrappées servent à :
* remplir l'index national ;
* calculer prix/m² observé ;
* détecter doublons ;
* alimenter fiabilité, carte, proximité, package score ;
* identifier sources/agences/promoteurs à approcher ;
* envoyer l'utilisateur vers la source quand l'annonce n'est pas partenaire.

Elles ne deviennent pas automatiquement des annonces complètes AkarFinder.

Affichage produit
* /search : image réelle si allowed/partner_full, sinon ListingVisual fallback.
* /listings/[id] : galerie complète seulement si partner_full.
* /map : thumbnails uniquement si allowed/partner_full, sinon fallback compact.
* Badge discret possible :
  - "Annonce analysée"
  - "Source identifiée"
  - "Annonce partenaire"
* Ne pas utiliser "Données vérifiées" sans vérification humaine réelle.

Exit criteria
* Modèle média documenté et/ou typé.
* source_access_level disponible sur listings.
* image_permission_status disponible.
* Fallback visuel maintenu.
* Aucune galerie scrappée réaffichée sans permission.
* Build 0 erreur TypeScript si implémenté.
* Documentation claire pour agences/promoteurs : vraies photos = avantage partenaire.

====================================================
====================================================
P10D — PRIX MOYEN OBSERVÉ

Statut : COMPLÉTÉE — 2026-06-24

Objectif
Commencer à apprendre progressivement les prix moyens à partir des annonces
analysées. Ne jamais promettre une valeur officielle ou garantie.

Ce qui est calculé et stocké
* prix/m² observé par ville
* prix/m² observé par quartier
* prix/m² observé par type de bien (appartement, villa, terrain, etc.)
* nombre d'annonces utilisées pour le calcul
* niveau de confiance (élevé si N ≥ 30 ; moyen si N 10–29 ; faible si N < 10)
* date de calcul (les repères vieillissent)

Wording obligatoire
Utiliser : "prix/m² observé" ou "prix moyen observé"
NE JAMAIS écrire : "prix officiel", "valeur garantie", "estimation certifiée"

Exemples de libellés autorisés
"Prix/m² observé : 13 800 MAD/m²"
"Basé sur 42 annonces similaires"
"Confiance : moyenne (29 annonces)"
"Données indicatives issues de l'analyse AkarFinder — non officielles."

Affichage dans le produit
* Bloc "Repère marché" dans /listings/[id] : comparaison bien vs repère quartier
* Bloc "Repères prix" en homepage : tableau par ville (indicatif)
* Carte de chaleur prix/m² sur /map (optionnel, si volume suffisant)

Exit criteria
* prix_observe_quartier et prix_observe_ville calculés et stockés en DB
* Affiché dans /listings/[id] avec label obligatoire
* Niveau de confiance affiché systématiquement
* Aucune claim "officielle" dans l'interface

Livraison MVP (2026-06-24)
* MarketReferenceBlock sur /listings/[id] : comparaison bien vs repère + confidence badge
* Badge compact sur cards /search
* getListingObservedPriceComparison() helper + 8 tests
* Dataset : STATIQUE (lib/market/morocco-market-prices.ts — références initiales manuelles)

Limitation MVP — dette technique documentée
Les références actuelles (sample_count, médiane, range) sont des valeurs de
démarrage définies manuellement dans morocco-market-prices.ts.
Elles ne sont PAS calculées dynamiquement à partir des annonces property_listings.
→ Afficher la confidence et la source aide les utilisateurs à jauger la précision.
→ Le calcul dynamique depuis Supabase property_listings est explicitement repoussé à Phase 3.

Dette P10D-LIVE (Phase 3+)
* Calculer prix/m², médiane, sample_count réels depuis property_listings
* Persister en table market_references (ville, quartier, type, transaction_type)
* Recalculer à chaque ingest batch
* Remplacer morocco-market-prices.ts statique par une requête DB live

====================================================
P10E — PACKAGE SCORE AKARFINDER

Statut : COMPLÉTÉE — 2026-06-24

Prérequis : P10C (proximité) + P10D (prix observé) complétées

Objectif
Ne plus juger un bien uniquement par son prix ou sa fiche.
Évaluer le package complet : qualité de l'annonce + vie autour du bien
+ cohérence du prix avec le marché.

Trois scores indépendants

1. Score fiabilité annonce (existant, à afficher de façon renforcée)
   Composantes : complétude des données, absence de doublon, cohérence prix,
   identification de la source, fraîcheur.

2. Score vie quotidienne (P10C)
   Composantes : marché, supermarché, transport, pharmacie, école, mosquée,
   parking, commerces de proximité.
   Pondéré selon le profil déclaré (famille, investisseur, MRE…) si connu.

3. Score prix marché (P10D)
   Composantes : prix/m² du bien vs prix/m² observé quartier,
   comparaison avec annonces similaires récentes,
   niveau de confiance selon volume de données disponibles.

Résumé package (niveau synthèse)
Calculé à partir des 3 scores.
Libellés autorisés :
* "Excellent package"     — les 3 scores élevés
* "Bon package"           — 2 scores élevés, 1 moyen
* "Package correct"       — scores moyens
* "À analyser"            — données insuffisantes ou scores mixtes
* "Données insuffisantes" — moins de 2 scores calculables

Exemples de résumés affichables
"Bon package quartier"
"Annonce fiable · Proximité forte · Prix cohérent"

"Package correct"
"Annonce fiable · Données proximité limitées · Prix légèrement au-dessus du marché"

"À analyser"
"Complétude partielle · Peu de données de référence disponibles"

Règles produit
* Les 3 scores sont indépendants et toujours affichés séparément
* Le résumé est informatif, pas prescriptif
* Pas de "ce bien est un bon investissement" — AkarFinder ne conseille pas
* Chaque score affiche son niveau de confiance
* Si données insuffisantes pour un score → "Données insuffisantes" affiché,
  pas de valeur inventée

Affichage dans le produit
* Bloc "Package AkarFinder" dans /listings/[id] (remplace ou enrichit le bloc Score)
* Badge compact "Bon package" sur les cards /search (si données suffisantes)
* Filtre "Afficher les biens avec bon package" dans /search

Exit criteria
* 3 scores séparés calculés et visibles dans /listings/[id]
* Résumé package affiché avec niveau de confiance
* Badge compact opérationnel sur les cards
* Aucune claim de conseil financier ou d'investissement
* Build 0 erreur TypeScript

Livraison MVP — 2026-06-24
* lib/package-score/types.ts (PackageScoreLabel, PackageScoreSignal, PackageScoreResult)
* lib/package-score/calculate-package-score.ts (3 signaux → label global)
* components/listings/PackageScoreBlock.tsx (bloc /listings/[id])
* Badge package sur PhotoFirstListingCard (remplace badge marché si calculable)
* Filtre "Bon package" dans QuickFilters + LightZillowSearchShell (client-side)
* Mobile debt corrigé : pb-40 → pb-52 dans ListingDetail
* 10 tests P10E (254/254 scrapers ✅, 51/51 API ✅, build clean ✅)
* Screenshots : p10e-package-score-desktop.png, p10e-package-score-mobile.png, p10e-package-card-badge.png

====================================================
OBJECTIF EXPÉRIENCE 8.7/10

Pour atteindre ce niveau, AkarFinder doit combiner :
* Recherche rapide (Typesense — Phase 4)
* Carte interactive type Airbnb (P10B)
* Données géographiques propres (P10A)
* Score de fiabilité annonce renforcé (P10E composante 1)
* Score proximité marocain (P10C)
* Prix moyen observé (P10D)
* Package score multi-dimensionnel (P10E)
* Images réelles autorisées / fallback premium maîtrisé (P10IMG)
* Onboarding acheteur indicatif pour qualifier l'intention (P12A)
* Mobile bottom sheet et interaction fluide (P10B)
* Transparence sur la précision des données (toutes les phases)
* Wording honnête : "observé", "indicatif", "approximatif"

Score estimé par phase
* Phase 1 complétée (état actuel) : ~7.0/10
* + UX/UI polish (P9B refonte) : ~8.0/10
* + Carte interactive MVP (P10B) : ~8.3/10
* + Proximité Maroc (P10C) : ~8.5/10
* + Images réelles autorisées / fallback maîtrisé (P10IMG) : ~8.6/10
* + Package Score (P10E) : ~8.7/10
* + Onboarding acheteur indicatif (P12A) : améliore surtout conversion/leads, pas seulement UX

====================================================
CONTRAINTES PERMANENTES PHASES P10

Ces contraintes s'appliquent à toutes les phases P10 sans exception :

* Pas de position exacte inventée — null si incertitude géographique
* Pas de prix officiel, garanti ou certifié — "observé" et "indicatif" uniquement
* Pas de promesse de garantie sur les données de proximité
* Pas de téléphone, email, formulaire de contact, ni données derrière login/captcha scrapés
* Aucune clé API exposée côté client (pas de NEXT_PUBLIC_MAPS_KEY, etc.)
* Pas de dépendance Google Maps obligatoire — MapLibre / tiles gratuits pour le MVP
* Google Maps / Mapbox uniquement si décision future explicitement validée
* Pas de "Walk Score" (marque déposée) — utiliser "Score vie quotidienne" AkarFinder
* Pas de conseil financier ou d'investissement — AkarFinder informe, ne conseille pas
* Libellé "Position approximative" obligatoire si geo_precision ≠ "exact"
* Disclaimer "données indicatives" obligatoire sur tout bloc de données estimées
* Photos réelles uniquement si droit/autorisation/source_access_level compatible
* Attribution source obligatoire mais jamais suffisante seule pour réutiliser une image
* Annonces scrappées : indexées et enrichies, pas recopiées comme annonces complètes sans accord

====================================================
P11 — AKARFINDER PRO (CÔTÉ OFFRE B2B)

Statut : NON DÉMARRÉE

Inspiration stratégique
Zillow a un deuxième côté produit pour les utilisateurs "offre" :
post listing, rental manager, Premier Agent, advertising.
AkarFinder a besoin de son propre côté B2B/pro adapté au Maroc.

Règle fondamentale
Ne pas ouvrir la publication publique libre aux particuliers en V1.
Priorité : agences, promoteurs, exposants Sakan Expo.
Particuliers vérifiés uniquement si process qualité existant.

----------------------------------------------------
P11A — PAGE LANDING PRO

Statut : COMPLÉTÉE — 2026-06-24

Périmètre
* Page pour agences et promoteurs
* Expliquer la valeur : leads qualifiés, visibilité, package score, intégration Sakan Expo
* CTA : demande d'accès / réservation de démo

----------------------------------------------------
P11B — WORKFLOW D'IMPORT AGENCE

Statut : NON DÉMARRÉE

Périmètre
* Import CSV/XML
* Validation des données
* Rapport qualité
* Détection de doublons
* Badge de confiance source
* Pas de publication publique sans validation

----------------------------------------------------
P11C — PAGES PROJET PROMOTEUR

Statut : NON DÉMARRÉE

Périmètre
* Profil de projet
* Unités / typologies
* Fourchettes de prix si fournies
* CTA brochure
* Demande de visite
* Tracking QR Sakan Expo

----------------------------------------------------
P11D — BOÎTE RÉCEPTION LEADS / CRM WHATSAPP

Statut : COMPLÉTÉE — 2026-06-25

Périmètre
* Leads par listing/projet
* Score chaud/tiède/froid
* Budget, ville, type, timeline, statut MRE
* Canal source : web / carte / Sakan Expo / QR / onboarding acheteur
* Dossier acheteur indicatif : budget, apport, financement, timing, zones recherchées

Livraison MVP (2026-06-25)
* db/supabase-leads-migration.sql — table buyer_leads avec RLS (service_role_all, no anon)
* lib/leads/types.ts — LeadApiPayload, LeadApiResponse, BuyerLeadRow, LeadStatus
* lib/leads/validate.ts — validateLeadPayload, normalizePhone, extractLeadPayload (testable, no I/O)
* app/api/leads/route.ts — POST only, double consent requis, température recalculée serveur-side
* /onboarding — soumission connectée à l'API, spinner de loading, bannière succès/erreur
* app/pro/leads/page.tsx — inbox interne MVP, token URL (LEADS_ADMIN_TOKEN), tabs statut, WhatsApp links
* app/pro/page.tsx — CTA "Boîte réception leads" ajouté (section InboxCTA)
* scripts/apply-leads-migration.ts — npm run apply:leads-migration (Management API ou instructions manuelles)
* 44 tests P11D (309/309 scrapers ✅, 51/51 API ✅, build clean ✅)
* 4 screenshots : p11d-onboarding-submit-success.png, p11d-lead-inbox-cta.png,
                   p11d-lead-inbox-desktop.png, p11d-lead-inbox-mobile.png

P11D-C — Demande de visite — Completed ✅
* components/listings/VisitRequestPanel.tsx — formulaire créneau + daypart + contact + consent
* lib/leads/visit-request.ts — validation, normalisation, buildVisitLeadInsert (snapshot listing)
* app/api/visit-requests/route.ts — POST, insert buyer_leads avec lead_type=visit_request
* db/supabase-visit-requests-migration.sql — extension buyer_leads : lead_type, visit_status,
  visit_preferred_slot_1/2, visit_preferred_daypart, visit_message, listing snapshot fields
* scripts/apply-visit-requests-migration.ts — application via Management API si SUPABASE_ACCESS_TOKEN disponible
* Temperature forcée "chaud" pour tout visit_request
* 341/341 tests scrapers, 51/51 tests API, build clean ✅
* 4 screenshots UI générés : p11d-c-visit-form-desktop.png, p11d-c-visit-form-mobile.png,
  p11d-c-leads-inbox-visit-desktop.png, p11d-c-leads-inbox-visit-mobile.png
* Screenshot succès live non généré : migration Supabase appliquée ✅ (2026-06-25)

P11D-C-UX — UX polish + libellés FR — Completed ✅ (2026-06-25)
* VisitRequestPanel refondu : compact trigger → modal centré desktop / bottom sheet mobile
  - Champs confortables : Nom, Téléphone WhatsApp, Créneaux 1+2, Moment préféré (chips), Message, Consentement
  - Notice "La visite reste en attente de confirmation." intégrée
  - Bouton principal "Envoyer ma demande de visite"
  - État succès clair : titre + description + pendingLabel + bouton Fermer
  - Pas de succès mélangé avec le formulaire
* /pro/leads libellés corrigés :
  - visit_request → "Demande de visite" (badge + source_channel)
  - buyer_profile → "Dossier acheteur"
  - new → "Nouveau", contacted → "Contacté", qualified → "Qualifié", archived → "Archivé"
  - reschedule_requested → "Créneau à modifier"
* 341/341 tests scrapers, 51/51 tests API, build clean ✅
* 5 screenshots UI : p11d-c-visit-modal-desktop.png, p11d-c-visit-modal-mobile.png,
  p11d-c-visit-success-desktop.png, p11d-c-visit-success-mobile.png, p11d-c-leads-inbox-fr-desktop.png
* Limitations maintenues :
  - Pas d'envoi automatique au propriétaire/agence
  - Pas de SMS
  - Pas de calendrier
  - Visite non confirmée automatiquement — en attente de confirmation manuelle

P11D-D — CRM interne minimal — Completed ✅ (2026-06-25)
* lib/leads/lead-admin.ts — validateLeadAdminToken, ALLOWED_LEAD_STATUSES, ALLOWED_VISIT_STATUSES,
  validateLeadStatusUpdate, validateVisitStatusUpdate, normalizeInternalNotes,
  normalizeFollowUpDate, mapLeadStatusLabel, mapVisitStatusLabel
* app/api/leads/[id]/route.ts — PATCH endpoint, auth via x-leads-admin-token header ou ?token=,
  mise à jour status/visit_status/internal_notes/next_follow_up_at/mark_contacted
* db/supabase-p11d-d-migration.sql — add if not exists: internal_notes, last_contacted_at,
  next_follow_up_at + extended status constraint + indexes
* components/leads/LeadCrmCard.tsx — client component "use client": dropdown statuts lead/visite,
  textarea notes internes, date prochain suivi, boutons Enregistrer/Contacté/Archiver, feedback FR
* app/pro/leads/page.tsx — intègre LeadCrmCard, token passé en prop, statuts P11D-D ajoutés au filtre
* lib/leads/types.ts — BuyerLeadRow étendu : internal_notes, last_contacted_at, next_follow_up_at;
  LeadStatus étendu : visit_confirmed, reschedule_requested
* scripts/scrapers/__tests__/p11d-lead-crm.test.ts — 47 tests CRM helpers
* 388/388 scrapers tests ✅, 51/51 API tests ✅, build clean ✅
* Migration Supabase appliquée : db/supabase-p11d-d-migration.sql ✅ 2026-06-25
* WhatsApp manuel conservé — pas d'API WA, pas de SMS, pas de calendrier

Limitations documentées (à résoudre en phases futures)
* Authentification complète non construite — accès inbox par token URL uniquement
* Distribution de leads non automatisée — consultation manuelle uniquement
* Aucune notification automatique propriétaire/agence/source pour les annonces indexed_only
* Aucune visite n'est confirmée sans validation manuelle
* buyer_leads table appliquée dans Supabase ✅ (2026-06-25)
    + db/supabase-visit-requests-migration.sql ✅ (2026-06-25)
    + db/supabase-p11d-d-migration.sql ✅ (2026-06-25)

Note : P11D est le premier pont de monétisation — les soumissions onboarding P12A
deviennent des leads acheteurs consentis visibles dans la boîte Pro interne.
Aucun lead n'est distribué ou vendu sans workflow de consentement validé.

----------------------------------------------------
P11E — BOOST / PLACEMENTS SPONSORISÉS

Statut : NON DÉMARRÉE

Périmètre
* Booster les listings/projets dans les résultats
* Label "Sponsorisé" toujours visible
* Le boost ne cache jamais le score de fiabilité
* Pas de faux claim de partenariat

----------------------------------------------------
P11F — ANALYTICS ET RAPPORTS

Statut : NON DÉMARRÉE

Périmètre
* Vues, leads, indicateurs de conversion
* Top villes/quartiers
* Distribution du package score
* Rapport post-événement Sakan Expo

----------------------------------------------------
P11G — TESTS DE TARIFICATION

Statut : NON DÉMARRÉE

Périmètre
* Tarification lead qualifié
* Package promoteur mensuel
* Package agence premium
* Package digital Sakan Expo
* Tarification campagne boost

Exit criteria pour P11
* Proposition de valeur Pro documentée
* Workflow B2B documenté
* Modèle de lead documenté
* Chemins de monétisation documentés
* Règles de crédibilité documentées

====================================================
P12 — ONBOARDING ACHETEUR + FINANCEMENT IMMOBILIER

Statut : NON DÉMARRÉE

Inspiration stratégique
Trulia/Zillow proposent des tunnels de préqualification et de financement.
AkarFinder doit adapter cette logique au Maroc sans promettre une vraie
préqualification bancaire tant qu'aucun partenaire/process n'est validé.

Positionnement
Ne pas appeler cela "préqualification crédit" au départ.
Nom recommandé :
* "Onboarding acheteur"
* "Profil de recherche"
* "Dossier acheteur indicatif"

Objectif
Transformer un visiteur anonyme en lead qualifié, utile pour :
* agences ;
* promoteurs ;
* banques plus tard ;
* Sakan Expo ;
* relance WhatsApp ;
* scoring chaud/tiède/froid.

----------------------------------------------------
P12A — ONBOARDING ACHETEUR / DOSSIER INDICATIF

Statut : COMPLÉTÉE — 2026-06-25

Objectif
Créer un tunnel simple permettant à l'utilisateur de clarifier son projet,
son budget, son timing et son mode de financement.
Ce tunnel ne valide pas un crédit. Il prépare un dossier indicatif.

Tunnel proposé

Étape 1 — Projet
* Acheter
* Louer
* Neuf
* Investir
* MRE

Étape 2 — Zone
* Ville
* Quartier
* Zones acceptées
* Option carte plus tard

Étape 3 — Budget
* Budget total
* Apport disponible
* Besoin de crédit : oui/non
* Mensualité cible indicative
* Devise/pays de résidence si MRE

Étape 4 — Bien recherché
* Appartement
* Villa
* Terrain
* Studio
* Bureau
* Surface cible
* Chambres
* Neuf / ancien

Étape 5 — Timing
* Urgent
* 1–3 mois
* 3–6 mois
* Simple veille

Étape 6 — Contact et consentement
* Nom
* Téléphone / WhatsApp
* Pays si MRE
* Consentement clair pour être recontacté
* Consentement séparé si transmission à partenaire bancaire/pro

Sorties produit
* Profil de recherche enregistré
* Score lead chaud/tiède/froid
* Biens compatibles avec le budget
* Alertes personnalisées
* Dossier transmis à AkarFinder Pro uniquement avec consentement
* Préparation future lead bancaire si P12B/P12C activés

CTA possibles
* Sur /listings/[id] :
  "Vérifier si ce bien correspond à mon budget"
* Sur /map :
  "Voir les biens compatibles avec mon budget"
* Pour MRE :
  "Créer mon dossier d'achat depuis l'étranger"
* Sur homepage ou /search :
  "Créer mon profil de recherche"

Wording autorisé
* "Dossier acheteur indicatif"
* "Budget estimatif"
* "Simulation indicative"
* "À confirmer avec votre banque"
* "Préqualification possible" uniquement si partenaire/process validé

Wording interdit
* "Vous êtes préqualifié"
* "Crédit accepté"
* "Crédit garanti"
* "Taux officiel"
* "Accord bancaire assuré"
* "Capacité d'achat certifiée"

Guardrails
* Pas de conseil financier.
* Pas de décision bancaire simulée comme validée.
* Consentement obligatoire avant transmission d'un lead.
* Données sensibles minimisées.
* Pas de revente de données sans opt-in clair.
* Toujours distinguer estimation indicative et validation bancaire réelle.

Exit criteria P12A
* Tunnel documenté.
* Champs lead documentés.
* Wording safe documenté.
* Connexion future à P11D lead inbox documentée.
* Aucune promesse de crédit.

----------------------------------------------------
P12B — SIMULATEUR CRÉDIT INDICATIF

Statut : NON DÉMARRÉE

Périmètre
* Calculateur mensualité intégré dans /listings/[id] ou onboarding.
* Entrées : prix, apport, durée, taux indicatif.
* Output : mensualité estimée, coût total indicatif.
* Label obligatoire : "Simulation indicative — à confirmer avec votre banque".
* Pas de taux en temps réel sans partenariat validé.

----------------------------------------------------
P12C — LEADS BANCAIRES PARTENAIRES

Statut : NON DÉMARRÉE

Périmètre
* Formulaire de lead bancaire partenaire.
* Routing vers banque partenaire.
* Lead qualifié financement : budget, ville, statut professionnel, MRE, apport.
* Badge "financement possible" seulement si process validé avec partenaire.
* Reporting leads banque.

----------------------------------------------------
P12D — PARCOURS FINANCEMENT MRE

Statut : NON DÉMARRÉE

Périmètre
* Checklist achat depuis l'étranger.
* Simulation indicative en MAD.
* Informations documents à préparer.
* Connexion future à banques partenaires MRE.
* Wording prudent : information et préparation, jamais accord bancaire garanti.

====================================================
====================================================
P13 — SEO IMMOBILIER MAROC

Statut : NON DÉMARRÉE

Inspiration stratégique
Zillow utilise des pages de villes, quartiers, guides et pages
informatives pour capter la demande de recherche.

Périmètre
* Pages villes : immobilier Casablanca, Rabat, Marrakech, Tanger, Agadir
* Pages quartiers : Maârif, Hay Riad, Agdal, Malabata, etc.
* Guides MRE
* Guides achat
* Guides location
* Pages prix/m² observés (quand volume suffisant)
* Pages Sakan Expo
* Pas de pages spam autogénérées vides

Règles
* Chaque page doit avoir du contenu local utile
* Utiliser "prix observé" uniquement quand le volume de données est suffisant
* Afficher le niveau de confiance
* Ne jamais écrire "prix officiel"

====================================================
P14 — ASSISTANT DE RECHERCHE AKARFINDER

Statut : NON DÉMARRÉE

Inspiration stratégique
Zillow évolue vers la découverte assistée par IA.
AkarFinder doit utiliser l'IA uniquement comme aide à la décision,
pas comme estimateur magique.

Périmètre
* Comparer 2–3 annonces
* Expliquer le package score
* Résumer quartier / proximité / prix observé
* Préparer les questions à poser à l'agence/promoteur
* Checklist de décision MRE
* Recommandations d'alertes

Garde-fous
* Pas de conseil juridique
* Pas de conseil financier
* Pas de claims d'investissement garanties
* Pas de données hallucinées
* Chaque réponse doit distinguer données connues vs données manquantes

====================================================
PHASE 6 — Monétisation B2B

Statut : NON DÉMARRÉE

Prérequis : Phase 3 complétée (prod) + volume listings crédible

Objectif
Commencer à vendre. Transformer AkarFinder en business.

Acteurs cibles prioritaires
1. Promoteurs immobiliers
2. Agences immobilières premium
3. Sakan Expo / salons immobiliers

Périmètre

Espaces B2B
* Espace Promoteur : profil + projets + leads reçus + badge vérifié
* Espace Agence : profil + listings importés + badge vérifié + leads
* Espace Vendeur particulier (phase ultérieure, pas B2B, hors scope ici)

Annonces sponsorisées
* Boost d'annonces sur /search (label "Sponsorisé" visible)
* Boost de projets neuf en homepage
* Règle : le boost ne cache pas le score de fiabilité — un bien sponsorisé
  conserve son badge fiabilité réel

Publicité native homepage
* Projets de promoteurs partenaires (bloc "Projets mis en avant")
* Événements immobiliers (Sakan Expo, salons, lancements)
* Lancement de nouvelles résidences / programmes

Leads qualifiés
* Formulaire lead avec : budget / ville / type / timeline / MRE status /
  WhatsApp / financement
* Dossier acheteur indicatif issu de l'onboarding (si renseigné)
* Scoring chaud/tiède/froid
* Distribution de leads aux promoteurs/agences selon profil
* Export leads (manuel d'abord, puis API)

Sakan Expo package
* Page projet sur AkarFinder
* QR code sur stand expo
* Formulaire brochure / visite
* Capture lead expo (source_channel = "sakan_expo")
* Rapport post-expo (leads générés, consultations, conversions)

Modèle commercial initial (à valider manuellement)
* Lead qualifié : prix à la pièce (chaud > tiède > froid)
* Package mensuel promoteur : visibilité + leads + badge
* Package Sakan Expo : page projet + QR + rapport
* Boost annonce/projet : CPM ou forfait campagne

Règles de crédibilité commerciale
* Pas de "badge vérifié AkarFinder" sans process de vérification réel
* Pas de "partenaire officiel" sans accord signé
* Boost label "Sponsorisé" toujours visible
* Leads ne sont jamais vendus sans consentement RGPD-like

====================================================
PHASE 7 — Partenariats financiers

Statut : NON DÉMARRÉE

Prérequis : Phase 6 activée (trafic et leads prouvés)

Objectif
Connecter immobilier + crédit + investissement.
Créer un deuxième axe de revenu B2B en lien avec le financement.

Acteurs cibles
* Banques marocaines (Attijariwafa, CIH, BMCE, Banque Populaire, …)
* Organismes de crédit immobilier
* OPCIM / fonds d'investissement immobilier
* Assurances habitation

Périmètre

Simulateur de crédit
* Calculateur mensualité intégré dans /listings/[id]
* Entrées : prix, apport, durée, taux
* Output : mensualité estimée, coût total
* Label "Simulation indicative — à confirmer avec votre banque"
* Pas de taux en temps réel sans partenariat validé

Dossier crédit en ligne
* Formulaire de dossier crédit simplifié
* Routing vers banque partenaire
* Lead qualifié financement (budget + ville + statut professionnel + MRE)

OPCIM / investissement immobilier
* Bloc "Investissement immobilier" sur fiches et homepage
* Mise en avant de projets adaptés à l'investissement locatif
* Partenariat affiché uniquement si accord signé

Modèle commercial
* Commission sur lead financement transmis à banque partenaire
* Publicité native banque sur pages stratégiques
* Co-branding événement avec banque (Sakan Expo)

====================================================
PHASE 8 — Lancement XXL

Statut : NON DÉMARRÉE

Prérequis : Phase 6 active + quelques premiers contrats signés

Objectif
Créer la marque. Passer d'un produit validé à une marque connue.

Positionnement à ancrer
* AkarFinder est le moteur immobilier intelligent du Maroc.
* Pas un simple site d'annonces : un moteur de recherche avec fiabilité,
  carte, scoring, et connexion Sakan Expo.
* Tagline principale : "Toutes les annonces immobilières du Maroc. Une seule recherche."
* Tagline produit : "Cherchez moins. Trouvez mieux."

Périmètre

Branding
* Finaliser identité visuelle (logo vectoriel, design system)
* Brand guide complet (couleurs, typo, ton éditorial, règles visuelles)
* Assets : bannières, présentations, one-pagers, emailings

Campagne de lancement
* Lancement "bêta publique" avec liste d'attente + invitations
* Campagne de contenu : articles, vidéos, tutoriels (recherche immobilière au Maroc)
* Influence : partenariat youtubeurs / influenceurs immobilier marocains
* Presse : communiqué de presse immobilier marocain
* LinkedIn : thought leadership immobilier + proptech Maroc

Sakan Expo intégration lancement
* Présence physique ou digitale à Sakan Expo
* Démonstration live AkarFinder sur stand
* Acquisition directe de promoteurs partenaires

MRE acquisition
* Campagne ciblée diaspora marocaine (Europe, Amérique du Nord, Golfe)
* Partenariat média MRE : radios, médias communautaires, Facebook groups
* WhatsApp groups premium MRE (consentement)

CRM et outreach
* Campagnes emailing avec consentement explicite
* SMS + WhatsApp uniquement avec opt-in
* Segmentation : acheteurs / MRE / promoteurs / agences

Métriques de succès lancement
* Nombre de sessions mois 1
* Taux de retour semaine 2
* Leads qualifiés générés
* Premiers contrats B2B signés
* Couverture presse / mentions

====================================================
PHASE 9 — Internationalisation

Statut : NON DÉMARRÉE

Prérequis : Phase 8 complétée + Maroc stabilisé

Objectif
Préparer une marque scalable. Etendre AkarFinder sans diluer la marque Maroc.

Stratégie

Étape 1 : Consolider le Maroc
* Être le moteur de référence immobilier marocain.
* Toutes les grandes villes couvertes.
* B2B rentable et scalable.
* Données fiables et exhaustives.

Étape 2 : Marchés MRE
* Adapter l'expérience pour les acheteurs diaspora.
* Pages en français + arabe.
* Contenu ciblé par pays de résidence (France, Espagne, Belgique, Italie, Golfe).
* Partenariats locaux pour la confiance (banques MRE, associations).

Étape 3 : Expansion régionale
* Autres marchés Maghreb ou Afrique francophone.
* Évaluer : Tunisie, Sénégal, Côte d'Ivoire.
* Marque internationale possible : House Finder / House Scanner (à valider).
* Ne pas diluer AkarFinder trop tôt — attendre que la marque soit solide au Maroc.

Règle d'or
AkarFinder d'abord. Marque internationale ensuite.
L'internationalisation ne commence pas avant que le Maroc soit profitable.

====================================================
RÉSUMÉ PAR HORIZON

Phase   | Statut                          | Objectif court
--------|---------------------------------|------------------------------------------
1       | Complétée en local/pré-prod     | MVP crédible (pipeline + UI + scoring)
2       | En cours                        | Data intelligence (scores calculés en DB)
2.5     | Non démarrée — prochaine        | Data Proof UI (tri fiabilité, bloc data)
3       | COMPLÉTÉE — 2026-06-25          | Supabase / production
4       | Non démarrée (après Phase 3)    | Search avancée / Typesense
5       | Non démarrée (après Phase 3)    | Carte interactive
6       | Non démarrée                    | Monétisation B2B
7       | Non démarrée (après Phase 6)    | Partenariats financiers
8       | Non démarrée (après contrats)   | Lancement XXL
9       | Non démarrée (après Maroc rent.)| Internationalisation

V1 — Livré en local/pré-production (Phases 1 + 2 partielle)
* Homepage + /search + /listings wired SQLite
* Pipeline data P0 → P6 (scraping, dedup, scoring, enrichissement)
* reliability_score, duplicate_score, reliability_badge, reliability_reasons
* 132 tests verts, build OK

V2 — Prochain horizon (Phases 2 fin + 2.5 + 3)
* Score opportunité visible dans le produit (Phase 2 fin)
* Tri et filtre par fiabilité dans /search (Phase 2.5)
* Bloc data indicatif homepage (Phase 2.5)
* Supabase production (Phase 3)

V3 — Produit complet (Phases 4 + 5)
* Typesense search avancée
* Carte interactive /carte

V4 — Lancement commercial (Phases 6 + 7 + 8)
* Espaces B2B, leads qualifiés, Sakan Expo package, AkarFinder Pro
* Onboarding acheteur indicatif puis partenariats financiers
* Campagne de lancement

V5 — Scale (Phase 9)
* Extension MRE ciblée, marchés internationaux

====================================================
CE QUI VA OÙ

Sur le site public
* Listings réels avec score visible
* Badges fiabilité
* Prix/m²
* Carte statique premium (Phase 1 — déjà là)
* Tableau data indicatif homepage (Phase 2)
* Carte interactive (Phase 5 / P10B-REAL déjà validée en local mock)
* Photos réelles sur annonces autorisées/partenaires ; fallback SVG sinon (P10IMG)
* Onboarding acheteur / dossier indicatif (P12A)
* Simulateur crédit indicatif (Phase 7 / P12B)
* Projets sponsorisés (Phase 6, labellisés)

Dans la stratégie business (docs internes)
* SWOT → docs/BUSINESS_MODEL.md
* Modèle économique → docs/BUSINESS_MODEL.md
* Plan commercial → docs/GO_TO_MARKET.md
* Offre promoteurs / agences → docs/MONETIZATION.md

Dans le deck investisseur
* SWOT synthétique
* Pipeline data comme barrier to entry
* Modèle économique V1/V2/V3
* Traction early : listings, tests, partenariats
* Roadmap business (Phases 6–9)
* Vision internationale (Phase 9)

====================================================
PROCHAINE PHASE TECHNIQUE RECOMMANDÉE

Branche produit immédiate si l'objectif est de continuer l'expérience 8.7/10 :
P10D — Prix moyen observé → P10E — Package Score.
P10IMG peut être lancé avant P10D si les visuels annonces deviennent le frein principal.

Branche infrastructure production :
Phase 2 (fin) → Phase 2.5 (Data Proof UI) → Phase 3 (Supabase)

Étape A — Finir Phase 2 (data backend)
1. Calculer opportunite_score par listing (prix/m² vs médiane ville/quartier)
2. Stocker opportunite_score dans property_listings (migration SQLite)

Étape B — Lancer Phase 2.5 (data visible dans le produit)
3. Ajouter tri reliability_score DESC et filtre reliability_badge dans /search
4. Ajouter tri opportunite_score DESC dans /search
5. Bloc "Repères marché" homepage : prix/m² médian par ville, label "indicatif"
6. Mise en avant des annonces fiabilité élevée (tri automatique ou bloc dédié)

Étape C — Préparer Phase 3 (Supabase)
7. Appliquer db/supabase-migration.sql en staging Supabase
8. Tester le switch DATABASE_URL SQLite (dev) → Supabase (prod)

====================================================
PROCHAINE PHASE BUSINESS RECOMMANDÉE

Phase 6 (préparation commerciale)

Actions immédiates :
1. Créer le one-pager promoteur (offre, tarifs, leads, Sakan Expo)
2. Identifier 3–5 promoteurs à approcher manuellement pour validation offre
3. Construire la demo deck commerciale (homepage + /search + scoring + leads)
4. Cibler Sakan Expo comme premier canal d'acquisition B2B
5. Définir les prix de test (leads, packages, boosts) à valider manuellement
6. Préparer l'offre "photos + galerie + leads" réservée aux annonces partner_full
7. Définir le tunnel onboarding acheteur comme source de leads qualifiés

====================================================
EXPLORER-MAROC — HUB CARTE INTELLIGENTE ACTIONNABLE
Statut : COMPLÉTÉE — 2026-06-25

Objectif
Transformer la section "Carte intelligente" (SignatureMapSection) en hub d'exploration
actionnable "Explorer le Maroc", avec CTAs visibles, descriptions villes, et bloc visite.

Livré
* SignatureMapSection — 3 CTAs : "Voir la carte interactive" (/map), "Explorer par ville" (/#villes), "Créer mon dossier acheteur" (/onboarding)
* Sous-texte mis à jour : "repères indicatifs, prix observés, fiabilité, proximité, signaux de confiance"
* 4 signal cards mises à jour : Quartiers lisibles, Fiabilité visible, Prix observés, Proximité utile
* Bloc pédagogique "Quand un bien vous intéresse…" + CTA "Voir les biens disponibles" → /search
* lib/cities.ts — champ description ajouté sur les 5 villes
* CityIntentGrid — id="villes" (ancre) + description visible sous le tag sur chaque carte
* MreTrustSection — 2 CTAs : "Créer mon dossier acheteur" → /onboarding + "Explorer les biens" → /search

Screenshots
* public/screenshots/explorer-maroc-desktop.png
* public/screenshots/explorer-maroc-mobile.png
* public/screenshots/explorer-maroc-cities-desktop.png
* public/screenshots/explorer-maroc-cities-mobile.png

Build : OK · P15A : COMPLÉTÉE 2026-06-25 · P15B : COMPLÉTÉE 2026-06-25 · P16A : COMPLÉTÉE 2026-06-25 · P16B : Not started

====================================================
POST-P11D — ZILLOW-INSPIRED DECISION ENGINE ROADMAP
Version : 2026-06-25
Ajouté suite à l'audit Zillow — fonctionnalités adaptées au marché marocain.

Principe directeur
AkarFinder ne copie pas Zillow tel quel.
Il transforme les patterns Zillow utiles en un parcours AkarFinder Maroc :

  chercher
  → comparer
  → sauvegarder
  → recevoir alertes
  → vérifier budget indicatif
  → demander visite
  → suivi CRM / Pro

Ordre produit P15 → P21
  1.  P15A — Comparateur de biens          [Completed 2026-06-25]
  2.  P15B — Favoris / shortlist persistante
  3.  P16A — Pages par intention
  4.  P16B — Page Location dédiée
  5.  P16C — Page Neuf / Promoteurs
  6.  P17A — Pages promoteurs partenaires
  7.  P17B — Packs promoteurs
  8.  P18A — Alertes sauvegardées réelles
  9.  P18B — Calculateur mensualité / budget indicatif Maroc-MRE
  10. P19A — Historique prix/statut annonce
  11. P19B — Pages marché locales SEO
  12. P20A — Dossier quartier enrichi
  13. P20B — Recherche multi-zones
  14. P21A — Visites organisées / portes ouvertes
  15. P21B — Visite virtuelle / vidéo / plan interactif partenaire

Raison de cet ordre : décision acheteur d'abord, puis pages thématiques SEO et
monétisation promoteurs, puis signaux avancés, puis couches visite.

----------------------------------------------------
P15A — COMPARATEUR DE BIENS

Statut : COMPLÉTÉE — 2026-06-25 (reprise après arrêt Codex)

Objectif
Comparer 2 à 5 biens côte à côte.

Données comparées
* prix
* prix/m²
* ville / quartier
* surface
* chambres / SDB
* type de bien
* score fiabilité
* package score
* prix observé
* proximité
* doublons possibles
* accès source / photos autorisées
* demande de visite disponible

Pourquoi
C'est la fonctionnalité la plus alignée avec "Comparez avant de contacter."
Elle valorise directement les données que le pipeline produit déjà
(fiabilité, package score, prix observé, proximité).

Wording autorisé
* "Comparer les biens"
* "Tableau comparatif indicatif"
* "Données issues de l'analyse AkarFinder — non officielles"

Guardrails
* Pas de "meilleur choix garanti"
* Pas de conseil d'investissement
* Chaque score affiche son niveau de confiance

----------------------------------------------------
P15B — FAVORIS / SHORTLIST PERSISTANTE

Statut : COMPLÉTÉE 2026-06-25.
Build : OK · Tests : 419 scrapers + 51 API (0 fail)

Objectif
Permettre à l'utilisateur de sauvegarder des biens dans une shortlist
persistante (localStorage, sans auth) pour construire une shortlist avant
comparaison, contact ou demande de visite.

Livré
* lib/favorites/favorites-storage.ts — FAVORITES_STORAGE_KEY, FAVORITES_STORAGE_EVENT,
  parseFavoriteIds, readFavoriteIds, addFavoriteId, removeFavoriteId, toggleFavoriteId,
  clearFavoriteIds, isFavorited, dispatchFavoritesUpdated. Pas de limite (vs 4 max pour compare).
* components/favorites/useFavoriteSelection.ts — hook miroir de useCompareSelection,
  sync via storage + CustomEvent.
* components/favorites/FavoriteToggleButton.tsx — variantes "icon" (cards) et "block" (detail sidebar).
  Lecture localStorage via useEffect (hydration-safe). Feedback textuel 2.2s après toggle.
* components/favorites/FavoritesPageShell.tsx — empty state, grid listing cards (Voir / Comparer / Visite / Retirer),
  bouton "Tout vider", fallback mockListings si API indisponible.
* app/favorites/page.tsx — route /favorites, dynamic = "force-dynamic".
* PhotoFirstListingCard.tsx — remplace wishlisted local useState par FavoriteToggleButton.
* ListingDetail.tsx — FavoriteToggleButton variant="block" ajouté (mobile + sidebar desktop).
* scripts/scrapers/__tests__/p15b-favorites.test.ts — 10 tests unitaires.
* Screenshots : p15b-favorites-empty-desktop/mobile.png, p15b-favorites-list-desktop/mobile.png,
  p15b-heart-button-search.png.

Guardrails respectés
* localStorage uniquement — pas de Supabase, pas d'auth, pas de sync serveur
* Pas de mention wording interdit
* Composants isolés — pas de modification scraper ni Supabase

----------------------------------------------------
P16A — PAGES PAR INTENTION

Statut : COMPLÉTÉE 2026-06-25.
Build : OK · Tests : 419 scrapers + 51 API (0 fail)

Objectif
Créer des pages shell stratégiques par intention utilisateur, orientées vers
les features existantes, avec wording conforme et disclaimer indicatif.

Pages créées (toutes statiques — ○ dans la route table)
* /acheter  — Achat avec méthode (recherche, compare, favoris, fiabilité, visite)
* /louer    — Location (budget mensuel, types, proximité, shortlist, alertes futures)
* /neuf     — Programmes neufs et promoteurs partenaires (wording strict)
* /investir — Repères de marché indicatifs (aucun conseil financier)
* /mre      — Achat à distance pour Marocains résidant à l'étranger
* /promoteurs — Espace B2B promoteurs (page projet, leads, Sakan Expo)

Composant partagé
* components/intent/IntentPageShell.tsx — shell serveur réutilisable (hero dark + grid blocks + callout + disclaimer)

Modifications connexes
* lib/site.ts — navItems mis à jour : Acheter → /acheter, Louer → /louer, Neuf → /neuf

Screenshots
* public/screenshots/p16a-{acheter,louer,neuf,investir,mre,promoteurs}-{desktop,mobile}.png (12 captures)

Guardrails respectés
* Wording interdit absent (garanti, certifié, officiel, vérifié, conseil financier)
* Disclaimer indicatif sur toutes les pages
* Pas de Supabase, pas d'API nouvelle, pas de scraper modifié
* P16B, P16C, P17, DATA-A restent Not started

----------------------------------------------------
P16B — PAGE LOCATION DÉDIÉE

Statut : COMPLÉTÉE 2026-06-25.
Build : OK · Tests : 419 scrapers + 51 API (0 fail)

Objectif
Transformer /louer d'une page shell générique en une vraie expérience dédiée location.

Livré
* components/location/LouerPageShell.tsx — composant serveur dédié (fetch réel transaction_type=rent)
  - Hero teal (#0e4756) avec CTAs : Voir locations / Ma shortlist / Comparer
  - Bloc 1 Budget mensuel : 4 chips par fourchette de loyer (< 2K / 2-5K / 5-10K / >10K DH)
  - Bloc 2 Type de location : chips Studio/Appartement/Villa/Bureau/Meublé/Vide
  - Bloc 3 Vie quotidienne : 6 items (bureau, école, transport, pharmacie, supermarché, carte)
  - Section biens à louer : listings réels via searchListings({ transaction_type: "rent" })
    → 2 biens en base affichés avec mini-cartes + CTA Voir fiche + favoris
    → Fallback texte si aucun bien disponible
  - Bloc 4 Shortlist + Comparateur : 2 cartes côte à côte
  - Bloc 5 Alertes futures : badge "À venir", 4 cas documentés sans implémentation
  - Callout final + disclaimer loyer indicatif
* app/louer/page.tsx — remplacé (dynamic = "force-dynamic", import LouerPageShell)

Wording respecté
* "loyer indicatif", "à confirmer auprès de la source", "repères indicatifs",
  "vie quotidienne", "shortlist", "comparer avant de visiter"
* Aucun wording interdit

/louer route : ƒ (dynamique, server-rendered) car fetch données réelles

Screenshots
* public/screenshots/p16b-louer-{desktop,mobile}.png
* public/screenshots/p16b-budget-desktop.png
* public/screenshots/p16b-vie-quotidienne-mobile.png
* public/screenshots/p16b-shortlist-ctas-desktop.png

P16C, P17, DATA-A restent Not started

----------------------------------------------------
P16C — PAGE NEUF / PROMOTEURS

Statut : Completed 2026-06-25 ✅
Build : OK · Tests : 419 scrapers + 51 API (0 fail) · 6 screenshots

Livré
* /neuf transformée en NeufPageShell (server component async, force-dynamic)
* Hero amber (#78350f) — "Programmes neufs au Maroc"
* Bloc 1 : Projets par ville (6 chips)
* Bloc 2 : Budget / Prix à partir de (4 chips)
* Bloc 3 : Typologies & surfaces (6 chips)
* Section listings réels (transaction_type: buy, limit: 6, fallback CTA)
* Section Projets partenaires promoteurs (3 mini-cards)
* Section Brochure / WhatsApp / Dossier acheteur
* Section Shortlist + Comparaison neuf vs ancien
* Callout → /promoteurs → /pro
* Disclaimer complet wording interdit respecté
* /promoteurs inchangée (cohérente, pas de pricing, pas de garanties)

Fichiers créés
* components/neuf/NeufPageShell.tsx

Fichiers modifiés
* app/neuf/page.tsx (IntentPageShell → NeufPageShell, force-dynamic)

Guardrails respectés
* Wording : "données fournies par le promoteur", "prix à partir de",
  "à confirmer auprès du promoteur", "repères indicatifs"
* Wording interdit absent : pas de "garanti", "certifié", "officiel",
  "leads garantis", "promoteur validé"
* Pas de /promoteurs/[slug], /projets/[slug], pricing, auth

----------------------------------------------------
P17A-0 — PRÉFLIGHT PAGES PROMOTEURS PARTENAIRES

Statut : Complété 2026-06-25.
Périmètre : cadrage documentaire uniquement. Aucune page dynamique créée.

Contrats définis
* Promoter : id / slug / name / logo_url? / city / description / contact_whatsapp? /
  contact_email? / website_url? / partner_status (none|partner|featured) /
  source_note / created_at / updated_at
* NewProject : id / slug / promoter_id / name / city / neighborhood? / address_label? /
  price_from / currency / property_types[] / typologies[] / surfaces{min,max,unit} /
  delivery_date_label? / brochure_url? / main_image_url? / gallery_urls? /
  latitude? / longitude? / project_status (upcoming|active|delivered|paused) /
  partner_badge / lead_cta_type (whatsapp|callback|form) /
  source_access_level / image_permission_status / disclaimer

Pages cibles cadrées
* /promoteurs/[slug] : 7 blocs (hero, présentation, projets actifs, villes/quartiers,
  CTA whatsapp/rappel, reporting futur placeholder, disclaimer)
* /projets/[slug] : 12 blocs (hero, prix à partir de, typologies, surfaces,
  localisation, brochure, rappel, WhatsApp, biens similaires, proximité,
  package score, disclaimer)

Stratégie MVP
* MVP 1 local : seed TypeScript 2-3 promoteurs/projets exemples, pages SSG,
  contenu clairement "exemple partenaire" dans l'interface, sans Supabase.
  Alternative validée : attendre vrais partenaires → évite risque wording.
* MVP 2 Supabase : migration promoteurs/projets, import CSV partenaires,
  dashboard leads/reporting dans phase ultérieure.
* Décision MVP 1 vs attente vrais partenaires : à trancher avec le propriétaire
  avant de lancer P17A full.

Anti-PII
* contact_whatsapp / contact_email → uniquement depuis formulaire /pro,
  import CSV partenaire ou accord direct. Jamais depuis scraping annonces publiques.

Wording interdit absent : OUI
P17A full implementation : Not started
P17B : Not started
DATA-A : Not started

Voir détail complet dans docs/SESSION.md (section P17A-0 Préflight).

----------------------------------------------------
P17A — PAGES PROMOTEURS PARTENAIRES

Statut : Partiellement complétée (P17A-1 scaffolding livré 2026-06-26).
Pas de vraie page active publique — en attente d'un vrai partenaire.

P17A-1 livré
* Routes /promoteurs/[slug] et /projets/[slug] créées (SSG, vides)
* Data locale typée lib/promoters/ (types, data, getters)
* PromoterPageShell + ProjectPageShell templates prêts
* visibility_status active/demo/draft : seul "active" est public
* 404 propre confirmé pour les entrées demo
* 14 nouveaux tests (438 scrapers 0 fail · 51 API 0 fail)
* Build OK ● (SSG 0 pages pré-rendues)

Pour compléter P17A
→ Ajouter un vrai partenaire avec visibility_status: "active" dans promoters-data.ts

Objectif
Créer des pages dédiées par promoteur partenaire, affichant leurs projets
et permettant une prise de contact qualifiée.

Contenu
* Présentation du promoteur (données fournies par le promoteur)
* Projets actifs et à venir
* Galerie autorisée (partner_full uniquement)
* Formulaire contact / demande de visite
* Badge "Partenaire AkarFinder"

Pourquoi
Différenciateur B2B. Les promoteurs veulent de la visibilité qualifiée, pas
juste un listing parmi d'autres. Une page dédiée justifie un pack payant.

Guardrails
* Contenu fourni par le promoteur, non généré automatiquement
* Pas de "meilleur promoteur" ou classement non fondé
* Mentions légales obligatoires sur chaque page promoteur

----------------------------------------------------
P17B — PACKS PROMOTEURS

Statut : Not started (P17B-0 cadrage Completed 2026-06-26 — voir section P17B-0 en tête de roadmap).

Objectif
Offrir des packs payants aux promoteurs pour une visibilité premium sur
AkarFinder : page dédiée, leads qualifiés, analytics, reporting marché.

Contenu d'un pack
* Page promoteur dédiée (P17A)
* Mise en avant des projets sur /neuf et /search
* Reporting mensuel indicatif (annonces consultées, leads générés)
* Badge "Partenaire AkarFinder" sur toutes les fiches liées
* Accès dashboard analytics interne (DATA-F)

Guardrails
* Pas de volume de leads garanti
* Reporting indicatif uniquement — données issues de l'analyse AkarFinder
* Pas de "données certifiées" ou "audience officielle"

----------------------------------------------------
P15C — NOTES PERSONNELLES + PARTAGE FAMILLE

Statut : Not started. (couche optionnelle — prérequis P15B)

Prérequis : P15B complétée

Objectif
Ajouter des notes privées sur les biens sauvegardés et permettre le partage simple.

MVP
* Note personnelle libre (textarea, max 500 chars)
* Tags : à visiter / à comparer / trop cher / intéressant
* Lien de partage read-only (hash URL) plus tard

Pourquoi
L'achat immobilier au Maroc = décision familiale.
MRE en particulier consultent leur famille avant chaque décision.

Guardrails
* Notes privées uniquement — pas de partage public sans action explicite
* Aucune note transmise à des tiers sans consentement

----------------------------------------------------
INTENT-RELOOKING — REFONTE PREMIUM DES PAGES D'INTENTION

Version détail : 2026-06-27 — ROADMAP-RELOOKING-DETAIL (11 visuels détaillés page par page)

Statut général
* INTENT-RELOOKING-0 — Cadrage visuel              : Completed 2026-06-27
* INTENT-RELOOKING-1 — Acheter                     : Completed 2026-06-27 (dark premium — score 95/100 après uplift visuel cards)
* INTENT-RELOOKING-2 — Louer                       : Completed 2026-06-27 (dark premium — score 95/100 — validé visuellement par Achraf)
* INTENT-RELOOKING-3 — Neuf                        : Completed 2026-06-27 (dark premium — score 95/100 après uplift visuel cards)
* INTENT-RELOOKING-4 — Promoteurs                  : Completed 2026-06-27 (dark premium B2B — score 95/100 après uplift visuel cards)
* INTENT-RELOOKING-5 — Vendre                      : Completed 2026-06-27 (dark premium — score 96/100 — validé visuellement par Achraf)
* INTENT-RELOOKING-6 — QA globale mobile/desktop/perf : Completed 2026-06-27 (10/10 routes 200 · 452+51 tests 0 fail · wording OK · mocks labellisés · dark cohérent)
* INTENT-RELOOKING-BONUS-INVESTIR — Direction future : Deferred / Not started
* INTENT-FUNCTIONAL-AUDIT-1 — Audit CTA/mock/route/réel avant tunnels : Completed 2026-06-27 (5 pages auditées · matrice tunnels · ordre construction établi)
* FUNCTIONAL-FIXES-0 — Fixes rapides CTA + preflight leads : Completed 2026-06-27 (chips buy+type · doublons CTA · /map?city= vérifié · leads e2e validé)
* LEADS-MVP — Tunnels acheteur/locataire câblés : Completed 2026-06-27 (hooks /acheter + /louer · cards CTA · intent+source_page dyn · export CSV /api/leads/export)
* SELLER-MVP — Tunnel vendeur réel : Completed 2026-06-27 (/vendre/dossier · form vendeur · buyer_leads source_channel=seller · /pro/leads badge+filtre Vendeur · export inclus · 0 migration)
* PROMOTER-MVP — Capture leads promoteurs : Completed 2026-06-27 (LeadForm /pro activé · source_channel=promoter · /pro/leads badge+filtre Promoteur · export inclus · 0 migration)
* QA-PROD-TUNNELS-1 — QA production 3 tunnels : Completed 2026-06-27 (10/10 routes 200 · 4 tunnels POST ok · isolation filtres parfaite · export CSV 200 · 401 bad token · 452+51 tests 0 fail · 0 bug)
* P18A — Alertes sauvegardées MVP : Completed 2026-06-27 (RentAlertForm /louer · saved_alerts table migrée · /api/alerts POST ok=true · /api/alerts/export CSV 200/401 · /pro/alerts admin · 452+51 tests 0 fail · smoke prod validé · 0 bug)
* CREDIT-MVP — Simulateur mensualité + lead financement : Completed 2026-06-28 (CreditSimulator /acheter+/neuf · annuité indicative · lead source_channel=credit via /api/leads · badge+filtre+compteur Crédit /pro/leads · export CSV colonnes Canal+Apport · 452+51 tests 0 fail · smoke prod validé · wording prudent · 0 bug)
* CREDIT-UX-1 — Préremplir le simulateur depuis la card : Completed 2026-06-28 (SimulateCreditButton event prix + scroll #financement · CreditSimulator listener setPrice+apport · build OK · prod déployée)
* HERO-IMAGE-REPLACE-1 — Nouveau hero résidence sunset : Completed 2026-06-28 (WebP desktop 130KB + mobile 109KB · <picture> art-direction · fetchPriority LCP · sans watermark · 0 layout shift · prod déployée)
* HOMEPAGE-HERO-POLISH-1 — Polish hero homepage : Completed 2026-06-28 (search card glass premium hybride · header mobile compact · Promoteurs lisible · overlay desktop allégé + voile radial · 9.5/10 desktop/mobile/global · prod déployée)
* LOGO-REFINE-1 / LOGO-ASSETS-INTEGRATION-1 — Logo V2 : Completed 2026-06-28 (assets V2 rangés logo-v2/ · favicon V2 · header/footer PNG détouré transparent · prod déployée)
* OVERNIGHT-MVP-HARDENING-1 — Conversion + tracking MVP : Completed 2026-06-28 (P1 credit prefill listing_id · P2 tracking conversion_events 9 events non bloquant · P3 /pro/analytics token · P4 purge SQL non destructif · build+452+51 OK · migration conversion_events à appliquer · NON poussé prod)
* SEARCH-PAGE-AUDIT-1 — Audit /search : Completed 2026-06-28 (docs/SEARCH_PAGE_AUDIT.md · scores 7/6.5/7/4.5 · potentiel 9.5)
* SEARCH-RELOOKING-1 — Refonte /search dark premium : Completed 2026-06-28 (shell dark + SearchListingCardDark clone + carte clusters SVG + filtres glass + URL deep-links + CTAs business + 6 events tracking + suppression 7 composants morts · build+452+51 OK · 9.4/10 · NON poussé prod, preview à valider)

Verrous roadmap (inchangés)
* P18B — Calculateur mensualité indicatif : Couvert par CREDIT-MVP (2026-06-28)
* DATA-A : Not started
* P17B full : HOLD tant qu'il n'y a pas de vrai partenaire promoteur signé

Objectif
Transformer les pages d'intention AkarFinder (Acheter, Louer, Neuf, Promoteurs, Vendre)
en landing pages fonctionnelles premium, inspirées des expériences modernes type
Booking / Airbnb / marketplace immobilière, avec l'identité AkarFinder deepblue / bronze.

Nature de la phase
Documentation, cadrage et intégration visuelle progressive, page par page.
Aucune modification Supabase. Aucun scraper. DATA-A untouched.

Source de référence
Dossier : public/relooking/
11 visuels ChatGPT générés le 2026-06-27 — direction artistique officielle validée par Achraf.

Décision produit actée
Les pages d'intention AkarFinder ne sont plus de simples pages éditoriales.
Elles deviennent des landing pages premium fonctionnelles :
* mobile-first ;
* visuelles ;
* orientées conversion ;
* inspirées marketplace immobilière moderne ;
* style AkarFinder deepblue / bronze ;
* données réelles quand disponibles ;
* mocks uniquement avec label Exemple / Aperçu ;
* wording prudent obligatoire.

Univers par page
* Acheter    = décision achat + comparaison
* Louer      = budget + quartier + vie quotidienne
* Neuf       = projet partenaire + brochure + promoteur
* Promoteurs = B2B leads + page projet + reporting
* Vendre     = préparation vente + repères indicatifs
* Investir   = bonus futur, données marché, prudence financière

----------------------------------------------------
MAPPING OFFICIEL DES 11 VISUELS — INTENT-RELOOKING

| Page       | Type     | Fichier actuel dans relooking/                 | Statut             | Rôle                                      |
|------------|----------|------------------------------------------------|--------------------|-------------------------------------------|
| Acheter    | Desktop  | ChatGPT Image 27 juin 2026, 00_31_40 (1).png   | Référence validée  | Direction visuelle (pas screenshot à coller) |
| Acheter    | Mobile   | ChatGPT Image 27 juin 2026, 00_31_24 (1).png   | Référence validée  | Direction visuelle (pas screenshot à coller) |
| Louer      | Desktop  | ChatGPT Image 27 juin 2026, 00_31_41 (2).png   | Référence validée  | Direction visuelle (pas screenshot à coller) |
| Louer      | Mobile   | ChatGPT Image 27 juin 2026, 00_31_24 (2).png   | Référence validée  | Direction visuelle (pas screenshot à coller) |
| Vendre     | Vertical | ChatGPT Image 27 juin 2026, 00_31_24 (3).png   | Référence validée  | Direction visuelle unique (pas de desktop séparé) |
| Neuf       | Desktop  | ChatGPT Image 27 juin 2026, 00_31_41 (3).png   | Référence validée  | Direction visuelle (pas screenshot à coller) |
| Neuf       | Mobile   | ChatGPT Image 27 juin 2026, 00_31_25 (4).png   | Référence validée  | Direction visuelle (pas screenshot à coller) |
| Promoteurs | Desktop  | ChatGPT Image 27 juin 2026, 00_31_41 (5).png   | Référence validée  | Direction visuelle B2B (pas screenshot à coller) |
| Promoteurs | Mobile   | ChatGPT Image 27 juin 2026, 00_31_25 (5).png   | Référence validée  | Direction visuelle B2B (pas screenshot à coller) |
| Investir   | Desktop  | ChatGPT Image 27 juin 2026, 00_31_41 (4).png   | Référence bonus    | Direction future (deferred)               |
| Investir   | Mobile   | ChatGPT Image 27 juin 2026, 00_31_25 (6).png   | Référence bonus    | Direction future (deferred)               |

Note : 11 visuels au total (pas 10). VENDRE n'a qu'un seul visuel (format vertical, pas de desktop séparé).
INVESTIR (2 visuels) n'était pas dans le brief initial — livré en bonus, traité en direction future.

Renommage recommandé (NON exécuté dans cette mission — documentation seulement)
Les noms actuels sont génériques ("ChatGPT Image…"). Renommage propre recommandé avant intégration :
* 00_31_40 (1).png  → acheter-desktop-reference.png
* 00_31_24 (1).png  → acheter-mobile-reference.png
* 00_31_41 (2).png  → louer-desktop-reference.png
* 00_31_24 (2).png  → louer-mobile-reference.png
* 00_31_24 (3).png  → vendre-vertical-reference.png
* 00_31_41 (3).png  → neuf-desktop-reference.png
* 00_31_25 (4).png  → neuf-mobile-reference.png
* 00_31_41 (5).png  → promoteurs-desktop-reference.png
* 00_31_25 (5).png  → promoteurs-mobile-reference.png
* 00_31_41 (4).png  → investir-desktop-reference.png
* 00_31_25 (6).png  → investir-mobile-reference.png
À exécuter dans une mission dédiée (renommage + mise à jour de ce mapping), pas maintenant.

----------------------------------------------------
INTENT-RELOOKING-0 — CADRAGE VISUEL

Statut : Completed 2026-06-27
Objectif : Identifier, mapper et détailler les 11 visuels de référence.
Livré : mapping officiel des visuels / pages / formats + détail page par page
        + règles techniques globales + wording autorisé/interdit.
Nature : Documentation uniquement. Aucun fichier applicatif modifié.

----------------------------------------------------
INTENT-RELOOKING-1 — ACHETER

Statut : Completed 2026-06-27 — validé visuellement par Achraf (revue iPhone sur Production).
Build : OK · Tests : 452 scrapers + 51 API (0 fail)
Itérations
* v1  : 4b88124 (livraison initiale — score 82/100 — non déployé)
* v1B : 393a077 (correction visuelle — score 86/100)
* v1C : fa05e8c (cards verticales 3-col — score 88/100)
* v1D : 489c1e6 (RESET visuel dashboard SOMBRE deepblue global — score 89/100)
       → Production https://akarfinder.vercel.app/acheter (push validé Achraf pour revue iPhone)
* v1E : polish final (header mobile + hero mobile compactés, Explorer le Maroc enrichi)
        — score 90 desktop · 89 mobile · 89 global
Score visuel final : 89/100 (desktop 90 · mobile 89 — seuils ≥88 atteints)
Validation : ACQUISE — Achraf a validé visuellement 1E (Production akarfinder.vercel.app).
Standard validé réutilisé pour les pages suivantes : dark premium deepblue dominant,
bronze (CTA/prix/accents), cards verticales blanches sur fond sombre, badges glass,
dashboard 2-col, sidebar glass, stats row sombre, SiteHeader variant=dark compact.
Prérequis : INTENT-RELOOKING-0 complétée.

Objectif
Transformer /acheter en expérience produit premium pour convertir un visiteur qui veut
acheter en acheteur qualifié prêt à rechercher, comparer et contacter.

Visuels
* desktop : ChatGPT Image 27 juin 2026, 00_31_40 (1).png
* mobile  : ChatGPT Image 27 juin 2026, 00_31_24 (1).png

Promesse
"Trouvez le bien fait pour vous, avec les données du marché pour choisir avec clarté."

Éléments à recréer
* hero Acheter (image Casablanca de fond + overlay deepblue) ;
* barre de recherche (ville/quartier + sélecteur Maroc + CTA bronze "Explorer") ;
* chips Acheter / Type de bien / Prix max / Plus de filtres ;
* compteur de repères marché branché sur /api/stats (jamais hardcodé) ;
* 3 cards biens réels via searchListings (limit 3, tri fiabilité) ;
* badges ville sur chaque card ;
* prix DH lisible ;
* surface / chambres / SDB / parking ;
* badge repères de fiabilité par card ;
* bloc "Fiabilité visible" (4 repères éducatifs : historique des prix, qualité de l'annonce,
  similarité du bien, activité du marché) ;
* bloc "Doublon possible" (conditionné à duplicate_score disponible) ;
* bloc Comparer branché sur /compare ;
* bloc Prix observés (indicatifs, disclaimés) ;
* mini carte / section "Explorer le Maroc" (Tanger / Casablanca / Marrakech → /map?city=X) ;
* CTA : /search, /compare, /onboarding, /map.

Approche technique
* ne pas intégrer l'image comme page ;
* recréer en composants React/Tailwind ;
* utiliser les visuels comme direction artistique uniquement ;
* hero = next/image (WebP) + overlay + HTML superposé ;
* données réelles quand possible, fallback propre si pas assez de listings ;
* stats jamais hardcodées (toujours /api/stats).

Risques
* ne pas hardcoder "12 458 annonces" — toujours /api/stats ;
* ne pas utiliser de photos scrappées non autorisées (P10IMG : indexed_only → fallback SVG) ;
* bloc "Doublon possible" affiché seulement si duplicate_score disponible dans les données ;
* prix observés toujours indicatifs et disclaimés.

Exit criteria
* /acheter desktop enrichie ;
* /acheter mobile enrichie (aucun overflow horizontal) ;
* données réelles ou fallback propre ;
* wording interdit absent ;
* build + test:scrapers + test:api OK ;
* screenshots desktop + mobile ;
* Preview Vercel puis Production si Preview OK.

----------------------------------------------------
INTENT-RELOOKING-2 — LOUER

Statut : Completed 2026-06-27 — validé visuellement par Achraf (Production). Score 95/100.
Prérequis : INTENT-RELOOKING-0 complétée + INTENT-RELOOKING-1 (Acheter) validé.

Objectif
Transformer /louer en expérience location claire : budget mensuel, logement,
vie quotidienne, repères de loyer. (LouerPageShell P16B existe déjà — à enrichir.)

Visuels
* desktop : ChatGPT Image 27 juin 2026, 00_31_41 (2).png
* mobile  : ChatGPT Image 27 juin 2026, 00_31_24 (2).png

Promesse
"Louer au Maroc, simple et clair."

Éléments à recréer
* hero Louer (ton teal/deepblue distinct d'Acheter) ;
* stats location (annonces / évolution / délai moyen) — via /api/stats si possible ;
* barre recherche ville/quartier ;
* chips budget mensuel (fourchettes DH/mois) ;
* chips type de bien ;
* chips meublé/vide visuels (DB non filtrable → cosmétique, à signaler) ;
* cards location réelles via searchListings transaction_type=rent ;
* prix DH/mois (pas DH total) ;
* repères de loyer observé par card ;
* bloc Vie quotidienne (transport, école, marché, pharmacie, bureau, carte) ;
* bloc Repères de fiabilité location (prix observé, demande locative, tenure...) ;
* bloc Alerte location — badge "À venir" (jusqu'à P18A) ;
* bloc Ma sélection (favoris / comparateur) ;
* carte des loyers indicative par quartier (Maârif / Racine / Gauthier).

Approche technique
* enrichir LouerPageShell existant (ne pas repartir de zéro) ;
* pas de vraie heatmap si data absente ;
* carte des loyers = CSS/SVG indicatif avec disclaimer ;
* meublé/vide = chips visuels si DB non filtrable ;
* alerte location = "À venir" → lien /search jusqu'à P18A (pas de CTA trompeur).

Risques
* peu de biens location en DB (≈ 2 actuellement) → fallback si < 3 locations ;
* ne pas promettre d'alerte réelle tant que P18A non livré ;
* ne jamais afficher "loyer garanti" ;
* bien signaler "repères indicatifs".

Exit criteria
* /louer desktop enrichie ;
* /louer mobile enrichie (aucun overflow) ;
* fallback propre si moins de 3 locations ;
* wording interdit absent ;
* build + test:scrapers + test:api OK ;
* screenshots desktop + mobile ;
* Preview Vercel puis Production si Preview OK.

----------------------------------------------------
INTENT-RELOOKING-3 — NEUF

Statut : Completed 2026-06-27 — validé visuellement par Achraf (Production) + micro-passe de clarification.
Build : OK · Tests : 452 scrapers + 51 API (0 fail)
Score visuel : 89/100 (desktop 89 · mobile 89).
Données : aucun promoteur actif (lib/promoters = entrée demo gated) → card projet rendue
en APERÇU / EXEMPLE clairement labellisé. Jamais présenté comme réel.
Micro-clarifications (post-validation) : label unique "Aperçu · exemple" (suppression du
badge "Projet partenaire" contradictoire) ; CTA réduits (suppression "Découvrir le projet",
"Voir les autres projets", WhatsApp dupliqué) ; libellés prudents ("Données illustratives —
exemple de présentation", note WhatsApp réservée aux projets partenaires actifs).
P17B full : HOLD · P18A : Completed 2026-06-27 · DATA-A : Not started.
Prérequis : INTENT-RELOOKING-0 complétée. (NeufPageShell P16C existait — refondu.)

Objectif
Transformer /neuf en page premium pour découvrir les projets neufs,
en restant prudent sur les données promoteur.

Visuels
* desktop : ChatGPT Image 27 juin 2026, 00_31_41 (3).png
* mobile  : ChatGPT Image 27 juin 2026, 00_31_25 (4).png

Promesse
"Découvrez les nouveaux projets au Maroc, avec des données fournies par le promoteur
et des repères indicatifs."

Éléments à recréer
* hero Neuf ;
* 4 repères (projets récents / emplacements / plans & brochures / repères indicatifs) ;
* card projet partenaire (badge "Projet partenaire") ;
* photo programme (partner_full uniquement) ;
* prix "à partir de" (jamais "prix officiel") ;
* typologies ;
* surfaces ;
* livraison prévue (jamais "livraison garantie") ;
* plan / brochure ("Brochure fournie par le promoteur") ;
* bloc "Données fournies par le promoteur" systématique ;
* bloc promoteur (nom, présentation, lien autres projets) ;
* CTA WhatsApp / rappel ;
* bloc Neuf vs Ancien (comparaison indicative) ;
* guide d'achat neuf (frais notaire / frais réduits) si présent.

Approche technique
* enrichir NeufPageShell existant ;
* utiliser données promoteur seulement si autorisées ;
* si pas de partenaire actif : ne pas inventer un faux projet public ;
* bloc exemple seulement si clairement marqué "Aperçu / Exemple".

Risques
* faux projet public présenté comme réel → interdit ;
* "prix officiel" interdit ;
* "livraison garantie" interdit ;
* données promoteur non confirmées → mention obligatoire ;
* photos uniquement si autorisées (partner_full).

Exit criteria
* /neuf desktop enrichie ;
* /neuf mobile enrichie ;
* source des données claire (fournie par le promoteur) ;
* wording interdit absent ;
* build + test:scrapers + test:api OK ;
* screenshots desktop + mobile ;
* Preview Vercel puis Production si Preview OK.

----------------------------------------------------
INTENT-RELOOKING-4 — PROMOTEURS

Statut : Completed 2026-06-27 — validé visuellement par Achraf (8.6–8.8/10) après micro-polish wording (reporting arrondi/simulé, CTA leads/WhatsApp en "aperçu", titre raccourci).
Build : OK · Tests : 452 scrapers + 51 API (0 fail)
Shell dédié créé : components/promoteurs/PromoteursPageShell.tsx (remplace IntentPageShell générique).
Tous les mocks (projet, leads, reporting, QR) labellisés Aperçu / Exemple / Simulation.
Wording prudent (pas de "leads garantis / résultat garanti / promoteur vérifié / officiel").
Prérequis : INTENT-RELOOKING-0 complétée + P17A-1 scaffolding disponible.

Objectif
Transformer /promoteurs en page B2B premium qui montre la valeur pour les promoteurs
sans promettre de résultats garantis.

Visuels
* desktop : ChatGPT Image 27 juin 2026, 00_31_41 (5).png
* mobile  : ChatGPT Image 27 juin 2026, 00_31_25 (5).png

Promesse
"Présentez vos projets. Recevez des leads qualifiés."

Éléments à recréer
* hero Promoteurs (deepblue / bronze) ;
* value props (pages premium / leads / outils / données) ;
* card projet (lien page projet demo P17A-2 si disponible) ;
* leads qualifiés (mock labellisé "Exemple") ;
* WhatsApp ;
* reporting (mock labellisé / placeholder "disponible avec votre pack") ;
* brochure PDF ;
* QR salon / expo (placeholder, pas trompeur) ;
* packs Starter / Pro / Premium / Expo (sans prix chiffré — P17B-0) ;
* diffusion multicanale ;
* formulaire intelligent ;
* notifications (marquer "À venir" si non livré) ;
* données sécurisées.

Approche technique
* enrichir /promoteurs existant ;
* mocks autorisés uniquement avec label Exemple / Aperçu ;
* pas de vrais leads publics (les vrais leads restent dans /pro/leads token-gated) ;
* pas de prix pack chiffré ;
* pas de fausse promesse.

Risques
* leads/reporting mock non labellisés → interdit (toujours "Exemple") ;
* QR demo trompeur → placeholder avec mention ;
* prix packs absents → expliquer avec CTA "Nous contacter / Réserver une démo" ;
* notifications non livrées → marquer "À venir" si besoin.

Exit criteria
* /promoteurs desktop enrichie ;
* /promoteurs mobile enrichie ;
* mocks clairement labellisés Exemple / Aperçu ;
* wording interdit absent ;
* build + test:scrapers + test:api OK ;
* screenshots desktop + mobile ;
* Preview Vercel puis Production si Preview OK.

----------------------------------------------------
INTENT-RELOOKING-5 — VENDRE

Statut : Completed 2026-06-27 — validé visuellement par Achraf (score 96/100). Production OK.
Nav : /vendre ajouté à lib/site.ts (desktop) + mobile chips SiteHeader.
Mocks (bien, estimation, leads, visibilité) labellisés "Aperçu / Exemple".
Prérequis : INTENT-RELOOKING-0 complétée + décisions Achraf (nav, blocs mock) tranchées.

Objectif
Créer ou enrichir /vendre pour aider un propriétaire à préparer sa vente avec des
repères indicatifs, sans promettre d'estimation officielle ni vente garantie.

Visuel
* vertical : ChatGPT Image 27 juin 2026, 00_31_24 (3).png
* desktop séparé : absent (à concevoir nativement en Tailwind responsive)

Promesse
"Vendre avec plus de clarté et de confiance."

Éléments à recréer
* page /vendre ;
* hero Vendre ;
* card bien vendeur ;
* estimation indicative (fourchette large, fort disclaimer) ;
* visibilité de l'annonce (diffusion multi-canal Acheter/Louer/Neuf/Google) ;
* demandes de visite (mock labellisé "Aperçu") ;
* leads qualifiés (mock labellisé "Aperçu") ;
* prix observés dans la zone (tableau ville/quartier/m²) ;
* annonce similaire détectée (via searchListings) ;
* CTA "préparer ma vente" / "demander un accompagnement" ;
* lien vers /pro ou formulaire contact.

Décision à documenter (à confirmer par Achraf)
/vendre doit être ajoutée dans :
* nav principale ;
* chips mobile ;
* éventuellement footer.
MAIS la page ne doit pas promettre de dépôt instantané d'annonce.

Approche technique
* créer app/vendre/page.tsx si absent ;
* créer components/vendre/VendrePageShell.tsx si nécessaire ;
* données estimation statiques ou semi-dynamiques avec disclaimer fort ;
* pas de backend publication ;
* pas d'auth vendeur dans cette phase.

Risques
* estimation trop précise → perte de crédibilité (fourchette large obligatoire) ;
* "publier mon bien" mal compris → pas de dépôt automatique ;
* leads/visites mock non labellisés → toujours "Aperçu / Exemple" ;
* confusion avec une agence immobilière → wording prudent ;
* aucun dépôt automatique d'annonce.

Exit criteria
* /vendre créée ;
* nav mise à jour (selon décision Achraf) ;
* mobile OK (aucun overflow) ;
* wording prudent, pas de promesse officielle ;
* build + test:scrapers + test:api OK ;
* screenshots mobile + desktop responsive ;
* Preview Vercel puis Production si Preview OK.

----------------------------------------------------
INTENT-RELOOKING-6 — QA GLOBALE MOBILE / DESKTOP / PERFORMANCE

Statut : Completed 2026-06-27.
Prérequis : INTENT-RELOOKING-1 à 5 complétées (toutes complétées).
Objectif : Vérifier le rendu iPhone, desktop, poids images, absence d'overflow.

Résultats QA (2026-06-27)
* Smoke test HTTP 200 : 10/10 routes (/ /acheter /louer /neuf /promoteurs /vendre /search /compare /map /onboarding)
* Build : OK (0 erreur TypeScript)
* Tests : 452 scrapers + 51 API (0 fail)
* Dark premium cohérent : bg-[#061027] + SiteHeader variant=dark compact sur les 5 pages ✅
* Wording interdit : absent — toutes les occurrences de garanti/certifié/officiel sont des disclaimers négatifs ✅
* Mocks labellisés : Aperçu / Exemple / Simulation / Brouillon sur tous les contenus illustratifs ✅
* Grilles mobiles : max 2 colonnes sur mobile — aucun overflow horizontal détecté ✅
* Nav mobile chips : 5 pages d'intention + Recherche (Acheter / Louer / Neuf / Vendre / Promoteurs / Recherche) ✅
* Nav desktop navItems : Acheter / Louer / Neuf / Vendre / Carte / Recherche ✅
* Promoteurs hors navItems desktop (B2B, accessible via chips mobile) — intentionnel ✅
* Aucun bug trouvé. Aucune correction nécessaire.

Checklist
* Smoke test HTTP 200 : /acheter / /louer / /neuf / /promoteurs / /vendre
* Rendu iPhone (390px) : aucun overflow, texte lisible, CTA accessibles
* Rendu desktop (1280px) : layout conforme aux visuels de référence
* Poids images : optimisées (next/image + WebP)
* Build propre : npm run build 0 erreur TypeScript
* test:scrapers : 0 fail
* test:api : 0 fail
* Wording interdit absent sur les 5 pages
* Vercel Preview déployée avant Production
* Smoke test Production après déploiement

----------------------------------------------------
INTENT-RELOOKING-BONUS-INVESTIR — DIRECTION FUTURE

Statut : Deferred / Not started.
Position : après les 5 pages principales, ou avec DATA-E (prix observés renforcés).

Visuels
* desktop : ChatGPT Image 27 juin 2026, 00_31_41 (4).png
* mobile  : ChatGPT Image 27 juin 2026, 00_31_25 (6).png

Objectif futur
Transformer /investir en page d'aide à la décision avec prix observés, comparatif villes,
quartiers actifs et méthodologie — sans conseil financier.

Éléments visuels
* prix/m² observé (P10D) ;
* comparatif villes ;
* quartiers actifs ;
* zones en mouvement (carte heatmap indicative) ;
* opportunités à surveiller ;
* tableau comparatif ;
* méthodologie ("comment ces données sont calculées") ;
* disclaimer de prudence décisionnelle.

Raison du report
* wording financier sensible ;
* besoin de données plus solides (DATA-E / prix observés renforcés) ;
* risque de conseil financier implicite ;
* à traiter après les 5 pages principales, sous mission dédiée avec validation wording.

Wording interdit (spécifique Investir)
* rendement garanti
* investissement sûr
* plus-value garantie
* conseil financier
* prix officiel
* données certifiées

Exit criteria futur
* données suffisamment solides ;
* méthodologie claire et visible ;
* disclaimers de prudence visibles ;
* aucun conseil financier.

----------------------------------------------------
RÈGLES TECHNIQUES GLOBALES — INTENT-RELOOKING

Approche d'intégration commune
* les images du dossier relooking sont des références de direction artistique ;
* ne pas coller les visuels comme screenshots de page ;
* recréer en composants React/Tailwind ;
* utiliser next/image uniquement pour les photos / fonds (priority + sizes, WebP, < 200 Ko) ;
* textes importants en HTML (pas dans l'image) ;
* CTA en vrais liens (/search, /compare, /onboarding, /map, /pro, wa.me) ;
* stats via /api/stats (jamais hardcodées) ;
* listings via searchListings (fallback propre si données insuffisantes) ;
* prix observés avec disclaimer indicatif ;
* mocks uniquement avec label Exemple / Aperçu ;
* pas de photos non autorisées (P10IMG : indexed_only → fallback SVG) ;
* pas d'overflow mobile ;
* mobile-first ;
* pas de nouvelle dépendance npm non auditée.

Règle de test (intégration séparée page par page)
Chaque intégration page doit être faite séparément, dans cet ordre :
1. Acheter
2. Louer
3. Neuf
4. Promoteurs
5. Vendre
Investir après validation séparée (mission dédiée).

Chaque page intégrée doit avoir
* screenshot desktop ;
* screenshot mobile ;
* build OK ;
* test:scrapers OK ;
* test:api OK ;
* wording interdit absent ;
* Preview Vercel ;
* Production seulement si Preview OK.

----------------------------------------------------
WORDING GLOBAL — INTENT-RELOOKING

Wording autorisé
* repères marché indicatifs
* repères indicatifs
* prix observés
* signaux de fiabilité visibles
* données fournies par le promoteur
* source identifiée
* à confirmer avant décision
* à confirmer auprès du promoteur
* estimation indicative
* leads qualifiés
* aperçu
* exemple

Wording interdit
* prix officiel
* estimation officielle
* données vérifiées
* garanti
* certifié
* fiable à 100 %
* vente garantie
* leads garantis
* estimation certifiée
* rendement garanti
* investissement sûr
* plus-value garantie
* conseil financier
* promoteur vérifié
* projet certifié
* livraison garantie

----------------------------------------------------
P18A — ALERTES SAUVEGARDÉES RÉELLES

Statut : Not started.

Prérequis : P15B complétée + Phase 3 (Supabase)

Objectif
Créer des alertes persistantes à partir d'une recherche.

MVP
* Critères : ville/quartier, budget min/max, transaction type, type bien
* Fréquence indicative (journalière, hebdomadaire)
* Historique des alertes créées
* Aucun envoi email/SMS automatique au début si non implémenté
* CTA depuis /search et /listings/[id]

Wording autorisé
* "Alertes sauvegardées"
* "Recevoir les nouveaux biens correspondant à ma recherche"
* "Alerte créée — vous serez notifié selon la disponibilité du service"

Wording interdit
* "alerte garantie"
* "temps réel" si non live
* "tous les nouveaux biens" si le scraping n'est pas continu

Guardrails
* Consentement obligatoire pour tout envoi de notification
* Pas de promesse de complétude du flux

----------------------------------------------------
P18B — CALCULATEUR MENSUALITÉ / BUDGET INDICATIF MAROC-MRE

Statut : Not started.

Objectif
Transformer budget / apport / durée / taux indicatif en mensualité estimative.

Entrées
* Prix du bien
* Apport disponible
* Durée souhaitée (en années)
* Taux indicatif (valeur de marché non officielle)
* Devise (MAD / EUR / USD pour les MRE)

Sortie
* Mensualité estimative
* Coût total indicatif
* Ratio apport / financement

Important
Ce n'est pas une préqualification bancaire.

Wording autorisé
* "Simulation indicative"
* "Mensualité estimative"
* "À confirmer avec votre banque"
* "Capacité estimative — non officielle"

Wording interdit
* "crédit accepté"
* "taux garanti"
* "capacité certifiée"
* "préqualification bancaire"
* tout lien avec une banque partenaire sans accord signé

Guardrails
* Label "Simulation indicative — à confirmer avec votre banque" obligatoire
* Pas de taux en temps réel sans partenariat validé
* Pas de stockage de données financières sans consentement

----------------------------------------------------
P19A — HISTORIQUE PRIX / STATUT ANNONCE

Statut : Not started.

Prérequis : Phase 3 (Supabase) + pipeline import continu

Objectif
Suivre les changements d'une annonce entre deux scrapes :

* prix baissé
* prix augmenté
* republié (même fingerprint réapparu après disparition)
* retiré (fingerprint absent du dernier run)
* doublon réapparu
* source changée

Pourquoi
Très fort pour la confiance et la négociation.
"Ce bien a baissé de 15% en 3 mois" est un signal de négociation.

MVP
* Table listing_snapshots ou listing_events (diff entre imports)
* Affichage indicatif sur detail page (/listings/[id])
* Label "Données indicatives issues de l'analyse AkarFinder"
* Pas de promesse de complétude temporelle

Guardrails
* Pas de "prix historique officiel"
* Variation affichée avec niveau de confiance et sample count
* Données indicatives uniquement

----------------------------------------------------
P19B — PAGES MARCHÉ LOCALES SEO

Statut : Not started.

Prérequis : P19A complétée + volume suffisant (N ≥ 20 annonces par zone)

Objectif
Créer des pages ville/quartier utiles pour la recherche organique.

Contenu de chaque page
* Prix observé / m² (avec confidence level)
* Types de biens disponibles
* Annonces récentes
* Proximité quartier (si P10C disponible)
* Tendances indicatives (si P19A disponible)

Exemples d'URL
* /marche/casablanca
* /marche/rabat/hay-riad
* /marche/marrakech/gueliz
* /marche/tanger/malabata
* /marche/agadir

Important
* Pas de thin SEO spam autogénéré
* Afficher uniquement si données suffisantes (N ≥ 20)
* Sinon : page pilote / données limitées déclarées
* Label "Données indicatives issues de l'analyse AkarFinder — non officielles" obligatoire

Guardrails
* Pas de "prix officiel du quartier"
* Pas de prévision de prix
* Pas de "meilleur quartier pour investir"

----------------------------------------------------
P20A — DOSSIER QUARTIER ENRICHI

Statut : Not started.

Prérequis : P10C (proximité) complétée + DATA-E (prix/m² observé enrichi)

Objectif
Transformer la proximité indicative en vrai dossier quartier :

* Transport (bus, tram, taxi, gare)
* Écoles / crèches / collèges
* Commerces (marché, supermarché, hanout)
* Santé (pharmacie, clinique, hôpital)
* Mosquées
* Taxis / stations
* Temps d'accès indicatifs
* Scoring quartier (extension du score vie quotidienne P10C)

Guardrails
* Toutes données indicatives issues d'OpenStreetMap / Overpass API
* "À vérifier avant décision" obligatoire
* Pas de Foursquare / Google Places sans partenariat validé

----------------------------------------------------
P20B — RECHERCHE MULTI-ZONES

Statut : Not started.

Objectif
Permettre une recherche sur plusieurs villes/quartiers simultanément.

Exemples
* Rabat Hay Riad + Agdal + Souissi
* Casablanca Maârif + Gauthier + Racine
* Tanger Malabata + Centre + Médina

Pourquoi
Très utile MRE et acheteurs flexibles sur la localisation.

MVP
* Sélecteur multi-zones sur /search
* Résultats filtrés sur l'union des zones sélectionnées
* Carte multi-zones si P10B-DB disponible

----------------------------------------------------
FUTURE — MARKET INTELLIGENCE / CARTE DU MARCHÉ

Statut : Idee future, non planifiee.

Objectif
Créer une future brique d'analyse marché basée uniquement sur les données internes AkarFinder
pour aider à lire l'activité, les prix observés et la fiabilité par zone.

Principes
* Données internes AkarFinder uniquement
* Pas de scraping Yakeey ni de copie concurrente
* Jamais présenté comme officiel
* Disclaimer obligatoire : "Repères indicatifs basés sur des repères publics et des résultats web externes. Ces données ne constituent pas une estimation officielle."
* Commencer par une V1 simple par ville avant d'aller vers les quartiers
* Utiliser la médiane plutôt que la moyenne quand possible
* Afficher le niveau de confiance selon le volume de données
* Préférer d'abord des cartes / tableaux simples puis une vraie carte interactive plus tard
* Éviter toute carte géographique fausse ou sensible

V1 future
* Classement des villes par volume d'annonces
* Prix médian au m² par ville
* Score moyen de fiabilité par ville
* Cards "zones actives"
* Disclaimer clair

V2 future
* Analyse par quartier si le district est fiable
* Heatmap activité / prix / fiabilité
* Filtres achat / location / appartement / villa / neuf
* Lien vers les annonces correspondantes

V3 future
* Carte interactive avancée
* Historique d'évolution
* Alertes marché
* Comparaison entre villes et quartiers
* Repères de prix par ville et quartier
* Zones les plus actives
* Zones à surveiller
* Zones à prix observés modérés
* Zones avec plus de biens fiables
* Zones avec plus de sources analysées
* Zones avec plus de signaux de fiabilité
* Carte "activité / prix / fiabilité / repères marché"

----------------------------------------------------
P21A — VISITES ORGANISÉES / PORTES OUVERTES

Statut : Not started.

Objectif
Adapter le concept Zillow open houses au Maroc :

* Créneaux organisés par promoteur / agence
* Visites groupées (événement, showroom, lancement)
* Intégration Sakan Expo / événements partenaires
* Demande d'inscription depuis AkarFinder

Important
* Pas de "visite confirmée" sans validation manuelle
* Wording : "Demande d'inscription envoyée — en attente de confirmation"
* Les créneaux sont fournis par le partenaire, pas générés par AkarFinder

Guardrails
* Aucune confirmation automatique
* Aucun SMS / notification sans consentement
* Partenaire responsable de la confirmation et de l'organisation

----------------------------------------------------
P21B — VISITE VIRTUELLE / VIDÉO / PLAN INTERACTIF PARTENAIRE

Statut : Not started.

Objectif
Offrir une valeur premium aux agences et promoteurs partenaires :

* Vidéo de présentation
* Visite virtuelle (iframe ou partenaire externe)
* Plan interactif (SVG ou partenaire)
* Galerie photos autorisées (partner_full)
* Badge partenaire "Contenu enrichi"

Important
* Disponible uniquement pour annonces partner_full
* Les biens indexed_only conservent le fallback SVG sans visite virtuelle
* Aucun contenu copié sans autorisation explicite

Guardrails
* source_access_level === "partner_full" requis
* Pas de copie de visites virtuelles depuis des portails tiers
* Iframe uniquement si partenariat signé avec la source

====================================================
RÈGLES PERMANENTES

* Ne pas tout mettre en V1.
* Ne pas lancer Typesense ou /carte avant que Supabase soit en production.
* Ne pas promettre "certifié" ou "garanti" sans process juridique.
* Ne pas afficher de publicité cheap qui détruit le premium.
* Ne pas diluer AkarFinder vers l'international avant d'être rentable au Maroc.
* SWOT / BCG restent dans les docs internes — jamais dans l'interface publique.
* Boost sponsorisé : toujours labellisé, jamais masqué.
* WhatsApp CTA : toujours primaire dans le produit.
* Attribution d'une photo/source ne vaut pas autorisation de réutilisation commerciale.
* Onboarding acheteur : toujours "indicatif", jamais "préqualification" sans partenaire bancaire validé.
====================================================
UI-MARKET-PULSE - Completed 2026-06-25

Statut : COMPLETEE
Objectif : Ajouter une bande premium "Dernieres annonces analysees" sur la homepage premium pour montrer l'activite recente du moteur sans revendiquer de temps reel.
Build : OK - Tests : 403 scrapers + 51 API (0 fail)
Screenshots : 3 captures public/screenshots/ui-market-pulse-*.png

Livre :
* Nouveau helper serveur `lib/market-pulse/get-market-pulse-listings.ts`
* Source des annonces : `queryListings()` (Supabase / SQLite fallback) + `mapDbRowToListing()` + mocks uniquement si aucun provider n'est disponible
* Filtrage qualite : id + title + city requis ; transaction_type mappe ; reliability_score >= 50 si dispo ; duplicate_score < 80 ; data_completeness_score >= 40 si dispo ; prix ou detail utile requis
* Bande premium sous le hero, non sticky, fond dark premium coherent avec UI-PREMIUM-HOMEPAGE
* Items cliquables vers `/listings/[id]`
* Desktop : marquee lent avec pause au hover
* Mobile : scroll horizontal manuel, sans animation agressive
* `prefers-reduced-motion` respecte : animation desactivee automatiquement
* Wording safe : "Derniers repères marché" / "Biens récemment intégrés" ; aucun "temps reel", aucune "donnee verifiee"

====================================================
TRACK DATA ENGINE — Moteur d'intelligence immobilière Maroc
Version : 2026-06-25 — Documenté post-P15A

====================================================
DESCRIPTION

AkarFinder repose sur deux couches complémentaires :

  AkarFinder Site   = interface utilisateur (recherche, comparateur, carte, fiches, onboarding, Pro)
  AkarFinder Engine = collecte publique + nettoyage + normalisation + déduplication + scoring +
                      historique + analytics marché

Le Track Data Engine est une piste parallèle permanente. Il nourrit :
* P15A — Comparateur de biens (prix observé, package score, proximité, doublons)
* P15B — Favoris / shortlist (données enrichies des biens sauvegardés)
* P16A/B/C — Pages par intention, Location, Neuf (données filtrées par type)
* P17A/B — Pages et packs promoteurs (données projets + analytics)
* P18A — Alertes (flux de nouvelles annonces)
* P18B — Calculateur (prix/m² observé pour simulation)
* P19A — Historique prix/statut (DATA-D)
* P19B — Pages marché locales SEO (DATA-E)
* P20A — Dossier quartier enrichi (DATA-E + proximité)
* P20B — Recherche multi-zones
* P21A/B — Visites organisées et visite virtuelle
* Package Score (P10E)
* Prix observé (P10D / DATA-E)
* Proximité (P10C)
* Fiabilité et doublons (P5/P6)
* Dashboard promoteurs (DATA-F)
* Rapports marché (DATA-H)

Séparation des responsabilités
* features produit → roadmap P15 → P21
* chantiers infrastructure/data → roadmap DATA-A → DATA-H
* DATA-A ne démarre pas avant stabilisation P15B+

Ce track est indépendant du track produit (P15B, P16, P17...).
Il ne commence pas maintenant (DATA-A = not started).
Il est documenté pour orienter la roadmap data à moyen terme.

====================================================
STATUTS

DATA-A : Not started
DATA-B : Not started
DATA-C : Partiellement couvert (normalisation + déduplication déjà en prod via P5/P6)
DATA-D : Not started
DATA-E : Partiellement couvert (prix/m² observé par ville/quartier via P10D)
DATA-F : Not started
DATA-G : Partiellement couvert (contraintes PII déjà respectées dans scraper existant)
DATA-H : Not started

====================================================
DATA-A — SOURCE REGISTRY

Statut : Not started

Objectif
Maintenir un registre structuré des sources publiques immobilières analysées.

Contenu
* nom et URL de la source
* type : portail public, agence, promoteur, import partenaire
* couverture villes / quartiers
* fréquence de collecte autorisée
* qualité moyenne observée (taux de champs remplis)
* taux d'erreur ou d'échec de collecte
* contraintes techniques connues
* politique image et contact par source
* statut actif / en pause / suspendu

====================================================
DATA-B — COLLECTE PUBLIQUE PROGRAMMÉE

Statut : Not started

Objectif
Automatiser la collecte de manière prudente et contrôlée.

Principes
* pas de collecte live pendant la navigation utilisateur
* runs programmés à heures fixes
* logs horodatés par source
* comptage : nouvelles annonces / mises à jour / erreurs
* fréquence contrôlée par source (respecter les contraintes DATA-A)
* pas de surcharge des sources
* arrêt automatique en cas de taux d'erreur anormal

====================================================
DATA-C — NORMALISATION + DÉDUPLICATION

Statut : Partiellement couvert (P5/P6 en prod)

Ce qui est déjà fait
* normalisation prix, surface, ville, quartier, type de bien
* transaction : achat / location / neuf
* duplicate_score et duplicate_group_id calculés et stockés
* canonical listing maintenu

Ce qui reste
* extension multi-sources si nouvelles sources ajoutées
* amélioration du rapprochement cross-source

====================================================
DATA-D — HISTORIQUE PRIX / STATUT

Statut : Not started

Objectif
Suivre dans le temps l'évolution des annonces.

Données à suivre
* prix initial
* prix actuel
* delta prix (baisse / hausse)
* annonce active / disparue / réapparue
* durée de présence sur le marché
* statut observé dans le temps

Usage futur
* base de données pour P19A — Historique prix/statut annonce (fiche /listings/[id])
* input pour analytics marché (DATA-F)

====================================================
DATA-E — PRIX/M² OBSERVÉ

Statut : Partiellement couvert (P10D en prod)

Ce qui est déjà fait
* prix/m² observé par ville
* prix/m² par quartier
* prix/m² par type de bien
* position marché (coherent / high / low)

Ce qui reste
* médiane sur volume suffisant plutôt que moyenne simple
* affichage du niveau de confiance (volume d'annonces utilisées)
* seuil minimum de données avant affichage public
* historique du prix/m² dans le temps (dépend de DATA-D)

Wording obligatoire
* "prix observé" — jamais "prix officiel" ou "prix garanti"

====================================================
DATA-F — DASHBOARD ANALYTICS INTERNE

Statut : Not started

Objectif
Tableau de bord interne pour piloter la qualité du moteur.

Métriques à afficher
* volumes collectés par source et par ville
* qualité par source (taux de champs remplis)
* prix/m² observé par ville et quartier
* quartiers les plus actifs
* volume de doublons détectés
* nouvelles annonces / annonces disparues
* tendances de marché observées
* anomalies détectées
* sources en erreur ou en pause

====================================================
DATA-G — DATA QUALITY & COMPLIANCE

Statut : Partiellement couvert (contraintes respectées dans scraper existant)

Contraintes permanentes — non négociables
* pas d'extraction de téléphone ou d'email depuis les annonces publiques
* pas de PII (données personnelles identifiables)
* pas de login utilisateur ou de contournement de captcha
* pas de contournement technique des protections des sources
* sources publiques uniquement, ou imports partenaires formellement acceptés
* pas de réhébergement d'images non autorisées
* logs auditables par opération de collecte

Wording public obligatoire
* "annonces publiques analysées" — jamais "scraping" dans les interfaces publiques
* "données indicatives" — jamais "données vérifiées" ou "base officielle"

====================================================
DATA-H — MARKET INTELLIGENCE API

Statut : Not started

Objectif
Exposer les données du moteur via des API internes structurées.

API prévues
* /api/market/price-per-m2 — prix observé par ville / quartier / type
* /api/market/neighborhood — données agrégées par quartier
* /api/market/history — historique prix (dépend de DATA-D)
* /api/internal/dashboard — alimentation DATA-F
* /api/compare — déjà partiellement utilisé par P15A via /api/search
* /api/seo/local — pages SEO locales futures
* /api/pro/reporting — dashboards promoteurs (phase ultérieure)

====================================================
ORDRE RECOMMANDÉ

Si le Track Data Engine est activé à l'avenir :
DATA-A (registry) → DATA-B (collecte) → DATA-C (extension) → DATA-D (historique)
→ DATA-E (prix/m² enrichi) → DATA-F (dashboard) → DATA-G (compliance) → DATA-H (API)

DATA-G s'applique dès DATA-A et ne se "termine" jamais — c'est un garde-fou permanent.

Ne pas démarrer avant que le track produit (P15B, P16, P17...) soit stabilisé.
====================================================
SOURCE-CANDIDATE-AUDIT-1

Statut : Completed (documentation only, aucun changement prod)

Livrables
* `docs/SOURCE_CANDIDATE_AUDIT.md`
* `data/source-candidate-audit.json`

Synthese
* P0 sources auditees techniquement : Mubawab, Avito, Sarouty, Agenz, MarocAnnonces, Logic-Immo Maroc, Yakeey
* `public_index_source` candidates : Mubawab, Agenz, Logic-Immo Maroc
* `thin_indexed_result` candidate prouve : Avito via Search API uniquement
* `audit_source` / `source_search_link` : Sarouty, MarocAnnonces, Yakeey
* `promoter_site_source` backlog : Addoha, Prestigia, Groupe Al Omrane, CGI
* `benchmark_source` : Bank Al-Maghrib, HCP, ANCFCC, DGI
* `social_signal_source` : Facebook, Instagram, TikTok publics

Contraintes validees
* aucun scraping de production ajoute
* aucune migration DB
* aucun bypass / proxy / stealth / faux user-agent
* aucun contact / galerie / image rehost active

Missions suivantes recommandees
* `SOURCE-CANDIDATE-AUDIT-2` - deep audit `Agenz` + `Logic-Immo Maroc`
* `SOURCE-CANDIDATE-AUDIT-3` - listing URL discovery `Sarouty` + `Yakeey`
* `SEARCH-API-MULTI-SOURCE-AUDIT-1` - mesurer la qualite provider domaine par domaine
* `PROMOTER-SITE-AUDIT-1` - audit public des sites promoteurs neufs
* `SOURCE-CANDIDATE-AUDIT-2` - confirme `Agenz` et `Logic-Immo Maroc` comme high-confidence candidates `public_index_source`, sans ouverture prod
* `YAKEEY-PRICE-REFERENCE-ENGINE-AUDIT-1` - benchmark source only : referentiel public Yakeey (58 villes, 458 quartiers, integrate_as_benchmark_source)
* `DATA-ENGINE-YAKEEY-BENCHMARK-WIRING-1` - registry benchmark + calculateur price_gap (Data Engine only, no frontend)
* `MARKET-PRICE-SCORE-PRODUCT-POLICY-1` - policy wording + badges pour les statuts Yakeey avant UI
* `MARKET-PRICE-SCORE-FRONTEND-DISPLAY-1` - badge Yakeey sur cartes structurees uniquement, pas sur search gateway

====================================================
PHASE 1 LAUNCH READINESS — VALIDATED 2026-07-04

STATUS: READY FOR PUBLIC ANNOUNCEMENT

SEARCH-GATEWAY-PROVIDER-CONFIG-1: COMPLETED
- Production deployment: stable
- External results: 129/129 with correct wording
- API provider: serper operational
- Doctrine compliance: 100% (0 violations)
- Production smoke test: 9/9 routes ✓

NEXT OPTIMIZATION PHASE:
After public announcement and initial user feedback:
1. SEARCH-GATEWAY-COVERAGE-OPTIMIZE-2 - multi-source coverage stability
2. Ranking refinement based on usage patterns
3. Deduplication and result quality improvements

Phase 1 can now be publicly announced. Search Gateway returns external web results while preserving source-original redirection and no third-party listing persistence.

====================================================
STRATEGIC REALIGNMENT — DEMAND-QUALIFIED ROADMAP — 2026-07-04

Context:
External strategic audit identified misalignment between "maximum annonces" promise and actual business model.
New priority: capture qualified intentions → test B2B monetization (promoters/agencies) → build moat via data access, not inventory ownership.

Revised priority order:

P0 — IMMEDIATE PURITY & ALIGNMENT
=================================

1. SERP-PURITY-ALIGNMENT-1
   Remove marketplace UI traces, wording fixes in /search component
   Blocked: nothing | Blocks: PROMISE-REALITY-ALIGNMENT-1
   Status: READY
   Owner: Search

2. PROMISE-REALITY-ALIGNMENT-1
   Align public wording: remove "all Moroccan listings", "exhaustive", "marketplace"
   Replace with: "Search more widely, compare faster, contact original source"
   Blocked: SERP-PURITY-ALIGNMENT-1 | Blocks: ALERTS-DEMAND-CAPTURE-MVP-1
   Status: READY
   Owner: Product

P1 — DEMAND CAPTURE (BUSINESS BRIDGE)
======================================

3. ALERTS-DEMAND-CAPTURE-MVP-1
   MVP alerts / search relaunches
   Capture: city, neighborhood, type, budget, search frequency
   NO third-party result persistence
   Blocked: PROMISE-REALITY-ALIGNMENT-1 | Blocks: BUYER-DOSSIER-LEAD-MVP-1
   Status: PLANNED
   Owner: Product + Backend

4. BUYER-DOSSIER-LEAD-MVP-1
   Qualify searches into leads
   Dossier: intent, budget, timeline, profile, consent
   Build first data asset for B2B
   Blocked: ALERTS-DEMAND-CAPTURE-MVP-1 | Blocks: SAKAN-PROMOTER-PILOT-OFFER-1
   Status: PLANNED
   Owner: Product + Frontend

5. SAKAN-PROMOTER-PILOT-OFFER-1
   10 promoters contacted
   3 meetings
   1 paid pilot
   Offer: project page + QR + lead form + 30-day report
   KPI: searches, clicks, leads, neighborhoods requested
   Blocked: BUYER-DOSSIER-LEAD-MVP-1 | Blocks: nothing until results
   Status: PLANNED
   Owner: Product + Sales

P2 — GATEWAY OPTIMIZATION (POST-CAPTURE)
=========================================

6. SEARCH-GATEWAY-INTENT-DETECTION-1
   Separate buy/rent/new/terrain AFTER demand capture
   Locked ranking changes until business model validated
   Blocked: SAKAN-PROMOTER-PILOT-OFFER-1 | Blocks: RANKING-TUNE-1
   Status: PLANNED
   Owner: Search

7. SEARCH-GATEWAY-QUERY-VARIANTS-1
8. SEARCH-GATEWAY-RANKING-TUNE-1
9. SEARCH-GATEWAY-QUALITY-SMOKE-1
   Non-critical optimizations FROZEN after dedupe validation
   Only unblock if pilot reveals specific gaps
   Blocked: INTENT-DETECTION-1 | Blocks: nothing until pilot data
   Status: FROZEN
   Owner: Search

P3 — INTELLIGENCE & MOAT
=========================

10. USER-PROFILE-SEARCH-MODES-1
11. NEIGHBORHOOD-ATTENTION-POINTS-1
12. RESULT-FIT-SCORE-GATEWAY-1
    Only deploy scores to first-party or partner-authorized results
    Do NOT apply to thin external web results
13. SEARCH-UX-RICH-EXPERIENCE-1
14. DATA-GOVERNANCE-SEARCH-INTELLIGENCE-1

Reposition after pilot validation.

Key decision:
Search Gateway = traffic layer.
Demand data = business asset.
Partner authorized inventory = revenue model.
Neighborhood/market intelligence = long-term moat.

Do NOT chase:
- max annonces
- exhaustive inventory
- marketplace positioning
- thin external result ranking heroics

DO chase:
- qualified intention signal
- buyer intent data
- promoter/agency partnership proof
- MRE market leadership
- neighborhood intelligence

====================================================
PHASE 4 — DEMO SHOWCASE / Commercial Demonstration — APPROVED — 2026-07-04

Context:
Demo Showcase Mode is a sales and product vision layer, not a production system.
Enables clearer B2B conversations with promoters/agencies.
Demonstrates target experience richness without marketplace confusion.

Missions:

1. DEMO-SHOWCASE-MODE-1
   Create demo framework and guards
   Objectif:
   - routes or entries clearly labeled Demo / Example
   - strict separation from production
   - visible badge "Mode démo" or "Exemple"
   - no demo content confused with real content
   - complete audit trail to prove demo content is not real
   Blocked: BUYER-DOSSIER-LEAD-MVP-1 | Blocks: DEMO-PROMOTER-PAGE-1
   Status: QUEUED
   Owner: Product

2. DEMO-PROMOTER-PAGE-1
   Example promoter page
   Objectif:
   - example promoter identity (name, logo, zones)
   - example projects
   - example coverage map
   - CTA "Demander une démo"
   - example visibility/leads report clearly labeled demo
   - sample partner benefits
   - NO real partner data
   Blocked: DEMO-SHOWCASE-MODE-1 | Blocks: DEMO-AGENCY-PAGE-1
   Status: QUEUED
   Owner: Product

3. DEMO-AGENCY-PAGE-1
   Example agency page
   Objectif:
   - example agency identity (name, specialties, zones)
   - buy/rent/new/MRE specialties
   - example client listings (demo-labeled)
   - agency performance dashboard (demo data)
   - lead capture form example
   - example report template
   - NO real agency data
   Blocked: DEMO-PROMOTER-PAGE-1 | Blocks: DEMO-INTENT-PAGES-FULL-1
   Status: QUEUED
   Owner: Product

4. DEMO-INTENT-PAGES-FULL-1
   Full-featured demo intent pages: Buyer / Seller / Renter
   Objectif:
   - rich Buyer experience with neighborhood details, market context
   - rich Seller experience with listing prep, market position, valuation guides
   - rich Renter experience with search preparation, alerts setup
   - all pages clearly labeled demo / example
   - no exhaustiveness promise
   - no marketplace language
   - shows target feature completeness
   Blocked: DEMO-AGENCY-PAGE-1 | Blocks: SAKAN-PROMOTER-PILOT-OFFER-1
   Status: QUEUED
   Owner: Product

Constraints:
- Demo ≠ marketplace
- Demo ≠ fake inventory
- Demo ≠ fake partners
- Demo ≠ fake leads
- Demo = sales support + vision clarity

Launch trigger:
Before Sakan Expo and first B2B conversations.

════════════════════════════════════
REVISED ROADMAP ORDER — Demand Capture to B2B Monetization
════════════════════════════════════

Phases summary:
- Phase 0: Complete (gateway, dedupe, doctrine alignment)
- Phase 1: In progress (SERP purity activation, promise alignment)
- Phase 2: Queued (demand capture, buyer dossier, demo showcase)
- Phase 3: Planned (B2B monetization pilot)
- Phase 4: Planned (gateway optimizations)
- Phase 5: Planned (search intelligence)

Sequential mission order:

Phase 1 — Public Promise & SERP Alignment
P1.1 SERP-PURITY-PROD-ACTIVATION-1 (production deployment)
P1.2 PROMISE-REALITY-ALIGNMENT-1 (public wording)

Phase 2 — Demand Capture & Demo Showcase
P2.1 ALERTS-DEMAND-CAPTURE-MVP-1 (capture intent)
P2.2 BUYER-DOSSIER-LEAD-MVP-1 (qualify leads)
P2.3 DEMO-SHOWCASE-MODE-1 (demo framework)
P2.4 DEMO-PROMOTER-PAGE-1 (example promoter)
P2.5 DEMO-AGENCY-PAGE-1 (example agency)
P2.6 DEMO-INTENT-PAGES-FULL-1 (full intent demos)

Phase 3 — B2B Monetization Pilot
P3.1 SAKAN-PROMOTER-PILOT-OFFER-1 (sales offer)
P3.2 PROMOTER-OUTREACH-10-LEADS-1 (prospecting)
P3.3 FIRST-PAID-PILOT-1 (revenue validation)

Phase 4 — Gateway Optimization (Post-Validation)
P4.1 SEARCH-GATEWAY-INTENT-DETECTION-1 (buy/rent/new/terrain)
P4.2 SEARCH-GATEWAY-QUERY-VARIANTS-1 (query optimization)
P4.3 SEARCH-GATEWAY-RANKING-TUNE-1 (ranking refinement)

Phase 5 — Search Intelligence & Moat
P5.1 USER-PROFILE-SEARCH-MODES-1 (user learning)
P5.2 NEIGHBORHOOD-ATTENTION-POINTS-1 (neighborhood data)
P5.3 RESULT-FIT-SCORE-GATEWAY-1 (fit scoring)
P5.4 SEARCH-UX-RICH-EXPERIENCE-1 (rich experience)
P5.5 DATA-GOVERNANCE-SEARCH-INTELLIGENCE-1 (governance)

Current progress estimate: 28%
- Phase 0: 100% (done)
- Phase 1: 0% (ready to deploy)
- Phase 2: 0% (queued)
- Phase 3-5: 0% (planned)

Next immediate mission:
SERP-PURITY-PROD-ACTIVATION-1 (production deployment of SERP fixes)

====================================================
PARTNER STRUCTURED LISTING STANDARD - APPROVED 2026-07-04
====================================================

Context:
AkarFinder prepares authorized partner supply without becoming a marketplace and without weakening the Search Gateway boundary.

Mission completed:
PARTNER-LISTING-STANDARD-1

Progress:
- Initial roadmap progress estimate: 45%
- Estimated progress after success: 47%

Principle:
Pertinence first. Partner status second. Listing quality third. External source last.

Partner listing requirement:
- A partner must provide structured, authorized and relevant data before receiving enriched or premium display.
- Required foundations: identity, authorization note, transaction, property type, city, district, usable location, price mode, surface, status, media rules, contact rules, description and enrichment permissions.
- District is mandatory.
- Exact public address is allowed only when explicitly authorized.

Quality levels:
- `limited`
- `standard`
- `enriched`
- `premium_ready`

Public labels:
- Informations limitees
- Fiche structuree
- Fiche enrichie
- Presentation premium

Partner vs external web results:
- Authorized partners may display authorized photos, enriched details, neighborhood/proximity/mobility context and partner CTA.
- External web results remain limited: no images, no direct contact, no gallery, original source visible, limited preview only.

Future ranking policy, documented but not implemented:
1. Highly relevant authorized partner results.
2. Promoter partners for new-build / new purchase intent.
3. Premium agencies for classic buy/rent intent.
4. Standard agency partners.
5. External web results without images.

Hard rule:
A partner never outranks a more relevant result only because it is a partner.

Next mission:
PARTNER-RANKING-POLICY-1

====================================================
PARTNER PAGES DEMO EXPERIENCE - PREVIEW 2026-07-04
====================================================

Mission completed:
PARTNER-PAGES-ZILLOW-LIKE-DEMO-EXPERIENCE-1

Progress:
- Initial roadmap progress estimate: 47%
- Estimated progress after preview success: 51%

Deliverable:
Premium demo experience for partner pages:
- promoter page;
- project page;
- phases;
- typologies;
- 2D floor plans;
- model apartment;
- authorized fictional gallery;
- proximity / mobility / neighborhood context;
- agency virtual office;
- structured agency listings;
- demo qualified requests;
- conceptual partner vs external web result stack.

Doctrine:
- Demo only.
- No production deployment.
- No backend.
- No upload.
- No real partner.
- No real WhatsApp.
- No Search Gateway or ranking change.
- External web results remain limited.

Next mission:
PARTNER-RANKING-POLICY-1

====================================================
PARTNER FLOOR PLAN STANDARD - APPROVED 2026-07-04
====================================================

Mission completed:
PARTNER-LISTING-FLOORPLAN-STANDARD-1

Progress:
- Initial roadmap progress estimate: 47%
- Estimated progress after success: 48%

Decision:
AkarFinder adds 2D floor plans as a structured partner-listing standard element, especially for promoter partners, new-build programs, residences, off-plan projects and projects with unit types.

Rules:
- Floor plans must be authorized by the partner.
- If `floor_plan_authorized=false`, AkarFinder must not display the plan.
- Floor plans are presented as partner-provided or partner-authorized documents.
- AkarFinder never presents a floor plan as certified, official, verified or guaranteed by AkarFinder.

Promoter / new-build quality:
- A promoter or new-build project needs an authorized floor-plan signal, including available-on-request mode, to reach `premium_ready`.
- Without floor plan, the listing can remain `standard` or `enriched`.

Agency quality:
- Floor plan is optional.
- It can improve the listing for villas, large apartments, offices and retail spaces.
- It does not block `premium_ready` when the rest of the listing is complete.

Implementation scope:
- Types and pure quality helpers only.
- No upload API.
- No file storage.
- No DB or Supabase change.
- No Search Gateway change.
- No live page change.
- No real ranking change.

Next mission:
PARTNER-RANKING-POLICY-1

## 2026-07-05 — PARTNER-QUALITY-SCORING-POLICY-1 (54% -> 57%)

Fait:
- lib/partners/partner-quality-score-types.ts (sources d'autorisation, intent,
  tiers freshness, composite PartnerQualityScores).
- lib/partners/partner-quality-score.ts (5 scores internes + composite,
  reutilise partner-listing-quality).
- scripts/scrapers/__tests__/partner-quality-score.test.ts (19 tests, integres
  a npm test).
- docs/PARTNER_QUALITY_SCORING.md.

Prochaine mission:
PARTNER-RANKING-POLICY-MVP-1 (57% -> 60%) — moteur de classement isole,
pertinence d'abord, partenaire ensuite, source externe en dernier.

## 2026-07-05 — PARTNER-RANKING-POLICY-MVP-1 (57% -> 60%)

Fait:
- lib/partners/partner-ranking-policy.ts (eligibilite pertinence, tri stable,
  droits d'affichage par source).
- scripts/scrapers/__tests__/partner-ranking-policy.test.ts (9 tests, cas A-E
  + invariants, integres a npm test).
- components/demo/DemoPartnerResultStack.tsx: ordre calcule par le moteur sur
  candidats fictifs (demonstration /demo et /demo/acheter).
- docs/PARTNER_RANKING_POLICY.md.
- Pas de branchement SERP live (Search Gateway gele, decision documentee).

Prochaine mission:
SEARCH-PROFILE-ONBOARDING-MVP-1 (60% -> 64%) — profil de recherche guide,
frontend seulement.

## 2026-07-05 — SEARCH-PROFILE-ONBOARDING-MVP-1 (60% -> 64%)

Fait:
- lib/search-profile/search-profile-types.ts + search-profile-summary.ts
  (types, options, resume pur, lien /search derive).
- components/search-profile/SearchProfileWizard.tsx (8 etapes, reutilise
  OnboardingStepCard, localStorage, branches achat/location/vente).
- app/profil-recherche/page.tsx (statique).
- Entree discrete sur /search (LightZillowSearchShell).
- scripts/scrapers/__tests__/search-profile.test.ts (6 tests, integres a
  npm test).
- E2E mobile Playwright: 8 etapes, resume, localStorage, 0 erreur JS,
  0 overflow.

Prochaine mission:
DEMAND-CAPTURE-MVP-1 (64% -> 68%) — demande qualifiee depuis le profil.

## 2026-07-05 — DEMAND-CAPTURE-MVP-1 (64% -> 68%)

Fait:
- lib/demand/search-demand-profile.ts (type SearchDemandProfile + builder pur,
  gate consentement).
- components/demand/DemandSummaryCard.tsx, QualifiedDemandPreview.tsx,
  DemandCaptureSection.tsx.
- app/demo/demande/page.tsx (demo fictive cote utilisateur + cote partenaire).
- Integration etape 8 du wizard /profil-recherche ("Preparer ma demande
  qualifiee").
- scripts/scrapers/__tests__/search-demand.test.ts (6 tests, integres a
  npm test).
- E2E Playwright: gate consentement (exclu avant / inclus apres), page demo,
  0 erreur JS.

Prochaine mission:
PARTNER-INTAKE-DEMO-KIT-1 (68% -> 70%) — kit partenaire demo.

## 2026-07-05 — PARTNER-INTAKE-DEMO-KIT-1 (68% -> 70%)

Fait:
- app/demo/partenaire/page.tsx (kit partenaire demo, noindex).
- Cartes "Demande qualifiee" et "Kit partenaire" ajoutees au hub /demo.
- Reutilisation de QualifiedDemandPreview et du builder de demande.

Roadmap: 70% atteint (objectif mission AKARFINDER-ROADMAP-TO-70-FABLE-1).

====================================================
ROADMAP-SEARCH-VOLUME-SEO-ALIGNMENT-1 — 2026-07-05
Alignement volume / pertinence / SEO apres le palier 70% preview
====================================================

ETAT ACTUEL (mis a jour 2026-07-05 — ROADMAP-70-PROD-ACTIVATION-1)
* Preview : 70%
* Production : 70% — phases 2-6 deployees et alignees sur la preview
  (dpl_4fi4Hevb9SNmyMty5L1YqvC9gwM4, commit 4f733e6, https://akarfinder.vercel.app)
* SEARCH-GATEWAY-COVERAGE-EXPANSION-1 : code + preview valides 2026-07-05
  (15,1 -> 33,8 resultats/requete, A+B ~75-90%, doctrine conservee).
  Production activee 2026-07-05 (dpl_2KRAr3AmthyheorRAb6pyX3EitYM) — 73% CONFIRME.
* BUY-RENT-SERP-RELEVANCE-TUNING-1 : DEPLOYE EN PRODUCTION (reconcilie
  2026-07-06). Deployment ID dpl_AUwewYE4A3SAWmnCmtqLavNehX13, HEAD
  production c97412b, https://akarfinder.vercel.app.
  Les checks cibles Acheter/Louer sont bons, /listings/137 reste 404,
  doctrine conservee.
  Production CONFIRMEE : 76%.

CONSTAT AUDIT VOLUME (docs/SEARCH_VOLUME_RELEVANCE_AUDIT.md)
* 15,1 resultats moyens par requete Gateway — insuffisant commercialement.
* 10,8 resultats pertinents (A+B) moyens par requete ; taux A+B 71,5%.
* Seulement 6% d'annonces individuelles exploitables ; SERP dominee par les
  pages categories de portails.
* 6 sources actives ; Logic-Immo n'apporte que sa homepage.

STRATEGIE DE VOLUME D'ANNONCES

Sources de volume, par ordre de structure decroissante :
1. Promoteurs Premium — volume neuf structure : projets, tranches,
   typologies, plans 2D, prix/fourchettes, livraison.
2. Agences Gold — volume qualifie avec fiches enrichies.
3. Agences AkarFinder — volume partenaire standard, moins prioritaire
   que Gold.
4. Vendeurs directs structures — annonces proprietaires saisies via
   formulaire strict.
5. Gateway public externe — filet de volume : apercu limite, source
   originale, pas d'image, pas de contact, pas de galerie, pas de page
   detail interne pour un resultat externe.

Ordre futur d'affichage :
* Promoteur Premium si correspond au profil/recherche
* Agence Gold si correspond au profil/recherche
* Agence AkarFinder si correspond au profil/recherche
* Vendeur direct structure
* Gateway public externe

Regle centrale :
pertinence d'abord. badge ensuite. qualite de fiche ensuite.
Gateway en fallback volume. Un partenaire non pertinent ne passe jamais
devant un resultat pertinent (moteur deja implemente et teste, non branche).

PRIORITE IMMEDIATE (ordre)
1. Validation humaine du preview 70%
2. Audit volume/pertinence Acheter/Louer — FAIT (baseline 2026-07-05)
3. Nettoyage wording legacy (SimilarListings/ReliabilityBadge hardcodes)
4. Activation production phases 2-6 (ordre explicite requis)
5. Expansion volume Gateway
6. Tuning pertinence Acheter/Louer
7. Ranking partenaire live
8. SEO foundation
9. Pages SEO ville/intention/quartier

TABLEAU DES MISSIONS

Phase | % | Mission | Objectif | Statut | Dependance | Risque | Prod/Preview
A | 70% | SEARCH-VOLUME-RELEVANCE-AUDIT-1 | baseline volume+pertinence | FAIT 2026-07-05 | preview 70% | aucun | preview (read-only)
B | 70->73% | SEARCH-GATEWAY-COVERAGE-EXPANSION-1 | 30-50 resultats/requete : query expansion, load more, diversite sources, filtrage homepages/staging, seuil commercial | FAIT prod 2026-07-05 | audit baseline | cout provider a surveiller | production
C | 73->76% | BUY-RENT-SERP-RELEVANCE-TUNING-1 | achat: vente+neuf compatibles ; location: jamais d'achat ; ville stricte | FAIT PROD 2026-07-06 (dpl_AUwewYE4A3SAWmnCmtqLavNehX13, HEAD c97412b) | B prod + validation preview | variabilite provider sur audit long + bruit long-tail neuf/national | production
D | 76->80% | PARTNER-RANKING-LIVE-INTEGRATION-1 | brancher le moteur ranking partenaire a la SERP live sans casser le Gateway | a faire | B + C + Gateway stable + regles partenaires testees | casser la SERP live | preview puis prod controlee
E | 76->80% | SEO-FOUNDATION-1 | titles/meta, canonical, sitemap, robots, OG, structured data safe, noindex demo verrouille | FAIT PROD 2026-07-06 (dpl_5RGBoAx1avzeGEnicChyYsbX1Wbv, HEAD 7d23eb4) | C prod | sur-indexation pages minces | production
F | 80->82% | MOROCCO-PRICE-LIFESTYLE-REFERENCE-DATASET-1 | referentiel interne Maroc prix/quartiers/lifestyle, internal_only, garde-fous publics, seed V3 | FAIT PROD 2026-07-06 (dpl_8Yy5un5ft3eydfrYnQErqQgHKrNz, HEAD 3755794) | E prod | exposition publique accidentelle de prix | production
G | 82->85% | AKARINFO-PASSPORT-1 | passeport quartier prudent avec labels lifestyle et reperes explicatifs sans prix publics bruts | PREVIEW/CODE CANDIDAT 2026-07-06 | F prod | sur-promesse quartier/prix + preview sans data/provider | preview validee, prod en attente
G2 | 85->87% | FRESHNESS-OBSERVATION-SCORE-1 | lecture prudente de fraicheur/observation sur les resultats Gateway externes, sans promesse de disponibilite, sans persistance reelle (abstraction only) | FAIT PROD 2026-07-06 (dpl_3FFMNJ4tVZH5KM1FfqYM4TA8sKj1, HEAD 36f1743) | G prod | sur-promesse de disponibilite/fiabilite si labels mal filtres ; aucun resultat Gateway reel observable en direct au moment du GO (limitation provider, pas le code) | production
H | 85->88% | PRICE-POSITION-REFERENCE-V2 | logique encadree de position prix, serveur only, sans promesse "prix de marche" | a faire | F | wording prix trop agressif | preview puis prod
I | 88->91% | SEO-CITY-INTENT-PAGES-1 | pages editoriales ville x intention + moteur integre | a faire | E | contenu mince | prod
J | 91->94% | SEO-NEIGHBORHOOD-GUIDES-1 | guides quartiers Maroc avec lifestyle prudent et reperes non contractuels | a faire | F + I | maintenance contenu | prod
K | 94->96% | SMART-ALERTS-PROFILE-MATCHING-1 | alertes basees profil, pas seulement mots-cles | a faire | profil recherche (fait) | volume alertes | preview puis prod
L | 96->98% | MOROCCO-FINANCING-SIMULATOR-1 | simulateur credit/frais Maroc indicatif | a faire | aucun | wording financier prudent obligatoire | prod
M | 98->99% | COLLABORATIVE-FAMILY-SEARCH-1 | favoris, notes, shortlist familiale | a faire | favoris existants | scope creep | preview puis prod
N | 99->100% | AI-SEARCH-ASSISTANT-1 | assistant IA encadre pour expliquer compromis et guider | a faire | K-M | hallucination/wording, cadrage strict | preview puis prod

NOTE : cette mise a jour ne modifie ni Search Gateway, ni ranking live,
ni DB. Elle documente l'ordre de marche. Chaque mission garde ses gates
(tests, build, scans doctrine, commit separe).

## 2026-07-06 — SEO-FOUNDATION-1

Fondation SEO technique mise en place : sitemap (`/`, `/pro`,
`/profil-recherche` uniquement), robots.txt pointant vers le sitemap,
metadata globale (title/description/OG/twitter), canonical sur les 3 routes
publiques, structured data prudent (Organization + WebSite/SearchAction),
`/search` confirme noindex,follow (decision documentee dans
docs/SEO_FOUNDATION.md), `/demo/**` deja noindex,nofollow (aucune
modification necessaire). Correction d'une incoherence preexistante :
`metadataBase` pointait vers `https://akarfinder.ma` (domaine non branche) et
a ete corrige vers `https://akarfinder.vercel.app` (URL reellement servie).
Aucune modification Search Gateway, ranking, DB ou Supabase.

**Reconciliation roadmap (2026-07-06, apres verification par Achraf)** :
BUY-RENT-SERP-RELEVANCE-TUNING-1 est confirme deploye en production
(Deployment ID dpl_AUwewYE4A3SAWmnCmtqLavNehX13, HEAD production c97412b,
https://akarfinder.vercel.app). L'ecart signale precedemment dans cette
section (73% reel vs 76% cite) est resolu : la production etait deja a 76%
avant le debut de SEO-FOUNDATION-1, le "73%" documente au 2026-07-05 etait
perime des la promotion prod de BUY-RENT-SERP-RELEVANCE-TUNING-1.

Etat reconcilie :
- Production avant SEO-FOUNDATION-1 : 76% (BUY-RENT tuning deploye et
  confirme).
- SEO-FOUNDATION-1 : deploye en production.
- Production actuelle : 80% (Deployment ID dpl_5RGBoAx1avzeGEnicChyYsbX1Wbv,
  HEAD 7d23eb4).

Decision :
- Production : OUI pour SEO-FOUNDATION-1.
- Prochaine mission logique : MOROCCO-PRICE-LIFESTYLE-REFERENCE-DATASET-1.
- Cette nouvelle mission peut atteindre 82% en preview/code, mais la
  production reste a 80% jusqu'au GO prod explicite.

## 2026-07-05 — DEMO-PROMOTER-AGENCY-REALISTIC-MOCKUP-1

Les pages /demo/promoteur et /demo/agence ont ete transformees en mock-ups
commerciaux realistes en preview. La progression production reste inchangee
(73%) tant que non deploye.

## 2026-07-06 â€” SEARCH-GATEWAY-CACHE-1

Etat reconcilie pour cette mission :

* Production actuelle : `87%` (`FRESHNESS-OBSERVATION-SCORE-1` deja en production).
* `SEARCH-GATEWAY-CACHE-1` est valide en code + tests + build + preview.
* Candidat preview/code recommande : `88%`.
* Production doit rester `87%` tant qu'aucun GO prod explicite n'est donne.

Mission :

* Ajouter une couche cache au Search Gateway pour reduire la consommation
  Serper, eviter les appels repetes inutiles, et autoriser un fallback stale
  prudent vers des resultats observes precedemment.

Guardrails :

* ranking Gateway inchange ;
* doctrine Gateway inchangee ;
* aucun contact, aucune galerie, aucun prix dataset dans le cache ;
* aucune migration Supabase appliquee automatiquement ;
* aucun deploiement production dans cette mission.

Livrables :

* `lib/search-gateway-cache/*`
* branchement minimal dans `app/api/search/gateway/route.ts`
* migration revue-only `supabase/migrations/20260706130000_create_search_gateway_cache.sql`
* tests `search-gateway-cache.test.ts`
* doc `docs/SEARCH_GATEWAY_CACHE.md`

Verification :

* `npm test` : OK
* `npm run build` : OK
* preview verifiee :
  `https://akarfinder-h3fojo4vn-achraf-benmoussa-s-projects.vercel.app`
* routes publiques demandees : OK
* `/listings/137` : `404`
* `robots.txt` / `sitemap.xml` : `200`
* Gateway preview : pas de crash meme avec provider degrade

Prochaine etape :

* attendre GO prod explicite si le cache doit passer `87% -> 88%` en
  production ;
* ensuite seulement reprendre la mission suivante.

## 2026-07-06 â€” SIMILAR-PUBLIC-RESULTS-1

Etat reconcilie pour cette mission :

* Production actuelle : `88%`
* `SIMILAR-PUBLIC-RESULTS-1` vise `89%` en preview/code uniquement.
* Production doit rester `88%` tant qu'aucun GO prod explicite n'est donne.

Mission :

* Ajouter une couche "Résultat similaire possible" sur les résultats publics
  Gateway pour aider la comparaison, sans jamais parler de doublon confirmé.

Guardrails :

* aucun changement ranking Gateway ;
* aucun changement cache Gateway ;
* aucune migration ;
* aucun contact, aucune galerie, aucun prix dataset ;
* aucun score numérique public ;
* aucune page interne Gateway.

Livrables :

* `lib/public-result-similarity/*`
* intégration légère `components/search/*` et `components/akarinfo/*`
* documentation dédiée `docs/SIMILAR_PUBLIC_RESULTS.md`
* tests sécurité / logique dédiés

Verification code :

* `npm test` : OK
* `npm run build` : OK
* scan fuite interne public : OK

Prochaine etape :

* preview Vercel puis vérification des routes publiques ;
* production seulement après GO explicite.
