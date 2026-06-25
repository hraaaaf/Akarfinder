PRODUCT.md — AkarFinder Définition Produit
Version : 2026-06-25 — Mise à jour post-P15A

====================================================
ARCHITECTURE PRODUIT — DEUX COUCHES

AkarFinder repose sur deux couches complémentaires :

  AkarFinder Site   = interface utilisateur qui sert l'acheteur, le MRE, le promoteur, l'agence.
  AkarFinder Engine = collecte d'annonces publiques analysées, nettoyage, normalisation,
                      déduplication, scoring, historique et analytics marché.

L'Engine nourrit le Site : comparateur, prix/m² observés, package score, pages quartier,
alertes, dashboards promoteurs et rapports marché.
Wording public : "annonces publiques analysées" — jamais "scraping" dans les interfaces publiques.

AkarFinder n'est pas seulement un moteur de recherche immobilier.
C'est une plateforme d'aide à la décision et de mise en relation qualifiée,
alimentée par un moteur data propriétaire basé sur des annonces publiques analysées.

====================================================
DÉFINITION EN UNE LIGNE

AkarFinder est le moteur de recherche immobilier intelligent du Maroc :
il centralise les annonces, détecte les doublons, score la fiabilité,
et génère des leads qualifiés pour les promoteurs et les agences.

====================================================
PROMESSES

Promesse principale
"Toutes les annonces immobilières du Maroc. Une seule recherche."

Tagline secondaire
"Cherchez moins. Trouvez mieux."

Positionnement produit
Pas un site d'annonces.
Un moteur immobilier avec : fiabilité visible, scoring, carte intelligente,
leads qualifiés, et connexion Sakan Expo.

====================================================
CE QU'EST AKARFINDER

* Un moteur de recherche immobilier multi-sources.
* Un agrégateur de listings normalisé et enrichi.
* Une couche de confiance pour les acheteurs (scoring, badges, doublons).
* Un moteur de leads qualifiés pour les promoteurs.
* Une couche data sur la demande immobilière marocaine.
* L'extension digitale de Sakan Expo.

====================================================
CE QU'N'EST PAS AKARFINDER

* Un site d'agence immobilière luxe.
* Un annuaire généraliste.
* Un portail de petites annonces ouvert à tous dès V1.
* Un scraper sans contrôle qualité.
* Un produit qui copie les marques de sources sans accord.
* Un estimateur officiel de valeur immobilière.

====================================================
PROBLÈME

L'immobilier au Maroc est fragmenté.

Les acheteurs doivent chercher sur :
* des portails immobiliers (Mubawab, Avito, Sarouty, …)
* des sites d'agences
* des pages de promoteurs
* Facebook Marketplace
* des groupes Facebook
* des annonces Google indexées
* des conversations WhatsApp
* des salons / expos

Cela crée :
* des doublons (même bien sur 5 sources)
* des annonces périmées
* des prix flous
* des données incomplètes
* des contacts non fiables
* une perte de temps massive
* une faible confiance globale

====================================================
RÉPONSE PRODUIT

AkarFinder permet de chercher sur toutes les sources en un seul endroit,
avec un score de fiabilité par annonce et des données enrichies.

Le produit :
1. Centralise les listings multi-sources.
2. Normalise les données (prix, surface, ville, type).
3. Détecte les doublons (duplicate_group_id, duplicate_score).
4. Score la fiabilité (reliability_score 0–100, badge, raisons).
5. Calcule le prix/m².
6. Identifie les signaux MRE-friendly.
7. Capture les leads qualifiés.
8. Aide les promoteurs à mesurer la demande.
9. Connecte la recherche en ligne à Sakan Expo.

====================================================
ÉTAT TECHNIQUE ACTUEL (2026-06-23)

Pipeline data (P0–P6) — COMPLÉTÉ ET VALIDÉ
* P0 : scraping public safe (Mubawab validé ; Avito/Sarouty en attente)
* P1 : enrichissement pages détail
* P2 : clean export + quality report + field_confidence
* P3 : ingestion SQLite (scrape_runs, raw_listings, property_listings, listing_sources)
* P4 : API /api/listings + /search wired SQLite + fallback mocks
* P5 : duplicate_group_id, duplicate_score, reliability_score, reliability_badge
* P6 : enrichissement full DB persistant

