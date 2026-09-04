# AKARFINDER SEO CANONICAL

> **Chantier principal : Référencement organique / SEO AkarFinder**
>
> Boussole canonique de reprise. À chaque reprise : lire ce fichier, puis vérifier repo / `main` / branche / PR / CI / LIVE avant toute action.

**Statut : ACTIVE — SEO-0 audité techniquement mais non CLOSED ; SEO-1 benchmark en cours**  
**Dernière mise à jour : 2026-09-04**  
**Repo : `hraaaaf/Akarfinder`**  
**Branche active : `fix/seo-baseline-p1`**  
**PR : `#999`**  
**Preuve détaillée : `AKARFINDER_SEO_AUDIT_2026-09-04.md`**

---

## 1. GOAL GLOBAL

Faire du SEO un avantage compétitif majeur d'AkarFinder : transformer l'index immobilier en surface d'acquisition organique utile, mesurable et scalable au Maroc.

### Succès observable

Le Goal global sera prouvé par une combinaison durable de :

- impressions et clics organiques non brandés ;
- requêtes cibles en Top 10 / Top 3 ;
- ratio pages utiles indexées / pages publiées ;
- trafic organique vers les annonces et sources ;
- croissance des domaines référents et recherches de marque.

### Preuve principale

**Google Search Console**, complétée par analytics, logs/crawl, SERP observées et tests techniques.

Aucun objectif numérique n'est inventé avant disponibilité du baseline Search Console.

---

## 2. THÈSE STRATÉGIQUE

Moat visé :

**stock large + données normalisées + fraîcheur + pages réellement utiles + architecture SEO propre + transparence + autorité.**

Règle centrale :

> **Une combinaison de filtres n'est pas automatiquement une page SEO.**

Une page ne devient indexable que si l'intention, le stock, la qualité des données, le contenu distinctif, le canonical, le maillage et le sitemap le justifient.

Interdit : industrialiser des milliers de pages faibles ou quasi identiques.

---

## 3. SEO-0 — BASELINE AUDIT

### Goal

Établir ce que les moteurs peuvent découvrir, crawler, indexer et comprendre aujourd'hui sur AkarFinder, puis classer les défauts P0/P1/P2.

### État vérifié

- `/search` : `noindex,follow`, canonical `/search`, hors sitemap.
- `/map` : indexable ; canonical `/map` ajouté dans PR #999 pour neutraliser les variantes à paramètres.
- `/immobilier/{city}` : landing SSR indexable avec self-canonical.
- `/immobilier/{city}/{district}` : landing SSR indexable uniquement si registre géographique `validated + seo_eligible`, self-canonical + Breadcrumb JSON-LD.
- surface contrôlée actuelle : **5 villes SEO + 11 quartiers SEO**.
- éligibilité ville/quartier encore **statique**, pas conditionnée par le stock réel.
- sitemap : faux `lastModified: new Date()` retiré dans PR #999 en l'absence d'une vraie date métier.
- URLs SEO/JSON-LD codées en dur sur l'hostname Vercel : centralisées vers `siteConfig.siteUrl` dans PR #999.
- aucune visibilité AkarFinder n'a été retrouvée dans les recherches web publiques testées ; cela ne remplace pas Search Console.
- Search Console, couverture Google réelle, Core Web Vitals, profondeur de clic/orphelines et cycle des annonces retirées restent à prouver avant fermeture complète de SEO-0.

### P0

1. **Domaine final** : le domaine `akarfinder.ma` n'était pas attaché au projet Vercel lors du baseline. Ne pas bâtir volontairement l'autorité finale sur un hostname transitoire.
2. **Search Console** : absence de preuve privée GSC dans cette session. Indexation réelle, clics, impressions et canonicals choisis par Google restent inconnus.

### P1 corrigés dans PR #999

- canonical `/map` ;
- suppression des URLs Vercel codées en dur dans les générateurs SEO/JSON-LD concernés.

