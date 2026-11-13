# V7 J4 — Avito, Yakeey, Sarouty : réemploi des anciens connecteurs

**GOAL :** réutiliser les fonctions d'identité Avito (#989 merged) et Sarouty (#990 merged), tout en distinguant Yakeey présent seulement dans le pipeline Kaynly Draft (#1146).

**CODE de préparation :** `scripts/acquisition/v7_parallel/j4_portal_intake.mjs` fait appel au véritable `legacy_candidate_bridge.mjs` pour Avito + Sarouty ; liens Kaynly vers Yakeey sont gardés en quarantaine **third_party_draft_link_only**, sans ID original démontré.

**Frontière :** ce sont des candidates URL, jamais des fiches ; aucune preuve de fraîcheur, de prix ou d'autorisation, aucun contenu en staging privé ni public. Rejet des rapports arrêtés 403/429.

**Tests préparés :** six scénarios offline, CI dédiée. Ne pas interpréter tests verts comme collecte réelle valide.

**NEXT :** captures HTML réelles d'Avito puis Sarouty, URL+ID par source et provenance indépendante Yakeey avant d'envisager une intégration. Aucune activation réseau live, DB, merge, cron ou Vercel.

## Réemploi précis du contrat Yakeey historique Kaynly #1146 (13 novembre 2026)

