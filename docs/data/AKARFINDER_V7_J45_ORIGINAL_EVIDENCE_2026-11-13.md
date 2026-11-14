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

## Closeout — contrat de vérification des captures originales J4/J5 (13 novembre 2026)

**Preuve du code exact :** commit `c2a7df04ffb169a971d5db82887397ea512564a3`, [V7 Actions #43405965131](https://github.com/hraaaaf/Akarfinder/actions/runs/43405965131) **SUCCESS** : **13/13 tests J4/J5 PASS**, exécution du véritable validateur L8 et des deux parseurs L4/V3 sur HTML synthétiques ; les tests globaux V7 ont également terminé verts. [J1 replay #43405965450](https://github.com/hraaaaf/Akarfinder/actions/runs/43405965450), [V3 privé #43405965061](https://github.com/hraaaaf/Akarfinder/actions/runs/43405965061), [V3 regression #43405965393](https://github.com/hraaaaf/Akarfinder/actions/runs/43405965393), [CI policy #43405965322](https://github.com/hraaaaf/Akarfinder/actions/runs/43405965322) sont SUCCESS au même SHA. Le run Radar10 #43405965218 était encore IN_PROGRESS au premier contrôle : vérifier séparément avant toute affirmation de succès.

**Résultat contrôlé :** les formes source Avito, Sarouty (y compris /property-details?listing_id strict), Mubawab et MarocAnnonces peuvent alimenter le banc d'audit hors ligne depuis une archive réelle à fournir. Un HTML contenant uniquement un challenge/CAPTCHA et une URL de fiche valide est refusé. La validation du SHA-256 d'un manifeste ne prouve ni authenticité de la capture, ni disponibilité, ni titre/prix exacts sans annotation indépendante. Le pin doit venir d'un registre séparé **non authentifié par ce code**.

**Closeout du sous-lot de préparation seulement :** les 13 tests de contrat passent, mais **0/4 vrais HTML originaux J4/J5** qualifiés ; les jalons J4 et J5 demeurent **ouverts**. Les 5 captures Agenz J3 ne valent pas comme captures d'autres portails. Première CI SHA 8bceb223 (#43405232600) a échoué sur une assertion de message, corrigée sans autoriser d'entrée auparavant refusée. La version suivante 11a4de3 a passé 11/11 (#43405576555), puis le cas Sarouty a été ajouté et testé au SHA ci-dessus.

**Sécurité et décisions :** aucune nouvelle requête source, aucun retry Avito HTTP403, aucune écriture DB, aucune admission, aucun changement de cron, aucun merge, aucun déploiement Vercel. La PR de base #1204 reste Draft ; #1207/#1208 restent des PR empilées de vérification URL-only. V7 continue à **2/8 jalons clôturés** (J0/J1).

**NEXT exact :** prendre la première archive brute de fiche individuelle provenant d'un canal autorisé avec URL, identité de portail, hash et horodatage UTC vérifiables. La comparer aux sept labels source indépendants puis statuer source par source. Sans archive, garder les données en quarantaine et avancer uniquement les autres chantiers autorisés ; ne pas relancer les sites ayant bloqué la requête.

## Confirmation CI définitive du lot de préparation J4/J5

Au **SHA code exact c2a7df04ffb169a971d5db82887397ea512564a3**, les **six workflows** ont fini SUCCESS : V7 #43405965131 (13/13 tests J4/J5), Radar10 #43405965218, V3 regression #43405965393, V3 privé #43405965061, J1 replay #43405965450, CI policy #43405965322. Les 13 tests du nouveau sous-lot sont synthétiques et ne constituent pas une certification de captures originales.

Au **SHA documentaire d9876922adc892f193d84e562cb7df7ea1ee0792**, six workflows supplémentaires ont également fini SUCCESS : V7 #43406198375, Radar10 #43406198374, V3 regression #43406198425, V3 privé #43406198347, J1 replay #43406198348 et CI policy #43406198618.

**Sous-lot terminé** : contrat de vérification technique SHA/URL/ID/L4/V3, avec test contre HTML challenge et route Sarouty bornée. **J4/J5 non clôturés**, car zéro vrai HTML original de leurs portails a été vérifié. Prochaine étape conditionnelle : source externe autorisée délivrant un snapshot brut ; sinon ne pas activer le staging ni les collecteurs.

## Source HTML self-identity (13/11/2026) — préparation supplémentaire

**Contexte vérifié :** le bundle privé J3 consulté contient seulement les cinq archives Agenz (199159 octets). Le tree GitHub #1204 ne contient aucune vraie archive J4/J5, seulement des fixtures de tests et des pages ville Yakeey. Le portail MarocAnnonces a retourné une page `Please wait while your request is being verified` lors d'une consultation publique, et la page Sarouty disponible présente des annonces en liste, pas un fichier HTML original d'annonce individuelle. Ces observations ne permettent **aucune admission** ni affirmation qu'une annonce actuellement affichée ait été capturée en octets.

**Problème de conception découvert :** le validateur du sous-lot J4/J5 liait l'URL d'un candidat au `source.manifest.json`, mais n'exigeait pas que les octets HTML se déclarent eux-mêmes appartenir à cette fiche. Un HTML d'une autre page, associé au bon `source_url` dans un manifeste recalculé, pouvait donc passer les contrôles d'enveloppe et de densité immobilière.

**Correctif hors ligne :** `_HeadSourceIdentity` exige une balise `link rel=canonical` dans le `head` et sa correspondance **exacte** à l'URL candidate/manifest; si des `meta property=og:url` sont présents ils doivent aussi correspondre. Balise dans le corps, absente ou contradictoire : échec fermé. Le URL canonical reste une **déclaration contrôlée par le HTML**, pas une attestation cryptographique de l'origine du document ni une autorisation de réutilisation. Toute variante réelle de canonical (www, slash, UTM) exige revue et test sur une capture fiable plutôt que normalisation spéculative.

**Tests synthétiques ajoutés :** HTML sans canonical, canonical d'une autre fiche, `og:url` contradictoire, fausse balise canonical dans le corps ; les quatre fixtures auparavant employées comportent désormais canonical + OG déclarés, sans prétendre être des sources originales.

**Critère de succès :** CI au SHA code exact ; toujours 0/4 vrais HTML J4/J5 certifiés, aucun déploiement ni collecte live.

## Closeout canonical HTML-source identity — 13 novembre 2026

**Résultat exact de ce sous-lot :** vérification hors ligne de l'URL canonique déclarée dans le document HTML lui-même, complémentaire de l'identité URL/ID L8, du manifeste SHA-256 et des sept comparaisons L4/V3.

**Code testé SHA :** `ef89fc691b2bd732757ec2354690f839a7bf433e`. [GitHub Actions V7 #43407955228](https://github.com/hraaaaf/Akarfinder/actions/runs/43407955228) **SUCCESS, 17/17 tests ciblés** (y compris canonical absent, canonical d'une autre annonce, `og:url` contradictoire et balise canonical dans le corps). **Six workflows SUCCESS au même SHA** : [V7 #43407955228](https://github.com/hraaaaf/Akarfinder/actions/runs/43407955228), [Radar10 #43407955223](https://github.com/hraaaaf/Akarfinder/actions/runs/43407955223), [V3 regression #43407955222](https://github.com/hraaaaf/Akarfinder/actions/runs/43407955222), [V3 privé #43407955348](https://github.com/hraaaaf/Akarfinder/actions/runs/43407955348), [J1 replay #43407955354](https://github.com/hraaaaf/Akarfinder/actions/runs/43407955354), [CI policy #43407955218](https://github.com/hraaaaf/Akarfinder/actions/runs/43407955218).

**Contrat strict :** `<head><link rel=canonical href=...>` doit être présent dans le HTML et coïncider exactement avec l'URL candidate validée ; `<meta property=og:url>` est vérifié s'il existe. Les différences alias `www`, slash et query ne sont pas normalisées par supposition : en cas de divergence, revoir à partir d'un vrai original plutôt que contourner la règle. Une déclaration de la page elle-même peut être forgée, donc `self_declaration_is_independent_proof=false` dans la réponse. Ce contrôle ne prouve ni provenance réseau ni vérité des champs, et n'active pas le staging.

**Contrôle d'inventaire :** dans la Library privée `/AkarFinder/V7/private`, seul le bundle Agenz J3 `AKARFINDER_V7_J3_AGENZ_ARCHIVES_PRIVEES_2026-11-13.zip` est disponible (199159 octets). Le tree GitHub du chantier ne contient pas de HTML original J4/J5. Recherche publique ponctuelle : la page catégorie MarocAnnonces a répondu par challenge `Please wait while your request is being verified` ; les pages Sarouty récupérées sont des catégories, pas des attestations d'annonce individuelle. **Aucune capture HTML originale J4/J5 nouvellement qualifiée : 0/4 portails**, zéro annonce réelle admise. Aucune relance HTTP du blocage Avito ni du challenge MarocAnnonces.

**Statut :** sous-lot de **préparation du gate** clos sur la preuve de CI. Les jalons portails J4 et J5 restent ouverts ; le jalon V7 complet demeure **2/8** (J0 et J1 seulement). Pas de DB réelle, source LIVE, staging, cron actif, merge, publication ou déploiement Vercel.

**Next exact :** obtenir par un canal explicitement autorisé le premier `source.html` original d'une annonce individuelle J4/J5, accompagné de son URL, SHA256, horodatage UTC, et attestation externe de provenance ; faire tourner le gate puis labelliser les sept champs indépendamment. Aucune capture fiable = **NO-GO**, ne pas remplir le manque par un échantillon synthétique.
