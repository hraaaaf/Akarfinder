PARTNER-CSV-IMPORT-LIGHT-1
==========================

Import CSV partenaire léger — agences et promoteurs immobiliers.

Objectif
--------
Permettre l'ajout rapide d'annonces structurées dans la base canonique
(property_listings + listing_sources) sans créer de nouvelle architecture.
Réutilise le même pipeline d'ingestion que les scrapers existants.

Périmètre strict
----------------
- Aucun changement de schéma DB
- Aucune migration Supabase
- Aucun stockage d'images externes
- Aucun stockage téléphone/email/WhatsApp
- Aucune modification du frontend
- Aucune modification du Search Gateway
- Aucune modification des scrapers avito/mubawab/sarouty

Format CSV
----------

En-têtes (dans l'ordre):
  title, price_mad, city, district, property_type, transaction_type,
  surface_m2, rooms_count, bedrooms_count, bathrooms_count,
  description_snippet, seller_name, source_name, source_url

Champs obligatoires
-------------------
  title              — Titre de l'annonce
  price_mad          — Prix en dirhams (nombre, ex: 1200000)
  city               — Ville (ex: Casablanca, Marrakech, Rabat)
  property_type      — Type de bien (voir valeurs acceptées)
  transaction_type   — Type de transaction (voir valeurs acceptées)
  source_name        — Identifiant partenaire (slug, ex: agence_x)

Note: source_url est obligatoire sauf si source_name est dans la liste
des partenaires internes autorisés (voir INTERNAL_PARTNER_SOURCES dans
scripts/import-partner-csv.ts).

Valeurs acceptées — property_type
----------------------------------
  apartment   — Appartement
  villa       — Villa / Maison
  land        — Terrain
  office      — Bureau
  commercial  — Local commercial
  other       — Autre

Valeurs acceptées — transaction_type
--------------------------------------
  sale   — Vente
  rent   — Location

Règles de rejet
---------------
  - title absent ou < 5 caractères
  - price_mad absent ou < 1000 DH
  - city absente
  - property_type non reconnu
  - transaction_type non reconnu
  - surface_m2 absente pour apartment ou villa
  - surface_m2 < 15 m² pour apartment ou villa
  - source_name absent
  - source_url absent pour source non interne
  - description_snippet contient téléphone, email ou WhatsApp
  - seller_name contient téléphone ou email

Doctrine PII
------------
  Aucun numéro de téléphone (0[5-7]XXXXXXXX, +212XXXXXXXXX) ne peut
  apparaître dans description_snippet ou seller_name. La ligne est rejetée.
  Aucun email ne peut apparaître dans ces champs.
  Toute mention de WhatsApp ou wa.me est rejetée.

  Ces règles sont définitives. Elles protègent contre l'ingestion accidentelle
  d'un annuaire de contacts propriétaires.

Doctrine images
---------------
  Les images ne sont pas importées. Le champ images_count sera null.
  Aucune URL d'image n'est stockée. Aucune image externe n'est référencée.

Déduplication
-------------
  Chaque annonce est identifiée par un canonical_fingerprint basé sur:
    city | property_type | transaction_type | price_bucket | surface_bucket | bedrooms
  
  Deux lignes CSV avec les mêmes valeurs normalisées génèrent le même
  fingerprint — la deuxième mise à jour enrichit l'existante plutôt que
  de créer un doublon.

  Relancer le même CSV est idempotent: aucun doublon créé.

Exemple de commande
-------------------

  # Import standard
  npm run import:partner-csv -- --file ./data/imports/partner.csv --source agence_x

  # Import sans écriture DB (validation uniquement)
  npm run import:partner-csv -- --file ./data/imports/partner.csv --dry-run

  # Avec source de fallback (utilisée si source_name est vide dans le CSV)
  npm run import:partner-csv -- --file ./data/imports/partner.csv --source agence_atlas

Exemple de CSV
--------------

  title,price_mad,city,district,property_type,transaction_type,surface_m2,rooms_count,bedrooms_count,bathrooms_count,description_snippet,seller_name,source_name,source_url
  Appartement lumineux 3 pièces Gauthier,1850000,Casablanca,Gauthier,apartment,sale,110,3,2,2,Bel appartement en étage élevé.,Agence Atlas,agence_atlas,https://agence-atlas.ma/annonces/1
  Villa avec piscine,4200000,Marrakech,,villa,sale,380,8,5,4,,Immobilier du Sud,immo_sud,https://immo-sud.ma/villa-1

Procédure après import local
-----------------------------

  1. Exécuter l'import:
       npm run import:partner-csv -- --file ./data/imports/partner.csv

  2. Vérifier le rapport console:
       - input_rows / valid_rows / rejected_rows
       - Lignes rejetées avec raison

  3. Rapport JSON sauvegardé dans:
       data/imports/reports/partner-csv-import-[timestamp].json

  4. Vérifier dans la DB locale:
       node -e "
         const { DatabaseSync } = require('node:sqlite');
         const db = new DatabaseSync('./scripts/scrapers/output/akarfinder.db');
         const rows = db.prepare('SELECT id, city, property_type, transaction_type FROM property_listings ORDER BY id DESC LIMIT 10').all();
         console.log(rows);
       "

  5. Tester la recherche locale:
       npm run dev
       # Visiter http://localhost:3000/search

Procédure sync Supabase
-----------------------

  Après validation locale:

  1. S'assurer que .env.local contient SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
  2. Lancer la sync:
       npm run sync:supabase
  3. Vérifier les logs:
       [sync] Synced property_listings: X rows
       [sync] Synced listing_sources: X rows

Procédure smoke /search live
-----------------------------

  Après sync:

  1. https://akarfinder.vercel.app/api/search
     → vérifier: source=database, total augmenté
  
  2. https://akarfinder.vercel.app/search
     → vérifier: nouvelles annonces visibles
  
  3. https://akarfinder.vercel.app/search?city=Casablanca
     → vérifier: annonces Casablanca présentes

Fichiers créés
--------------
  scripts/import-partner-csv.ts        — script principal
  scripts/scrapers/__tests__/
    partner-csv-import.test.ts          — tests unitaires
  data/imports/sample-partner.csv      — exemple CSV
  data/imports/reports/               — rapports JSON (gitignored)
  docs/PARTNER_CSV_IMPORT_LIGHT.md    — ce fichier
