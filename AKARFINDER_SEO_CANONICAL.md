# AKARFINDER SEO CANONICAL

> **Chantier principal : Référencement organique / SEO AkarFinder**
>
> **Rôle de ce fichier :** boussole canonique de reprise. Toute nouvelle session doit lire ce fichier avant d'engager un travail SEO, puis vérifier le repo, le HEAD, la branche/PR éventuelle, la CI et l'état réel du site.

**Statut : ACTIVE — roadmap initialisée, baseline SEO non encore auditée**  
**Dernière mise à jour : 2026-09-04**  
**Repo : `hraaaaf/Akarfinder`**  
**Branche d'initialisation : `chore/seo-canonical`**  
**Base au démarrage : `main` @ `009f2f9fe8d3ccf214026307e7d5ea13e521768e`**

---

## 1. GOAL GLOBAL

Faire du **SEO l'avantage compétitif principal d'AkarFinder** : devenir le moteur immobilier marocain que Google comprend, explore, indexe et recommande mieux que les portails et agrégateurs concurrents sur les requêtes immobilières transactionnelles et informationnelles au Maroc.

AkarFinder ne doit pas seulement avoir un bon moteur interne. Il doit transformer son index immobilier en **surface d'acquisition organique scalable**.

### Succès observable

Le Goal global n'est pas déclaré atteint sur la base d'un nombre de pages indexées.

Il sera prouvé par une combinaison durable de :

- croissance des **impressions organiques non brandées** ;
- croissance des **clics organiques qualifiés** ;
- progression du nombre de requêtes immobilières cibles en **Top 10 / Top 3** ;
- couverture des clusters ville × quartier × type × transaction ;
- bon ratio **pages utiles indexées / pages publiées** ;
- croissance des backlinks/domaines référents vers nos pages data ;
- croissance des recherches de marque `AkarFinder` ;
- trafic organique qui mène réellement vers les annonces et les sources.

### Preuve

Source principale de preuve : **Google Search Console**, complétée par analytics, logs/crawl, SERP observées et tests techniques.

Les objectifs numériques précis seront verrouillés **après le baseline audit**, pas inventés avant de connaître l'état réel.

---

## 2. THÈSE STRATÉGIQUE

Le moat SEO d'AkarFinder doit venir de la combinaison suivante :

**Stock immobilier large + données normalisées + pages utiles uniques + architecture SEO propre + fraîcheur + autorité.**

Ce que nous ne voulons PAS faire : fabriquer des milliers de pages faibles à partir de toutes les combinaisons de filtres.

Ce que nous voulons faire : publier uniquement les pages qui répondent à une vraie intention de recherche et qui disposent d'assez de données pour produire une expérience réellement utile.

### Principe central

> **Une combinaison de filtres n'est pas automatiquement une page SEO.**
>
> Une page devient indexable uniquement si elle mérite réellement d'être trouvée dans Google.

---

## 3. BENCHMARK PRIORITAIRE — KAYNLY

Kaynly est le **benchmark concurrent n°1** du chantier SEO, pas le cap stratégique.

### Faits vérifiés au 2026-09-04

Kaynly se présente comme un index immobilier marocain multi-portails et indique agréger :

- Avito ;
- Mubawab ;
- Sarouty ;
- Yakeey ;
- Noura Immobilier.

Le site affichait environ **100 055 annonces** au relevé du 31 août 2026, avec redirection vers la source d'origine.

Kaynly possède déjà :

- pages ville ;
- pages transaction × ville ;
- pages transaction × ville × type ;
- pages quartier ;
- pages résidence ;
- baromètres de prix ;
- prix médian et prix/m² ;
- comparaison au marché local ;
- dédoublonnage annoncé ;
- maillage interne vers villes/quartiers/résidences ;
- pages d'annonces agrégées reliées à la source.

Exemple vérifié : la page `vente/casablanca` expose volume d'annonces, prix médian, prix/m², répartition par type et aperçu de marché.

### Photos

**Non confirmé à ce stade.** Les pages accessibles au crawler montrent les données de l'annonce et les liens vers la source, mais l'utilisation exacte des photos doit être vérifiée séparément par audit visuel/browser.

### Sources de benchmark

- https://kaynly.com/
- https://kaynly.com/vente/casablanca
- https://kaynly.com/barometre/casablanca

