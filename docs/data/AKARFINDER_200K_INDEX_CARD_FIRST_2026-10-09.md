# AkarFinder — Acquisition 200K par scraping « result-card-first »

Date : 2026-10-09
Statut : **SPIKE EN COURS — PAS DE PROMOTION D'ANNONCES**

## Décision de cadrage
L'utilisateur veut acquérir massivement par **scraping de pages immobilières publiques**, sans négocier des flux commerciaux. Cette approche **remplace la proposition de pivot commercial / partenariats** du fichier `AKARFINDER_200K_FRESHNESS_FIRST_PIVOT_PROPOSAL_2026-10-09.md` en tant que piste prioritaire. Rien n'est déployé et aucun changement de DB n'est effectué.

## Nouveau Goal
Découvrir et observer en volume des annonces avec URL source, ville, quartier, prix et surface, en parcourant les **pages de résultats**, et non en effectuant une requête par ancienne URL de fiche. Ne compter une annonce dans les 200k finales que si fraîcheur, unicité, droits et champs sont vérifiés.

## Preuve externe initiale (HTML rendu public)
Pages Mubawab vérifiées :
- `https://www.mubawab.ma/fr/st/casablanca/appartements-a-vendre`
- `https://www.mubawab.ma/fr/st/rabat/appartements-a-vendre`
- `https://www.mubawab.ma/fr/sc/appartements-a-vendre`

Les cartes affichent publiquement des prix MAD/DH, quartiers, villes, surfaces, titres et liens individuels. Exemple observé sur la page Casablanca : « Appartement à vendre à Californie », localisation « Californie, Casablanca », 146 m², prix en DH. Les carrousels de **programmes neufs** présentent plusieurs unités différentes : ne pas les confondre avec une annonce individuelle. La page annonce aussi un filtre de tri « Date » dont le paramètre et la fiabilité restent à démontrer.

Robots public `https://www.mubawab.ma/robots.txt` : les routes de catégories utilisées ne figuraient pas dans les exclusions observées le 9 octobre 2026. Le pilote relit robots **à l'exécution** et échoue fermé si inaccessible.

