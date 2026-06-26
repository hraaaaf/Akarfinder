BUSINESS_MODEL.md — AkarFinder Modèle Économique & Stratégie
Version : 2026-06-26 — Mise à jour P17B-0 Cadrage Packs Promoteurs

Note de cohérence avec la roadmap produit
* P17A (Pages promoteurs partenaires) et P17B (Packs promoteurs) sont les features produit
  qui permettent de monétiser la relation promoteur.
* Le Track Data Engine (DATA-A→DATA-H) alimente les dashboards promoteurs et les rapports marché.
* Wording : "données fournies par le promoteur" pour les projets partenaires ;
  "annonces publiques analysées" pour les données AkarFinder.
* Pas de "volume garanti", "leads certifiés" ou "données officielles".

====================================================
POSITIONNEMENT

AkarFinder n'est pas un site d'annonces.
AkarFinder est un moteur de recherche immobilier intelligent.

Différence fondamentale :
* Un site d'annonces monétise les annonceurs.
* Un moteur immobilier monétise la donnée, la fiabilité, et les leads.

Positionnement cible :
"Le Google Search de l'immobilier marocain."
Avec : fiabilité visible, scoring, carte intelligente, WhatsApp-first, et
connexion Sakan Expo.

====================================================
ANALYSE SWOT

FORCES

* Pipeline data propriétaire (P0–P6 : scraping, normalisation, déduplication,
  scoring) — difficile à répliquer rapidement.
* Scoring fiabilité : différenciateur visible dès la V1.
* WhatsApp-first : adapté au marché marocain et au segment MRE.
* Connexion Sakan Expo : canal B2B unique et qualifié.
* Stack moderne (Next.js, TypeScript, SQLite → Supabase) : scalable.
* Pas de dépendance à une seule source : multi-source par design.
* Design premium crédible dès le MVP.

FAIBLESSES

* Volume de données encore limité (scraping Mubawab uniquement en P0).
* Avito et Sarouty bloqués (403 + JS-rendered) : dépendance à des partner feeds.
* Pas encore de canal d'acquisition utilisateur validé.
* Aucun contrat B2B signé à ce stade.
* Coordonnées lat/lng absentes (carte interactive non possible sans geocoding).
* SQLite local → Supabase production non encore migré.
* Équipe bootstrapée : ressources limitées pour le lancement simultané.

OPPORTUNITÉS

* Marché immobilier marocain fragmenté : pas de moteur de référence dominant.
* Segment MRE inexploité : 5+ millions de Marocains à l'étranger achetant au Maroc.
* Sakan Expo : accès direct à l'écosystème promoteurs premium.
* Digitalisation du secteur immobilier marocain en accélération.
* Banques intéressées par le segment crédit immobilier en ligne.
* OPCIM : marché investissement immobilier en croissance.
* Aucun acteur local n'a la combinaison scoring + carte + leads qualifiés.

MENACES

* Mubawab ou Avito pourraient bloquer le scraping (déjà partiellement le cas).
* Un acteur bien financé (startup internationale ou groupe media) pourrait entrer.
* Confiance des acheteurs difficile à construire sans volume réel.
* Législation sur la protection des données au Maroc (CNDP) à surveiller.
* Dépendance aux salons immobiliers (Sakan Expo) si les salons se dématérialisent.

====================================================
ACTEURS À CIBLER

Priorité 1 — Promoteurs immobiliers
* Ont des projets, des budgets, et un besoin mesurable de leads qualifiés.
* Canal d'acquisition : Sakan Expo + approche directe.
* Offre : leads qualifiés + badge vérifié + espace projet + package expo.

Priorité 2 — Agences immobilières premium
* Ont du volume de listings.
* Canal : approche directe (Casablanca, Marrakech, Tanger).
* Offre : import CSV/XML + listings boostés + leads.

Priorité 3 — Banques et organismes de crédit
* Intérêt pour le segment acheteur pré-qualifié.
* Canal : approche commerciale B2B classique.
* Offre : simulateur crédit co-brandé + lead financement.

Priorité 4 — Sakan Expo / salons immobiliers
* Canal de distribution stratégique (accès direct aux promoteurs).
* Offre : package digital Sakan Expo (page projet + QR + leads + rapport).

Priorité 5 — OPCIM / acteurs investissement immobilier
* Niche premium mais forte valeur perçue.
* Offre : données marché + mise en avant produits d'investissement.

