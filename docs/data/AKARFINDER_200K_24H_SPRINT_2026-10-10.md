# AkarFinder — SPRINT 24 h / exploration nationale par pages de résultats

Date : 2026-10-10
Statut : **exécution bornée + mesure, objectif 200 000 NON CERTIFIÉ**
Repo : `hraaaaf/Akarfinder`, branche `data/200k-fresh-parser-v2`.

## GOAL demandé

200 000 annonces marocaines **réellement distinctes, actives, avec URL source, ville, quartier, prix et superficie** en 24 h, après validation des droits de réutilisation. Il s'agit d'un **objectif**, pas d'une promesse de faisabilité.

**Faisabilité** : 200 000 / 86 400 = **2,315 annonces certifiées par seconde**. À 25 cartes différentes par page, cela représente **au moins 8 000 pages** ; les doublons, prix masqués, résultats paginés et biens déjà vendus augmentent ce nombre. Le site public Mubawab affiche environ 110 000 annonces et Domio environ 10 400, ces volumes ne sont pas une certification de biens encore disponibles et ne prouvent pas que deux sources suffisent à 200 000. Le besoin de **multiples portails réellement productifs** est impératif.

## Preuves de départ

- Mubawab CI `38014920725` : 50 catégories, **1 316 identités source distinctes**, **1 140 cartes à cinq champs présents**, 806 ID absents du corpus gelé. Pas de preuve de fraîcheur ni de non-duplication physique.
- Mubawab détail CI `38015494577` : échantillon 30/30 identités conservées ; 26/26 surfaces vérifiables concordantes ; ne prouve pas disponibilité vendeur.
- Domio run `38042386411` : **7 pages**, **168 IDs**, **70 cinq champs observés**, zéro détail dans cet échantillon.
- Domio détail `38042128852` : **12/12 identité + prix + surface concordants**, dates d'origine explicites observées sur 12, allant de juillet à septembre 2026 ; pas de preuve que le logement n'est pas déjà vendu.
- Avito sitemap HTTP 403 dans le canari, source non exploitable par cette voie, **aucun contournement**.

## Décision d'architecture

Le goulet n'est pas seulement la précision du parser, mais **la découverte de pages non déjà vues**.

1. **Discovery auto par pages liées sur le site** : page nationale `/fr/cc/`, puis liens authentiques `/fr/ct/<ville>/...` et `/fr/st/<ville>/...`. Ne pas inventer de routes pour des villes inconnues. Se limiter aux villes connues avec localisation confirmée **dans la carte elle-même**. Pagination uniquement si URL explicitement publiée, robots et conditions compatibles.
2. **Extraction card-first** : une annonce = un ID canonique source ; prix, surface, ville, quartier dans un même bloc. Ne pas compter les unités d'un programme neuf comme des annonces individuelles distinctes sans ID de bien. Écarter les valeurs ambiguës et les coordonnées personnelles.
3. **État et reprise** : métriques de rendement `nouveaux IDs versus baseline / HTTP 200`, détection de pages saturées et queues restantes ; checkpoints en artifacts read-only, pas de DB ou changement produit.
4. **Validation de fraîcheur** : distinguer ① découvert aujourd'hui ② détail réel, bon ID ③ date de publication déclarée ④ disponibilité commerciale (preuve explicite quand présente) ⑤ doublon inter-sources probable. Ne jamais faire passer ① pour ④.
5. **Scoring** : préférer les catégories avec nouveaux IDs fiables / requête. Arrêter rapidement routes 404/403/429 et sources bloquées. Per-host cadence prudente et UA identifié; **pas de camouflage, IP rotatives, CAPTCHA solving ni endpoints privés**.
6. **Montée en volume** : extraction / qualification / stockage séparés. Aucune écriture ni activation de 200K avant preuve. Optimiser par cartes et sitemaps publics autorisés, pas par 200K détails fetch en masse.

## Lot immédiat en CI

- `scripts/data/mubawab-national-frontier-v1.mjs` : 2 pages nationales de découverte + les 50 catégories éprouvées ; élargissement uniquement depuis liens de catégories publiques vérifiés dans le HTML ; **100 requêtes maximum** par run, min 1,75 s entre catégories ; stop 403/429; aucun fetch détail.
- `scripts/data/__tests__/mubawab-national-frontier-v1.test.mjs` : extraction de liens, villes correctement normalisées, refus domaines externes, URLs à paramètres/colon non autorisés, aucune ville inventée, dédup ID, robots, budget de 100.
- `.github/workflows/mubawab-national-frontier-100.yml` : tests, artifact source gelé des 50 catégories `38014920725` téléchargé pour comparer les ID, extraction du nouveau lot dans `mubawab-frontier-100.json[l]`, 0 DB.
- **Goal du lot** : N vraies pages découvertes, X IDs source, Y cartes 5/5, Z IDs absents du pilote de 50; audit pagination/route via champs `site_result_count` et `underenumerated`.