### Règle benchmark

Ne jamais copier mécaniquement Kaynly.

Pour chaque mécanisme observé :

1. comprendre ce qu'ils font ;
2. mesurer si cela fonctionne en SERP ;
3. identifier le gap AkarFinder ;
4. égaler le socle utile ;
5. dépasser sur la qualité, l'UX, les données, la fiabilité et le SEO.

---

## 4. SOURCES SEO DE RÉFÉRENCE

Les décisions techniques doivent être fondées prioritairement sur la documentation officielle Google Search Central et vérifiées contre le comportement observé du site.

Références initiales :

- Navigation à facettes / crawl : https://developers.google.com/search/blog/2024/12/crawling-december-faceted-nav
- Canonicalisation : https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- Sitemaps : https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- Données structurées : https://developers.google.com/search/docs/appearance/structured-data/search-gallery

### Contraintes officielles à respecter

Google confirme notamment que :

- la navigation à facettes peut générer un nombre quasi infini d'URLs et gaspiller le crawl ;
- `rel="canonical"`, redirections et sitemaps sont des signaux de canonicalisation de forces différentes ;
- un sitemap doit privilégier les URLs canoniques que nous souhaitons voir dans Search ;
- les données structurées aident Google à comprendre le contenu, sans garantir un résultat enrichi.

---

# 5. ROADMAP D'EXÉCUTION

L'ordre ci-dessous est le chemin critique. Ne pas sauter directement à la génération de pages.

---

## LOT SEO-0 — BASELINE AUDIT

### Goal

Établir exactement ce que Google peut découvrir, crawler, indexer et comprendre aujourd'hui sur AkarFinder.

### À vérifier

- domaine canonique réellement utilisé ;
- `robots.txt` ;
- sitemap(s) ;
- metadata ;
- canonical tags ;
- SSR / HTML initial ;
- statuts HTTP ;
- redirections ;
- pages `/search` et paramètres ;
- pagination ;
- pages détail annonce ;
- pages ville/quartier/type existantes ;
- données structurées ;
- performance/Core Web Vitals ;
- maillage interne ;
- profondeur de clic ;
- pages orphelines ;
- URLs indexables accidentelles ;
- Search Console si disponible ;
- sitemap soumis et couverture réelle ;
- requêtes/impressions/clics actuels ;
- éventuels problèmes duplicate/canonical/noindex.

### Succès

Une matrice **URL type → crawl → index → canonical → sitemap → rendu → action** existe et chaque problème prioritaire est classé P0/P1/P2.

### Preuve

Crawl/tests HTTP + HTML rendu + Search Console + captures si impact visuel.

---

## LOT SEO-1 — BENCHMARK KAYNLY + SERP MAROC

### Goal

Comprendre précisément les surfaces SEO déjà occupées et les gaps exploitables.

### À auditer

- architecture URL Kaynly ;
- pages ville/quartier/type/résidence ;
- titres/H1/descriptions ;
- profondeur de maillage ;
- nombre approximatif de surfaces indexables ;
- photos ou absence de photos ;
- fraîcheur ;
- données propriétaires ;
- schema.org ;
- sitemaps/robots/canonical ;
- performance ;
- SERP réellement gagnées ;
- concurrents directs : Mubawab, Avito, Sarouty, Yakeey + autres gagnants SERP observés.

### Succès

Une **gap analysis** classe : `Kaynly meilleur / égalité / AkarFinder meilleur / opportunité non couverte`.

### Preuve

SERP + pages inspectées + captures + crawl/documentation.

---

## LOT SEO-2 — QUERY MAP MAROC

### Goal

Construire la carte des intentions immobilières marocaines avant de construire les pages.

### Axes

- transaction : vente / location ;
- type : appartement / villa / terrain / riad / studio / maison / commerce / bureau / etc. ;
- localisation : Maroc → ville → quartier → résidence ;
- intention data : prix/m², prix immobilier, évolution, quartier, comparaison ;
- longue traîne utile ;
- langues réellement demandées : français / arabe / autres seulement si preuve de demande.

### Exemple de clusters

- `appartement à vendre Casablanca`
- `location appartement Rabat`
- `villa Marrakech`
- `appartement Maarif`
- `prix immobilier Casablanca`
- `prix m2 Agdal Rabat`

