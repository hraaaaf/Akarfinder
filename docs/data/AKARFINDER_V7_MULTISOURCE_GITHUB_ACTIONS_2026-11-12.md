# AKARFINDER — V7 MULTISOURCE GITHUB ACTIONS — 2026-11-12

GOAL: version multi-sites extensible, cadence cible 10 minutes GitHub Actions,
AkarParser V3 réel, déduplication par source et staging privé.

ÉTAT: candidat Draft empilé sur Radar10 #1202. Ce fichier est
l'unique reprise du nouveau sous-lot V7; se reporter à
scripts/acquisition/v7_multisource/README.md pour le runbook.

PÉRIMÈTRE RÉEL:
- Deux adaptateurs OFFLINE: Mubawab (V6.4.6 snapshot HMAC signé), Agenz
  (observation individuelle fournie et non authentifiée côté portail).
- Neuf sites enregistrés comme NON intégrés, pas comme couverts.
- Pas de connexion live à un portail et pas d'import Supabase PROD.
- Workflow GitHub Actions porte un cron 10 min, mais n'est pas sur main.
  Sa seule voie schedule est un probe NO-NETWORK OFF par défaut.
- Aucun déploiement Vercel, merge, migration DB ni retrait du radar horaire.

SUCCESS ciblé: suite de tests V3 réel + V646 HMAC fixture + PG17 éphémère,
contrat URL/ID anti-falsification, double source, replay idempotent,
0 publication et 0 écritures Supabase. Ne pas écrire PASS sans preuve CI.

NEXT EXACT:
1. Lire CI V7 au SHA HEAD exact; corriger et revalider si échec.
2. Mettre PR/Notion à jour avec nombres de tests/logs/SHAs.
3. Vérifier droits des sources, échantillons réels et bench précision
   par portail, résilience/robots/quotas.
4. Provisionner stockage externe monotone pour GH-hosted ephemeral,
   schéma Supabase staging isolé, rôle readonly/ingest limité,
   sans secrets dans Git/CI outputs/Notion.
5. Après GO spécifique : live canary, installation main cron 10 min,
   monitoring 24h, couverture multi-sites mesurée.
6. Fusion/promotions publiques/Vercel seulement après gates distincts.

Aucun pourcentage global inventé.

## Premières preuves CI exactes — commit b4ca24dc

