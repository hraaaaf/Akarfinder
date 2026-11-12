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
