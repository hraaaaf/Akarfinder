# Search Volume & Relevance Audit

Mission : ROADMAP-SEARCH-VOLUME-SEO-ALIGNMENT-1 (2026-07-05)
Type : audit read-only — aucun code modifié, Gateway inchangé.
Environnement audité : preview phases 2-6
(https://akarfinder-btejqef3r-achraf-benmoussa-s-projects.vercel.app),
endpoint /api/search/gateway.

## Méthodologie

10 requêtes représentatives envoyées au Gateway en preview. Chaque résultat
classé selon la grille :

- **A — très pertinent** : bonne ville + bonne transaction + bon type de bien
  + annonce ou page listing exploitable + source originale claire.
- **B — pertinent acceptable** : bonne ville + transaction compatible + type
  probable + résultat immobilier utile (pages catégories ciblées incluses).
- **C — faible** : ville ou type incertain, page catégorie trop générale,
  page référentiel de prix, peu d'informations exploitables.
- **D — non pertinent** : hors ville, hors transaction, hors immobilier,
  blog/article, hors Maroc, page d'accueil de portail.

Note : /acheter et /louer sont des landing pages d'intention alimentées par
les listings first-party (DB interne), pas des SERP Gateway — elles répondent
200 en preview mais ne sont pas mesurées ici en volume Gateway.

## Tableau volume + pertinence

| Requête | Total | A | B | C | D | Pertinence A+B | Commentaire |
| --- | --- | --- | --- | --- | --- | --- | --- |
| appartement casablanca | 12 | 1 | 7 | 2 | 2 | 67% | 2 homepages portail, 1 page prix |
| location studio casablanca | 11 | 0 | 8 | 2 | 1 | 73% | 0 annonce individuelle |
| villa rabat | 10 | 0 | 8 | 1 | 1 | 80% | volume le plus faible (10) |
| appartement marrakech | 18 | 1 | 9 | 5 | 3 | 56% | 4 pages référentiel prix, 1 blog |
| location appartement rabat | 12 | 1 | 9 | 1 | 1 | 83% | bonne requête, volume faible |
| terrain marrakech | 16 | 3 | 12 | 0 | 1 | 94% | meilleure requête (3 annonces A) |
| programme neuf casablanca | 24 | 2 | 11 | 8 | 3 | 54% | pire pertinence : 6 pages nationales non-Casablanca, 2 blogs |
| appartement agadir | 15 | 1 | 8 | 4 | 2 | 60% | 1 titre incohérent (Casablanca sur URL Agadir) |
| location tanger | 14 | 0 | 12 | 1 | 1 | 86% | 1 URL staging tierce (stage-v1.yakeey.com) |
| maison fes | 19 | 0 | 15 | 2 | 2 | 79% | 1 résultat hors ville (Route de Fès à Marrakech) |

## Totaux

- Total résultats affichés : **151**
- Résultats A : **9** (6%)
- Résultats B : **99** (65,5%)
- Résultats C : **26** (17,2%)
- Résultats D : **17** (11,3%)
- **Taux A+B : 71,5%** — Taux C+D : 28,5%
- **Nombre moyen de résultats par requête : 15,1**
- **Nombre moyen de résultats pertinents (A+B) par requête : 10,8**
- Requêtes < 20 résultats : **9/10** (toutes sauf "programme neuf casablanca")
- Requêtes < 10 résultats pertinents A+B : **4/10** (appartement casablanca,
  location studio casablanca, villa rabat, appartement agadir)

## Constat commercial central

**~15 résultats par requête est insuffisant pour un discours commercial fort
auprès des agences et promoteurs.** Un partenaire qui teste "appartement
casablanca" voit 12 résultats là où les portails en affichent des milliers.
La pertinence relative est correcte (71,5% A+B) mais le volume ne soutient
pas encore un argumentaire "moteur de recherche immobilier du Maroc".

Deuxième constat structurel : **seulement 6% des résultats sont des annonces
individuelles exploitables (A)**. La SERP Gateway est dominée par des pages
catégories de portails (100% des résultats en mode thin_indexed_result).
C'est cohérent avec la doctrine (aperçu limité + source originale) mais cela
plafonne la perception de richesse.

## Sources

Dominantes (6 sources actives) :
- Avito (~35% des résultats, souvent 3-5 par requête)
- Sarouty (~25%)
- Mubawab (~15%)
- Yakeey (~12%)
- Agenz (~8%)
- Logic-Immo (~7% — mais 10/10 requêtes renvoient UNIQUEMENT sa homepage → D quasi systématique)

Manquantes ou faibles :
- Marocannonces et autres portails généralistes
- Sites de promoteurs directs (aucun résultat promoteur first-party)
- Sites d'agences locales indépendantes
- Résultats partenaires AkarFinder (0 dans la SERP Gateway — le ranking
  partenaire isolé n'est pas branché, conformément à la doctrine actuelle)
- Aucune diversité de source au-delà des 6 portails configurés

## Problèmes de pertinence détectés

1. **Homepages de portails** : Logic-Immo n'apporte que sa page d'accueil sur
   les 10 requêtes (snippet souvent hors sujet — villa Marrakech sur une
   requête Rabat). Sarouty homepage apparaît 2×. À filtrer ou déclasser.
2. **Pages référentiel de prix** : 8+ occurrences (Yakeey "carte des prix",
   Agenz "référentiel des prix") — utiles mais pas des annonces ; sur
   "appartement marrakech" elles font 4/18 résultats.
3. **Blogs/articles** : 3 occurrences (Sarouty blog investir/frais/projets).
4. **Requête "programme neuf casablanca"** : 6 pages nationales "Maroc" non
   spécifiques à Casablanca → pire taux A+B (54%).
5. **URL staging tierce** : stage-v1.yakeey.com servie sur "location tanger"
   — environnement de test d'un portail, à exclure.
6. **Incohérences ville** : titre "Hay Mohammadi - Casablanca" sur URL Agenz
   Agadir ; "Maison Route de Fès" située à Marrakech sur requête "maison fes".
7. **Quasi-doublons thématiques** : Avito multiplie les pages /sp/immobilier/
   très proches (jusqu'à 5 variantes de la même intention par requête) ;
   pas de doublon strict d'URL détecté (le dedupe fonctionne).
8. **Hors Maroc : 0. Hors immobilier : 0** — le filtre real-estate fonctionne.

## Objectifs de volume (commercial)

Court terme :
- 30 à 50 résultats publics affichables sur les grandes requêtes
- ≥ 60% de résultats A+B sur les requêtes principales (déjà atteint sur 8/10 ;
  cible à maintenir en doublant le volume)
- Sources diversifiées ; si possible pas plus de 2 résultats consécutifs de
  la même source
- Résultats externes toujours sans image/contact/galerie (doctrine conservée)

Moyen terme :
- Plusieurs pages de résultats ou bouton "Voir plus de résultats"
- Requêtes élargies intelligemment (variantes ville/type/transaction)
- Suivi du volume par ville et par intention (achat/location/neuf)
- Résultats partenaires en haut si pertinents (moteur ranking déjà prêt,
  branchement = mission dédiée)
- Gateway comme filet de volume

Wording autorisé pour ce discours : résultats publics externes, source
originale, aperçu limité, recherche élargie, résultats partenaires
structurés, volume indicatif, couverture progressive.
Interdit : "toutes les annonces", "base exhaustive", "annonces vérifiées",
"index complet".

## Recommandations

1. SEARCH-GATEWAY-COVERAGE-EXPANSION-1 : query expansion (variantes par
   ville/type/transaction), pagination/"load more", seuil minimum commercial
   par requête (fallback élargi si < 30 résultats), filtrage des homepages
   portail et URLs staging, déclassement des pages référentiel de prix,
   contrainte de diversité de sources.
2. BUY-RENT-SERP-RELEVANCE-TUNING-1 : renforcer la correspondance
   transaction (éviter le neuf national sur une requête ville ; éviter
   l'achat dans la location), et le ciblage ville strict.
3. PARTNER-RANKING-LIVE-INTEGRATION-1 : ne brancher le ranking partenaire
   qu'après l'expansion volume, pour que les partenaires s'ajoutent à un
   fond de SERP déjà fourni.
4. Mesure continue : rejouer cet audit après chaque mission volume (même
   grille A/B/C/D, mêmes 10 requêtes) pour objectiver la progression.

## Prochaines missions (ordre)

1. SEARCH-VOLUME-RELEVANCE-AUDIT-1 — exécuté par ce document (baseline).
2. SEARCH-GATEWAY-COVERAGE-EXPANSION-1 (70% → 73%)
3. BUY-RENT-SERP-RELEVANCE-TUNING-1 (73% → 76%)
4. PARTNER-RANKING-LIVE-INTEGRATION-1 (76% → 80%)
5. SEO-FOUNDATION-1 (80% → 83%) — voir docs/SEO_ROADMAP.md
