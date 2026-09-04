# AKARFINDER SEO CANONICAL

> **Chantier principal : Référencement organique / SEO AkarFinder**
>
> Boussole canonique de reprise. À chaque reprise : lire ce fichier, puis vérifier repo / `main` / branche / PR / CI / LIVE avant toute action.

**Statut : ACTIVE — SEO-0 remédiation technique en validation ; SEO-1 benchmark initial terminé ; SEO-2 qualification data initiale terminée ; SEO-3 gate conçu mais non implémenté**  
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

Une page ne devient indexable que si l'intention, le stock, la diversité des sources, la qualité des données, le contenu distinctif, le canonical, le maillage et le sitemap le justifient.

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
- `/acheter` et `/louer` sont des hubs nationaux indexables ; le helper SEO existant réserve déjà la taxonomie `/immobilier/{ville}/{acheter|louer}` pour les futures surfaces transactionnelles.
- `/neuf` est actuellement `index,follow` mais n'a pas de programme suffisamment documenté affiché ; son statut SEO doit être réévalué avant scale, pas modifié sans preuve supplémentaire.
- Search Console, couverture Google réelle, Core Web Vitals, profondeur de clic/orphelines et cycle des annonces retirées restent à prouver avant fermeture complète de SEO-0.

### P0

1. **Domaine final** : le domaine `akarfinder.ma` n'était pas attaché au projet Vercel lors du baseline. Ne pas bâtir volontairement l'autorité finale sur un hostname transitoire.
2. **Search Console** : absence de preuve privée GSC dans cette session. Indexation réelle, clics, impressions et canonicals choisis par Google restent inconnus.

### P1 corrigés dans PR #999

- canonical `/map` ;
- suppression des URLs Vercel codées en dur dans les générateurs SEO/JSON-LD concernés.

### P2 corrigé dans PR #999

- suppression du faux signal `lastModified` généré à chaque build.

---

## 4. INCIDENTS CI INDÉPENDANTS DU SEO

PR #999 a exposé plusieurs guards Mon Projet obsolètes après le passage déjà présent du produit vers `MonProjetWizardP2` :

- #19G Homepage/Search Entry attendait encore `MonProjetWizardP1A` ;
- #19H User Continuity attendait encore `MonProjetWizardP1A` ;
- Phase 1 P1 User Journey lisait encore `MonProjetWizardP1A.tsx` dans `mon-projet-workspace-ux.test.ts`.

Corrections minimales : les guards ciblent désormais le composant réellement monté `MonProjetWizardP2` et conservent leurs contrats de continuité / search / workspace.

Aucune modification UI Mon Projet n'a été faite dans ce lot.

Preuve historique disponible : le run initial Canonical Baseline avait **1 835 / 1 835 tests scrapers verts** avant de tomber sur ces assertions de garde périmées.

---

## 5. SEO-1 — BENCHMARK SERP MAROC

### État

**Benchmark initial terminé le 2026-09-04.** Ce n'est pas un substitut à Search Console ni une promesse de positions Google fixes.

### Concurrents vérifiés

- **Kaynly** : ville × transaction, ville × transaction × type, quartiers, résidences, baromètres prix/m², volumes/médianes/fraîcheur, multi-portails.
- **Mubawab** : très fort sur les intentions transactionnelles directes ville/type/quartier.
- **Yakeey** : forte profondeur ville/type, facettes, longue traîne locale et référentiels de prix.
- **AlerteImmo** : agrégation multi-portails, pages ville/type, prix médian, FAQ locale et alertes.
- Autres gagnants observés : Masaken, SoukImmobilier, Palm Estates Pro selon les requêtes.

### Décision

Ne pas copier leur profondeur combinatoire. Priorité : **gate stock/qualité → surfaces transactionnelles prouvées → data moat fiable**.

---

## 6. SEO-2 — QUERY MAP + QUALIFICATION DATA

### Source de vérité mesurée

Read-model public : `public.public_search_representations_v1`.

Sous-ensemble strict utilisé pour qualifier les intentions :

- `display_eligibility = 'eligible_primary'` ;
- `freshness_status = 'fresh_confirmed'` ;
- ville/intention connues.

Le read-model contient **3 216 représentations `eligible_primary + fresh_confirmed`** avant filtres supplémentaires de ville/intention/type.

### Ville × transaction — preuve actuelle

Sur les 5 villes SEO actuelles, chaque intention `sale` / `rent` dispose d'au moins **115 représentations strictes** et **4 sources distinctes**.