### Règle

La structure finale vient des **intentions + stock + qualité des données**, pas d'une multiplication combinatoire aveugle.

### Succès

Chaque cluster prioritaire possède : intention, volume relatif si disponible, concurrence, stock AkarFinder, page cible et priorité.

---

## LOT SEO-3 — URL & INDEXATION CONTRACT

### Goal

Définir une architecture d'URLs stable avant de scaler.

### Classes d'URLs attendues

1. **Pages SEO indexables** choisies explicitement.
2. **Pages annonce** si elles apportent une surface utile et légalement exploitable.
3. **Pages data/baromètres**.
4. **Recherche utilisateur `/search`** et filtres avancés non destinés automatiquement à l'index.
5. **Combinaisons faibles / vides / dupliquées** non indexables.

### Gate d'indexabilité

Une landing SEO n'est publiée/indexée que si elle satisfait les dimensions suivantes :

- intention de recherche réelle ;
- stock suffisant ;
- données suffisamment complètes ;
- contenu distinctif ;
- URL canonique stable ;
- maillage interne réel ;
- statut HTTP correct ;
- présence pertinente dans le sitemap.

Le seuil numérique de stock sera déterminé après analyse du baseline et des distributions de données.

### Règle filtres

Prix, surface, chambres, tri, équipements et autres facettes ne doivent pas créer par défaut un espace infini d'URLs crawlables/indexables.

---

## LOT SEO-4 — TEMPLATES DE LANDING PAGES

### Goal

Créer des pages qui méritent réellement leur indexation.

### Contenu minimal cible

Selon le type de page :

- H1 répondant exactement à l'intention ;
- annonces actives pertinentes ;
- nombre d'annonces ;
- fraîcheur / date de relevé ;
- médiane prix ;
- médiane prix/m² si statistiquement fiable ;
- fourchette / distribution utile ;
- quartiers ou types les plus représentés ;
- comparaison avec zone parent ;
- maillage vers pages enfants/parents ;
- provenance et méthodologie des données ;
- liens directs vers les annonces/sources selon le modèle AkarFinder ;
- metadata unique ;
- structured data uniquement si appropriée et conforme.

### Interdit

- texte générique IA du type « Casablanca est une ville dynamique » ;
- paragraphes créés uniquement pour ajouter des mots-clés ;
- pages quasi identiques avec simple substitution de ville ;
- statistiques calculées sur échantillon non fiable sans signalement.

---

## LOT SEO-5 — DATA MOAT

### Goal

Faire des données agrégées AkarFinder une raison de nous citer et de nous rechercher directement.

### Surfaces candidates

- baromètre immobilier par ville ;
- prix/m² par quartier ;
- évolution temporelle lorsque l'historique devient fiable ;
- volume d'offres ;
- fraîcheur du marché ;
- répartition par type ;
- score de qualité/fiabilité des annonces ;
- taux de doublons ;
- sources représentées ;
- comparaison quartiers/villes.

### Règle

Aucune statistique ne doit être publiée comme « marché marocain » si notre couverture ne le permet pas.

Toujours distinguer : **données observées dans l'index AkarFinder** vs vérité exhaustive du marché.

---

## LOT SEO-6 — TECHNICAL SEO FOUNDATION

### Goal

Garantir que l'architecture choisie est crawlable, canonique et rapide.

### Checklist

- robots.txt cohérent ;
- sitemap dynamique ;
- uniquement URLs canoniques pertinentes dans le sitemap ;
- canonical self-reference sur pages indexables ;
- gestion des duplicates ;
- 404/410/redirects des annonces supprimées selon cas ;
- pagination maîtrisée ;
- aucun conflit `noindex` / sitemap ;
- rendu HTML exploitable sans dépendre d'une interaction client ;
- titles/descriptions/H1 uniques ;
- OpenGraph secondaire au SEO mais cohérent ;
- breadcrumbs ;
- structured data validée ;
- performance mobile ;
- images optimisées lorsque nous sommes autorisés à les utiliser ;
- monitoring des erreurs 4xx/5xx.

### Succès

Zéro contradiction connue entre :

**status HTTP ↔ robots ↔ noindex ↔ canonical ↔ sitemap ↔ liens internes.**

---

## LOT SEO-7 — MAILLAGE INTERNE