## Règles de preuve / human gates

Un gain de pages ne prouve pas 200 000 annonces actives. Toute déclaration de succès doit comporter le décompte exact source ID, date/activité, doublons, cinq champs, exclusions et le calcul final net après dédup.

**Pré-requis** : robots respectés, conditions de réutilisation vérifiées, vie privée CNDP 09-08, pas de déploiement Vercel ni écriture de DB sans gate explicite. Sources de règles : https://www.rfc-editor.org/rfc/rfc9309.html ; https://doc.scrapy.org/en/latest/topics/autothrottle.html ; https://www.cndp.ma/faq/ ; https://www.cndp.ma/conditions/.

**Next exact** : lire le run exact du frontier 100 → corriger toute erreur → inspecter delta réel + découvertes → adapter au deuxième portail et à des pages paginées réellement permises → qualifier un échantillon statistiquement utile pour mesurer disponibilité/erreur → dédupliquer inter-sources → décider si objectif 200K réalisable ou limité par inventaire.


## Bilan intermédiaire contrôlé — 2026-10-10

- **Mubawab national** `38043182237` ✅ : 62 pages, 1 321 identités de source, **200 nouveaux IDs versus le pilote 50**, **169** nouveaux cinq champs. Source observée, pas fraîche certifiée.
- **Domio pagination 70** `38043204045` ✅ : 1 663 identités source, 745 cinq champs observés, 1 328 nouveaux vs les 14 premières pages, dont 619 cinq champs. **Quatre catégories continuent après page12** via lien source visible ; reprise strictement liée au HTML source jusqu'à 12 pages de plus, 64 requêtes max.
- **Candidats duplications** : artifact offline `38042808384` indique une paire Rabat Agdal entre Mubawab et Domio avec même prix/surface, aucune fusion sans preuve.
- **Lots préparés ou lancés** : `mubawab-district-derived-shards-v1.mjs` sur run `38043539778`, et `domio-pagination-resume-v1.mjs` après le run 70. Stop robots/403/429, pacing, aucune fiche privée ou bypass. Le volume récupéré n'est pas automatiquement un volume d'annonces encore disponibles.
- **Next exact** : récupérer les runs/artifacts exacts, mesurer nouvelles cartes nettes, diagnostiquer les vrais taux de disponibilité et les doublons, puis adapter d'autres sources permises. Pas de DB, merge ou deploy Vercel.


## Expansion nationale au-delà des cinq villes initiales — 2026-10-10

**Preuve :** le ledger exact `38044964671` ✅ (artifact `11667367558`) recense **8 993 identifiants source** et **6 995 cartes cinq champs cohérentes**, dont **6 403 Mubawab** quasi exclusivement Casablanca/Tanger/Marrakech/Agadir/Rabat et **2 590 Domio**. Aucun frais/actif/dédup physique certifié. **Cette concentration géographique justifie l'ouverture de nouvelles villes**, pas le recrawl répété des mêmes catégories.

Deux pages de catégorie Mubawab ont été effectivement vérifiées publiquement :
- `https://www.mubawab.ma/fr/st/meknes/appartements-a-vendre` (H1 « Appartement à vendre à Meknes », prix/quartiers/surfaces affichés)
- `https://www.mubawab.ma/fr/st/oujda/appartements-a-vendre` (catégorie appartements à vendre Oujda).

**Lot préparé à certifier** : `scripts/data/mubawab-new-city-frontier-v1.mjs` + tests + `.github/workflows/mubawab-new-city-frontier-30.yml` : partir uniquement de ces deux URLs réelles ; découvrir uniquement les liens catégorie `/fr/st/<ville>/appartements-a-vendre` effectivement présents, 30 requêtes maximum, hôte officiel, robots fail-closed, pauses 1,8s, stop 403/429, H1 ville obligatoire pour chaque page, aucune fiche détail. Dédup par ID `a:id` et contrôle net-new face au registre six artifacts avec SHA256 JSONL `bfe706a803abedab31a971ea336ee1a0931d26740911810fab0a1aba94aaa7cf`.

**Next exact** : tests CI et artifact des catégories nouvellement découvertes ; comparer le rendement marginal des IDs sources (neufs *pour le registre*, pas publiés récemment) par page ; rejeter les catégories sans preuve de ville, sans robots ou à rendement nul, puis étendre prudemment les URLs publiques réellement observées. Le délai utilisateur de 24h demeure un objectif non garanti, et non une confirmation de 200K disponibles.