| Ville | Vente | Sources | Location | Sources |
|---|---:|---:|---:|---:|
| Agadir | 173 | 4 | 115 | 4 |
| Casablanca | 260 | 6 | 198 | 6 |
| Marrakech | 215 | 4 | 254 | 4 |
| Rabat | 166 | 5 | 161 | 6 |
| Tanger | 184 | 4 | 282 | 4 |

**Fès** est aussi un candidat data crédible : 102 ventes / 5 sources et 106 locations / 4 sources, mais n'appartient pas encore au `CitySlug` SEO actuel.

Anomalie à normaliser avant scale : Marrakech contient aussi une ligne `buy` séparée de `sale`.

### Ville × transaction × type — premier gate candidat

Avant comptage, normaliser au minimum :

- `buy → sale` ;
- `appartement → apartment` ;
- `terrain → land` ;
- `bureau → office` ;
- `local commercial → commercial`.

Floor exploratoire retenu pour la query map : **≥20 représentations strictes + ≥3 sources distinctes**. Ce floor n'est **pas** déclaré équivalent au gate DB `strong` ; il sert à sélectionner les premières surfaces à étudier.

Combinaisons qui passent ce floor après alias mapping :

- appartement vente/location : Agadir, Casablanca, Fès, Marrakech, Rabat, Tanger ;
- villa vente : Tanger uniquement.

Aucune landing type supplémentaire n'est créée dans PR #999.

---

## 7. SEO-3 — URL & INDEXATION CONTRACT

### Taxonomie cible

Réutiliser l'architecture déjà prévue par le repo :

`/acheter` ou `/louer`  
→ `/immobilier/{ville}/{acheter|louer}`  
→ éventuellement une future surface type uniquement si le gate est franchi.

`/search?...` reste une surface de recherche/facettes **noindex**, pas une fabrique de landing pages.

### Gate à implémenter

Ordre obligatoire :

1. **normalisation canonique** des intentions/types ;
2. **stock publiable et frais** issu du read-model public ;
3. **diversité de sources** ;
4. pour les statistiques/quartiers, réutiliser autant que possible la politique de fiabilité data existante plutôt que créer un second système divergent ;
5. seulement ensuite : metadata/canonical/maillage/sitemap/indexation.

### Quartiers — état actuel

La politique data existante observée en DB est plus stricte que le registre SEO statique :

- 96 métriques quartier inspectées ;
- 92 `insufficient`, 4 `limited`, 0 certifiée ;
- `public_activation = false` sur les segments observés ;
- aucune publication correspondante retrouvée dans `published_neighborhood_intelligence` pour les 11 slugs actuels.

Décision : **ne pas étendre la surface quartier avant franchissement d'un gate data défendable**. Les 11 pages existantes ne sont pas modifiées dans PR #999.

---

## 8. SOURCES SEO DE RÉFÉRENCE

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

## 9. ROADMAP

### SEO-0 — Baseline Audit

**EN COURS de fermeture.** Remédiation technique dans PR #999 ; restent validation CI finale, merge, puis preuves GSC/LIVE non disponibles sans étapes séparées.

### SEO-1 — Benchmark SERP Maroc

**INITIAL TERMINÉ.** Benchmark Kaynly/Mubawab/Yakeey/AlerteImmo + gaps prioritaires documentés.

### SEO-2 — Query Map Maroc

**INITIAL TERMINÉ.** Distribution ville × transaction et premier filtre ville × transaction × type mesurés sur le read-model public.

### SEO-3 — URL & Indexation Contract

**CONÇU, NON IMPLÉMENTÉ.** Prochain lot : transformer le gate en code/test unique et empêcher sitemap/indexation sans décision d'éligibilité.

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

## 10. RÈGLES D'EXÉCUTION SEO

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

## 11. NEXT EXACT

1. certifier la CI du HEAD final de PR #999 ;
2. si échec : diagnostiquer/corriger la cause exacte ;
3. si vert : merger #999 puis vérifier `main` ;
4. **ne pas déployer Vercel** ;
5. ouvrir le lot SEO-3 d'implémentation du gate dynamique, en commençant par normalisation + décision ville × intention ;
6. garder Search Console / domaine final / éventuelle activation LIVE comme human gates séparés.

---

## 12. SÉQUENCE RESTANTE

`CI PR #999`  
→ si vert `merge + post-merge Git`  
→ `SEO-3 gate dynamique code + tests`  
→ `SEO-4 premières landings transaction × ville qualifiées`  
→ `SEO-5 data moat`  
→ `SEO-6/7 technical + maillage`  
→ `SEO-8 authority`  
→ `SEO-9 GSC loop`  
→ `SEO-10 scale gates`.

Human gates séparés : **tout déploiement Vercel / activation du domaine final / accès Search Console si nécessaire**.
