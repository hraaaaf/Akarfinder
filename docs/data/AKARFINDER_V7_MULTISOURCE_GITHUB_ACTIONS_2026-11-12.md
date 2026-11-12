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
