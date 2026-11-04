# Akarfinder — Roadmap 200 000 annonces fraîches (04/11/2026)

**Goal :** maintenir **200 000 biens immobiliers marocains distincts, vérifiés actifs, récents, de qualité contrôlée et exploitables dans le périmètre des droits de chaque source**. Il s'agit d'un stock opérationnel, pas de 200k URLs ni de 200k observations cumulées sur des années.

**État : FEASIBILITY_NOT_PROVEN / NO_PROD_WRITE / NO_DEPLOY.**

## 1. Baseline vérifiée et limites

- Inventaire isolé reconstruit : **32 460 clés (source, source_id)**, Avito 27 106 et Mubawab 5 354 ; **32 460 UNVERIFIED**, **0 ready_for_use / publication_eligible**, sur artefact GitHub [#41322759990](https://github.com/hraaaaf/Akarfinder/actions/runs/41322759990). Un ID/source n'est pas une propriété unique physique.
- Mubawab V6.4.6 : **3/3 pages réelles P1 PASS** au 04/11/2026, HTTP 200 et 97 IDs-source entre les pages. Les IDs ne doivent pas être additionnés directement au réservoir (recouvrement inconnu). Le correctif réseau post-canary demeure non validé sur de nouveaux shards live. [PR Draft #1154](https://github.com/hraaaaf/Akarfinder/pull/1154), [rapport](../reviews/MUBAWAB_V646_DIRECT_CANARY_RUN_2026-11-04.md).
- Sources MASS-2F : **101 domaines revus, 43 PERMISSION_REQUIRED, 58 HOLD, 0 activable** selon [certification](../data/DATA-MASS-2F-FINAL-CERTIFICATION.md). Aucun flux commercial réel autorisé et productif n'est prouvé par les dossiers.
- Supabase AqarFinder indiqué `INACTIVE` le 01/11/2026 ; **état courant à revérifier**, aucun SQL de production lancé dans cet audit. Ne pas employer un ancien chiffre d'annonces en DB comme stock frais sans interrogation live.
- Des extracteurs L8, un moteur de flux `lib/feeds/{schema,parsers,staging}.ts` et des gates qualité existent déjà. **Réutiliser avant de réécrire.**

## 2. Définition opérationnelle proposée (à adopter comme contrat produit)

Une annonce compte dans `fresh_unique_eligible` seulement si :
1. source identifiée, URL canonique et identifiant source stable ; droits d'indexation/affichage et politique de retrait enregistrés pour le périmètre d'usage ;
2. type/transaction/ville + champs clés interprétables (prix numérique ou statut `on_request` explicite, surface lorsqu'elle est déclarée) ;
3. preuve positive récente d'activité du détenteur de la fiche, distincte de `first_seen_at` et d'une date de crawl ; `source_updated_at`, `last_seen_at`, `last_active_verified_at`, `unpublished_at` conservés séparément ;
4. non supprimée, non désactivée et non fusionnée arbitrairement ; déduplication inter-sources conservatrice par propriété ;
5. statut de publication explicitement autorisé.

**SLA de départ proposé (non mesuré ni contracté) :** ingestion des deltas sous 24 h ; confirmation d'activité sous 48 h par flux/état partenaire fiable ; fiche expirée du compteur frais après 48 h sans preuve positive ; retrait immédiat après signal de suppression. Si une source ne peut prouver l'activité selon ce délai, elle n'entre pas dans le compteur « frais ».

`fresh_unique_eligible = COUNT(DISTINCT physical_property_group)` sur les fiches admissibles selon ces critères. Maintenir séparément les compteurs `observed_source_ids`, `indexed_candidates`, `fresh_active`, `licensed_ready`, `unique_properties` et `published`.

## 3. Roadmap exécutable, par gates

| Lot | Livrable | Critère de succès / preuve | Gate |
|---|---|---|---|
| **R0 — J0–J3 indicatif** | Snapshot de l'état DB réel, inventaire des sources et droits, KPI de base ; audit side-effects des pipelines existants | comptage SQL read-only reproductible ; sources/âges/statuts et recouvrement reconnus, 0 mutation | pas de promotion tant que le stock initial n'est pas mesuré |
| **R1 — J3–J10** | Pipeline source→quarantaine→normalisation→policy→fraîcheur→dédup→éligibilité ; reprise incrémentale, tombstones et audit | fixtures CSV/JSON/XML et 100–1000 lignes d'un feed réel *autorisé* ; dates, rejets, suppressions, SHA et 0 DB prod | absence de feed autorisé = gate externe, pas un OK implicite |
| **R2 — premier palier 10k** | Première cohorte effectivement active/fraîche avec droits, audits de qualité et rapports | ≥10k propriétés uniques admissibles, taux de rejet/overlap et fraîcheur mesurés ; zéro fausse fusion prouvée sur échantillon de QA | si le volume net accessible ne couvre pas 10k, revoir la stratégie |
| **R3 — 50k puis 100k** | Multiplication des flux *indépendants* et incremental sync ; file de revalidation et circuit-breaker | 50k puis 100k admissibles, surveillance des échecs/rétractations ; QA inter-sources, cohortes de villes, coûts et latences observés | ne pas augmenter quotas sans capacité réelle et droits |
| **R4 — 200k stable** | Stock national réconcilié et actualisé dans le respect des SLA | ≥200k `fresh_unique_eligible` constatés pendant **7 jours consécutifs**, plus journal des retraits ; audit indépendant de doublons | publication/release PROD soumise à décision séparée |

Les durées sont **indicatives et conditionnelles** : disponibilité des flux, droits et stock unique dédupliqué déterminent la faisabilité ; aucun délai de 48 h ou 90 jours n'est garanti.

## 4. Capacité et vérité des chiffres

- Si objectif de constitution en 48 h : `200000 / 48 = 4 166,7` propriétés **qualifiées et nouvelles** / heure, pas des URLs / heure.
- À 32 éligibles/page et sans perte : 6 250 pages *théoriques* ; troncature, pagination admissible, doublons et disponibilité peuvent rendre ce calcul sans objet.
- Si seuls 60 % des candidats bruts restent actifs/uniques/qualifiés/autorisés, il faudrait **333 334 observations brutes environ** ; ce taux est **un scénario hypothétique**, non une mesure.
- Pour revalider 200k fiches toutes les 48 h, il faut une capacité *sous contrat* d'au moins 100 000 confirmations d'activité/jour, idéalement à partir d'un delta de flux plutôt que 100k visites de fiches.
- La comparaison doit porter sur les **biens physiques distincts et frais**, pas les doublons d'ID ou un compteur public agrégé.

## 5. Stratégies A/B et décision recommandée

**A — Scraping direct borné seulement** : poursuivre les canaries techniques autorisés et classifier les fiches ; utile pour le parseur et la découverte, **non crédible comme garantie de 200k frais** sans mesures longitudinales et périmètre admissible beaucoup plus vaste. Ne pas relancer les trois pages du lot V6.4.6 automatiquement, ni contourner 403/429/robots.

**B — Flux directs titulaires/licenciés + complément technique sous policy** : **recommandé**. Plusieurs réseaux d'agences, promoteurs ou logiciels métier alimentent le pipeline natif; négociation de droits / sourcing est une **décision utilisateur** distincte, aucun message externe envoyé. Le cas FeenWay illustre un gros compteur agrégé, **pas un stock indépendant ni une licence prouvée**.

**Verdict du 04/11/2026 :** 200k frais **NON PROUVÉS**. Le chemin critique est : baseline prod réconciliée → flux et droits réels → preuve de fraîcheur/activité → dédup physique → montée en charge par paliers. L'ancien jalon 97 IDs prouve le parsing P1 sur trois pages, pas la taille du catalogue.

## 6. Next exact, sans dépendance humaine

1. Lire le statut actuel DB/feeds en **read-only** si la connexion est disponible ; si non, consigner `UNKNOWN`, ne pas inventer le stock.
2. Auditer dans le code existant les contrats `schema/parsers/staging`, tombstones, SLA et dédup physique ; établir un écart technique R0/R1 sans nouvelle acquisition externe.
3. Conserver la PR #1154 non mergée et le canary réseau distinct jusqu'à nouveau manifeste explicitement autorisé.
4. Lorsque un export licencié existe : tester 100–1000 lignes en quarantaine, compter net admissible et extrapoler. Ne jamais extrapoler sur une simple liste de liens.
5. Exiger validation humaine distincte pour **prise de contact**, **activation collecte à grande échelle**, **écritures en production** et **déploiement Vercel** ; aucun des quatre actes n'est autorisé par cette roadmap.

**Références :** [Mission 200k/48h](AKARFINDER_200K_48H_SOURCE_SCALE_2026-11-01.md), [yield gate](AKARFINDER_200K_YIELD_AND_COVERAGE_GATE_2026-11-01.md), [inventaire permission](AKARFINDER_200K_SOURCE_AUTHORIZATION_INVENTORY_2026-11-01.md), [feed gate](AKARFINDER_200K_PARTNER_FEED_GATE_2026-11-01.md).