### P2 corrigé dans PR #999

- suppression du faux signal `lastModified` généré à chaque build.

### P1 restant avant scale

Créer un **gate dynamique stock + qualité** avant d'ouvrir davantage de villes/quartiers/types. Le seuil doit venir de la distribution réelle des données, pas d'un nombre choisi au hasard.

---

## 4. INCIDENT CI #19G

Le premier run de PR #999 a échoué sur un guard **indépendant du SEO** :

- 1 835 / 1 835 tests scrapers passaient ;
- contrats #11 à #19F passaient ;
- #19G attendait encore `<MonProjetWizardP1A` alors que `main` rend `MonProjetWizardP2` ;
- PR #999 ne touchait initialement aucun fichier Mon Projet.

Correction minimale ajoutée sur la branche : le guard #19G teste désormais `MonProjetWizardP2` tout en conservant les contrats transition / search / continuity.

Aucune modification UI Mon Projet n'a été faite dans ce lot.

---

## 5. SEO-1 — BENCHMARK SERP MAROC

### Goal

Identifier les surfaces déjà gagnées par les concurrents et les gaps exploitables avant de construire de nouvelles pages.

### Concurrents vérifiés au 2026-09-04

#### Kaynly

Benchmark agrégateur direct :

- ville × transaction ;
- ville × transaction × type ;
- quartier ;
- résidence ;
- baromètre prix/m² ;
- volumes, médianes, comparaison locale, fraîcheur ;
- multi-portails + redirection source ;
- environ **100 055 annonces** affichées au relevé du 31 août 2026.

#### Mubawab

Très fort sur les intentions transactionnelles directes ville/type/quartier avec gros volume de pages et d'annonces.

#### Yakeey

Fort sur ville/type, facettes, référentiels de prix et longue traîne locale.

#### AlerteImmo

Agrégateur concurrent observé pendant SEO-1 : pages ville/type, prix médian, FAQ locale, multi-portails et proposition de valeur « alerte rapide ».

#### Autres gagnants observés

Masaken, SoukImmobilier et Palm Estates Pro sur certaines requêtes quartier/type/data.

### Gap initial

| Dimension | Concurrence | AkarFinder | Lecture |
|---|---|---|---|
| Couverture villes/quartiers | forte | 5 villes / 11 quartiers | gap de couverture, à ne pas combler sans gate |
| transaction × ville | présente | pas de landing SEO dédiée | priorité potentielle |
| transaction × ville × type | présente | pas de landing SEO dédiée | priorité après preuve de stock |
| prix / prix m² | forte chez Kaynly/Yakeey | partiel selon read-model | gap important |
| fraîcheur explicite | forte chez Kaynly/AlerteImmo | à structurer | opportunité |
| contexte local | variable | read-model quartier + carte | avantage potentiel AkarFinder |
| transparence source/limites | variable | forte | avantage potentiel AkarFinder |
| gate qualité avant scale | non observable | registre contrôlé mais statique | à rendre dynamique |

### Décision

Ne pas copier la profondeur concurrente. Priorité : **gate stock/qualité → surfaces transactionnelles prouvées → data moat fiable**.

---

## 6. SOURCES SEO DE RÉFÉRENCE

Références techniques prioritaires : Google Search Central.

- Faceted navigation : `https://developers.google.com/search/blog/2024/12/crawling-december-faceted-nav`
- Canonicalisation : `https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls`
- Sitemaps : `https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap`
- Structured data : `https://developers.google.com/search/docs/appearance/structured-data/search-gallery`

Règles retenues :

- éviter les espaces quasi infinis d'URLs de facettes ;
- sitemap = URLs canoniques voulues ;
- canonical, redirections et sitemap sont des signaux complémentaires ;
- structured data aide à comprendre mais ne garantit aucun rich result.

---

## 7. ROADMAP

### SEO-0 — Baseline Audit

