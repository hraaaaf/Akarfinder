# V7 J5 — Portails complémentaires : inventaire sourcé

**GOAL :** réutiliser Mubawab (#988 merged) et MarocAnnonces (#992 merged), sans déclarer intégrés Masaken, Immoneuf Avito, Mitula et Portail-Immobilier.

**CODE de préparation :** `scripts/acquisition/v7_parallel/j5_remaining_portals.mjs` importe le vrai `legacy_candidate_bridge.mjs` pour les deux portails existants ; distingue candidates URL et fiches ; inventaire priorisé et explicitement désactivé pour quatre autres sites.

**Risque produit :** Immoneuf (filiale/sous-domaine Avito) et Mitula sont traités comme sources potentiellement miroirs nécessitant l'ID original, pas comme propriétés uniques supplémentaires.

**Tests préparés :** six tests offline ; zéro HTTP/DB, aucune annonce publiée, aucun cron. Les 4 autres portails ne sont pas connectés.

**NEXT :** qualifier une vraie fiche detail pour chacun des 2 portails déjà présents, puis traiter les 4 autres selon preuve de source et rendement, avant staging J6.

## J5 — Contrôle global du volume, déterminisme et provenance (13 novembre 2026)

**Défaut de contrat identifié :** le bridge L8 borne chaque source à **1 000 URLs**, tandis que le pipeline V7 impose **1 000 inputs au total**. Deux rapports valides de 601+400 URLs pouvaient franchir J5 avec **1 001 entrées**. Le nouveau contrat `J5_MAX_RAW_URLS_PER_BATCH=1000` rejette le lot au-delà du maximum **global brut**, doublons compris, sans réduire artificiellement le nombre d'entrées traitées.

**Audit de sortie :** `raw_source_url_count`, `duplicate_raw_url_count`, `candidate_counts_by_source` distinguent URL brutes et candidates uniques par source. Ordre de sortie stable selon les priorités J5 puis ID, quel que soit l'ordre des clés de rapports. Deux garanties affichées par URL : `source_report_authenticated=false` et `original_html_sha256_verified=false`. Ne pas confondre une validation de forme/identité L8 avec capture originale authentifiée. Aucun indice de propriété physique nouvelle, de disponibilité ou de publication déduit.

**Nouveaux tests :** 1001 URLs brutes rejetées / 1000 acceptées, répétitions dédupliquées, ordre invariant et 1001 entrées rejetées même avec de nombreux doublons. Tests synthétiques, 0 réseau/DB. **La CI du nouveau commit est à vérifier** ; ancienne CI [J5 #43335602494](https://github.com/hraaaaf/Akarfinder/actions/runs/43335602494) prouvait seulement les six tests initiaux.

**NEXT :** valider la CI, maintenir les quatre autres portails non intégrés et ne collecter de vrais HTML qu'avec source autorisée ; aucun merge, Vercel, staging ni cron.

## Closeout du sous-lot de durcissement — 13 novembre 2026

**Code exact :** `91c00e5927bf35505b28df783a6724145c902539`. [CI J5 #43400589933](https://github.com/hraaaaf/Akarfinder/actions/runs/43400589933) **SUCCESS, 10/10 tests Node PASS (0 FAIL / 0 SKIP)** ; [CI Policy #43400590398](https://github.com/hraaaaf/Akarfinder/actions/runs/43400590398) **SUCCESS**. Contrôle de code réalisé avec les véritables adaptateurs L8 réutilisés hors ligne, et tests d'entrée adversariaux synthétiques.

**Décision :** le sous-lot de bornage/traçabilité est certifié pour le contrat **URL-only**. Cela ne valide ni HTML d'origine, ni véracité des annonces, ni identité de bien physique, ni disponibilité/fraîcheur, ni droit de publication. Le jalon J5 complet reste **OUVERT**, car les pages originales et un contrôle indépendant des champs ne sont toujours pas établis.

**Aucun effet de bord :** pas de requêtes réseau vers les portails, pas de DB, pas de staging, pas de cron live, pas de merge et aucun déploiement Vercel. Les changements sont uniquement sur la Draft PR.

**NEXT exact :** conserver les sources non qualifiées en quarantaine et reprendre l'audit d'HTML source direct par un canal permis ; à défaut, poursuivre les travaux V7 indépendants, sans promouvoir les URL candidates.

## J5 — Test de passage réel L8 Node → AkarParser V3 (13 novembre 2026)

**GOAL :** prouver que la préparation J5 (Mubawab 600 + MarocAnnonces 400, URLs totalement synthétiques) correspond sans perte aux vrais enregistrements de `legacy_candidate_bridge.mjs` et passe la vérification `v7_multisource.legacy_url_intake.inspect_url_only_candidates` du **vrai** AkarParser V3, tout en restant en quarantaine.

**Ajout :** `scripts/acquisition/__tests__/test_v7_j5_real_v3_handoff.py` exécute en mémoire `assessJ5` et `adaptLegacyReports` via Node, compare les 1000 triplets exacts (portail, ID, URL), et appelle `inspect_url_only_candidates` sur les 1000 vrais objets L8. Troisième test : interdiction des déclarations de date éditoriale ou d'éligibilité au staging. Workflow J5 étendu avec Python 3.11 et BeautifulSoup épinglé, uniquement en PR, sans collecte source ni connexion base.

**Succès à vérifier :** CI au code SHA exact et compte des tests ; le résultat attendu est 1000/1000 `source_snippet_only`, zéro detail, zéro base, aucune admission privée ou publique. Cela **ne prouve aucune présence réelle d'annonces sur les portails**, aucune date de publication, aucune propriété unique, aucune disponibilité. Le corpus est synthétique.

**Gate conservé :** J5 complet demeure ouvert sans HTML original. Pas d'appel HTTP portal, pas de staging, cron live, merge ni Vercel.

## J5 — Cross-language V3 réel : closeout vérifié (13 novembre 2026)

**Code exact vérifié :** `663619debb5069a534ac55edfb0edc316ffabe70` sur PR Draft #1208. [J5 GitHub Actions #43424340573](https://github.com/hraaaaf/Akarfinder/actions/runs/43424340573) **SUCCESS : 10/10 tests Node existants + 3/3 tests Python nouveaux, soit 13/13**, sans échec. [CI Workflow Efficiency Policy #43424340770](https://github.com/hraaaaf/Akarfinder/actions/runs/43424340770) SUCCESS sur le même SHA.

**Preuve métier limitée :** `assessJ5` et `adaptLegacyReports` ont été lancés sur **600 URL Mubawab + 400 URL MarocAnnonces synthétiques**, comparaison exacte des 1000 triplets (portail, ID, URL). Les 1000 vrais objets de contrat L8 ont été acceptés en mémoire par `inspect_url_only_candidates` du réel AkarParser V3 et sont tous restés `source_snippet_only` : **1000/1000 en quarantaine, 0 détails admis, 0 lignes Radar10/DB, 0 accès HTTP source**. Les falsifications `editorial_published_at` et `eligible_for_private_detail_staging=true` ont été rejetées. CI Python 3.11 et dépendance BeautifulSoup épinglée en workflow PR-only.

**Ce que cela ne prouve pas :** aucune des 1000 URL de test ne prouve une annonce actuellement en ligne, ni une archive HTML originale, ni une adresse, ni une donnée métier vérifiée. Ce sous-lot **contrat interopérabilité Node→Python/V3** est clos ; J5 connecteurs physiques reste **OUVERT**, les quatre portails complémentaires toujours non intégrés. Zéro réseau source, aucune écriture extérieure, aucune activation live, cron, SQL réel, staging, merge ou Vercel.

**Séquence restante :** conserver la quarantaine, obtenir une archive originale autorisée et son identifiant source, comparer les sept champs, contrôler la disponibilité/identité géographique indépendamment, puis seulement envisager un gate d'admission privé J6 sous effort élevé. V7 conserve J0/J1 seuls clos = 2/8 jalons.


## J5 — Exemple direct Mubawab et risque de duplication cross-portail (13 novembre 2026)

**Fiche originale visible sur Mubawab :** [Mubawab #8413785](https://www.mubawab.ma/fr/a/8413785/appartement-%C3%A0-vendre-104-m%C2%B2-3-chambres-al-qods-sal%C3%A9). Elle porte la référence commerciale **SAL-TA-1004**, comme la [fiche originale Agenz #444291](https://agenz.ma/fr/annonces/immo-sale/vente-appartements/al-qods/444291), et reproduit une description identique : 104 m², 3 chambres, Al Qods dans le titre et Tabriquet dans la description. Ce recoupement étaye **une même offre publicitaire répliquée entre deux portails**, non deux biens comptables distincts. Il ne constitue ni une attestation géographique indépendante, ni une preuve d'adresse réelle du bien.

**Risques à garder explicitement** : déduplication inter-portails sur identité de l'offre + référence commerciale quand la provenance l'autorise ; éviter de confondre duplication de contenu et certification de la propriété physique, ou de transférer automatiquement le quartier d'un portail à l'autre. La ref peut aussi se répéter, donc ne suffit pas seule à unir des biens physiques. Les 7 champs Mubawab n'ont pas été extraits/rejoués sur HTML brut SHA256/UTC original. Source visible dans un lecteur public seulement. MarocAnnonces reste sans telle fiche réelle qualifiée.

**Statut J5 :** candidat direct de revue documentaire, pas un nouveau connecteur certifié ; **0 admission privée/publique, 0 DB, 0 cron, 0 merge, 0 Vercel**. Next exact = un HTML source Mubawab original archivé et signé + contrôle ID/canonical/7 champs, puis dédup sur preuves réelles avant J6.



## 13/11/2026 — Vérification directe Mubawab #8413785 : fiche redirigée, doublon historique non actualisé

Un lecteur d'origine JS, avec rafraîchissement demandé, a tenté la fiche individuelle https://www.mubawab.ma/fr/a/8413785/appartement-%C3%A0-vendre-104-m%C2%B2-3-chambres-al-qods-sal%C3%A9. **URL finale observée :** https://www.mubawab.ma/fr/sd/sal%C3%A9/el-qods/appartements-a-vendre — une **page de résultats de recherche de quartier**, titre « Appartement à Vendre El Qods, Salé », et non la page individuelle 8413785. Le HTML sémantique renvoyé contient diverses autres offres et NE peut pas servir de source originale de 8413785.

**Conclusion limitée et vérifiée :** la référence SAL-TA-1004 et le texte reproduit d'Agenz constituent au mieux un recoupement documentaire antérieur. La fiche originale Mubawab #8413785 **n'est pas directement vérifiable dans la réponse actuelle**. Cela ne prouve ni la vente ni la disparition ni le même bien physique ; pas de rapprochement géographique certifié. Aucun nouvel original HTTP200/HTML brut signé J5, aucune identité de cette offre autorisée pour staging.

**Action :** garder cette URL en quarantaine avec motif SOURCE_DETAIL_REDIRECTS_TO_SEARCH, sans attribuer au bien 8413785 les prix/attributs des annonces de la page de résultats. Next = utiliser une fiche originale actuellement individuelle Mubawab disponible directement ou un export officiel, puis SHA/UTC + ID/canonical + 7 champs via gate existant. Pas de nouveau scraper ni de contournement, pas d'import/cron/merge/Vercel.



## 13/11/2026 — Deux pages individuelles Mubawab observées via rendu JS source, sans HTML brut

Depuis la page de résultats officielle Mubawab El Qods à Salé, les liens individuels originaux ont été découverts puis interrogés **une seule fois en lecture ponctuelle** par un lecteur JS avec rafraîchissement demandé. Deux URL finales sont restées identiques aux URL de détail d'entrée, et les corps de fiches individuelles (pas une page recherche) ont été réellement rendus :

- **Mubawab #8429897** https://www.mubawab.ma/fr/a/8429897/appartement-%C3%A0-vendre-143-m%C2%B2-2-chambres-al-qods-sal%C3%A9 : **1 595 000 DH**, **143 m²** affichés dans la fiche, 2 chambres, 2 SDB, appartement à vendre, El Qods, Salé ; annonceur **AGENZ**, référence commerciale **SAL-TA-1009**. **Contradictions dans la source** : description parle de **145 m²** contre 143 dans la zone principale ; description mentionne **4e étage** contre **5e étage** dans les caractéristiques. Ne pas choisir l'un des deux sans adjudication.
- **Mubawab #8422456** https://www.mubawab.ma/fr/a/8422456/appartement-%C3%A0-vendre-106-m%C2%B2-3-chambres-al-qods-sal%C3%A9 : **1 350 000 DH**, **106 m²** affichés, 3 chambres, 2 SDB, appartement à vendre, El Qods, Salé ; annonceur **AGENZ**, référence **SAL-TA-1007**. Description mentionne Tabriquet comme secteur ; cela ne contredit pas nécessairement l'arrondissement et n'atteste pas l'adresse réelle.

**Ce qui progresse réellement :** deux détails directs et sept valeurs descriptives consultables chacun (titre/prix/surface/ville/quartier/type/transaction), identité URL finale conservée ; doubles possibilités de diffusion Agenz↔Mubawab à examiner par références commerciales distinctes. **Pas de certification d'identité physique, de fraîcheur ou de provenance autonome** : aucune correspondance indépendante à une fiche Agenz actuelle n'a été démontrée pour SAL-TA-1009 ou SAL-TA-1007.

**Critère de gate J5 non atteint :** contenu retourné = HTML sémantique NETTOYÉ après rendu JS, pas octets HTTP originaux, manifeste source HTML SHA256/UTC et canonical/og:url auto-déclaré non obtenus par ce lecteur. Les deux fiches restent source-observations pour revue, **0 admission privée/publique**. Éviter de placer le contenu sémantique dans un fichier source.html artificiel ou de qualifier le rendu nettoyé de capture originale signée. Next exact : obtenir au moins une vraie capture source Mubawab avec octets/HTTP200, canonique et hachage immuable, valider les 7 champs par J45/V3, arbitrer contradictions de surface/étage, puis dédup multi-portail. Aucun DB/cron/merge/Vercel.


## 13/11/2026 — Deux rapprochements commerciaux J5 vérifiés, garde-fou de revue testé

**GOAL :** empêcher le double comptage des annonces syndiquées Agenz sur Mubawab, sans déduire abusivement qu'une référence commerciale commune prouve l'unicité du bien physique. Ces données sont des observations ponctuelles de pages rendues ; **aucun HTTP original Mubawab avec SHA/UTC n'est certifié**.

**Preuves de comparaison source→miroir, sur des détails individuels visibles :**

- **SAL-TA-1007** : Agenz [détail #77532](https://agenz.ma/fr/annonces/immo-sale/vente-appartements/al-qods/77532) et Mubawab [détail #8422456](https://www.mubawab.ma/fr/a/8422456/appartement-%C3%A0-vendre-106-m%C2%B2-3-chambres-al-qods-sal%C3%A9), tous deux affichant **1 350 000 DH, 106 m², 3 chambres, 2 salles de bain, 2ème étage**, quartier Al Qods affiché / Tabriquet mentionné en description. Même référence commerciale ; deux URLs d'offres distinctes, pas preuve de propriété physique.
- **SAL-TA-1009** : Agenz [détail #175885](https://agenz.ma/fr/annonces/immo-sale/vente-appartements/al-qods/175885) et Mubawab [détail #8429897](https://www.mubawab.ma/fr/a/8429897/appartement-%C3%A0-vendre-143-m%C2%B2-2-chambres-al-qods-sal%C3%A9), tous deux **1 595 000 DH, 143 m² dans les caractéristiques et 2 chambres**. **Contradiction préexistante dès Agenz et répliquée sur Mubawab** : description annonce **145 m² et 4ème étage**, caractéristiques **143 m² et 5ème étage**. Aucun arbitrage automatique ni géolocalisation indépendante.

**Code nouveau** : scripts/acquisition/v7_parallel/j5_commercial_mirror_review.mjs, fonction reviewJ5CommercialCopies sur au plus 20 observations de détails rendus (statut fixed public_rendered_detail_unattested) ; validation stricte des domaines et des URL/ID officiels, de la référence commerciale, des valeurs bornées, du type de preuve ; comparaison inter-portails référence+prix+surface+chambres+ville+quartier. Distingue lien commercial à examiner, référence orpheline, collision de référence ou dérive de champs. Préserve les contradictions surface/étage par offre, **sans affecter la logique d'admission ni la DB**. Son résultat force same_physical_property_verified=false, original_html_of_both_sites_verified=false, eligible_for_private_detail_staging=false, eligible_for_public_admission=false.

**Tests exacts :** [J5 workflow #43479222455](https://github.com/hraaaaf/Akarfinder/actions/runs/43479222455), code SHA e76d0c6cde2b782c8b131fbd51ef036160431b55 : **22/22 tests Node SUCCESS** (10 précédents + 12 nouveaux adversariaux) et **3/3 tests Python V3 SUCCESS** ; [CI Policy #43479222666](https://github.com/hraaaaf/Akarfinder/actions/runs/43479222666) SUCCESS. Source/HTML de ces fixtures sont des observations transcrites et non des octets capturés cryptographiquement ; aucune requête HTTP/DB n'est faite par les tests.

**Succès limité et confirmé :** **2 rapprochements de référence commerciale en attente de vérification d'origine** ; **0 doublon de bien physique certifié, 0 annonce nouvelle admise, 0 original Mubawab certifié**. Les annonces des quatre autres portails J5 restent non intégrées. La PR #1208 reste Draft, sans merge, source-GET, staging, cron, DB externe ni Vercel. **J5 métier OUVERT** et V7 toujours 2/8 jalons clos.

**NEXT exact :** chercher l'export natif ou canal autorisé d'une fiche Mubawab actuelle conservant ses octets HTTP+statut+URL+UTC+SHA, appliquer la gate J45 et les sept labels L4/V3, puis seulement raccorder le contrôle de duplication commerciale à la revue du registre source J6 ; un match de références ne doit pas servir de source d'autorisation.


## 13/11/2026 — Premier original Mubawab HISTORIQUE : Common Crawl WARC vérifié, 0 admission

**GOAL :** sortir de la dépendance à un GET Mubawab ayant échoué deux fois, sans contournement ni prétendre vérifier une annonce actuelle. Inventaire existant en Library : 129 annonces structurées historiques et 934 URLs candidates, sans HTML de détail original. Une fiche individuelle présente dans l'index Common Crawl a été rejouée depuis un WARC public, **sans aucun HTTP direct vers Mubawab**.

**Preuve source exacte** : https://www.mubawab.ma/fr/a/8205911/appartement-de-106m2-bouskoura-ville-verte ; identifiant **8205911**, archivage **CC-MAIN-2026-39** le **2026-09-05T21:01:42Z** ; statut HTTP archivé 200, MIME text/html. Le fichier public Common Crawl possède index offset **767799442**, length **54725**, digest SHA1 **GY5Z4MOTJBFVBIPIOC6QB3ZVJCVF5L3V**. Le Range GET vers data.commoncrawl.org a reçu HTTP206 exact ; archive original.warc.gz **54725 octets**, SHA256 **19b3db36d3f17423c0aa59c0e306e68f3faac434b40aaf4a44f74e29a24afa4a**. Corps HTML original récupéré **341668 octets**, SHA256 **b59bef5a2a206e1182bbbcb72f799a24d3d19905d7ba02d6e307ec3361f78743** ; WARC-Payload-Digest SHA1 vérifié sur les octets et identique à l'index. Manifeste + WARC + index + HTML dans ZIP final **106944 octets**, SHA256 **8701db5a09462f9e895ae46808ba97c990836dcb25a66d8b4e007008e177c7d5**, CRC ZIP PASS.

**Conservation privée** : /AkarFinder/V7/private/AKARFINDER_V7_J5_MUBAWAB_8205911_COMMONCRAWL_WARC_VERIFIE_2026-11-13.zip, Library ID **libfile_dd6a4c19043c81918895fea6dc02fdd5** ; source intermédiaire [GitHub artifact #14083006498](https://github.com/hraaaaf/Akarfinder/actions/runs/43520352338/artifacts/14083006498), conservation 1 jour. **Aucun HTML original dans Git**. Workflow WARC temporaire retiré au commit **ea971666f33f06b3aa1f795de0882a883695affd** pour empêcher les GET répétés.

**Inspection réelle** : fiche **de location** historique, titre « Appartement de 106m2 Bouskoura Ville verte », **9000 DH**, **106 m²**, **2 chambres**, **3 SDB** ; ni link rel=canonical, ni og:url dans HEAD. Ceci est du **HTML brut d'une réponse historique conservée par Common Crawl**, pas un HTTP GET opérateur direct de novembre ni une fiche de vente. **NO-GO** pour J45 direct et staging J6 : absence de canonical et fraîcheur non attestée. Pas de date de publication éditoriale prouvée, géolocalisation ou propriété physique validée, publication autorisée ou disponibilité certifiée. **0 annonce admise.**

**Traçabilité échecs et correctifs** : runs #43519362836/#43519991185 : refus du contrôle GitHub SHA avant réseau ; run #43520137636 : Range WARC obtenu mais parseur rejette doublons d'en-têtes et artefact temporaire non sauvegardé ; run #43520352338 : Range obtenu, WARC compressé sauvegardé même si parseur initial rejette. Analyse des vrais octets hors réseau : WARC-Protocol et Set-Cookie peuvent être répétés légitimement. Correctif **fail-closed** : admettre ces répétitions **non critiques seulement**, rejeter les doublons d'identité, digest et Content-Type.

**Tests** : au code SHA **5b2d405aefb5287ecf9e6483e1e577a977785140**, [CI J5 #43520890267](https://github.com/hraaaaf/Akarfinder/actions/runs/43520890267) **SUCCESS : 22/22 tests Node + 13/13 tests WARC Python + 3/3 tests V3 Python = 38/38**. [CI Policy #43520890248](https://github.com/hraaaaf/Akarfinder/actions/runs/43520890248) **SUCCESS**. Le rejeu et digest complets du WARC historique ont été faits localement sur les originaux, les tests CI permanents utilisant des fixtures synthétiques. Aucune requête réseau site, DB ou source cron dans ces tests.

**Décision :** sous-lot « première vraie archive de contenu Mubawab avec intégrité WARC historique » **acquis**, mais jalon **J5 OUVERT** : capture historique de **location**, sans canonical, aucun original live de **vente** actuel, ni identité géographique/fraîcheur indépendante. Aucune migration/staging/publication/merge/Vercel. V7 = J0/J1 seuls clos **2/8 jalons**. NEXT exact : source native autorisée d'une fiche de vente actuelle, URL/ID/UTC/SHA/canonical et 7 champs, puis J6/J7 sous gates séparés.
