# V7 J3 — Agenz : corpus de captures intègres

**GOAL :** évaluer plusieurs fiches Agenz, pas seulement la capture J1. Les originaux doivent être archivés en privé avec manifeste HTTP 200, SHA-256 et date UTC.

**CODE de préparation :** `scripts/acquisition/v7_parallel/j3_agenz_corpus.py` utilise le validateur existant `snapshot_evidence.py`, compare les sept champs L4/V3, exige IDs individuels uniques, marque écarts de complétude, refuse HTML altéré ou identifiant dupliqué.

**J1 acquis :** une fiche réelle `444291` a exposé prix courant 980000 MAD, surface 104 m², conflit quartier Al Qods vs Tabriquet. Ceci ne constitue pas une précision représentative.

**Cible de travail J3 :** cinq IDs distincts au minimum pour rendre un corpus *prêt pour annotations humaines*, sans déclarer précision indépendante. Aucune requête HTTP ni DB dans le comparateur. Les tests CI synthétiques ne sont pas des captures réelles.

**NEXT :** réunir 5 snapshots réels via parcours autorisé, annoter champs manuellement et corriger les divergences. Pas de cron, merge, Vercel, Supabase ou écriture PROD.

## J3 — corpus candidat de 5 fiches réelles, accès HTML limité

**Preuve liens :** la page publique Agenz `https://agenz.ma/fr/acheter/immo-sale/vente-appartements` contient les quatre URLs de détail suivantes ; chacune a été consultée en lecture seule via HTML rendu (mais **pas** enregistrée en HTML brut source) :
- `https://agenz.ma/fr/annonces/immo-sale/vente-appartements/sale-el-jadida/445495`
- `https://agenz.ma/fr/annonces/immo-sale/vente-appartements/said-hajji/420510`
- `https://agenz.ma/fr/annonces/immo-sale/vente-appartements/zone-industrielle-tabriquet/387448`
- `https://agenz.ma/fr/annonces/immo-sale/vente-appartements/assonboula/500006`

**Référence J1 :** Agenz `444291`, HTML source archivé privé SHA256 `788355d9050f4b3ee6061c51ebf259c89acff19bb583a03a895ab8889ece6d61` ; [artifact J1](https://github.com/hraaaaf/Akarfinder/actions/runs/43330609367) existant à la première vérification (expiration prévue 2026-11-13T23:39:02Z).

**Nouveau canary préparé :** workflow `.github/workflows/akar-v7-j3-original-once.yml` une requête HTTPS unique par fiche, sans retry/redirect, capture privée 1 jour SHA256/UTC/HTTP200. Après les 4 jobs, le corpus d'analyse en lecture seule télécharge leurs quatre artefacts et le cinquième J1 pour vérifier **5 IDs distincts** via `assess_corpus`. Le marqueur `.github/v7-j3-original-once-enabled` sera supprimé après premier essai. Aucun cron live, SQL/DB, merge, Vercel, ni promesse de disponibilité future.

**Critère à prouver :** seulement si les 5 manifests valident ensemble, déclarer `corpus_ready_for_human_labels`. Cela ne certifie pas la précision des 7 champs tant que leurs valeurs ne sont pas étiquetées indépendamment. Si un job échoue, ne jamais affirmer corpus 5/5.
