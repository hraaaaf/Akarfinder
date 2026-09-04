# Lot 9 Status — Mubawab Full Coverage

**Status: 🟡 OPEN — planner + bounded runner certified; first live wave GREEN**

## Goal

Parcourir exhaustivement le périmètre Mubawab accessible et autorisé afin de mesurer le stock canonique réel disponible avant d’ouvrir une deuxième source.

Le Lot 9 ne cherche pas à forcer artificiellement 100K annonces depuis Mubawab. Il cherche à connaître le maximum réel, unique et exploitable de la source pilote.

## Safety boundary

- aucun write production ;
- aucun déploiement Vercel ;
- aucun merge automatique ;
- aucun contournement CAPTCHA / authentification / contrôle d’accès ;
- toute route live reste soumise au contrôle robots existant ;
- 403 / 429 explicites sont des signaux de blocage et stoppent la vague ;
- aucune extraction de détail dans les vagues de discovery ;
- ne jamais toucher à `scripts/scrapers/output/akarfinder.db` pendant les preuves.

## Périmètre initial dérivé de la config

- 12 villes configurées ;
- 11 catégories activées ;
- 132 scopes initiaux `ville × catégorie` ;
- familles supportées : appartement, terrain, villa, maison, commercial, riad ;
- bureaux désactivés tant que leurs routes distinctes ne sont pas vérifiées.

## Étape 1 — Full Coverage planner ✅ CERTIFIED

Fichier : `data-ingestion/sources/mubawab/full-coverage.ts`.

Le planificateur :

- construit les scopes déterministes depuis la config ;
- crée des partitions stables par fenêtres de pages ;
- progression `1–25 → 26–50 → ...` uniquement si la fenêtre précédente est épuisée ;
- checkpoint monotone `next_page` ;
- statuts `pending / running / completed / failed` ;
- arrêt sur `zero_new_unique_ids`, robots, source block ou kill-switch ;
- aucune progression silencieuse après échec.

### Preuve planner

- workflow : `Data Ingestion Lot 9 Full Coverage Planner Gate` ;
- run : `33881976620` ✅ SUCCESS ;
- job : `full-coverage-planner` ;
- job id : `101052543906` ;
- HEAD produit prouvé : `1f9f0ae095fd28b9821008dd33dfb83e120ff5b4`.

## Étape 2 — bounded Full Coverage runner ✅ CERTIFIED

Fichiers :

- `data-ingestion/sources/mubawab/full-coverage-runner.ts` ;
- `scripts/scrapers/__tests__/data-ingestion-lot9-full-coverage-runner.test.ts` ;
- `.github/workflows/data-ingestion-lot9-full-coverage.yml`.

Le runner :

- borne chaque vague par `maxPartitions` ;
- maintient un set global de `source_id` ;
- déduplique entre pages et partitions ;
- checkpoint après chaque page ;
- stoppe un scope sur zéro nouvel ID unique ;
- traite robots / source block comme stops sécurité ;
- conserve les erreurs ordinaires en `failed` ;
- honore le kill-switch ;
- crée la fenêtre suivante uniquement après `window_exhausted` ;
- ne fait aucun write DB.

### Preuve runner

- workflow : `Data Ingestion Lot 9 Full Coverage Gate` ;
- run : `33882260391` ✅ SUCCESS ;
- job : `full-coverage` ;
- job id : `101053487441` ;
- Discovery regression : ✅ SUCCESS ;
- planner contract : ✅ SUCCESS ;
- bounded runner contract : ✅ SUCCESS.

## Étape 3 — première vague live ✅ GREEN

Workflow : `Data Ingestion Lot 9 Live Wave`.

Run : `33882641901` ✅ SUCCESS.

HEAD produit prouvé : `df0ba4494dd75b846d99d0a3b854fac30fd302c6`.

Job : `live-wave` ; job id : `101054741842`.

Périmètre volontairement borné :

- 2 partitions ;
- 2 pages maximum par partition ;
- Casablanca / appartement vente ;
- Casablanca / appartement location ;
- aucune page détail ;
- aucun téléchargement d’image ;
- aucun write DB ;
- contrôle robots avant requête ;
- arrêt global sur 403 / 429 ;
- User-Agent identifiable existant.

### Résultat réel

- partitions disponibles : 132 ;
- partitions démarrées : 2 ;
- partitions complétées : 2 ;
- partitions failed : 0 ;
- partitions différées : 130 ;
- pages demandées : 4 ;
- pages réussies : 4 ;
- annonces découvertes : 126 ;
- uniques ajoutées : 126 ;
- doublons de navigation observés : 0 ;
- partitions suivantes créées : 2 ;
- source bloquée : non ;
- kill-switch déclenché : non ;
- stop reason des deux partitions : `window_exhausted`.

Artifact :

- id : `9940542354` ;
- name : `lot9-live-wave-proof` ;
- digest : `sha256:ca1b1a6b45cf0ff178e818145ef82d4189b96239b1082a65751845816a72ce5e`.

## Lecture opérationnelle

La première vague live confirme que le chemin réel `partition → URL discovery → fetch polite/robots → extraction des refs → dedup → checkpoint → next partition` fonctionne sur Mubawab sans blocage observé sur ce petit périmètre.

Cette preuve ne suffit pas à fermer le Lot 9 ni à extrapoler directement 126 annonces / 4 pages à tout le site.

## Closure rule du Lot 9

Lot 9 ne sera CLOSED qu’après un manifest Full Coverage final couvrant toutes les partitions découvertes du périmètre autorisé, avec couverture, doublons, erreurs, rejets, checkpoints et stock unique mesuré.

## Next exact

1. étendre progressivement les vagues live avec limites explicites ;
2. persister manifest + checkpoint entre vagues ;
3. conserver la déduplication globale des `source_id` ;
4. mesurer les rendements par ville / catégorie / page-range ;
5. arrêter chaque scope sur zéro nouvel ID unique ou stop sécurité ;
6. poursuivre jusqu’au manifest Full Coverage final ;
7. ne passer au Lot 10 qu’après mesure du stock Mubawab unique réel.
