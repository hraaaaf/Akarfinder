# AKARFINDER — V7 MULTISOURCE GITHUB ACTIONS — 2026-11-12

## Décision de reprise canonique — 13 novembre 2026 (recentrage utilisateur)

**Décision explicite :** le lot J2 lié à l'agrégateur tiers est **écarté du chemin critique**. Ne plus chercher ses archives, relancer son collecteur ni conditionner l'avancement V7 à ses données. Conserver les preuves historiques pour audit sans en déduire une admission ou une clôture J2. Aucun changement du périmètre des autres jalons.

**Séquence canonique active :** J3 Agenz (5 archives HTML originales conservées, intégrité 5/5 PASS, précision géographique 0/5 admise) → J4 Avito/Yakeey/Sarouty (18/18 tests PASS pour contrat hors ligne ; HTML original/identité indépendante non certifiés) → J5 autres portails (13/13 tests PASS sur URL synthétiques → vrai V3, toujours source_snippet_only) → J6 staging privé (non activé) → J7 ordonnanceur 10 minutes (non activé). J0/J1 seuls fermés : **2/8 jalons entièrement clos**. J2 reste ouvert mais hors chemin critique, pas artificiellement « terminé ».

**Gate effectif :** travailler d'abord sur preuves amont autorisées (HTML original, champs comparés, localisation indépendante, dédoublonnage), sans insérer de candidat en DB. Les sous-lots de contrat hors ligne J3–J5 étant clôturés, ne pas répéter leurs tests sans nouveau changement. Le durcissement J6/J7 (authentification, isolation, ledger/fencing durable et permissions minimales) relève d'un effort élevé distinct : ne pas l'engager sans changement de niveau. Aucune collecte récurrente, migration/staging actif, merge, déploiement Vercel ou publication autorisée.

**État documentaire :** décision de priorisation uniquement, sans nouveau code, capture live ou certification supplémentaire. Les détails et preuves demeurent dans les documents J3/J4/J5 et les PR Draft #1206–#1210.


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


## 2026-11-13 — Reprise source-first J3/J4/J5, gates de vérité maintenus

**Périmètre décisionnel inchangé :** J2 agrégateur tiers hors chemin critique, aucune nouvelle roadmap, aucun merge/staging/cron source/DB/Vercel. J0/J1 seuls fermés (2/8), J3/J4/J5 restent ouverts.