### Goal

Faire circuler le crawl et l'autorité vers les pages prioritaires sans dépendre uniquement du sitemap.

### Graphe cible

`Maroc → ville → transaction → type → quartier/résidence → annonces`

avec remontée vers parents et recommandations latérales utiles.

### Règle

Une page SEO importante ne doit jamais être orpheline.

---

## LOT SEO-8 — AUTHORITY / BACKLINKS

### Goal

Faire d'AkarFinder une source que d'autres acteurs marocains ont intérêt à citer.

### Priorités

- données/baromètres citables ;
- pages méthodologie transparentes ;
- études périodiques ;
- journalistes immobiliers/économiques ;
- blogs et médias locaux ;
- partenaires/agences/promoteurs lorsque cohérent ;
- outils utiles partageables.

### Règle

Pas d'achat massif de backlinks douteux ni de réseau artificiel.

---

## LOT SEO-9 — SEARCH CONSOLE LOOP

### Goal

Faire du SEO une boucle d'amélioration mesurable, pas un chantier ponctuel.

### Boucle

`Publier → découvrir → indexer → impressions → CTR → position → conversion → corriger → renforcer`

### Analyse récurrente

- pages avec impressions mais CTR faible ;
- positions 4–20 à pousser ;
- requêtes non prévues qui émergent ;
- pages crawlées mais non indexées ;
- pages indexées sans impressions ;
- cannibalisation ;
- canonicals choisis par Google différents de ceux déclarés ;
- erreurs Core Web Vitals ;
- pages gagnantes à décliner seulement si la donnée justifie l'extension.

---

## LOT SEO-10 — SCALE GATES

### Goal

Scaler seulement ce qui a prouvé sa valeur.

### Gate avant expansion

Avant de multiplier un template :

1. pages pilotes crawlables ;
2. indexation observée ;
3. impressions réelles ;
4. absence de duplication/cannibalisation majeure ;
5. données fiables ;
6. maillage correct ;
7. performance acceptable ;
8. preuve qu'une extension du cluster a du sens.

### Principe

**20–40 pages excellentes valent mieux que 10 000 pages faibles.**

Le nombre exact de pages pilotes sera fixé après le query map et l'audit de stock.

---

# 6. DIFFÉRENCIATION AKARFINDER

Kaynly prouve que l'agrégation seule n'est plus différenciante.

AkarFinder doit chercher à dépasser les concurrents sur :

1. **SEO natif** : architecture construite dès le départ pour la recherche organique ;
2. **qualité/normalisation des données** ;
3. **fiabilité et fraîcheur** ;
4. **scoring qualité/fiabilité des annonces** ;
5. **UX de recherche** ;
6. **couverture marché** ;
7. **pages data propriétaires** ;
8. **transparence source/méthode**.

---

# 7. RISQUES À ÉVITER

## R1 — Explosion d'URLs de filtres

Risque : crawl gaspillé + duplicate content + dilution.

Mitigation : URL/indexation contract avant scale.

## R2 — Scaled content pauvre

Risque : milliers de pages presque identiques sans valeur.

Mitigation : gate d'indexabilité + données uniques.

## R3 — Stock insuffisant par page

Risque : landing pages vides/faibles.

Mitigation : seuil de stock/données déterminé par l'audit.

## R4 — Données trompeuses

Risque : publier des « prix du marché » basés sur couverture partielle.

Mitigation : méthodologie + taille d'échantillon + formulation « index AkarFinder ».

## R5 — Dépendance à une source

Risque : perte massive de pages/données si une source disparaît.

Mitigation : architecture source-agnostique et statistiques avec provenance.

## R6 — Cannibalisation

Risque : plusieurs pages attaquent la même intention.

Mitigation : query map + une page canonique par intention principale.

## R7 — Gagner le crawl mais perdre l'utilisateur

Risque : pages optimisées pour Google, médiocres pour la recherche immobilière.

Mitigation : page utile d'abord, SEO ensuite.

---

# 8. RÈGLES DE VALIDATION

Pour toute modification SEO significative :

