# V7 J3 — Agenz : corpus de captures intègres

**GOAL :** évaluer plusieurs fiches Agenz, pas seulement la capture J1. Les originaux doivent être archivés en privé avec manifeste HTTP 200, SHA-256 et date UTC.

**CODE de préparation :** `scripts/acquisition/v7_parallel/j3_agenz_corpus.py` utilise le validateur existant `snapshot_evidence.py`, compare les sept champs L4/V3, exige IDs individuels uniques, marque écarts de complétude, refuse HTML altéré ou identifiant dupliqué.

**J1 acquis :** une fiche réelle `444291` a exposé prix courant 980000 MAD, surface 104 m², conflit quartier Al Qods vs Tabriquet. Ceci ne constitue pas une précision représentative.

**Cible de travail J3 :** cinq IDs distincts au minimum pour rendre un corpus *prêt pour annotations humaines*, sans déclarer précision indépendante. Aucune requête HTTP ni DB dans le comparateur. Les tests CI synthétiques ne sont pas des captures réelles.

**NEXT :** réunir 5 snapshots réels via parcours autorisé, annoter champs manuellement et corriger les divergences. Pas de cron, merge, Vercel, Supabase ou écriture PROD.