La [PR Draft #1146](https://github.com/hraaaaf/Akarfinder/pull/1146) possède déjà `scripts/acquisition/kaynly-open-links/collector.py` et un test original pour le lien Yakeey `https://yakeey.com/fr-ma/acheter-appartement-casa-ca5003319`. Le contrat exact `source_links.jsonl` utilise `{"id":"yakeey:ca5003319","platform":"yakeey","url":"...","detail_state":"not_fetched"}`. Il ne s'agit **ni d'une fiche Yakeey observée, ni d'un collecteur direct fusionné** ; la PR historique est toujours Draft.

**Implémentation J4 :** `reviewYakeeyDraftLinks` exige maintenant la forme individuelle `/fr-ma/...-<deux lettres><ID numérique>`, et extrait uniquement un **candidate_source_offer_id_from_url**. `reviewKaynlyDraftRecords` accepte strictement les véritables objets JSONL de #1146 et refuse toute déclaration `detail_state=fetched`, identité discordante, URL trompeuse ou champ supplémentaire. `assessJ4` réunit liens et records en dédup source candidat, mais garde `original_listing_id=null`, `collector_merged=false`, `private_detail_staging=false`, `public_admission=false`. Aucune écriture DB, aucun accès réseau. Quatre nouveaux tests de contrat ajoutés ; les anciens restent conservés.

**Preuve attendue :** CI GitHub J4 sur HEAD exact, non encore évaluée au moment de préparation. **NEXT :** obtenir une page Yakeey originale réellement capturée, puis ID et champs preuve SHA256/UTC, avant admission possible.

## J4 — Durcissement de la fusion des deux flux Yakeey (13 novembre 2026)

**Défaut prouvé par lecture du code :** les deux entrées `yakeeyDraftLinks` et `yakeeyDraftRecords` étaient chacune bornées à 50, mais la fusion de `assessJ4` n'imposait pas de plafond total ; 30+21 identifiants distincts pouvaient donc en créer **51**. Le correctif impose un plafond de **50 candidats uniques après fusion** et rejette tout dépassement par `YAKEEY_COMBINED_CANDIDATE_LIMIT`.

**Provenance :** quand un même ID+URL est présent dans les deux canaux, la sortie `evidence_sources` garde les deux attestations **en tant que liens candidats non vérifiés**. Ce cumul n'authentifie pas la page, ni une identité immobilière réelle, ni le nombre de propriétés uniques. Collision d'un même ID avec deux URLs contradictoires rejetée. Quatre tests supplémentaires : 51 rejetés/50 admis à la revue, provenance des deux canaux sans promotion, collision croisée et canal unique sans faux double comptage.

**Frontière :** Yakeey demeure sans collecteur direct fusionné, Avito/Sarouty demeurent URL-only, HTML originaux absents, 0 accès HTTP/DB/staging/publication. **CI à vérifier sur SHA exact** ; la précédente [CI J4 #43342459480](https://github.com/hraaaaf/Akarfinder/actions/runs/43342459480) prouvait seulement **10/10** scénarios du code précédent.

**NEXT :** vérifier les nouveaux tests et la CI ; traiter les vraies pages sources seulement via flux autorisé, sinon poursuivre J5 en autonomie sans promotion.

## Closeout du sous-lot de durcissement — 13 novembre 2026

**Code exact :** `0d8d701e09e5feaca2d39b3bdb81e7c0268826a6`. [CI J4 #43400406370](https://github.com/hraaaaf/Akarfinder/actions/runs/43400406370) **SUCCESS, 14/14 tests Node PASS (0 FAIL / 0 SKIP)** ; [CI Policy #43400406540](https://github.com/hraaaaf/Akarfinder/actions/runs/43400406540) **SUCCESS**. Contrôle de code réalisé avec les véritables adaptateurs L8 réutilisés hors ligne, et tests d'entrée adversariaux synthétiques.

**Décision :** le sous-lot de bornage/traçabilité est certifié pour le contrat **URL-only**. Cela ne valide ni HTML d'origine, ni véracité des annonces, ni identité de bien physique, ni disponibilité/fraîcheur, ni droit de publication. Le jalon J4 complet reste **OUVERT**, car les pages originales et un contrôle indépendant des champs ne sont toujours pas établis.

**Aucun effet de bord :** pas de requêtes réseau vers les portails, pas de DB, pas de staging, pas de cron live, pas de merge et aucun déploiement Vercel. Les changements sont uniquement sur la Draft PR.

**NEXT exact :** conserver les sources non qualifiées en quarantaine et reprendre l'audit d'HTML source direct par un canal permis ; à défaut, poursuivre les travaux V7 indépendants, sans promouvoir les URL candidates.

## J4 — Contrat multi-portail conforme à la limite réelle du V7 (13 novembre 2026)

**Défaut prouvé par lecture code :** `adaptLegacyReports` ne borne qu'à 1000 **par rapport** : l'ancien `assessJ4` pouvait retourner 601 Avito + 400 Sarouty = 1001 URLs candidates alors que `v7_multisource/legacy_url_intake.py` refuse tout batch dépassant **1000 au total**.

**Correctif sans collecte :** `J4_MAX_RAW_URLS_PER_BATCH=1000` refuse le total **brut soumis**, même si les URL sont répétées, avec code `J4_AGGREGATE_URL_LIMIT`. La sortie `merged_url_only_candidates` a désormais un ordre déterministe Avito→Sarouty puis identifiant croissant. Les métriques `raw_merged_source_url_count`, `duplicate_raw_merged_url_count`, `merged_candidate_counts_by_source` distinguent tentatives brutes et candidats de source dédupliqués. Deux marqueurs explicites `source_report_authenticated=false`, `original_html_sha256_verified=false` protègent contre la confusion entre URL correctement formatée et page originale vérifiée. Les liens Yakeey historiques restent une **liste de quarantaine indépendante non raccordée au V7 L8 intake** et ne deviennent pas des candidats de mise en staging.

**Preuves attendues :** quatre nouveaux tests adversariaux : 1001 refusé/1000 autorisé, refus en présence de répétitions, ordre stable indépendant des clés d'input, et séparation de la quarantaine historique. La CI du commit exact doit confirmer avant tout qualificatif PASS.

**Frontière :** aucun HTTP source, aucune DB réelle, aucune admission V3/Radar10 ou publication, aucun cron live/merge/Vercel. Les portails J4 ne sont pas certifiés par ce seul contrat URL-only ; J4 jalon complet reste ouvert.

## Closeout vérifié : plafond J4 commun Avito + Sarouty, 13 novembre 2026

**Code SHA exact :** `f3d030409650c5fc942ccac97991831250f0a8db`.
**Preuve :** [J4 GitHub Actions #43423554296](https://github.com/hraaaaf/Akarfinder/actions/runs/43423554296) **SUCCESS : 18/18 tests Node (18 PASS, 0 FAIL)**, dont 4 tests supplémentaires de plafond global, répétitions brutes, stabilité du tri et séparation de la voie tierce non intégrée. [CI Workflow Efficiency #43423554294](https://github.com/hraaaaf/Akarfinder/actions/runs/43423554294) **SUCCESS** sur le même SHA. Aucune capture réseau source pendant la CI J4.

**Correction clôturée, bornes précises :** `assessJ4` refuse 1001 liens Avito/Sarouty bruts, accepte 1000 (y compris en présence de duplications), expose les compteurs source et ordonne les URL candidates de façon déterministe. Les URL du canal historique tiers ne sont jamais comptées comme des fiches détaillées ni raccordées à l'intake L8 de 1000 lignes. Les identifiants extraits de l'URL et les deux validateurs L8 demeurent des candidates, non une preuve de vente ni de fraîcheur.

**Décision GO/NOGO :** GO pour la **préparation J4 URL-only** testée ; **NO-GO pour le jalon J4 de collecte/detail réelle**. Absence de HTML d'annonce originale vérifiée, d'attestation indépendante de précision et de droit d'admission ; aucune annonce réelle n'a été ajoutée. J0/J1 restent les seuls jalons V7 clos : 2/8. PR toujours Draft, pas de merge ni DB/staging/cron/Vercel.

**NEXT exact :** traiter une vraie archive de fiche source par canal autorisé puis l'auditer via le gate J4/J5 existant ; dans l'attente, exploiter les contrôles de contrats hors ligne J5. Les lots d'activation J6/J7 exigent une validation sécuritaire et un effort élevé avant toute production.
