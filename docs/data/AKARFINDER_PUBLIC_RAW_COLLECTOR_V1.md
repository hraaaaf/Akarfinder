# AkarFinder — Collecte RAW publique, isolée par portail (27 octobre 2026)

**Goal** : aspirer les fiches accessibles publiquement en conservant le HTML brut, sans aucune écriture en base. Seules les annonces fraîches et vérifiées pourront ultérieurement être candidates à une admission DB.

**Règle fail-forward** : HTTP 401/403/429 ou challenge CAPTCHA sur un domaine → suspendre ce domaine pendant le lot, poursuivre les autres immédiatement. Un robots.txt bloquant une URL → ignorer cette URL, poursuivre les autres chemins permis. Un robots.txt indisponible → isoler le domaine et poursuivre les autres. Aucun contournement des restrictions d'accès, des CAPTCHA, de l'authentification ou changement d'identité réseau.

**Code** : scripts/acquisition/public-raw-collector-v1.mjs. Liste blanche de domaines immobiliers, HTTPS obligatoire, aucun chemin API/admin/compte/paiement, redirections refusées, fichiers HTML jusqu'à 2,2 Mo, délais entre les requêtes, aucun retry sur blocage. Répartition round-robin entre origines plutôt qu'arrêt global. Maximum 60 URLs par lot ; manifest JSONL avec SHA256, URL, taille, date de collecte, statut.

**RAW privé** : HTML conservé octet pour octet, sous dossier privé local de permissions 0700 et fichier 0600, identifié par empreinte SHA256. Ni les contacts ni les pages brutes ne sont envoyés vers GitHub/Notion. Ce stockage local n'est PAS un stockage durable de production ni chiffré au repos par le collecteur ; monter un volume privé chiffré et une politique d'accès/rétention avant collecte de masse. Les pages peuvent contenir des données personnelles : respecter les droits d'accès et de réutilisation.

**Commande manuelle, à partir des 238 références déjà disponibles** :

node scripts/acquisition/public-raw-collector-v1.mjs --input=docs/data/feenway-next238-origin-reconciled-neon-2026-10-27.jsonl --out=/private/akar-raw-lot01 --limit=48

**Preuve de code** : CI GitHub offline (aucun scraping déclenché par la CI) : scripts/data/__tests__/public-raw-collector-v1.test.mjs. Les tests vérifient la continuité des autres sources après 403/429, challenge, robots, 404/503, SHA du RAW et permissions du stockage.

**Pas d'insertion DB** : 0 appels Neon/Supabase, 0 publication, 0 Vercel. Le pulper garde les statuts review/quarantine ; fraîcheur commerciale réelle, intégrité des cinq champs, unicité physique et droits doivent être démontrés indépendamment avant toute admission.

**Next exact** : CI verte, rattacher un stockage RAW privé durable/chiffré à l'exécution, procéder à une collecte limitée sur sources autorisées et produire un bilan par portail. Accroître les volumes sans confondre URLs, fiches historiques et annonces fraîches.