Sources techniques : `https://doc.scrapy.org/en/latest/topics/spiders.html` (SitemapSpider/CrawlSpider), `https://docs.scrapy.org/en/master/topics/autothrottle.html` (politesse), `https://www.rfc-editor.org/rfc/rfc9309.html` (robots), `https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap` (URLs canoniques / lastmod, non preuve d'activité).

## Architecture cible
1. **Discovery rapide** : sitemap et pages de résultats par portail × ville × transaction × type × tri récent autorisé ; identifier la meilleure fragmentation des recherches pour éviter les limites de pagination.
2. **Extraction de carte seule** : collecter l'ID stable, l'URL canonique et les quatre champs uniquement dans la **même carte** ; rejeter groupes de projets, annonces similaires, valeurs contradictoires. Garder état `observed_review`, pas `write_safe` automatiquement.
3. **Delta crawler** : revisiter d'abord les nouvelles cartes ; comparer les IDs / hashes avec le corpus gelé, et prioriser le rendement `nouveaux IDs réellement observés / requêtes`.
4. **Validation ciblée** : contrôler un échantillon de fiches encore accessibles / informations concordantes ; aucune supposition de fraîcheur sur une carte isolée. Contrôles d'arrêt sur redirection, 403, 429, robots ou dérive DOM. Dédup source et cross-source.
5. **Multi-source et scale** : réutiliser la même mécanique sous adaptateurs spécifiques sur les autres portails accessibles avec autorisation et dans les limites de charge. Aucun bypass CAPTCHA, login, blocage IP ou endpoint privé.

## Spike exact
Commit de workflow `69e170ee326d9ca8bcf4cca205713b155ef78844` sur branche `data/200k-fresh-parser-v2`.
- `scripts/data/mubawab-result-cards-v1.mjs` : DOM card scraper, provenance élément unique, identifiant `a:<id>`, champs + contradictions, robots.
- `scripts/data/__tests__/mubawab-result-cards-v1.test.mjs` : cas 5/5 positif, carte mélangeant plusieurs identités, prix/surface contradictoires, projet `pa:`, hôte forgé, quartier absent, robots.
- `scripts/data/mubawab-result-cards-pilot-v1.mjs` : **3 pages catégorie**, pas de requêtes détail, UA identifié, 1250 ms entre pages, pas de cookies ni PII persistés.
- `.github/workflows/mubawab-result-cards-first-pilot.yml` : tests, pilote, artefact `mubawab-card-first-pilot`, DB 0/0. Run initial `37973276661`, dernière observation queued.

## Mesure attendue (NE PAS ANTICIPER)
- `observed_unique_cards` sur 3 pages ;
- `observed_unique_five_field` (présence d'URL, ville, quartier, prix, superficie dans une même carte) ;
- rejets `rejected_mixed`, conflits de prix/surface/localité ;
- part de cartes nouveaux IDs non présentes dans la freeze, à auditer **sans DB** ;
- taux de disponibilité/fraîcheur après test source distinct. Aucun « 200k » extrapolé depuis 3 pages.

## Next exact
Lire CI `37973276661`. Si rouge : corriger les assertions/sélecteurs depuis l'HTML réel, sans inventer les chiffres. Si vert : récupérer l'artefact, comparer les 3 pages, vérifier présence de vrais liens et la proportion de cartes 5 champs. Ensuite mini-expansion par types de bien/transactions et nouvelles villes, contrôle de recency et nouveauté, puis dédup; construire la matrice des portails.


## Premier résultat réel du pilote (run 37973454376)

Run `37973454376` **success** ; artifact `11638116913` examiné :
- Les **3/3** pages catégories demandées ont répondu HTTP 200 et gardé la route catégorie.
- Liens de détail dans ces trois pages : **23 + 32 + 32 = 87** ; **87 identités individuelles distinctes** après contrôle d'appartenance de chaque lien à une seule carte ; **zéro requête individuelle**.
- Quartier et superficie observables dans des cartes réelles, notamment Californie et Ferme Bretonne ; des ID `a:84xxxxx` apparaissent dans les résultats du jour.
- **0/87 à cinq champs**, non par manque des quartiers mais car `price_mad=null` sur les 87 cartes. Cela ne permet **pas** de certifier le rendement final.
- Correctif expérimental pour des valeurs monétaires séparées dans les sous-éléments de la carte (classe price) ; diagnostic booléen qui distingue prix dans carte, parent, grand-parent sans persister les textes/PII.
- Run exact-head le plus récent `37973741392` sur commit `f86521c4784a72e9d51be8617ee0d0d4d9f1229a`, **in_progress** lors du dernier constat. Les runs intermédiaires ne sont pas notre référence.

**Gate critique** : confirmer que le prix appartient à **la même annonce** et non à une carte voisine/programme neuf. Si absent de la carte `listingBox`, inspecter le wrapper DOM réel avant d'autoriser le prix. Ne jamais faire une jointure implicite entre blocs. Maintenir `observed_review` jusqu'au contrôle source actif et dédup.


## Correctif prix et preuve — run 37973741392

- Run exact HEAD `f86521c4784a72e9d51be8617ee0d0d4d9f1229a` : **success**, artifact `11637422426`. 3 pages catégories HTTP 200, **87 annonces individuelles distinctes**, **86/87 = 98,85 % avec les cinq champs présents dans la même carte** (dont 87 prix, 87 surfaces, 86 quartiers, 87 villes). **0 page de détail visitée**.
- Cause du 0/87 initial : les prix étaient répartis dans des sous-éléments des classes `price` ; corriger par `$(card).find('[class*=price]')...`, en conservant le scope de la carte. L'artifact a confirmé la présence du prix dans **87/87 cartes**. Les 8 tests locaux initialement lancés puis la correction robots sont passés (CI verte).
- **Jointure offline par ID source** au `clean-corpus-v4.11-core.jsonl.gz` : **67 IDs absents du gel historique / 87 observés (77,0 %)** ; 20 IDs présents dans l'archive sous une autre URL/slug ; **0 match d'URL canonique strict** — ne pas comparer uniquement les URLs entières.
- L'annonce `a:8360772` avait le quartier absent ; autres 86 avec quartier présenté. Le nombre `86/87` signifie uniquement **champs observés**, pas encore fraîcheur, disponibilité, conformité de republication ni unicité inter-portails.
- Extension ciblée à **8 pages** pour échantillonnage multi-villes/vente/location/maisons, commit workflow `6c0c00aaea7e25b9c11370d06e2c05fa42e53cf7`, run exact **37974096161** dernier état `queued`. Même sécurité robots, zéro détail, zéro DB.

**Next exact** : lire l'artifact du run 37974096161 ; mesurer IDs réellement nouveaux versus gel, taux de 5 champs, collisions/duplicata inter-catégories. Si positif, généraliser l'exploration par catégories vers plusieurs portails selon leurs conditions d'accès ; créer des filtres anti-dup/source-date/présence et un échantillon de validation détail ciblé avant comptage vers 200k.


## Extension multi-villes — run 37974096161 (preuve consolidée)

- **Run** [37974096161](https://github.com/hraaaaf/Akarfinder/actions/runs/37974096161) : **completed/success**, produit HEAD `6c0c00aaea7e25b9c11370d06e2c05fa42e53cf7`, artifact **11638287776** lu directement (JSON + JSONL).
- **8/8 pages catégorie HTTP 200**, 215 IDs de détail `a:<id>` uniques, **187/215 = 86,98 %** présentent les cinq champs dans **la carte source**. Zéro page de détail visitée. DB 0/0.
- Par route : Casablanca vente appartements **23/23**, Rabat vente appartements **31/32**, Casablanca location appartements **32/32**, Rabat location appartements **30/32**, Marrakech vente appartements **22/24**, Tanger vente appartements **8/23**, Agadir vente appartements **11/17**, Casablanca vente maisons **30/32**.
- **Jointure offline à l'archive canonique `10910779576`, par `a:<id>` et non URL brute** : **161/215 IDs absents du gel**, **54/215 déjà présents**. Ce sont des identités nouvelles **par rapport au stock**, pas une preuve de date de publication récente ni d'activité.
- Une grande partie des cartes incomplètes est liée à un **prix absent/à consulter**, et quelques annonces ne présentent pas de quartier. Ne jamais inventer les valeurs manquantes ; exemple de blocage connu `a:8360772` : pas de quartier.
- **Limites probantes :** 187 lignes `observed_review`, pas `CERTIFIED`. La page de résultats peut contenir prix aberrants (outliers), programmes immobiliers, annonces anciennes ou liens dont la destination change ; source `a:` exclut les projets `pa:` mais ne suffit pas à prouver la commercialisation du bien. Aucun déploiement/merge/promotion.
- **Qualité/sécurité :** robots vérifié à chaque run, stop 403/429, 1250 ms entre demandes, données source limitées aux 5 champs + titre et provenance, zéro PII privé/endpoint caché. Les droits de republication doivent être vérifiés avant mise en production.

**Next exact** : utiliser les catégories publiques autorisées pour étendre le graphe des shards ville/quartier/type/transaction sans pagination disallow ; garder dedup stable `source+id`. Sur un échantillon borné de nouvelles identités 5/5, vérifier la présence/identité et la cohérence des champs depuis la page individuelle source (sans parcourir chaque fiche systématiquement) ; audit de fraîcheur et anomalies. Généraliser ensuite vers d'autres portails avec adaptateurs isolés, et mesurer le gain `nouvelles annonces observées / requêtes` avec un gate de source active.