Hors scope initial
* Acheteurs particuliers : gratuit au début (génèrent le trafic et les leads).
* Vendeurs particuliers : hors scope V1 (modération, fraude, support trop lourd).

====================================================
MODÈLE ÉCONOMIQUE

COURT TERME — V1 (Phases 1–3, 0–6 mois)

Objectif : prouver la valeur, signer les premiers contrats, pas encore scalé.

Revenus attendus
* Packages promoteurs manuels : offre commerciale one-pager, tarif de test.
* Sakan Expo digital package : 1–3 promoteurs pour la validation.
* Pas de payment automatique — facturation manuelle, virement.

Coûts principaux
* Hébergement Supabase (tier Starter ou Pro).
* Domaine + DNS.
* Eventuellement CDN (Vercel Pro).
* Temps équipe (pas de masse salariale externe au stade initial).

MOYEN TERME — V2 (Phases 4–6, 6–18 mois)

Objectif : premiers vrais revenus récurrents. Typesense + Supabase opérationnels.

Revenus cibles
* Leads qualifiés : prix à la pièce selon température.
  Exemple : lead chaud 150–300 DH / lead tiède 50–100 DH.
* Package promoteur mensuel : 1 500 – 5 000 DH/mois.
  (badge + visibilité + leads + stats)
* Sakan Expo package : 3 000 – 10 000 DH par édition.
* Boosts annonces : 500 – 2 000 DH / campagne.
* Premier partenariat banque : co-branding simulateur crédit.

Objectif mois 12 : 10–20 promoteurs actifs, 50–100 leads/mois.

LONG TERME — V3 (Phases 7–9, 18 mois+)

Objectif : produit scalable, revenus diversifiés, croissance internationale.

Revenus cibles
* SaaS promoteur/agence (abonnements mensuels).
* Commissions sur leads financement (banques partenaires).
* Rapports de marché (data reports pour promoteurs, OPCIM, investisseurs).
* Publicité native premium (événements, lancements de projets, banques).
* Extension internationale (MRE, puis marchés voisins).

====================================================
MATRICE BCG (SIMPLIFIÉE)

Produit / Feature       | Part marché actuelle | Croissance marché
------------------------|----------------------|------------------
Leads qualifiés         | Faible (démarrage)   | TRÈS ÉLEVÉE (immobilier Maroc en croissance)
Badge fiabilité         | Inexistant ailleurs  | ÉLEVÉE (confiance = pain point majeur)
Package Sakan Expo      | Unique               | ÉLEVÉE (salon premium)
Partenariat banques     | Faible               | ÉLEVÉE (crédit immobilier)
Carte interactive       | Inexistant localement| ÉLEVÉE (UX différenciante)
Reports data marché     | Inexistant localement| MOYENNE (niche B2B)

Vedettes (forte part + forte croissance) → Leads qualifiés + Badge fiabilité
Dilemmes (faible part + forte croissance) → Banques + Carte + Reports
Vaches à lait (stable, rentable) → Package Sakan Expo quand établi

====================================================
BARRIÈRES À L'ENTRÉE

Ce que construit AkarFinder qui est difficile à copier :
1. Pipeline data propriétaire P0–P6 (mois de développement + expertise).
2. Scoring fiabilité déterministe et persistant (IP propriétaire).
3. Relation exclusive ou prioritaire avec Sakan Expo.
4. Volume de listings normalisés + historisés (avantage data cumulatif).
5. Confiance acheteurs construite sur la transparence du scoring.

====================================================
COMMENT LA ROADMAP P10 RENFORCE LA MONÉTISATION

La carte interactive (P10B), le score proximité (P10C), le prix observé (P10D)
et le package score (P10E) ne sont pas que des features produit.
Ce sont des leviers de monétisation directs et indirects.

Agences premium mieux mises en avant
* Les agences dont les biens ont un "bon package" (fiabilité + proximité + prix)
  peuvent payer pour que ce badge soit mis en avant dans les résultats.
* Filtre "Agences avec bons packages" → argument de vente B2B.

Promoteurs et package fort
* Un promoteur peut présenter son projet avec le score proximité officiel AkarFinder
  (transport, commerces, écoles à proximité) comme argument de vente.
* AkarFinder devient un tiers de confiance pour qualifier un programme neuf.
* Package score = argument marketing pour les promoteurs premium.

Banques et financement de biens mieux qualifiés
* Un bien avec un package score élevé (annonce fiable + quartier vie + prix cohérent)
  est plus facile à financer pour une banque.