**J3 Agenz** : 5 HTML bruts privés sauvegardés, SHA256 du bundle a1fb0a2ccf59fc57955abf15b4a4e4986e44bd7e534aeddd1d256dd45b37f037, 5/5 SHA originaux conformes. Nouvel audit de cohérence hors ligne en [PR #1206](https://github.com/hraaaaf/Akarfinder/pull/1206) : 1 titre « 4 chambres » alors que caractéristiques « 3 chambres » (#387448) ; 5/5 paires data-lat/data-lng chiffrées au format Salted__, jamais utilisées pour géolocaliser. La [Commune de Salé](https://fr.villedesale.ma/arrondissements/arrondissement-tabriquet/) place Al Qods dans l'arrondissement Tabriquet : un désaccord de libellés ne prouve pas nécessairement deux lieux exclusifs ; la [Commune](https://fr.villedesale.ma/zones-industrielles/) distingue toutefois deux zones industrielles Hay Rahma et Tabriquet. Aucune de ces observations ne certifie le bien réel : **0/5 géolocalisations autorisées**. Code J3 SHA bb842259bcfd7d37ddf3e20bcbac75f8d947edee, tests unitaires locaux 6/6 PASS et audit privé sur vraies archives ; **CI exacte à vérifier**. Premier run précédent #43454446109 FAILED sur une conversion de type UTF-8 dans le nouvel auditeur après 6/6 tests ; correctif appliqué au nouveau code SHA. Distinguer une CI verte d'un test de donnée originale certifiée.

**J4 Avito/Yakeey/Sarouty** : [fiche directe Sarouty 894012](https://www.sarouty.ma/acheter/appartement-sale-bab-al-bahr-894012/) lisible dans un lecteur public : appartement Salé/Bab al bahr 3 500 000 DH, 196 m², 3 chambres, 2 SDB, réf. agence 3199. **Simple témoin original rendu**, sans manifeste de HTML brut horodaté, donc non admissible. [PR #1207](https://github.com/hraaaaf/Akarfinder/pull/1207) HEAD doc 0c97dc0a83cb7670889dc6d8e552359cb21baa6a ; Avito et Yakeey restent non qualifiés.

**J5 Mubawab/MarocAnnonces et autres** : [Mubawab #8413785](https://www.mubawab.ma/fr/a/8413785/appartement-%C3%A0-vendre-104-m%C2%B2-3-chambres-al-qods-sal%C3%A9) reprend référence SAL-TA-1004 et description de [Agenz #444291](https://agenz.ma/fr/annonces/immo-sale/vente-appartements/al-qods/444291). Cela montre une offre publicitaire répliquée et un **risque de doublon inter-portails**, pas une attestation indépendante du quartier ou d'un bien physique. HTML source original SHA/UTC non archivé ; MarocAnnonces et les autres portails toujours non qualifiés. [PR #1208](https://github.com/hraaaaf/Akarfinder/pull/1208) HEAD doc b4662063e1feb4eb34108581b3f66ea482a8b9a3.

**Next exact :** conclure CI J3 à SHA corrigé, traiter tout échec, conserver 0/5 index geo ; archiver par canal autorisé des HTML originaux Sarouty et Mubawab avec SHA/UTC/ID et benchmark L4↔V3 ; qualifier puis dédupliquer avant gate J6, J7. Pas d'activation sans preuves et gates distincts.


### Reprise J3/J4/J5 — CI du correctif et des preuves source, 13/11/2026

- **J3 code SHA bb842259bcfd7d37ddf3e20bcbac75f8d947edee : 6/6 workflows SUCCESS**, dont [rejeu cinq originaux #43454800957](https://github.com/hraaaaf/Akarfinder/actions/runs/43454800957), 6 nouveaux tests unitaires PASS, 5 archives rejouées, 1 titre/chambres discordant et 5 paires de coordonnées chiffrées détectées. [One-shot #43454800884](https://github.com/hraaaaf/Akarfinder/actions/runs/43454800884) SUCCESS administratif mais étapes HTTP SKIPPED, **0 capture nouvelle**. Le premier échec #43454446109 est diagnostiqué/corrigé ; ne pas le masquer.
- **J4 PR #1207 HEAD documentaire 0c97dc0a83cb7670889dc6d8e552359cb21baa6a** : [J4 #43454611280](https://github.com/hraaaaf/Akarfinder/actions/runs/43454611280) + [policy #43454611620](https://github.com/hraaaaf/Akarfinder/actions/runs/43454611620) SUCCESS. Preuve de page publique Sarouty seulement, pas une capture HTML brute.
- **J5 PR #1208 HEAD documentaire b4662063e1feb4eb34108581b3f66ea482a8b9a3** : [J5 #43454661299](https://github.com/hraaaaf/Akarfinder/actions/runs/43454661299) + [policy #43454661350](https://github.com/hraaaaf/Akarfinder/actions/runs/43454661350) SUCCESS. Dupliqué commercial cross-portails identifié en lecture ; pas de vérité terrain indépendante.
- Aucun changement de statut : **2/8 jalons clos**, J3/J4/J5 métier ouverts. Prochaine preuve primaire : localisation indépendante des biens J3 et HTML brut d'origine des candidats J4/J5 via canal autorisé, puis dédup, J6/J7, gates opérateur. Pas de merge, DB/staging/cron live, ni Vercel.



## 13/11/2026 — V7 reprise accélérée : preuves J4/J5 et sécurité J6/J7 vérifiées

**Décision utilisateur maintenue :** J2 agrégateur tiers hors chemin critique. Jalons canoniques existants J3→J7 uniquement. Aucun merge, SQL privé réel, admission, cron live ni Vercel. V7 **2/8 jalons métier clôturés**, pas une estimation de pourcentage global.

**J3 (PR #1206)** : dernier HEAD closeout 2dc3470656906f7ff4d235bc2e8a2cc9d014b3f2, [6/6 CI SUCCESS dont replay vrai HTML #43455214463](https://github.com/hraaaaf/Akarfinder/actions/runs/43455214463). 5 archives Agenz authentiques, 1 contradiction 4 vs 3 chambres, 5 paires de coordonnées chiffrées. 0/5 coordonnées indépendantes. Sous-lot cohérence clos, J3 métier ouvert.

**J4 Sarouty (PR #1207)** : le rendu actuel direct de https://www.sarouty.ma/acheter/appartement-sale-bab-al-bahr-894012/ affiche URL finale/canonical/og:url concordants, offre 3 500 000 DH, 196m², appartement vente à Bab al bahr, Salé, 3 chambres, 2 SDB, réf. 3199. Publication portail déclarée 2025-10-28, modification portail déclarée 2026-09-07 ; **aucune disponibilité actuelle certifiée**. Rendu HTML sémantique nettoyé par lecteur JS : **pas de HTML source brut immuable** exigé par gate existant. Docs [commit ad3c764](https://github.com/hraaaaf/Akarfinder/commit/ad3c76411832be3cc205d7b762df75b024a3cb2e), [CI J4 #43464103952](https://github.com/hraaaaf/Akarfinder/actions/runs/43464103952) + policy #43464103981 SUCCESS. J4 métier ouvert.

**J5 Mubawab (PR #1208)** : l'ancienne fiche #8413785 redirige désormais vers page de recherche El Qods, ne doit pas devenir preuve individuelle ou doublon certifié. Deux **vraies pages individuelles rendues** à partir de liens source : https://www.mubawab.ma/fr/a/8429897/appartement-%C3%A0-vendre-143-m%C2%B2-2-chambres-al-qods-sal%C3%A9 (1 595 000 DH, 143m², 2 ch., réf. AGENZ SAL-TA-1009 ; la description parle de 145m² et 4e étage contre 143m² et 5e étage dans les caractéristiques) ; et https://www.mubawab.ma/fr/a/8422456/appartement-%C3%A0-vendre-106-m%C2%B2-3-chambres-al-qods-sal%C3%A9 (1 350 000 DH, 106m², 3 ch., réf. AGENZ SAL-TA-1007). Ces observations sont de HTML sémantique nettoyé sans empreinte du HTML brut/manifest ni canonical authentifié. Doublon commercial probable à examiner, **jamais une unicité physique prouvée**. Docs [commit 8cc11e7](https://github.com/hraaaaf/Akarfinder/commit/8cc11e772097febcd994b4df77ccf51c0d22999c), CI documentaire à vérifier. J5 métier ouvert.

**J6 (PR #1209)** : nouveau vérificateur de capture HMAC-SHA256 signé par clé de confiance extérieure, liaison URL/ID source, SHA HTML et manifeste, périodes d'émission/expiration, puis replay du vrai V3 et gate no-write. [CI code #43461891564](https://github.com/hraaaaf/Akarfinder/actions/runs/43461891564) **SUCCESS 33/33 tests** (10 readiness, 7 HTML/V3, 10 MAC, 6 PostgreSQL 17 isolé). Docs [SHA f8fc444](https://github.com/hraaaaf/Akarfinder/commit/f8fc4442ed3232d9ad17a1f39737a815388948cf), CI documentaire à vérifier. La clé et l'émetteur ne sont pas certifiés sur source réelle, signature symétrique non idéale pour multi-acteurs, registre anti-rejeu durable absent. 0 admission. Sous-lot cryptographie hors ligne clos, J6 complet ouvert.

**J7 (PR #1210)** : rôle propriétaire non-superuser NOLOGIN/NOBYPASSRLS, deux tables FORCE RLS et fonction de marqueur transactionnel sous jeton actif/row lock ; aucun effet externe autorisé. [CI code #43463575848](https://github.com/hraaaaf/Akarfinder/actions/runs/43463575848) **SUCCESS 21/21** (9 temps/SQLite + 12 PostgreSQL 17, dont 4 tests supplémentaires). Premier run rouge SQL syntaxe et deuxième rouge sur variable PL/pgSQL, corrigés. [Docs SHA 8b6e6dc](https://github.com/hraaaaf/Akarfinder/commit/8b6e6dc6bf36681fa18f3941454b6c1269c7b9e9), CI documentaire [J7 #43464393440](https://github.com/hraaaaf/Akarfinder/actions/runs/43464393440) et policy #43464393450 SUCCESS. Sous-lot non-superuser/fencing local clos, mais aucun registre réellement durable partagé et pas de fencing sur les effets externes. J7 complet ouvert.

**Next exact court et vérifiable :** 1) conclure CI documentaire J5/J6 et ce HEAD V7 ; 2) obtenir par une voie autorisée **au moins un HTML brut original Sarouty/Mubawab** avec statut HTTP, URL canonique, ID, SHA/UTC immuables et replay sept champs ; 3) distinguer les contradictions visibles et la diffusion multi-portails ; 4) seulement après preuve authentifiée J6, migration privé dédiée/registre durable J7 avec owner non-superuser et gate opérateur distinct ; 5) canary 24h après autorisation de cron, puis merge et Vercel uniquement après GO séparés. Aucun automatisme de publication créé.



## 13 novembre 2026 — Première vraie source J4, anomalie géo, J5 non franchi

**Première preuve source native J4 (#1207) :** [run one-shot #43474551252](https://github.com/hraaaaf/Akarfinder/actions/runs/43474551252), job Sarouty #894012 SUCCESS sur un GET direct HTTPS après robots.txt autorisant. HTML original **183331 octets**, HTTP200, capture **2026-11-13T17:37:19Z**, SHA256 **019a2cf51b6e188270b4a7c9d4f830cc31245fe9d1dbee50ac9e7e9bad12e145**, URL https://www.sarouty.ma/acheter/appartement-sale-bab-al-bahr-894012/. Manifeste/SHA/URL/ID L8/canonical/og:url originaux vérifiés. Gate J45 et L4/V3 PASS sur sept comparaisons, mais **seulement six champs non nulls sur sept** : district NULL, aucun staging autorisé. Prix 3500000 MAD, surface 196m², ville Sale, appartement vente.

**Archive reproductible :** [artifact GitHub privé #14062665412](https://github.com/hraaaaf/Akarfinder/actions/runs/43474551252/artifacts/14062665412), expires après 1 jour ; original préservé dans Library privée /AkarFinder/V7/private/AKARFINDER_V7_J4_SAROUTY_894012_SOURCE_ORIGINALE_2026-11-13.zip, libfile_ab1ff06fb2f881918e6f29ae753bc2bb. Contrôles locaux ZIP/CRC/manifest/HTML PASS ; SHA ZIP **e1dff0dcc93c61853977e1dd1be5c65e7d19e0913a15ebd90e77c59473b755c5**. Rapport JSON indépendant archivé Library libfile_5f833d00e6588191b8b85003a7e49369. Aucun raw HTML en Git.

**Alerte géographique réelle :** le JSON-LD RealEstateListing de la source affirme city Sale, region Bab al bahr, mais geo=31.7948264/-7.0847231, à **252.5 km** du centre de Salé de [GeoNames](https://www.geonames.org/2537763/sale.html) (34.0531/-6.79846). Erreur ou contradiction géographique de la source, interdiction de mapper la coordonnée. Nouveau module fail-closed j45_sarouty_source_geo_audit.py + dix tests. [CI J4 #43476560653](https://github.com/hraaaaf/Akarfinder/actions/runs/43476560653) **SUCCESS 28/28** (18 Node + 10 Python) ; [policy #43476560649](https://github.com/hraaaaf/Akarfinder/actions/runs/43476560649) SUCCESS. HEAD PR J4 code+docs **3d6c124e131071f7b6202d4bdf87554e157556a1**, non mergée.

**J5 Mubawab** : un GET original individuel #8394751 retourne HTTP200 text/html mais le contrôle des octets rejette INVALID_RAW_CAPTURE, sans preuve conservée. Aucune archive Mubawab certifiée. Ne pas retenter le même point d'accès à l'aveugle.

**Erratum d'incident réseau** : le filtre paths des workflows PR a déclenché une deuxième exécution non voulue [#43474887096](https://github.com/hraaaaf/Akarfinder/actions/runs/43474887096) après modification du workflow pendant présence du marqueur. **Total effectif : 2 GETs Sarouty et 2 GETs Mubawab**, pas un seul par site comme prévu. La deuxième réponse Sarouty contient les mêmes octets/même SHA ; Mubawab encore INVALID_RAW_CAPTURE. Les scripts temporaires ne persistent plus : marqueur supprimé (dbc49d1fd05e29caf7abad6378b8eec35dfbddc9), puis workflow de capture supprimé (79d40f181122938c979ed66faa6bfce6da074d7c), deux chemins vérifiés absents au HEAD J4. Ne pas réinstaller sans barrière d'idempotence durable.

**Décision** : sous-lot J4 HTML original vérifié + contrôle geo source validé. J4 métier reste **OUVERT** (district et identité géographique indépendante/fraîcheur/autres portails non certifiés), J5 **OUVERT**. V7 reste **J0/J1 seuls clos = 2/8 jalons**, aucun staging/DB, cron source live, publication, merge ni Vercel.

**Next** : via autre canal autorisé obtenir un HTML natif Mubawab certifié sans répéter le GET qui a échoué ; réconcilier labels Sarouty source et attestation géographique indépendante ; puis J6/J7 registre durable et gates opérateur.


## 13/11/2026 — J5 syndication commerciale réellement recoupée, sans capture Mubawab

**CI parent au HEAD précédent :** SHA b32505c1c13db5ea663e9082b35bf65e9411d20c, **6/6 workflows COMPLETED/SUCCESS** (dont [contrat V7 #43477316657](https://github.com/hraaaaf/Akarfinder/actions/runs/43477316657), CI policy #43477316554, AkarParser V3 privé #43477316441, Radar10 privé #43477316671). Ces runs n'admettent aucune annonce.

**Avancement J5 (PR Draft #1208)** : après le HTML brut Sarouty J4, un vrai rapprochement inter-portails **commercial uniquement** est désormais documenté sur deux références encore visibles dans des pages directes, pas des données de test inventées :

- **SAL-TA-1007** : [Agenz #77532](https://agenz.ma/fr/annonces/immo-sale/vente-appartements/al-qods/77532) ↔ [Mubawab #8422456](https://www.mubawab.ma/fr/a/8422456/appartement-%C3%A0-vendre-106-m%C2%B2-3-chambres-al-qods-sal%C3%A9), **1 350 000 DH / 106 m² / 3 chambres**, Al Qods Salé, 2e étage.
- **SAL-TA-1009** : [Agenz #175885](https://agenz.ma/fr/annonces/immo-sale/vente-appartements/al-qods/175885) ↔ [Mubawab #8429897](https://www.mubawab.ma/fr/a/8429897/appartement-%C3%A0-vendre-143-m%C2%B2-2-chambres-al-qods-sal%C3%A9), **1 595 000 DH / 143 m² / 2 chambres**, Al Qods Salé. La **source Agenz elle-même** contredit caractéristiques (143 m², 5e étage) et description (145 m², 4e étage), contradiction reprise par Mubawab.

**Code source-only** : scripts/acquisition/v7_parallel/j5_commercial_mirror_review.mjs compare référence commerciale + identité de portail/URL/ID + 5 champs déclarés pour produire une classe de **revue de syndication**, jamais de preuve d'unicité physique, de géographie, d'original HTML ou d'admission. Source d'observation = **rendu sémantique non authentifié** ; fail-closed sur divergences, faux domaine, ID, marqueurs d'admission forgés et entrées hors limite. [J5 CI #43479222455](https://github.com/hraaaaf/Akarfinder/actions/runs/43479222455) **22/22 tests Node et 3/3 Python PASS, 25/25**, [policy #43479222666](https://github.com/hraaaaf/Akarfinder/actions/runs/43479222666) SUCCESS au code SHA e76d0c6cde2b782c8b131fbd51ef036160431b55. Documentation J5 [SHA 2b3eb6e](https://github.com/hraaaaf/Akarfinder/commit/2b3eb6ecb13b47ba08be394580f5228d82d3f1da), CI du HEAD documentaire à confirmer indépendamment.

**Portée et gates :** 2 liens commerciaux à examiner, 0 même bien physique certifié, 0 droit à recopier une localisation, 0 HTML HTTP original Mubawab, 0 admission. J5 **OUVERT**, J4 source Sarouty limitée, J6/J7 restent des gates avec registre durable/attestation indépendante à établir. V7 **2/8 jalons métier clôturés** ; pas de merge, DB, cron source LIVE, Vercel.

**NEXT exact** : vérifier HEAD de J5/documentation et CI du HEAD V7 canonique ; puis acquérir un vrai original Mubawab via export/partage autorisé (et non répéter les deux GET rejetés), certifier les sept champs, et utiliser les rapprochements commerciaux uniquement dans une revue de dédup avant gate J6.



## 13/11/2026 — Nouveau résultat prouvé : archive historique native Mubawab (J5) et pont Sarouty→J6

**J5 PR Draft #1208 :** archive publique Common Crawl WARC retrouvée depuis le corpus privé des 934 URLs historiques, sans nouveau GET Mubawab : détail individuel Mubawab **#8205911**, https://www.mubawab.ma/fr/a/8205911/appartement-de-106m2-bouskoura-ville-verte ; capture WARC CC-MAIN-2026-39 du **2026-09-05T21:01:42Z** ; statut originel HTTP200, index digest SHA1 **GY5Z4MOTJBFVBIPIOC6QB3ZVJCVF5L3V** exactement vérifié par recalcul sur le corps HTTP. Octets originaux HTML **341668**, SHA256 **b59bef5a2a206e1182bbbcb72f799a24d3d19905d7ba02d6e307ec3361f78743** ; segment gzip WARC **54725 octets**, SHA256 **19b3db36d3f17423c0aa59c0e306e68f3faac434b40aaf4a44f74e29a24afa4a**. ZIP final SHA256 **8701db5a09462f9e895ae46808ba97c990836dcb25a66d8b4e007008e177c7d5**, CRC et hachages vérifiés.

**C'est une preuve historique seulement** : la fiche annonce une **location à 9000 MAD**, 106m², 2 chambres et 3 SDB ; aucune canonical/og:url dans HEAD. Pas de preuve de vente actuelle, disponibilité, publication, propriété physique ni géolocalisation certifiées. Interdiction de la faire passer pour capture directe J45, de convertir son horodatage archiviste en fraîcheur actuelle ou de l'admettre en privé/public. WARC+HTML+index+manifest conservés uniquement dans Library privée : /AkarFinder/V7/private/AKARFINDER_V7_J5_MUBAWAB_8205911_COMMONCRAWL_WARC_VERIFIE_2026-11-13.zip, libfile_dd6a4c19043c81918895fea6dc02fdd5 ; aucun raw dans Git. Artifact GitHub temporaire [#14083006498](https://github.com/hraaaaf/Akarfinder/actions/runs/43520352338/artifacts/14083006498). Workflow temporaire supprimé commit ea971666f33f06b3aa1f795de0882a883695affd.

**Débogage traçable** : deux premiers runs Common Crawl refusés avant réseau par mauvais contrôle du HEAD de PR ; deux runs suivants ont effectivement lu un seul segment WARC depuis **data.commoncrawl.org**, jamais Mubawab. Le 3e a rejeté des en-têtes répétables ; le 4e a sauvegardé l'original pour inspection. Correctif ciblé WARC-Protocol/Set-Cookie répétés (sauf en-têtes d'identité critiques) + deux tests adversariaux supplémentaires. **Code CI SHA 5b2d405aefb5287ecf9e6483e1e577a977785140, [J5 #43520890267](https://github.com/hraaaaf/Akarfinder/actions/runs/43520890267) SUCCESS 38/38 tests : 22 Node, 13 WARC Python, 3 V3 Python ; [Policy #43520890248](https://github.com/hraaaaf/Akarfinder/actions/runs/43520890248) SUCCESS.** Docs J5 [SHA 2221966](https://github.com/hraaaaf/Akarfinder/commit/2221966fc6fbb3e078064ebe6cd709216fe6b835), CI de son HEAD à vérifier.

**J6 PR Draft #1209** : verrou inutile supprimé : le vérificateur d'attestation HMAC/J6 ne reconnaissait que Agenz/Mubawab, alors que la vraie capture J4 est Sarouty. Le code réutilise dorénavant **le validateur L8 Sarouty exact**, vérifie canonical dans le HTML HEAD et og:url s'il existe, puis manifeste SHA, MAC et vrai replay V3 (fail-closed, zéro admission). **[J6 #43519866510](https://github.com/hraaaaf/Akarfinder/actions/runs/43519866510) SUCCESS 40/40 tests**, [Policy #43519866494](https://github.com/hraaaaf/Akarfinder/actions/runs/43519866494) SUCCESS au code SHA 5368c17280d3dfcaa7e1e74e3c0d4db2d3d76d99 ; documentaire J6 SHA 296cf083a3cb2460802607782c6dcfdbcc33166f, CI à vérifier. **Aucune vraie attestation opérateur signée, aucune identité géographique indépendante ni registre durable** à ce jour ; pas de staging.

**Décision roadmap** : travaux offline J5 WARC historique et J6 compatibilité de provenance **clôturés techniquement sur les preuves citées**. Jalons J4/J5/J6/J7 restent ouverts ; J0/J1 seuls clos, V7 **2/8 jalons métier**. Aucun merge, DB extérieure, cron source live, publication ou Vercel. NEXT exact : vérifier CI des HEAD documentaires, puis obtenir original HTTP d'une **vente Mubawab actuelle**, par canal source autorisé (pas retry des GET rejetés), étiqueter 7 champs et identité quartier vérifiables, organiser attestation émetteur opérateur/registre durable J6/J7 avant tout gate de staging.



## 13/11/2026 — J6 : preuve CI de la politique opérateur et des reçus transactionnels (0 production)

**Chantier exact :** [PR Draft J6 #1209](https://github.com/hraaaaf/Akarfinder/pull/1209), sans merge. Nouvelle couche de sécurité de provenance prévue par J6, pas un nouveau connecteur ni une activation.

**Sous-lot A — registre public épinglé par l'opérateur :** script scripts/acquisition/v7_parallel/j6_issuer_policy.py, séparation entre (1) empreinte SHA256 externe et registre JSON public, (2) clé HMAC fournie hors dépôt, (3) source HTML et attestation soumis. Vérifie identité key_id / issuer / portail, révocation, fenêtre de clé ≤90 jours et pin exact. Refuse doublons JSON et autres revendications de statut ; **aucun secret réel ni admission**. [CI J6 #43526814383](https://github.com/hraaaaf/Akarfinder/actions/runs/43526814383) **54/54 tests PASS**, policy #43526814339 SUCCESS, code SHA bbb75b79f223efcd875c30e94d853ac45a2598ba.

**Sous-lot B — trace anti-rollback et anti-double-reçu :** script SQL scripts/acquisition/v7_parallel/j6_ephemeral_receipt_ledger.sql, **UNIQUEMENT PostgreSQL17 éphémère CI**. Table policy_head : génération monotone compare-and-swap ; table capture_receipts : UNIQUE MAC + UNIQUE (domaine/ID source/SHA HTML), pour enregistrer une réception au plus une fois. Rôles distincts opérateur vs reviewer NOLOGIN, owner SECURITY DEFINER non-superuser, FORCE RLS et tables inaccessibles directement aux acteurs. Les tests couvrent notamment les insertions concurrentes, vieux digest/génération, doublons, absence de privilèges. **[CI J6 #43527314427](https://github.com/hraaaaf/Akarfinder/actions/runs/43527314427) COMPLETED SUCCESS : 64/64 tests PASS** (54 précédents + 10 DB éphémères), [policy #43527314346](https://github.com/hraaaaf/Akarfinder/actions/runs/43527314346) SUCCESS, code SHA c517ab2c2c61e63dd86753c8b2616a174038c51b. Fichier J6 canonique mis à jour au SHA 177c8a4331d2d7ee13f88cf936db3c6267c442ad (CI documentaire distincte à contrôler).

**Risque restant et portée exacte :** ce SQL ne vérifie pas de signature HMAC ni la vérité d'une annonce. Les signatures restent **symétriques** ; identité d'opérateur indépendante, gestion des vraies clés et registre réellement partagé non provisionnés. Le replay inter-runners et l'anti-rollback réels ne sont PAS prouvés par une base effacée après CI. Aucun outil n'autorise staging/publication ou collecte live. J6 métier OUVERT ; J7 schéma de créneau 10min reste séparé et non déployé. Avant une mise en production, contrôles spécifiques sur les émetteurs, mandat opérateur, stockage partagé durable, gestion de révocation et test de sécurité de bout en bout restent nécessaires, puis GO humain distinct.

**Roadmap** : J0/J1 seuls clôturés **2/8 jalons V7**, J2 FeenWay reste volontairement hors chemin critique, J3/J4/J5/J6/J7 non clos. Aucun merge, migration DB extérieure, cron live, admission ni Vercel. **NEXT exact :** vérifier les CI au HEAD canonique documenté, synchroniser Notion, puis préparer pour décision opérateur la stratégie de registres/clefs en production plutôt que brancher des vérificateurs synthétiques à des annonces réelles.



## 13/11/2026 — J6 chaîne cryptographique→reçu PostgreSQL validée (sans admission)

**Goal exact :** démontrer que le reçu anti-rejeu de J6 ne provient PAS d'un SHA déclaré par un candidat, mais du retour d'un vrai chemin de vérification de politique opérateur externe + MAC HMAC, original HTML/manifeste SHA, identité de portail et reprise des 7 champs V3. Les arguments de reçu sont émis **sans aucun appel SQL** par review_with_operator_issuer_policy, puis un test d'intégration les transmet au registre PostgreSQL éphémère en rôle séparé.

**Preuve code et CI sur PR J6 #1209** : le code a ajouté review_receipt_intent avec six champs strictement dérivés de la preuve validée, toujours eligible_for_private_staging=false et public_admission_authorized=false. Le test test_verified_j6_hmac_and_operator_policy_intent_maps_to_once_only_receipt lie une fixture source HTML réellement parsée par V3, une clé HMAC de CI SYNTHÉTIQUE et un registre opérateur de test au SQL compare-and-swap de génération : un reçu écrit une fois dans PostgreSQL 17 CI, le second identique est refusé. **[CI J6 #43528055119](https://github.com/hraaaaf/Akarfinder/actions/runs/43528055119) COMPLETED SUCCESS, 65/65 tests PASS** : 10 readiness, 7 original HTML, 10 HMAC, 7 Sarouty, 14 politique opérateur, 6 PG original, 11 nouveaux PG CAS/reçus incluant l'intégration. [Policy #43528055282](https://github.com/hraaaaf/Akarfinder/actions/runs/43528055282) SUCCESS au HEAD J6 documentaire **9789dcdd797dcc29c2c18444f0028fb5e26292dc**. Les CI préalables du code J6 #43526814383 (54/54) et #43527314427 (64/64) étaient également vertes.

**Limites de confiance à ne pas escamoter :** aucune clé HMAC opérateur réelle ni authentification organisationnelle prouvée, aucune attestation indépendante immobilière ; les deux tableaux PostgreSQL sont dans une instance éphémère CI sur 127.0.0.1 (pas une base persistante multi-runners). Le contrôle de génération monotone ne prouve pas l'absence de rollback d'une restauration de base réelle ; le reçu ne clôt aucun effet externe. Aucun lien déployé avec J7 scheduling ni Vercel. **J6 métier OUVERT malgré 65/65 tests**.

**V7 jalons métier inchangés :** J0/J1 seuls clos = **2/8**, J2 FeenWay hors chemin critique ; J3, J4, J5, J6, J7 restent ouverts. Aucun merge, DB distante/prod, source live, cron, publication ou Vercel.

**Next exact** : enregistrer et vérifier les CI au HEAD de cette roadmap ; préparer un choix opérateur réel pour authentification/rotation/révocation des émetteurs, clés secrets séparées, base de registre partagé persistante et gate humain explicite avant toute migration ou admission. Ne pas inférer qu'un protocole HMAC symétrique remplace une signature multi-acteurs.



## 13/11/2026 — Audit High J6/J7 de la chaîne de confiance (aucune activation)

**Décision dans la roadmap existante** : renforcer l'authenticité multi-acteurs J6 et l'atomicité J7, et maintenir la voie HMAC v1 en quarantaine. Aucun nouveau portail, déploiement, migration ou merge autorisé. Après audit du code SQL et du protocole, deux faiblesses concrètes ont été relevées : HMAC symétrique ne sépare pas signataire et vérificateur ; J7 acceptait des claims pour n'importe quel numéro de créneau et des tokens « claimed » non expirés.

**J6 PR Draft #1209** : ajout du vérificateur de signature **Ed25519** avec registre public épinglé par SHA256 extérieur, révocation et périmètre clés/portails, signature binaire à domaine séparé et comparaison de l'original HTML/manifeste SHA + vrai replay V3. Aucune clé privée dans le module ou dépôt ; Ed25519 reste strictement disjoint du registre HMAC d'attestation et **aucun receipt SQL HMAC n'est émis**. 19 tests adversariaux dont V3 réel obligatoire. Durcissement des deux fonctions SECURITY DEFINER de la DB PG17 éphémère : **pg_temp en dernier du search_path** avec preuve proconfig. HEAD source/test 5758ea3829881baffe4f46e4b6bebb067d2974d4, HEAD documentaire 208d7c6c4cb749fc92b6cf8f1fc11d91e6773ac5. CI [J6 #43531157104](https://github.com/hraaaaf/Akarfinder/actions/runs/43531157104) et policy #43531156818 étaient QUEUED à la première observation ; **ne pas annoncer succès du nouveau module sans run terminal au HEAD courant**. Dépendance CI cryptography==50.0.2, version publique PyPI du 30/09/2026.

**J7 PR Draft #1210** : ajout dans j7_ephemeral_ledger.sql d'une restriction du claim à une plage autorisée par le serveur PostgreSQL : slot UTC courant / deux précédents maximum, aucun futur ou trop ancien. Finish/fail/fenced_marker refusent les claims âgés de plus de 30 minutes ; quatre fonctions SECURITY DEFINER utilisent search_path pg_catalog, v7_schedule, pg_temp. Trois tests PG nouveaux, horloge de test issue du serveur. HEAD doc J7 3f6281efdbb7be2f3338fb2b18f41de01c6565c8, [J7 CI #43531236057](https://github.com/hraaaaf/Akarfinder/actions/runs/43531236057), policy #43531236041 QUEUED/PENDING au premier constat. Les exécutions de créneaux perdues >20 minutes sont volontairement ignorées en mode sécurité ; aucune activation de chron live.

**Documentation de menaces et gate final** : docs/data/AKARFINDER_V7_J6_J7_TRUST_AUDIT_2026-11-13.md, PR J6. Références primaires RFC8032, RFC8785 (le protocole Ed TLV fixe n'est pas du JCS), documentation PostgreSQL17 SECURITY DEFINER/search_path et cryptography Ed25519. La proposition de confiance finale est clés signataires privées uniquement chez émetteurs autorisés + registre de clés publiques épinglé indépendamment + anti-rollback externe à la DB + ledger v2 distinct pour preuve Ed25519 + enquête terrain/geo et validation humaine. Aucune identité opérateur réelle, preuve terrain ou registre partagé n'est provisionné.

**Roadmap** : sous-lots de préparation High en cours de certification CI, **J6 et J7 métiers restent OUVERTS**, V7 = J0/J1 clos **2/8 jalons métier**. Aucune production/cron/DB/merge/publication/Vercel. NEXT exact : vérifier et, au besoin, corriger CI J6/J7 aux HEAD exacts ; mise à jour Notion et doc de clôture ; puis décisions d'opérateur séparées pour clés/registre persistant et validation de capture source, avant le moindre staging.
