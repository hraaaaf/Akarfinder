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
