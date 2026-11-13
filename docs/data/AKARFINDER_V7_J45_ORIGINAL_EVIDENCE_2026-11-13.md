# Akarfinder V7 — J4/J5 : contrôle HTML source original (13 novembre 2026)

GOAL : préparer une vérification hors ligne des HTML originaux Avito/Sarouty (J4) et Mubawab/MarocAnnonces (J5), sans prendre les URL candidates pour des fiches réelles.

État réel : cinq HTML originaux de J3 sont exclusivement Agenz ; zéro capture HTML source originale J4/J5 certifiée dans les matériaux disponibles. La tentative J2 Mubawab #8449079 a retourné HTTP200 puis INVALID_RAW_CAPTURE indéterminé ; Avito #59015264 HTTP403. Aucune nouvelle requête aux portails bloqués n'est effectuée ici.

Implémentation : j45_l8_identity.mjs réemploie en lecture seule le véritable adaptLegacyReport et les validateurs de source L8. j45_original_snapshot.py valide la structure de candidat URL-only, l'identité portail/ID/URL via Node, le dossier source.html et source.manifest.json exact SHA256/UTC/HTTP200 et un SHA attendu fourni séparément, puis appelle offline_benchmark pour comparer sept champs à travers les vrais parseurs L4 et V3. Le registre externe du SHA attendu n'est PAS authentifié par ce module ; même après succès, admission privée et publique restent False.

Tests : test_v7_j45_original_snapshot.py couvre les quatre routes avec du HTML synthétique et les refus de faux ID, faux URL, source hors périmètre, faux contenu, absence de pin ou promotion forgée. Ne pas prétendre à une précision réelle d'un site sur une fixture synthétique.

Limites : 0 nouveau HTML original J4/J5 ; aucun droit de fraîcheur/activité, publication, géolocalisation ni unicité physique. Sous-lot de préparation uniquement, J4 et J5 restent ouverts, V7 2/8 jalons.

Aucune collecte réseau, DB, staging, merge, cron live ou Vercel.

NEXT : vérification CI au SHA exact, puis replay de la première archive authentique obtenue via un canal autorisé. Si source bloquée, garder en quarantaine et poursuivre les tâches indépendantes.

## Premier verdict CI et correction ciblée (13 novembre 2026)

Le premier code SHA 8bceb223da64813c388752f6ca488e2f7b3707cd a obtenu 5 workflows SUCCESS mais [V7 run #43405232600](https://github.com/hraaaaf/Akarfinder/actions/runs/43405232600) FAILED : neuf tests du nouveau banc passent, le dixième exigeait un message d'erreur trop tardif sur l'URL Sarouty portant un domaine Avito. La fonction Python URL-only refuse déjà l'usurpation par URL_ONLY_SAFETY_CONTRACT_FAILED avant le validateur Node ; c'est le bon comportement. L'assertion est corrigée, sans assouplissement.

Nouveau garde-fou ajouté : une réponse HTML HTTP200 peut être un CAPTCHA/page de blocage et non une annonce malgré une route valide. Le benchmark remonte maintenant les raisons L4 de classification ; le gate J4/J5 exige une fiche detail et au moins une raison de contenu (structured_listing_type ou listing_fact_density), pas seulement detail_url_pattern. Nouveau test négatif challenge HTML. Cette classification ne vaut toujours pas preuve indépendante des faits.

Nouveau HEAD code et CI : à observer séparément avant de revendiquer PASS.

## Sarouty — Route détail à requête strictement typée (13 novembre 2026)

Le validateur L8 fusionné reconnaît une variante d'annonce individuelle Sarouty /property-details?listing_id=123456, mais le lecteur de manifestes V7 refusait jusqu'ici tout querystring, laissant cette route non testable dans le gate J4. Le contrat de snapshot accepte uniquement la forme Sarouty exacte : chemin /property-details, query unique listing_id=5 à 9 chiffres, domaine Sarouty et HTTPS sans port. Tous les paramètres de tracking, doublons, query sur d'autres routes ou portails restent rejetés. Deux tests supplémentaires sont ajoutés : route admise en analyse hors ligne sans staging, et variantes malicieuses interdites. La route est une preuve syntaxique de type annonce, pas une capture réelle.