- [V7 + V646 signed fixture + V3 + PostgreSQL #43309455047](https://github.com/hraaaaf/Akarfinder/actions/runs/43309455047) : **SUCCESS**, 10 tests V7 PASS et 13 tests Radar10 PASS, 0 échec.
- [Radar10 Private Staging #43309455115](https://github.com/hraaaaf/Akarfinder/actions/runs/43309455115) : **SUCCESS**.
- [CI Workflow Efficiency Policy #43309454974](https://github.com/hraaaaf/Akarfinder/actions/runs/43309454974) : **SUCCESS**.
- Le commit suivant renforce la validation de netloc HTTP : sa propre CI doit être observée avant clôture finale.
- Ces exécutions sont entièrement OFFLINE sur données fictives et PostgreSQL 17 éphémère, **pas** une preuve de collecte nationale ni de lecture réelle Agenz.

## Closeout CI vérifié (code SHA c5a267516b083e6abc8eddc21fec89a9a5117b32)

- [V7 Multi-Source #43309817793](https://github.com/hraaaaf/Akarfinder/actions/runs/43309817793) : **SUCCESS**, 10 tests V7 PASS + 13 tests Radar10 PASS, 0 FAIL ; contrôles V646 export HMAC fixture → vrai V3, deux domaines et rollback/idempotence PostgreSQL 17 ; nouveau rejet de netloc déguisé testé.
- [Radar10 Private Staging #43309817805](https://github.com/hraaaaf/Akarfinder/actions/runs/43309817805) : **SUCCESS**.
- [CI Workflow Efficiency #43309817804](https://github.com/hraaaaf/Akarfinder/actions/runs/43309817804) : **SUCCESS**.
- Supabase active : lecture SQL confirme schéma `acquisition` absent et deux tables publiques `property_listings` / `listing_sources` toujours à 0 lignes après tests. Aucun réseau source réel utilisé par les tests.
- PR V7 #1204 **Draft / non fusionnée**. Le cron Actions 10 minutes est déclaré mais **pas activé**, n'offre aucune ponctualité garantie et ne possède que le status probe OFF-LINE. Les 8 autres portails demeurent NOT_INTEGRATED.
- Phase LIVE : bloquée sur autorisations source spécifiques, supports réels, serveur d'état de confiance HMAC monotone, secrets DB staging, validation via canarys et installation volontaire sur main. Le lot code/offline est clos, pas la mise en service multi-sites.

## Décision de priorité utilisateur — 12 novembre 2026

Ordre de traitement demandé : **1 FeenWay → 2 Agenz → 3 Avito → 4 Yakeey → 5 Sarouty → 6 Mubawab → 7 MarocAnnonces → 8 Masaken → 9 Immoneuf Avito → 10 Mitula → 11 Portail-Immobilier**.

La priorité décrit l'ordre d'évaluation/intégration, **pas** la couverture active. Le domaine FeenWay `feenway.com` est ajouté au registre, statut `not_integrated`, sans connecteur ni HTTP. FeenWay se présente publiquement comme agrégateur d'annonces issues notamment de Mubawab, Agenz, Yakeey, Sarouty : nécessité d'identifier les URLs et IDs sources originaux, sans compter deux fois la même annonce.

**Next exact** : vérifier CI sur la modification de l'ordre, puis évaluer le format de fiches FeenWay et leur traçabilité avant un connecteur privé autorisé. Aucun collecteur nouveau en service, cron 10 min toujours OFF, Supabase inchangée et aucun merge/Vercel.

## Validation du nouvel ordre — code HEAD 78b772c4

- [CI V7 multi-source #43311153092](https://github.com/hraaaaf/Akarfinder/actions/runs/43311153092) : SUCCESS sur le commit de priorité FeenWay, 11/11 tests V7 et 13/13 tests Radar10 PASS, 0 échec ; le job `ten-minute-gate` est volontairement SKIPPED (aucune collecte 10 min).
- [Radar10 Private Staging #43311153387](https://github.com/hraaaaf/Akarfinder/actions/runs/43311153387) : SUCCESS.
- [CI Workflow Efficiency #43311153313](https://github.com/hraaaaf/Akarfinder/actions/runs/43311153313) : SUCCESS.
- **Bilan :** 11 cibles inventoriées, seulement 2 adaptateurs offline, FeenWay reste non intégré. Aucune activation source, DB, cron live, merge ou Vercel.
- **Next exact :** évaluer l'identification et les URLs originelles des fiches FeenWay avant la création d'un adaptateur (le choix d'un agrégateur comme premier portail augmente le risque de doublons).

## Contre-audit historique GitHub — EXISTANT À RÉUTILISER (12 novembre 2026)

**Décision prioritaire : REUSE FIRST, pas redéveloppement des collecteurs L8.**
Sur `main`, le document canonique `docs/AKARFINDER_MOROCCO_WEB_ACQUISITION.md` porte déjà L1-L7 « CLOSED », et le code source correspondant existe effectivement. Il ne prouve pas pour autant une collecte actuellement active sur les portails.

| Fonction historique | PR | État GitHub vérifié | Code déjà dans main | Preuve historique / limite |
| --- | --- | --- | --- | --- |
| Multi-source discovery | #966 | merged | `scripts/audits/morocco-web-real-estate-discovery-canary.mjs` | 5 849 candidates / 3 sources, URLs seulement |
| Sarouty public + sitemap | #968, #990 | merged | `scripts/acquisition/sarouty-public-adapter.mjs`, `sarouty-property-sitemap-enumerator.mjs` | 5 025 / 5 064 IDs historiques, pas état actuel |
| Mubawab / MarocAnnonces | #971, #988, #992 | merged | `mubawab-exhaustive-enumerator.mjs`, `marocannonces-source-first.mjs` | contrôles source-first déjà codés |
| Avito | #989 | merged | `avito-sitemap-enumerator.mjs` | sitemap HTTP 403 lors du test live cité : ne pas contourner |
| Agenz | #993 | merged | `agenz-source-first.mjs` | 4 466 IDs en exécution partielle, puis hard-block ; arrêt obligatoire |
| Canonical extractor detail URL | #994 | merged | `canonical_listing_extractor.py` | Avito/Sarouty/Agenz reconnus, 8 tests historiques |
| Cross-source physical dedupe | #978 | merged | `cross_source_dedupe.py` | 6 observations → 4 clusters sur fixture |
| Freshness/revisit | #980 | merged | `freshness_revisit_engine.py` | logique de revisite, non preuve de fraîcheur active |
| Staging writer L7 | #982 | merged | `bounded_production_ingestion.py` | garde explicite pour écriture PROD ; NE PAS appeler |
| Avito IDs via Kaynly | #1016 | OPEN Draft | dans PR non fusionnée | 5 807 IDs candidats historiques, 0 preuve de fiches encore actives |
| Liens Yakeey/Sarouty/Avito via Kaynly | #1146 | OPEN Draft | `scripts/acquisition/kaynly-open-links/collector.py` dans branche Draft | 20 pages / 180 URLs dont 28 Yakeey ; URLs candidates |
| FeenWay | aucune ancienne intégration avérée | NOT_INTEGRATED | seulement nouvelle entrée V7 | portail agrégateur : ne pas compter les miroirs comme originaux |

**Correction d'interprétation :** « 2 adaptateurs offline » désigne seulement le NOUVEAU module V7 #1204 (V646/Mubawab + observations Agenz), pas les collecteurs déjà présents dans `main`. « 9 non intégrés » signifie non câblés dans le NOUVEAU pipeline V7, et non pas absents du dépôt. Éviter de créer un deuxième système concurrent de découverte et de revisite.

**NEXT EXACT :** comparer les interfaces et formats de sortie de ces modules `main` contre les entrées V3/Radar10, réutiliser le code au moyen d'un adaptateur de compatibilité et de tests isolés, conserver l'inventaire utilisateur FeenWay→Agenz→Avito→Yakeey→Sarouty, sans collecte LIVE ni suppression/replacement prématuré. FeenWay doit être étudié en priorité en vérifiant les URL/ID sources originales, pas en aspirant une base miroir. Après tests, gate humain avant source network, migration, cron main et PROD. Aucun Vercel.


## Reuse L8 → V3 compatibility slice (new code; CI still to verify)

**Goal:** connect existing merged L8 URL enumerator outputs to V7 without
a second collection system or false promotion of source URLs as listings.

**Source of truth:** directly imported 5 existing merged module validators:
Agenz #993; Avito #989; Sarouty #990; Mubawab #988;
MarocAnnonces #992. Input: returned listingUrls in their successful,
zero-write reports. FeenWay and Yakeey are not wired in this slice.

**New path in Draft #1204:**
- scripts/acquisition/v7_multisource/legacy_candidate_bridge.mjs
- scripts/acquisition/v7_multisource/legacy_url_intake.py
- scripts/acquisition/__tests__/v7-legacy-candidate-bridge.test.mjs
- scripts/acquisition/__tests__/test_v7_legacy_url_intake.py
- workflow .github/workflows/akar-v7-multisource-gate.yml updated with
  Node 22 and Python cross-language actual V3 checks.

**Proof boundary:** only URLs and source IDs, no detail snapshots. Therefore
AkarParser V3 classifies such inputs as source_snippet_only; 0 records
to private Radar10 detail candidates and 0 to public. No source fetch, no
DB credentials, no publication or freshness claims. A report stopped by
HTTP 429, 403, hard-block or inconsistent ID is rejected in full.
No revival of banned access patterns and no live automatic 10-min schedule.

**Success test:** independently observe CI (Node reuse regression,
Python node-to-V3 contract and pre-existing Radar10/PostgreSQL tests).
No PASS declaration before exact HEAD CI. PR remains Draft.
If red, diagnose and fix before closeout.

**Next exact:** after green CI, identify safe, genuine authorized detail-page
data contracts for the old collectors and plan the bridging step V3 details.
No sources may be turned on or staging schema migrated without separate
approvals. Retain FeenWay as highest *research* priority, not as already wired.


## Closeout du pont L8 vers V3 — preuve CI immuable

**Code SHA:** 7bb57989eb6abb683bca995d6a1e43c243e9c27f.
**PR:** #1204 Draft, empilée sur #1202, sans merge.

- [V7 Offline Gate run 43314672333](https://github.com/hraaaaf/Akarfinder/actions/runs/43314672333): SUCCESS. Preuve exacte dans le job multi-portal-offline : 7 tests Node 22 PASS (fonctions L8 réelles importées) + 5 tests Python PASS (handoff Node vers vrai AkarParser V3, classement source_snippet_only) + 11 tests V7 PASS (V646 HMAC synthetic + V3 + PG17) + 13 tests Radar10 PASS = **36/36, zéro échec**. Le job schedule ten-minute-gate est volontairement SKIPPED.
- [Radar10 Private Staging 43314672332](https://github.com/hraaaaf/Akarfinder/actions/runs/43314672332): SUCCESS (13 tests Radar10 séparés).
- [CI Workflow Efficiency 43314672314](https://github.com/hraaaaf/Akarfinder/actions/runs/43314672314): SUCCESS.

**Critère observable atteint, limité:** cinq anciens collecteurs de main
(Agenz, Avito, Sarouty, Mubawab, MarocAnnonces) réutilisés par fonctions
réelles d'identité d'URL, leur sortie listingUrls est conservée comme
**candidat URL-only** puis inspectée par le parseur V3 comme
source_snippet_only. Le pont échoue fermement sur hard-block / HTTP 429 /
rapport suspect, sans inférer fraîcheur ou prix. Les snippets URL-only ne
sont **JAMAIS** injectés dans les tables de détail de Radar10, ni PROD.

**Non atteint:** une collecte réelle multi-sources sur GitHub Actions,
un gisement de nouvelles fiches prouvées, un convertisseur full-detail
à partir de pages sources autorisées, le raccord FeenWay/Yakeey, une
migration SQL privée ou des permissions source certifiées. Les nombres
historiques d'URLs observées sur L8 ne sont pas des fiches fraîches.

**NEXT exact (vrai gate):** pour passer de URL-only à fiches :
trouver/autoriser des pages individuelles source et produire snapshots
réels vérifiables; comparer extrait canonique L4 / AkarParser V3 par source
sur jeu de vérité étiqueté; garantir idempotence dédup provenance puis
préparer un canary privé sécurisé. Ne pas réutiliser les anciens fetchers
pour live sans contrôle de robots/conditions et nouveau GO source.
Cron 10 min reste NO-GO / hors main. Aucun déploiement Vercel.


## Sous-lot snapshots HTML L4 / V3 — préparation technique du 12 novembre 2026

Goal: comparer de façon déterministe le canonical listing extractor L4 et
AkarParser V3 avec exactement les mêmes octets HTML de détail.

Code préparé: v7_multisource/detail_compare.py et
__tests__/test_v7_detail_compare.py. Entrées: snapshots HTML explicitement
fournis, URL source et référence de capture facultative. Sorties: SHA256 HTML,
comparaison L4/V3 pour 7 champs, contradictions, qualité V3. Aucune requête
HTTP, aucune DB, zéro promotion publique, aucun droit ni fraîcheur présumés.

Indices externes indexés, NON des snapshots HTML:
- https://www.feenway.com/listings/258638 : fiche Rabat, 4,35M DH, 169 m²,
  indique Source mubawab. L'URL source Mubawab originale n'est pas certifiée.
- https://www.feenway.com/listings/256946 : fiche Rabat, 5,5M DH, 165 m²,
  indique Source Avito. Pas de preuve d'URL originale ni de disponibilité.
- FeenWay utilise « Première apparition / Détectée » : pas date éditoriale.
- Agenz publie aussi des chemins récents /fr/annonces-achat/... selon son
  robots.txt, alors que la V7 actuelle reconnaît essentiellement
  /fr/annonces/immo-... . Étendre les routes seulement après preuve réelle.

L'utilisateur arbitre les conditions d'accès; le lot ici est technique,
hors ligne et sans contournement ni prétendue capture de page réelle.

Les 5 tests du nouveau module vérifient le contrat synthétique, pas la
précision sur des snapshots réels. Next exact: collecter un corpus permis
et horodaté de fiches individuelles, comparer l'extraction des 7 champs
source par source, corriger les divergences, puis canary privé sous GO.


## Compatibilité route régionale Agenz — code SHA 1001f165, CI à vérifier

**Motif :** le robots.txt public d'Agenz mentionne le format de fiche
régionale /fr/annonces-achat/appartement/rabat-sale-kenitra/sale/tabriquet/
appartement-a-vendre-259645. Les routes de fiches déjà indexées de type
/fr/annonces/immo-sale/vente-appartements/al-qods/444291 continuent aussi.

**Corrigé en code:** agenz-source-first.mjs, V7 sources.py,
akarparser_v3_portals.py et canonical_listing_extractor.py comprennent les
deux formats (URL/ID et labels city/district/type/transaction dérivés des
segments explicites). Les validateurs d'URLs rejettent toujours les pages de
recherche. Régressions source L8 Node, pont Node vers V3, V3 portails et L4
canonical ajoutées à la CI GitHub V7.

**Contrat de preuve :** des chemins mentionnés dans un fichier robots ne
certifient PAS qu'une annonce est en ligne ou son contenu. Les tests
utilisent une URL illustrative observée dans ce fichier et HTML
synthétique. Pas de requête d'annonce, pas de données vendues/prix inventés,
aucune migration/staging/production. Nouvelle preuve CI exigée au HEAD source
1001f165b5bd284f4652c87133dfdc2b0930cf5c.

**Next exact:** confirmer CI HEAD, corriger les divergences et ne traiter
des fiches réelles qu'avec HTML brut réellement obtenu et provenance
originale démontrée. Aucun cron live ou Vercel.


## CLOSEOUT — compatibilité Agenz régionale (code 1001f165) — 5 CI PASS

**Run exact au HEAD c4cb255998e5f0781a04156213839764e38d9bfc :**
- [V7 + legacy + L4/V3 + PG17 #43317609873](https://github.com/hraaaaf/Akarfinder/actions/runs/43317609873) SUCCESS. Dans le job : Node 18/18, V3 portal 23/23, L4 canonical 9/9, cross-language V3 5/5, comparateur détail 5/5, V7 12/12, Radar10 13/13 = **85/85 tests**. 10min schedule probe skipped intentionnellement.
- [AkarParser V3 Raw Bulk #43317609870](https://github.com/hraaaaf/Akarfinder/actions/runs/43317609870) SUCCESS.
- [AkarParser V3 Private Raw Bulk #43317609905](https://github.com/hraaaaf/Akarfinder/actions/runs/43317609905) SUCCESS.
- [Radar10 Private Staging #43317609898](https://github.com/hraaaaf/Akarfinder/actions/runs/43317609898) SUCCESS.
- [CI Workflow Efficiency Policy #43317609944](https://github.com/hraaaaf/Akarfinder/actions/runs/43317609944) SUCCESS.

**Lecture unique d'une fiche Agenz officielle (observation publique,
pas fixture brute conservée) :**
- https://agenz.ma/fr/annonces/immo-sale/vente-appartements/al-qods/444291
- Le HTML sémantique rendu expose prix ACTUEL 980 000 DH (ancien 1 100 000),
  surface 104 m², « Salé – Al Qods », 3 chambres, 2 SDB.
- La description parle aussi de « quartier de Tabriquet » ; il y a
  deux désignations de quartier à examiner, sans correction automatique.
- Source publiée et disponibilité active indépendamment vérifiées : NON.
- Le lecteur de pages n'a pas fourni une archive HTML brute immuable
  sous contrôle du repo. Ne PAS présenter cette observation comme un
  benchmark de précision L4/V3 sur vrais octets HTML.

**État de vérité :** route Agenz régionale et ancienne route reconnues
par source L8 + V7 + V3 + L4. Tests synthétiques 85/85 PASS, mais
aucun inventaire d'annonces nouvelles n'est importé. FeenWay demeure
indexé (quelques exemples montrent badges sources Avito/Mubawab), aucune
URL source originale indépendante certifiée, aucun connecteur FeenWay.

**Next exact :** jeux d'échantillons bruts horodatés de fiches détails
originelles; benchmark champ par champ et qualité de quartier/ancien prix,
puis raccordement contrôlé à staging privé. GH Actions cron 10min non actif,
PR non merged, 0 Vercel et aucune modification Supabase.


## Correctif Agenz prix barré — 12 novembre 2026

Code SHA 4b4205e2d6b200153ce20124ed1c024014d70d53 : comparaison stricte de prix actuel suivant un ancien prix barré, dans le HTML Agenz. Le parseur conserve le prix actuel 980000 DH quand le prix antérieur 1100000 DH est barré, ne confond pas les frais syndic 100 DH et rejette les séquences contradictoires. Tests synthétiques ajoutés dans test_akarparser_v3_portals.py. HTML véritable non archivé : qualité de la règle sur des captures brutes non certifiée. Quartier Al Qods / Tabriquet à revoir, sans correction automatique. Vérifier CI au code SHA ; aucune collecte LIVE, staging privé ou PROD, cron, merge ou Vercel. Next : capture HTML brute avec hash et vérité annotée par portail.


## Closeout CI prix barré — preuves exactes

SHA code 4b4205e2d6b200153ce20124ed1c024014d70d53, cinq jobs GitHub vérifiés COMPLETED SUCCESS : V7 #43322027038 = 18 tests Node + 25 V3 portails + 9 L4 + 5 pont URL + 5 benchmark comparatif + 12 V7 + 13 Radar10 = 87/87 PASS ; V3 regression #43322027114 SUCCESS ; CI efficiency #43322027013 SUCCESS ; Radar10 #43322026928 SUCCESS ; V3 private #43322026927 SUCCESS. Aucun test de source réelle ni de date de publication indépendamment certifiée. Cron 10min toujours désactivé. Prochaine action technique : archiver un vrai HTML brut de page individuelle avec SHA et comparaison L4/V3 des sept champs, notamment prix barré et quartier contradictoire ; FeenWay origine dupliquée à confirmer. Pas de merge, DB, Vercel.

## 12 novembre 2026 — Conflit de quartier Agenz => revue manuelle

Goal : comparer le quartier issu de la route Agenz à une assertion explicite du champ meta description de la fiche, et bloquer toute fausse certitude.
Code SHA cea6e6d405c55c10b092573fda18bdfbf1deb8af : akarparser_v3_portals.py detecte pour Agenz uniquement un quartier de X explicite dans og:description / meta description et le compare au quartier de la route. En cas de contradiction, akarparser_v3_raw_bulk.py signale AGENZ_EXPLICIT_NEIGHBORHOOD_CONFLICT_REQUIRES_REVIEW et human_review_required. La valeur de quartier n'est pas réécrite arbitrairement.
Deux tests supplémentaires : quartier Al Qods dans route contre Tabriquet dans description = revue ; Al Qods contre Al Qods = pas de revue.
Source de constat : la fiche publique Agenz /fr/annonces/immo-sale/vente-appartements/al-qods/444291 consultée antérieurement, prix courant 980000 DH, ancien barré 1100000 DH, surface 104m2, quartier Al Qods affiché, Tabriquet mentionné dans la description.
Limite : seul HTML rendu sémantique disponible par le lecteur, aucun snapshot source brut immuable conservé, qualité sur vrais HTML non certifiée. CI exact SHA à vérifier. 0 source live GitHub, 0 DB writes, aucune fusion/cron/Vercel.
Next : CI → snapshots HTML originaux hachés et datés → benchmark 7 champs L4/V3 → correctifs → canary staging privé et validations distinctes.
## 12 novembre 2026 — Raw HTML evidence pack et benchmark hors production

GOAL : disposer d'un format vérifiable pour archiver exactement les octets HTML d'une fiche réelle, la date UTC de capture, URL source, statut HTTP et SHA256, puis comparer les 7 champs L4/V3 hors ligne.
NEW scripts/acquisition/v7_multisource/snapshot_evidence.py : CLI offline --verify-folder FOLDER et capture unique --capture-url URL --private-output FOLDER --capture-approved-once. Toute capture réseau exige EN PLUS la variable AKAR_SOURCE_NETWORK_APPROVED=approved et ne fait qu'une requête HTTPS GET identifiée, sans redirection, proxy, cookies, retry ou contournement. Capture locale privée chmod 0600; nom de fichier source.html et source.manifest.json; hash SHA256, timestamp UTC, HTTP 200 et type HTML vérifiés au replay. Aucun commit des captures sources. Les tests CI n'activent jamais la capture.
Tests d'intégrité dans scripts/acquisition/__tests__/test_v7_snapshot_evidence.py : SHA UTC exact, rejet de bytes falsifiés, refus métadonnées falsifiées/extra, chaînage réel L4↔V3 sur fixture synthétique, double gate réseau et refus symlink / faux HTML. AUCUN corpus source brut réel acquis pour l'instant : preuve synthétique uniquement.
Source disponible : quelques fixtures HTML Yakeey du dépôt existent mais portent sur le référentiel de prix au m², PAS des annonces individuelles; ne pas les transformer en faux prix d'offres. Le PC autorisé DESKTOP-3MAJEEH reste OFFLINE, et la récupération directe de l'URL Agenz a échoué par DNS. Le lecteur externe ne fournit que HTML sémantique rendu, non une archive brute immuable.
SUCCESS requis : passage CI au HEAD code (à vérifier), puis une capture réelle avec manifest contrôlé et 7 champs de vérité annotés pour certifier précision, puis source originale FeenWay, autres portails, canary staging et activation sous gates. 0 DB, 0 merge, 0 cron actif, 0 Vercel.

## Clôture raw HTML evidence CI — code HEAD eaa1a16d (12 novembre 2026)

Code SHA eaa1a16d744812440c0071aedacb0b6e0746a130 : correction import v7_multisource.detail_compare après premier run rouge #43328833194 (ModuleNotFoundError).
V7 GitHub Actions #43329012513 COMPLETED SUCCESS : Node 18 + V3 portails 27 + L4 9 + Node→V3 5 + comparateur détail 5 + raw HTML evidence 6 + V7 12 + Radar10 13 = 95/95 tests PASS. Gate calendrier 10 min volontairement SKIPPED.
Quatre autres workflows à ce même SHA : V3 regression #43329012652 SUCCESS, V3 Private #43329012747 SUCCESS, Radar10 #43329012913 SUCCESS, CI Policy #43329012500 SUCCESS. Code hors production validé.
Preuve VALIDÉE : intégrité octet par octet d'un document HTML fourni, manifeste SHA256 + date UTC + URL + statut HTTP, refus falsification/symlink, replay sur vrai L4/V3; mode réseau disabled par défaut et double opt-in obligatoire. Preuve NON VALIDÉE : aucun fichier HTML source brut d'annonce réelle n'a été archivé, aucun benchmark de précision terrain, ni URL source FeenWay originale certifiée.
GOAL lot live non atteint. Machine distante DESKTOP-3MAJEEH offline, DNS direct agenz.ma bloqué côté container; le lecteur de pages a uniquement fourni HTML sémantique rendu. Les fixtures Yakeey du repo sont des indices de prix au m², pas des détails d'annonces.
Next exact : dès qu'un accès réseau autorisé aux pages source est disponible, commande opérateur de capture unitaire avec les deux gates et stockage privé; vérifier hash+UTC+HTTP 200; annoter 7 champs et comparer V3/L4, puis canary staging isolé. Le cron Actions main, Supabase, merge et Vercel exigent des autorisations distinctes.

## J1 — CLOSEOUT preuve réelle / 1 fiche Agenz / 7 champs

**GOAL J1 : atteint au niveau technique limité à une fiche réelle**, et
aucune couverture multi-site certifiée. Conserver le statut « validation
terrain non représentative » (seulement 1 source).

**Preuve brute :** URL Agenz /fr/annonces/immo-sale/vente-appartements/al-qods/444291,
capture GitHub Actions [#43330609367](https://github.com/hraaaaf/Akarfinder/actions/runs/43330609367)
du 12 novembre 2026 à 23:39:02Z, statut HTTP 200,
237450 octets, SHA-256
`788355d9050f4b3ee6061c51ebf259c89acff19bb583a03a895ab8889ece6d61`
recalculé localement sur le HTML ZIP / manifeste, archive GitHub privée
[#13993958357](https://github.com/hraaaaf/Akarfinder/actions/runs/43330609367/artifacts/13993958357)
(rétention 1 jour seulement).
Deuxième capture réelle : [#43331534434](https://github.com/hraaaaf/Akarfinder/actions/runs/43331534434),
23:45:46Z, 237450 octets, SHA différent
`4bc28c2ca3eeaf74353290fc075f3fc228cd00d619d51daad08b20930f2cc241`
avec attributs chiffrés de carte changeants ; même site-ID.
Le deuxième GET provient d'un ancien marquage pull_request déclenché à
nouveau par un commit, **non prévu**. Ce mécanisme a été supprimé au
commit `617295768363426b57cf3e3accb738334b219688`. Le workflow J1
actuel est uniquement OFFLINE REPLAY : **aucun nouveau GET au site**.

**Diagnostic initial :** L4 et V3 lisaient incorrectement 1 100 000 DH
(prix barré, `data-old-price`) ; la source HTML affiche 980 000 DH
(`data-price`) comme prix courant. Deux correctifs successifs :
validation des marqueurs source old/new + suppression fallback V2 vers
l'ancien prix, sans dépendance externe BS4 nouvelle dans les pipelines
historiques. L4 sait fonctionner en import autonome.

**Résultat après correction sur les octets réels :**
- [J1 offline replay #43331725808](https://github.com/hraaaaf/Akarfinder/actions/runs/43331725808)
  SUCCESS: **L4=980 000**, **V3=980 000**, surface **104 m²**,
  statut conflit de quartier (Al Qods vs Tabriquet) en révision.
- [CI V7 #43332395922](https://github.com/hraaaaf/Akarfinder/actions/runs/43332395922)
  SUCCESS: **99/99 tests**, dont tests structure DOM source.
- [J1 offline replay #43332395921](https://github.com/hraaaaf/Akarfinder/actions/runs/43332395921)
  SUCCESS ; [V3 raw #43332395915](https://github.com/hraaaaf/Akarfinder/actions/runs/43332395915),
  [V3 private #43332395962](https://github.com/hraaaaf/Akarfinder/actions/runs/43332395962),
  [Radar10 #43332395996](https://github.com/hraaaaf/Akarfinder/actions/runs/43332395996)
  et [CI Policy #43332395928](https://github.com/hraaaaf/Akarfinder/actions/runs/43332395928)
  sont également tous SUCCESS au code SHA `415659ded1e68e2ab54aaf06873b189918af93db`.

**Comparaison des sept champs :** titre, prix, surface, type, transaction
= accord L4/V3 (5/7). L4 ne remplit pas ville/quartier (V3=Sale et
Al Qods), avec mention contradictoire Tabriquet dans la description.
**5/7 n'est PAS la précision certifiée d'un corpus ni une validation
géographique** : l'annotation indépendante reste une tâche de qualité
pour J2/J3. L'admission publique demeure bloquée, disponibilité/fraîcheur
non vérifiées, DB écriture=0.

**Preuve détaillée et procédure de reprise :**
`docs/data/AKARFINDER_V7_J1_REAL_HTML_AGENZ_444291_2026-11-12.md`.

**Séquence restante :** J2 FeenWay provenance/URLs originales →
J3 Agenz multi-exemples, ville/quartier & exactitude terrain →
J4 Avito/Yakeey/Sarouty → J5 autres sources →
J6 staging privé durable/anti-rejeu → J7 canarys/cron 10min sous GO,
monitoring 24h. Aucun merge/Vercel/Supabase PROD/cron live.


## FeenWay priorité 1 — sous-lot d'adaptateurs de provenance OFFLINE (13 novembre 2026)

Le fichier source privé fourni `feenway_akarfinder_import.zip` contient **82 166 observations FeenWay et 0 URL/ID d'annonce des portails originaux**. FeenWay est un agrégateur : les domaines CDN des photos ne constituent **jamais** une identité de source et ne permettent pas une promotion vers les bases produit.

[PR Draft #1211](https://github.com/hraaaaf/Akarfinder/pull/1211) empilée sur cette V7 : nouveau module d'audit ZIP `feenway_provenance.py` (7 tests), et nouveau `feenway_snapshot_links.py` (12 tests) qui **réutilise** `v7_multisource.snapshot_evidence.verify_evidence` pour un HTML original fourni de fiche FeenWay. SHA256 + manifeste + pin attendu, canonical/og:url exacts, unique lien explicite « Voir sur <portail> », URL/ID source analysés conservativement, aucun accès réseau/DB. Sortie `SUPPLIED_HTML_SELF_DECLARED_LINK_QUARANTINE_ONLY` ; `eligible_for_public_admission=false` et `eligible_for_radar10_private_staging=false`.

**CI du commit de code** `5c6166d92c32306874188c6a86cf100ad2171ac8` : [V7 run #43421661472](https://github.com/hraaaaf/Akarfinder/actions/runs/43421661472) SUCCESS, FeenWay 12/12 tests HTML PASS contre véritable V7, tests initiaux FeenWay et régressions V3/PostgreSQL/Radar10 PASS, cron SKIPPED ; [CI policy #43421661482](https://github.com/hraaaaf/Akarfinder/actions/runs/43421661482) SUCCESS.

**Vérification limitée (non extrapolable)** : 10/10 fiches FeenWay consultées fournissent un lien vers site original ; 6/8 destinations vérifiées sont des fiches accessibles, 1 Avito redirigée vers catégorie, 1 Sarouty HTTP 410. Des anomalies métier bloquent l'admission (FeenWay 180678 3 900 DH/mois contre Masaken 14564 3 900 DH/jour ; FeenWay 222666 Appartement vente contre titre Mubawab Terrain location). Les 12 tests automatiques sont synthétiques et **aucune vraie capture HTML immuable FeenWay n'est encore fournie**.

**BLOCAGE EXTERNE** : fichiers bruts de la collecte initiale inaccessibles ; Windows AI Machine Bridge en mode heartbeat sans accès fichiers, Desktop Commander offline. Préférer extraction/ réexport du collecteur original avec liens et IDs source plutôt que revisiter 82 166 pages sur FeenWay. En alternative, obtenir des HTML bruts individuels traçables et SHA indépendants. Ensuite rapprocher les vraies fiches sources, prix et période, dédoublonner et tester les adaptateurs V7 → AkarParser V3 / Radar10 privé ; gate distinct avant DB / merge / cron / Vercel.

**Décision :** 82 166/82 166 en quarantaine, 0 admission, 0 HTTP massif, 0 DB, 0 merge, 0 Vercel. **V7 reste 2/8 jalons clôturés** ; aucune couverture FeenWay ou fraîcheur source certifiée. Rapport détaillé : `docs/data/AKARFINDER_V7_FEENWAY_PROVENANCE_2026-11-13.md`.