* Partenariat potentiel : "Simulation crédit AkarFinder" pour les biens bien scorés.
* Lead financement qualifié = valeur supérieure pour la banque partenaire.

Publicité native par quartier ou catégorie
* Un commerçant ou un promoteur peut sponsoriser son quartier sur la carte P10B.
* Exemple : "Résidence X — Vue sur mer · Package AkarFinder : Excellent"
  apparaît en marker mis en avant sur la carte de Casablanca côtier.
* Publicité contextuelle (quartier + type de bien + profil acheteur).

Rapports data pour promoteurs et agences
* P10D (prix observé) génère des données de marché exploitables :
  prix/m² par quartier, par type, par période.
* Rapports data vendables à prix premium (promoteurs, banques, institutionnels).
* AkarFinder crée progressivement un actif data rare sur le marché marocain.

Scoring utile pour les MRE (Marocains Résidant à l'Étranger)
* Le package score répond à la question clé des MRE :
  "Est-ce que ce bien, dans ce quartier, à ce prix, vaut le déplacement ?"
* Sans visite possible en amont, le package score devient un outil de confiance critique.
* Argument commercial fort : "AkarFinder, la seule plateforme qui score le bien
  et le quartier pour les acheteurs à distance."

Données marché progressivement plus fortes
* Plus AkarFinder analyse d'annonces, plus ses repères prix/m² sont précis.
* L'avantage concurrentiel data s'accroît avec le temps.
* Les rapports et insights deviennent monétisables à mesure que le volume augmente.
* Effet de réseau data : chaque annonce analysée améliore le scoring de toutes les autres.

====================================================
MONÉTISATION INSPIRÉE ZILLOW — ADAPTATION MAROC (2026-06-24)

Zillow combine : recherche consumer + Premier Agent (publicité agences) +
Zestimate (estimation valeur) + mortgage (crédit). AkarFinder adapte cette
logique sans copier les éléments non pertinents au marché marocain.

Flux de revenus documentés et adaptés

Abonnements Pro (agences, promoteurs)
* Agences premium : import CSV/XML + badge source + leads + analytics
* Promoteurs : page projet + QR Sakan Expo + leads + rapport post-expo
* Prix de test : 1 500–5 000 DH/mois (à valider avec les premiers contrats)

Leads qualifiés (chaud/tiède/froid)
* Lead chaud (budget clair + WhatsApp + achat < 3 mois) : valeur supérieure
* Lead tiède : budget clair + besoin défini + timeline 3–6 mois
* Lead froid : intérêt vague + timeline inconnue
* Source du lead tracée : web / carte / Sakan Expo / QR scan

Boost et placements sponsorisés
* Listings ou projets boostés dans les résultats de recherche et sur la carte
* Label "Sponsorisé" toujours visible — jamais masqué
* Le boost ne cache pas le score de fiabilité réel
* Promoteur ne peut pas payer pour cacher un mauvais score

Package digital Sakan Expo
* Page projet + QR code stand + formulaire brochure/visite + rapport leads
* Source channel = "sakan_expo" tracée dans chaque lead
* Rapport post-événement : leads générés, profils, conversions

Pages projet promoteur
* Profil complet avec typologies, fourchettes de prix, brochures
* Score vie quotidienne du projet (argument marketing tiers crédible)
* Tracking QR scan → leads on-site

Rapports analytics
* Vues, leads, indicateurs de conversion par listing/projet
* Top villes/quartiers par demande
* Distribution package score (argument commercial : "vos biens bien scorés")
* Rapport Sakan Expo post-événement

Publicité native par quartier ou catégorie
* Sponsorisation de quartier sur la carte (P10B)
* Contenu éditorial sponsorisé (pages SEO — P13)
* Ciblage contextuel : quartier + type de bien + profil acheteur

Leads financement bancaire (ultérieur — P12)
* Formulaire de dossier crédit simplifié en lien avec les annonces
* Routing vers banque partenaire
* Commission sur lead financement transmis
* Simulation indicative "à confirmer avec votre banque" — jamais de taux garantis

Rapports data marché (ultérieur)
* Données prix/m² observé par quartier / type / période
* Vendables aux promoteurs, banques, institutionnels
* AkarFinder construit progressivement un actif data rare sur le marché marocain

Règle d'or de la monétisation AkarFinder
La crédibilité est le produit. Aucun flux de revenu ne peut détruire la confiance.
* Boost sponsorisé : toujours labellisé "Sponsorisé", jamais caché
* Score de fiabilité : jamais modifiable par un client payant
* Prix observé : jamais présenté comme prix officiel ou garanti
* Lead : jamais vendu sans consentement explicite de l'acheteur

====================================================
PACKS PROMOTEURS AKARFINDER — CADRAGE V1

Cadré : 2026-06-26 (P17B-0)
Statut de l'offre : cadrage validé, implémentation (P17B full) : Not started
Pricing chiffré : non défini à ce stade — à valider avec les premiers partenaires
Volume de leads : non garanti — jamais promettre un nombre de leads

Pack Starter
Destination : promoteur débutant, 1 projet, découverte AkarFinder.
* Page promoteur dédiée (/promoteurs/[slug])
* 1 page projet (/projets/[slug])
* CTA WhatsApp ou formulaire de rappel
* Formulaire lead simple (nom, téléphone, message, consentement)
* Badge "Projet partenaire"
* Mention "Données fournies par le promoteur"
* Visibilité standard — pas de mise en avant /neuf

Pack Pro
Destination : promoteur actif, plusieurs projets, leads qualifiés.
* Page promoteur dédiée
* Jusqu'à 3 pages projets
* CTA WhatsApp + formulaire lead
* Badge "Projet partenaire" sur tous les projets
* Reporting simple : vues, clics WhatsApp, formulaires envoyés (quand implémenté)
* Mention "Données fournies par le promoteur"

Pack Premium
Destination : promoteur établi, programmes majeurs, visibilité maximale.
* Page promoteur dédiée
* Pages projets étendues
* Mise en avant sur /neuf (bloc "Projets partenaires")
* Landing projet premium + galerie (partner_full uniquement)
* Campagne lead-gen dédiée
* Reporting avancé : leads qualifiés, source, campagne, période
* Export leads (quand implémenté)
* Visibilité renforcée dans les résultats

Pack Expo / Launch
Destination : lancement projet, présence Sakan Expo ou salon.
* Page projet dédiée
* QR code salon → page projet
* Formulaire lead rapide contexte salon
* Reporting post-événement : leads, profils, source="sakan_expo"
* Campagne dédiée pendant l'événement
* Accompagnement lancement commercial AkarFinder
* source_channel = "sakan_expo" tracé sur chaque lead

Matrice des droits

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

Métriques reporting futures (non toutes implémentées à ce stade)
* vues page promoteur
* vues page projet
* clics CTA WhatsApp
* demandes de rappel
* formulaires lead envoyés
* leads qualifiés (chaud / tiède / froid)
* source du lead (web / carte / Sakan Expo / QR / /neuf)
* campagne associée
* QR code salon (source_channel = "sakan_expo")
* période (jour / semaine / mois / post-événement)

Wording autorisé dans l'offre et les rapports
* Projet partenaire · Données fournies par le promoteur
* leads qualifiés · leads consentis · reporting · reporting indicatif
* campagne dédiée · page projet · page promoteur · visibilité renforcée
* biens positionnés · annonces analysées

Wording interdit dans l'offre et les rapports
* leads garantis · ventes garanties · projet vérifié · promoteur certifié
* prix officiel · résultats garantis · exclusivité garantie
* audience certifiée · données officielles · partenaire officiel (sans accord signé)

Dette Data Engine / géo-enrichment (issue carte)
22 biens positionnés sur 82 analysés — ce n'est plus un bug UI.
C'est une dette Data Engine (géo-enrichment, geocoding Nominatim).
À ne pas traiter avant P17B full sauf urgence.
Le produit l'explique correctement avec le badge "X biens positionnés · sur Y annonces analysées".
Traitement futur : DATA-B (collecte) + DATA-C (normalisation) + P10B-DB (geocoding persistant).

Contraintes permanentes packs
* Pas de prix chiffré dans l'interface ou les docs publics avant validation partenaires
* Pas de volume de leads dans les supports commerciaux
* Reporting obligatoirement labellisé "indicatif"
* Score fiabilité : jamais modifiable par un client payant
* Boost sponsorisé : toujours label "Sponsorisé" visible
* Leads : jamais vendus sans consentement explicite

====================================================
RÈGLES DE CRÉDIBILITÉ COMMERCIALE

* Pas de "partenaire officiel" sans accord signé.
* Pas de "badge AkarFinder vérifié" sans process de vérification documenté.
* Pas de stat de volume non vérifiée dans les supports commerciaux.
* Leads vendus uniquement avec consentement explicite de l'acheteur.
* Prix des leads à valider manuellement avant d'automatiser.
* Pas de promesse de ROI sans données pour la prouver.
