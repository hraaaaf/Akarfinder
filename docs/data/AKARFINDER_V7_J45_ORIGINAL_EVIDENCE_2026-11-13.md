# Akarfinder V7 — J4/J5 : contrôle HTML source original (13 novembre 2026)

GOAL : préparer une vérification hors ligne des HTML originaux Avito/Sarouty (J4) et Mubawab/MarocAnnonces (J5), sans prendre les URL candidates pour des fiches réelles.

État réel : cinq HTML originaux de J3 sont exclusivement Agenz ; zéro capture HTML source originale J4/J5 certifiée dans les matériaux disponibles. La tentative J2 Mubawab #8449079 a retourné HTTP200 puis INVALID_RAW_CAPTURE indéterminé ; Avito #59015264 HTTP403. Aucune nouvelle requête aux portails bloqués n'est effectuée ici.

Implémentation : j45_l8_identity.mjs réemploie en lecture seule le véritable adaptLegacyReport et les validateurs de source L8. j45_original_snapshot.py valide la structure de candidat URL-only, l'identité portail/ID/URL via Node, le dossier source.html et source.manifest.json exact SHA256/UTC/HTTP200 et un SHA attendu fourni séparément, puis appelle offline_benchmark pour comparer sept champs à travers les vrais parseurs L4 et V3. Le registre externe du SHA attendu n'est PAS authentifié par ce module ; même après succès, admission privée et publique restent False.

Tests : test_v7_j45_original_snapshot.py couvre les quatre routes avec du HTML synthétique et les refus de faux ID, faux URL, source hors périmètre, faux contenu, absence de pin ou promotion forgée. Ne pas prétendre à une précision réelle d'un site sur une fixture synthétique.

Limites : 0 nouveau HTML original J4/J5 ; aucun droit de fraîcheur/activité, publication, géolocalisation ni unicité physique. Sous-lot de préparation uniquement, J4 et J5 restent ouverts, V7 2/8 jalons.

Aucune collecte réseau, DB, staging, merge, cron live ou Vercel.

NEXT : vérification CI au SHA exact, puis replay de la première archive authentique obtenue via un canal autorisé. Si source bloquée, garder en quarantaine et poursuivre les tâches indépendantes.