Frontend (Levels 0–2Z-B) — COMPLÉTÉ
* Homepage premium (moteur de recherche national, Casablanca hero)
* /search Light Zillow Morocco (2 colonnes, filtres, tri, carte statique)
* /listings/[id] dossier de décision (8 blocs, WhatsApp CTA primaire)
* Badges fiabilité, MRE, prix/m², source, fraîcheur
* Fallback mocks propre si DB absente
* Build 0 erreur TypeScript
* 132 tests verts

====================================================
UTILISATEURS CIBLES

1. Acheteurs au Maroc

Cherchent : appartements, villas, terrain, projets neuf, location.
Besoins : recherche rapide, filtres propres, moins de doublons, confiance.

2. Acheteurs MRE (Marocains Résidant à l'Étranger)

Besoins spécifiques :
* Confiance à distance
* Contact WhatsApp direct
* Promoteurs vérifiés
* Clarté du projet (livraison, plan de paiement)
* Comparaison ville / projet
* Visite possible à distance
* Support financement

3. Promoteurs immobiliers

Cible principale de monétisation.
Besoins :
* Leads qualifiés
* Visibilité projets
* Data demande acheteurs
* Suivi post-expo Sakan Expo
* ROI mesurable
* Positionnement premium

4. Agences immobilières

Cible secondaire.
Besoins :
* Visibilité
* Import listings
* Badge vérifié
* Moins de contacts non qualifiés

5. Équipe interne

Besoins :
* Source tracking
* Outils qualité data
* Monitoring doublons
* Monitoring leads
* Insights demande
* Rapports promoteurs
* Performance Sakan Expo

====================================================
GÉOGRAPHIE

AkarFinder couvre tout le Maroc.

Priorité opérationnelle (volume + data)
1. Casablanca
2. Rabat
3. Tanger
4. Marrakech
5. Agadir
6. Fès
7. Meknès
8. Kénitra
9. Mohammedia
10. El Jadida

Les petites villes sont supportées sans être la priorité opérationnelle.

====================================================
EXPÉRIENCE DE RECHERCHE

Filtres requis
* Ville
* Quartier
* Prix (min / max)
* Surface (min / max)
* Type de bien
* Transaction (Achat / Location / Neuf)
* Fiabilité
* MRE-friendly
* Source
* Récemment mis à jour

Tris disponibles
* Pertinence (défaut)
* Fiabilité décroissante (reliability_score DESC)
* Prix croissant / décroissant
* Surface croissante / décroissante
* Opportunité (score_opportunite DESC — à venir Phase 2)

Exemples de recherches naturelles
* "Appartement Maarif moins de 1M DH"
* "Villa Bouskoura avec piscine"
* "Studio location Rabat Agdal"
* "Projet neuf Casablanca pour MRE"
* "Appartement Tanger proche gare"

====================================================
FICHE ANNONCE (ÉTAT ACTUEL)

Une fiche AkarFinder affiche :
* Photo / visuel (image réelle si disponible, SVG illustratif sinon)
* Titre
* Ville + quartier
* Prix
* Prix/m²
* Surface
* Chambres
* Source + fraîcheur
* Badge fiabilité (élevée / moyenne / faible)
* Badge MRE si applicable
* WhatsApp CTA (primaire)
* Lien source (secondaire)

Dossier de décision (listing detail) — 8 blocs
1. Hero photo avec prix dominant, ville, quartier, prix/m², badges
2. CTA WhatsApp sticky (desktop + mobile bar)
3. Résumé rapide : surface / prix-m² / chambres / type
4. Repère marché indicatif : position du bien (cohérent / élevé / bas), disclaimer
5. Quartier & proximité : indicatif, "à vérifier avant décision"
6. Historique annonce : publiée le, prix initial vs actuel, variation %, source
7. Biens similaires : même quartier / budget / surface
8. Bloc MRE : WhatsApp, lecture à distance, promoteur vérifié si applicable

====================================================
SCORING ET FIABILITÉ

Score de fiabilité (reliability_score — 0 à 100)
Calculé sur : complétude données, fraîcheur, type source, absence de conflit doublon,
cohérence prix/m², disponibilité contact.

Seuils
* 80–100 : Fiabilité élevée (badge vert)
* 50–79  : Fiabilité moyenne (badge orange)
* 0–49   : Fiabilité faible (badge rouge)

Score de doublon (duplicate_score)
Mesure la probabilité qu'une annonce soit un doublon d'une autre.

Score de complétude (data_completeness_score — 0 à 100)
Mesure le remplissage des champs clés : prix, ville, surface, chambres, description, source.

Score d'opportunité (à venir — Phase 2)
Mesure si le prix/m² est en dessous du repère de marché pour la ville/quartier.
Signal : "En dessous du marché", "Dans la moyenne", "Au-dessus du marché".

====================================================
LEADS QUALIFIÉS

Définition d'un lead qualifié AkarFinder
Un lead contient l'intention d'achat, pas seulement un contact.

Champs obligatoires
* Budget min / max
* Ville cible
* Type de bien
* Timeline d'achat
* Statut MRE ou résident
* WhatsApp
* Température (chaud / tiède / froid)

Champs optionnels
* Quartier cible
* Pays de résidence si MRE
* Mode de financement (cash / crédit)
* Listing ou projet associé

Scoring lead
* Chaud : budget clair + ville claire + achat < 3 mois + WhatsApp
* Tiède : budget clair + besoin clair + achat dans 3–6 mois
* Froid : intérêt vague + budget flou + timeline inconnue

====================================================
SYNERGIE SAKAN EXPO

AkarFinder est l'extension digitale de Sakan Expo.

Boucle
Sakan Expo → inventory promoteurs → AkarFinder → leads qualifiés →
data demande → offre Sakan Expo plus forte → meilleur retour promoteur.

Fonctionnalités Sakan Expo
* QR code sur stand → page projet AkarFinder
* Demande brochure / visite
* Lead capture avec source_channel = "sakan_expo"
* Dashboard promoteur post-expo
* Rapport demande expo

====================================================
BENCHMARK POSITIONNEMENT

AkarFinder doit ressentir comme :
* Google Search pour l'immobilier marocain
* SeLoger pour la clarté des listings
* Airbnb pour la fluidité
* Stripe pour la crédibilité
* Intelligence data locale du marché marocain

====================================================
RÈGLES DE CRÉDIBILITÉ

Ne jamais promettre sans preuve.

Interdit
* "Certifié" ou "Garanti" sans process juridique réel
* "+X annonces" sans données vérifiées
* "En temps réel" sans pipeline continu validé
* "Partenaire officiel" sans accord signé
* "Estimation" officielle ou prix de référence légal
* "Zestimate" ou équivalent

Autorisé
* "Sources immobilières analysées"
* "Recherche multi-sources"
* "Doublons détectés"
* "Version bêta"
* "Promoteurs partenaires" (si accord signé)
* "Repère marché indicatif"
* "Annonce vérifiée AkarFinder" uniquement après process de vérification

====================================================
VISION PRODUIT — PACKAGE SCORE (Phases P10)

AkarFinder ne montre pas seulement des annonces.
AkarFinder aide l'utilisateur à comprendre si le bien, le quartier
et le prix forment un bon package.

Ce changement de paradigme est fondamental :

Avant (agrégateur) :
  L'utilisateur voit des annonces. Il filtre. Il compare manuellement.
  Il perd du temps et ne sait pas si l'annonce est fiable.

Après (moteur de décision) :
  AkarFinder analyse 3 dimensions pour chaque bien :
  1. La fiabilité de l'annonce (scoring, doublon, complétude, source)
  2. La vie autour du bien (proximité marocaine : souk, transport, école…)
  3. La cohérence du prix avec le marché observé

  L'utilisateur comprend rapidement :
  "Ce bien est fiable. Le quartier a tout ce qu'il faut. Le prix est cohérent."
  → Bon package.

  Ou :
  "L'annonce est complète, mais le prix est au-dessus du marché."
  → Package correct. À négocier.

Positionnement produit renforcé

* Zillow-like pour la recherche et la navigation multi-sources
* Airbnb/Booking-like pour l'expérience carte et la découverte de quartiers
* AkarFinder trust layer : la couche de confiance propre au marché marocain
  (fiabilité annonce + proximité marocaine + prix observé)

Ce qu'AkarFinder n'est PAS
* Pas un Zillow copié mot pour mot : le modèle marocain est different
  (WhatsApp-first, souk vs supermarché, MRE diaspora, offre en arabe/français)
* Pas un estimateur officiel (jamais "valeur garantie")
* Pas un conseiller financier (AkarFinder informe, ne conseille pas)

Terminologie réservée AkarFinder
* "Score de confiance AkarFinder" — score fiabilité annonce
* "Indice AkarFinder" — score de complétude des données
* "Score vie quotidienne" — score de proximité marocain
* "Prix/m² observé" — prix issu des annonces analysées
* "Package AkarFinder" — synthèse des 3 dimensions

Libellés interdits dans l'interface publique
* "Walk Score" (marque déposée)
* "Zestimate" (marque Zillow)
* "Valeur garantie" / "Prix officiel" / "Estimation certifiée"
* "En temps réel" sans pipeline continu validé
* "Certifié" sans process de vérification réel
* "Position exacte" si la donnée est une approximation quartier/ville

====================================================
AKARFINDER — MOTEUR DE DÉCISION IMMOBILIÈRE (Mise à jour 2026-06-24)

AkarFinder n'est pas uniquement un agrégateur d'annonces.
AkarFinder devient un moteur de décision immobilière marocain.

Couches principales du produit
* Recherche et listings (multi-sources, normalisés, dédupliqués)
* Expérience carte (MapLibre, clusters, markers prix — P10B-REAL complété)
* Couche de confiance et détection de doublons (reliability_score, duplicate_score)
* Proximité adaptée au Maroc (Score vie quotidienne — P10C)
* Prix observés (prix/m² observé — P10D)
* Package score (synthèse des 3 dimensions — P10E)
* Outils Pro pour agences et promoteurs (AkarFinder Pro — P11)
* Distribution Sakan Expo (QR, leads, rapports)
* Plus tard : financement (P12) et assistant IA (P14)

Formule stratégique
Trafic + couche de confiance + package score + leads WhatsApp + AkarFinder Pro
= système d'exploitation immobilier marocain monétisable.

Ce changement de paradigme
Avant (agrégateur) : l'utilisateur voit des annonces, filtre manuellement,
perd du temps, ne sait pas si l'annonce est fiable.

Après (moteur de décision) : AkarFinder analyse 3 dimensions pour chaque bien :
1. Fiabilité de l'annonce (scoring, doublon, complétude, source)
2. Vie autour du bien (proximité marocaine : souk, transport, école…)
3. Cohérence du prix avec le marché observé

L'utilisateur comprend rapidement :
"Ce bien est fiable. Le quartier a tout ce qu'il faut. Le prix est cohérent."
→ Bon package.

Ou : "L'annonce est complète, mais le prix est au-dessus du marché."
→ Package correct. À négocier.

Différenciateur vs Zillow
AkarFinder n'est pas Zillow copié. Le modèle marocain est différent :
* WhatsApp-first (pas de formulaire email anonyme)
* Souk / hanout / mosquée (pas un Walk Score US)
* MRE diaspora (segment premium à distance)
* Sakan Expo B2B acquisition
* Prix observés (pas Zestimate — jamais de valeur garantie)
* Confiance active (le marché marocain a besoin d'un tiers de confiance)

====================================================
TABLEAUX DATA PREMIUM (NOUVEAU — Phase 2)

Sur la homepage et sur /search, AkarFinder peut afficher :
* Prix/m² médian par ville (issues du scraping AkarFinder)
* Nombre d'annonces analysées par ville (données réelles)
* Répartition par type de bien
* Zones les plus actives

Label obligatoire :
"Données indicatives issues de l'analyse AkarFinder — non officielles."

Ce n'est pas une étude de marché officielle.
C'est la donnée du scraping propre, affichée avec transparence.
C'est la différence entre AkarFinder et un simple site d'annonces.
