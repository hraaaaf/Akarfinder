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


## J4 — Témoin original public Sarouty identifié, 13 novembre 2026

**Témoin candidat en lecture seule**, issu directement du portail Sarouty : [fiche individuelle /acheter/appartement-sale-bab-al-bahr-894012](https://www.sarouty.ma/acheter/appartement-sale-bab-al-bahr-894012/). Le rendu consultable expose un appartement à vendre à Bab al bahr, Salé, **3 500 000 DH, 196 m², 3 chambres, 2 salles de bain**, référence commerciale 3199, agence AYKANA. Ces éléments proviennent du rendu public Sarouty et non d'une archive brute certifiée. Ils ne sont pas injectés dans l'URL-only intake ni réputés disponibles/frais au moment de l'intégration.

**Gate exact restant** : obtenir par le canal source autorisé le HTML original et son manifeste SHA256 + UTC + URL canonique, comparer les 7 champs L4/V3 et vérifier l'identité source 894012 indépendamment de la simple forme d'URL. La page rendue n'est pas un artefact immuable, pas une autorisation de collecte en masse, et aucun marqueur d'admission ne change. Avito HTTP 403 historique non contourné ; Yakeey reste lien historique tiers non intégré.

**Opérations de ce pointage :** consultation publique et documentation seulement, pas de script de collecte source, pas de HTTP GitHub Actions supplémentaire, DB, cron, staging, merge ni déploiement. J4 demeure OUVERT.



## 13/11/2026 — Rectification de la portée du témoin Sarouty

Relecture de la page directe /acheter/appartement-sale-bab-al-bahr-894012/ via lecteur web : seul le pied de page/navigateur apparaît dans le texte retourné, **aucun des prix/surface/chambres attribués précédemment n'y est indépendantement visible** lors de cette lecture. La lecture a été fournie depuis une copie indexée de trois mois, et une récupération réseau directe de l'URL a échoué sur DNS non résolu dans l'environnement local. Ce constat ne démontre ni disparition ni maintien de la fiche : il **annule toute qualification courante de ses champs**.

Statut du témoin : URL à examiner, **0 HTML brut actuel vérifié, 0/7 champs présents et certifiés sur cette nouvelle lecture, 0 admission**. Conserver l'observation historique comme piste non vérifiée, pas comme preuve nouvelle. Aucun contournement de blocage, pas de source GET réussi, pas de DB/cron/merge/Vercel.



## 13/11/2026 — Nouvelle lecture JS fraîche du détail Sarouty : original visible, non archivé brut

Après la lecture textuelle partielle précédemment consignée, un **lecteur de contenu JS rendu avec fraîcheur demandée à zéro** a interrogé la fiche individuelle https://www.sarouty.ma/acheter/appartement-sale-bab-al-bahr-894012/ ; contrairement au rendu textuel précédent, la réponse fournit la section immobilière principale, URL finale identique, canonical et og:url concordants avec l'URL d'entrée, meta robots « index, follow ».

Sept champs effectivement visibles dans le rendu sémantique renvoyé par la source : titre « Appartement 3 ch. 196 m² à vendre Bab al bahr, Sale – 3 500 000 DH », prix **3 500 000 DH**, surface **196 m²**, ville **Salé**, quartier **Bab al bahr**, type **appartement**, transaction **vente**. La fiche annonce 3 chambres, 2 SDB et référence commerciale **3199** (agence AYKANA). Métadonnées du document : publication déclarée 2025-10-28T09:49:57Z, modification déclarée 2026-09-07T10:25:44Z. Ces dates sont des métadonnées déclarées par le portail, **pas une preuve de mise en vente toujours active**.

**Progrès :** 1/1 échantillon Sarouty dispose désormais d'un **rendu sémantique direct et d'une autodéclaration canonique concordante** (observation ponctuelle). **Limite bloquante :** ce contenu est du HTML sémantique NETTOYÉ par un lecteur, pas le HTML brut exact avec HTTP200 + SHA256/UTC immuable exigé par la gate j45_original_snapshot. Impossible de le requalifier en source.html à partir de ce texte sans fabriquer une origine. Aucune qualification d'exactitude terrain, fraîcheur ou unicité, aucune ligne staging. Avito/Yakeey n'ont pas bénéficié de cette lecture.

**NEXT exact** : capture originale Sarouty par un chemin autorisé conservant octets HTTP et manifeste, validation ID/canonical/7 champs par le parseur existant, puis décision de revue. Un échec de fetch/cache par un lecteur ne doit pas écraser la preuve sémantique rendue par un autre ; les deux niveaux de preuve sont distingués. 0 DB, 0 admission, 0 merge, 0 cron live, 0 Vercel.



## 13/11/2026 — Première archive source HTTP Sarouty vérifiée ; échec fermé Mubawab

**PREUVE ORIGINALE, pas synthétique :** [one-shot GitHub #43474551252](https://github.com/hraaaaf/Akarfinder/actions/runs/43474551252), HEAD source ba3c9617ef4df07f6fd45d0f2bd26eaacaff922d ; job Sarouty #894012 SUCCESS de bout en bout. GET HTTPS unique (après contrôle robots.txt positif, sans redirection/retry) sur https://www.sarouty.ma/acheter/appartement-sale-bab-al-bahr-894012/, HTTP200, **183331 vrais octets HTML**, capture UTC **2026-11-13T17:37:19Z**, SHA256 **019a2cf51b6e188270b4a7c9d4f830cc31245fe9d1dbee50ac9e7e9bad12e145**. Le manifeste et verify_evidence PASS. Rejeu j45_original_snapshot PASS : L8 ID exact, canonical et og:url dans head conformes, classification vraie fiche, comparaison L4/V3 des sept champs. Ce dernier test n'autorise **aucun staging** et le SHA n'est toujours pas épinglé par un registre d'attestation indépendant.

**Champs comparés :** L4 et V3 s'accordent sur 7/7 comparaisons de valeurs, mais **6/7 non null** : titre, prix **3 500 000 MAD**, surface **196 m²**, ville Sale, type appartement, transaction vente ; **quartier NULL dans les deux parseurs**. Ne pas annoncer sept champs renseignés ni véracité terrain.

**Intégrité et conservation :** ZIP GitHub [artifact #14062665412](https://github.com/hraaaaf/Akarfinder/actions/runs/43474551252/artifacts/14062665412), 1 jour seulement ; copié, ouvert et contrôlé localement : ZIP SHA256 **e1dff0dcc93c61853977e1dd1be5c65e7d19e0913a15ebd90e77c59473b755c5**, CRC PASS, uniquement source.html (183331 octets) et source.manifest.json (419 octets), SHA originaux égaux au manifeste. **Copie durable privée** dans /AkarFinder/V7/private/AKARFINDER_V7_J4_SAROUTY_894012_SOURCE_ORIGINALE_2026-11-13.zip ; identifiant Library libfile_ab1ff06fb2f881918e6f29ae753bc2bb. Aucun HTML brut ajouté au repo.

**Risque géographique découvert sur vrai HTML :** le JSON-LD RealEstateListing indique addressLocality=Sale et addressRegion=Bab al bahr, mais propose latitude **31.7948264** / longitude **-7.0847231**. Centre-ville de Salé selon [GeoNames](https://www.geonames.org/2537763/sale.html) : **34.05310 / -6.79846** ; distance haversine **environ 252,5 km**. Il s'agit d'une **contradiction de géocodage de la source**, pas d'une coordonnée immobilière certifiée. Ne pas indexer sur carte. Nouveau module strict j45_sarouty_source_geo_audit.py + dix tests adversariaux (y compris cas near=non attesté), workflow J4 adapté ; CI à vérifier.

**Mubawab :** job de capture #8394751 du même run FAILED sur EvidenceError INVALID_RAW_CAPTURE après un GET ayant validé HTTP 200 et le content-type text/html ; la validation des octets n'a pas été franchie. Faute de bytes conservés, impossible de distinguer réponse challenge, taille >2MB ou premier octet non document HTML. **0 original Mubawab certifié**, 0 retry/contournement ; ne pas décrire le run global comme SUCCESS (seul le job Sarouty l'est).

**Anti-relance :** marqueur unique créé au SHA ba3c9617 puis **supprimé** au commit dbc49d1fd05e29caf7abad6378b8eec35dfbddc9, sans second GET ; workflow sans marqueur = étapes source SKIPPED. CI workflow efficiency corrigée par f2b67e75b53be5190be905b7c687e9ec92340913. Aucune DB externe, publication, staging, cron live, merge ni Vercel.

**Décision :** sous-lot Sarouty capture brute + replay hors ligne = preuve concrète acquise ; J4 complet OUVERT (quartier/geo source contradictoire, activité/qualité indépendantes non certifiées), J5 OUVERT. V7 = 2/8 jalons clos. Next exact : vérifier CI du garde-fou source-geo, ensuite corriger seulement les parsers sur données originales si preuve de non-régression ; J5 nouvelle source par canal autorisé sans retry du même endpoint.



## ERRATUM obligatoire — seconde exécution automatique non voulue et neutralisation définitive

**Fait vérifié dans les jobs GitHub, corrige la formulation « un seul GET » du paragraphe précédent :** le premier [run #43474551252](https://github.com/hraaaaf/Akarfinder/actions/runs/43474551252) a exécuté 1 GET original Sarouty + 1 GET original Mubawab. Une modification ultérieure du workflow alors que le marqueur restait dans la différence globale de la PR a déclenché automatiquement le **second** [run #43474887096](https://github.com/hraaaaf/Akarfinder/actions/runs/43474887096). Ses deux jobs ont exécuté chacun une seconde requête source (pas de rerun manuel). C'est un **défaut de conception du déclenchement temporaire** : les filtres de chemin GitHub sur PR n'assurent pas l'unicité par commit du marqueur. L'intention « une tentative par portail » n'a donc pas été respectée : **2 GETs Sarouty, 2 GETs Mubawab** dans les deux runs. Ne jamais déclarer le contraire.

**Impact exact :** seconde capture Sarouty à 2026-11-13T17:40:46Z, **183331 octets et même SHA256 HTML 019a2cf51b6e188270b4a7c9d4f830cc31245fe9d1dbee50ac9e7e9bad12e145** que la première ; elle n'ajoute aucune information source indépendante. [Artifact secondaire #14063215863](https://github.com/hraaaaf/Akarfinder/actions/runs/43474887096/artifacts/14063215863), expiration 1 jour. Seconde tentative Mubawab : **même EvidenceError INVALID_RAW_CAPTURE**, 0 octet archivé/certifié. Aucun blocage technique contourné. La copie durable privée conservée est celle du **premier** artefact, contrôlée localement.

**Arrêt réel effectué :** marqueur d'autorisation **supprimé** au commit dbc49d1fd05e29caf7abad6378b8eec35dfbddc9, puis fichier du workflow temporaire **supprimé du repo** au commit **79d40f181122938c979ed66faa6bfce6da074d7c**. Il n'existe plus de chemin de capture automatique J4/J5 sur cette branche à son HEAD ; il ne faut pas réinstaller un tel workflow sans mécanisme de consommateur unique durable/claim opérateur, vérification de séquence et CI Policy PASS. Aucun autre GET n'a été ordonné.

**Autre défaut détecté et résolu :** [CI Policy #43474550923](https://github.com/hraaaaf/Akarfinder/actions/runs/43474550923) FAILED pour cancel-in-progress=false ; le paramètre a été corrigé puis le workflow de capture entièrement retiré. Les nouveaux tests hors ligne J4 géographie restent en CI indépendante, à vérifier sur HEAD final.

**Aucune fausse promotion :** vrai HTML Sarouty prouvé pour un identifiant, district L4/V3 toujours NULL, coordonnées JSON-LD incohérentes avec Salé, aucun lien d'authentification J6, aucune annonce indexée/écrite/publiee, J4/J5 non clos.