1. définir Goal / Succès / Preuve ;
2. établir baseline avant changement ;
3. implémenter ;
4. tester localement/preview ;
5. vérifier HTTP + HTML + metadata + canonical + robots + sitemap selon impact ;
6. si UI impactée : BEFORE → Goal visuel → mockup/référence → implémentation → AFTER mêmes viewports → comparaison + tests → score visuel ;
7. documenter uniquement l'état réellement prouvé ;
8. ne jamais déclarer « SEO validé » uniquement parce que le code compile.

### Vercel

**Aucun déploiement Vercel sans autorisation explicite d'Achraf.**

---

# 9. MÉTRIQUES CANONIQUES

À capturer au LOT SEO-0 puis suivre :

### Acquisition

- impressions organiques ;
- clics organiques ;
- CTR ;
- position moyenne ;
- part non brandée ;
- requêtes Top 3 / Top 10 / Top 20.

### Indexation

- pages découvertes ;
- pages crawlées ;
- pages indexées ;
- pages exclues et raisons ;
- pages sitemap indexées ;
- canonicals Google vs déclarées.

### Qualité SEO

- pages avec 0 impression ;
- pages orphelines ;
- duplicate/cannibalisation ;
- erreurs 4xx/5xx ;
- Core Web Vitals ;
- fraîcheur des pages.

### Autorité

- domaines référents ;
- backlinks vers pages data ;
- mentions de marque ;
- recherches brandées.

### Business

- sessions organiques vers résultats/annonces ;
- clics sortants vers sources ;
- taux d'engagement des visiteurs SEO.

---

# 10. ÉTAT ACTUEL CONNU

### Vérifié

- Repo : `hraaaaf/Akarfinder`.
- `main` au démarrage de ce fichier : `009f2f9fe8d3ccf214026307e7d5ea13e521768e`.
- Kaynly est un concurrent/benchmark direct d'agrégation immobilière au Maroc.
- Kaynly expose déjà des pages SEO ville/type/quartier, baromètres et données de marché issues de son index.

### Non encore vérifié dans ce chantier

- état SEO réel d'AkarFinder ;
- Search Console ;
- pages actuellement indexées ;
- performance SERP ;
- qualité actuelle du sitemap/robots/canonicals ;
- photos exactes utilisées par Kaynly ;
- volumes de recherche des clusters ;
- thresholds de stock nécessaires ;
- architecture URL finale.

Aucune conclusion ne doit être inventée sur ces points avant audit.

---

# 11. NEXT EXACT

**LOT SEO-0 — BASELINE AUDIT**

Première action à la reprise :

1. vérifier repo / branche / HEAD / PR / CI ;
2. identifier le domaine LIVE canonique réellement servi ;
3. inspecter `robots.txt`, sitemap(s), metadata/canonical et principales familles d'URLs ;
4. récupérer Search Console si disponible ;
5. produire la matrice baseline ;
6. classer les problèmes P0/P1/P2 ;
7. seulement ensuite verrouiller l'architecture SEO cible.

---

# 12. SÉQUENCE RESTANTE

`SEO-0 Baseline`  
→ `SEO-1 Benchmark Kaynly + SERP`  
→ `SEO-2 Query Map`  
→ `SEO-3 URL & Indexation Contract`  
→ `SEO-4 Landing Templates`  
→ `SEO-5 Data Moat`  
→ `SEO-6 Technical SEO`  
→ `SEO-7 Internal Linking`  
→ `SEO-8 Authority`  
→ `SEO-9 Search Console Loop`  
→ `SEO-10 Scale Gates`  
→ closeout et roadmap suivante.

Les lots peuvent se chevaucher uniquement si le travail parallèle ne dépend pas d'une décision non encore prouvée.

---

# 13. PROTOCOLE DE REPRISE / HANDOVER

Dans une nouvelle conversation :

1. lire `AKARFINDER_SEO_CANONICAL.md` ;
2. vérifier GitHub `main`, branche active, HEAD, PR, CI ;
3. vérifier que le canonique correspond encore au code et aux preuves ;
4. reprendre au **Next exact** ;
5. après chaque lot significatif, mettre à jour : état, preuves, décisions, Next exact et séquence restante.

Ne jamais réécrire l'historique pour faire paraître un lot terminé.

---

## RÉSUMÉ EN UNE LIGNE

> **AkarFinder doit gagner Google non pas en générant le plus de pages, mais en ayant le meilleur graphe de pages immobilières réellement utiles, alimentées par les meilleures données disponibles et mesurées en continu.**