**EN COURS de fermeture.** Technique auditée et remédiation PR #999 en validation. Restent GSC + contrôles non encore prouvés + état LIVE après éventuel déploiement autorisé.

### SEO-1 — Benchmark Kaynly + SERP Maroc

**EN COURS.** Gap analysis initiale établie. Continuer par intentions prioritaires et preuves de surfaces gagnantes.

### SEO-2 — Query Map Maroc

Construire les clusters : transaction × type × ville × quartier + intentions data. Associer demande observée, concurrence, stock AkarFinder, page cible, priorité.

### SEO-3 — URL & Indexation Contract

Définir précisément les classes indexables / non indexables et le gate dynamique.

### SEO-4 — Landing Templates

Templates utiles : annonces actives, fraîcheur, statistiques fiables, maillage, provenance/méthode. Aucun texte générique de remplissage.

### SEO-5 — Data Moat

Baromètres, prix/m², volumes, fraîcheur, répartition, qualité, sources, comparaisons. Toujours distinguer « index AkarFinder » de la vérité exhaustive du marché.

### SEO-6 — Technical SEO

Robots, sitemap, canonical, redirects, pagination, 4xx/5xx, SSR, metadata, breadcrumbs, structured data, performance mobile.

### SEO-7 — Internal Linking

Graphe cible : `Maroc → ville → transaction → type → quartier/résidence → annonces`.

### SEO-8 — Authority

Études/data citables, méthodologie, médias/partenaires. Pas de backlinks artificiels.

### SEO-9 — Search Console Loop

`Publier → découvrir → indexer → impressions → CTR → position → conversion → corriger`.

### SEO-10 — Scale Gates

Scaler uniquement après preuve : crawl, indexation, impressions, données fiables, maillage correct, absence de cannibalisation majeure.

---

## 8. MÉTRIQUES CANONIQUES

### Acquisition

Impressions, clics, CTR, position, part non brandée, Top 3 / 10 / 20.

### Indexation

Découvertes, crawlées, indexées, exclues, sitemap indexé, canonical Google vs déclaré.

### Qualité

0 impression, orphelines, duplicate/cannibalisation, 4xx/5xx, CWV, fraîcheur.

### Business

Sessions organiques vers résultats/annonces, clics sortants vers sources, engagement.

---

## 9. RÈGLES D'EXÉCUTION SEO

Pour toute modification significative :

1. Goal / Succès / Preuve ;
2. baseline ;
3. implémentation ;
4. tests ;
5. HTTP + HTML + metadata + canonical + robots + sitemap selon impact ;
6. si UI : BEFORE → Goal visuel → mockup → AFTER mêmes viewports → comparaison/tests/score ;
7. documentation uniquement de l'état prouvé.

**Aucun déploiement Vercel sans autorisation explicite d'Achraf.**

---

## 10. NEXT EXACT

1. vérifier une fois la CI du HEAD final de PR #999 ;
2. si échec : diagnostiquer/corriger sans masquer la cause ;
3. si vert : merger #999 et vérifier `main` ;
4. **ne pas déployer Vercel** ;
5. poursuivre SEO-1 / SEO-2 avec la query map et dériver le gate stock/qualité depuis les données réelles ;
6. fermeture SEO-0 uniquement après les preuves restantes, sans inventer GSC/LIVE.

---

## 11. SÉQUENCE RESTANTE

`CI PR #999`  
→ si vert `merge + post-merge Git`  
→ `SEO-1 Benchmark complet`  
→ `SEO-2 Query Map + stock distribution`  
→ `SEO-3 gate URL/indexation`  
→ `SEO-4/5 templates + data moat`  
→ `SEO-6/7 technical + maillage`  
→ `SEO-8 authority`  
→ `SEO-9 GSC loop`  
→ `SEO-10 scale gates`.

Human gate séparé : **tout déploiement Vercel / activation du domaine final**.
