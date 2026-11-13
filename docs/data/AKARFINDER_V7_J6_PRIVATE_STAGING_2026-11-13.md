# Akarfinder V7 — J6 readiness (13 novembre 2026)

**GOAL** — Avancer malgré J2/J3/J4/J5 partiellement bloqués, sans créer de migration, secret, ingestion live, ni assertion de validité d'une annonce. Préparer un inventaire **hors ligne** de quarantaine à partir de la vraie structure AkarParser V3 et du validateur Radar10.

**SUCCESS limité** — Un lot synthétique de fiches V3 peut être examiné sans requête source, sans DB, sans promotion; un ID de portail contradictoire, un extrait URL-only, un override de publication ou les trois ID Agenz J3 litigieux restent bloqués. Aucun code de mise en staging n'est appelé.

**CODE** — `scripts/acquisition/v7_parallel/j6_staging_readiness.py` : appel direct au vrai `radar10.ingest.normalize`, déduplication URL/identité, refus de collisions, comptage des motifs sans exposer les URL brutes, SHA de l'inventaire. Son résultat **`eligible_for_private_staging=0` est constant** et intentionnel : aucun canal de preuve/autorisation source fiable n'est raccordé.

**TESTS** — `test_v7_j6_staging_readiness.py` (8 scénarios, dont parsing réel V3), workflow `akar-v7-j6-readiness.yml`. Tests **non encore certifiés** tant que la CI au commit exact n'a pas réussi.

**LIMITES** — Pas de migration SQL, pas de connexion PostgreSQL, pas de test de comportement réel DB sur ce lot, pas de HTML nouvellement acquis, pas d'admission automatique. Le garde-fou J3 n'est pas fusionné : les trois ID conflictuels sont re-déclarés dans le contrat J6 comme quarantaine de sécurité. Le module existant `radar10.ingest.apply_batch` n'est ni modifié ni raccordé ; rien ne peut prétendre être une prévention globale des écritures depuis d'autres chemins.

**DÉCISION** — J6 sous-lot "readiness no-write" réalisable sans attente des sources ; J6 complet (migration + RLS + identité/permissions + staging réel) reste soumis à autre contrôle et autorisation. Pas de déploiement Vercel, merge, cron live ni DB de production.

**NEXT** — Vérifier CI et corriger. Puis étudier un couplage explicite avec les validations d'original HTML SHA+UTC et règles d'origine pour sélectionner une admission **uniquement** après validation humaine/identité DB, puis test PostgreSQL éphémère. En parallèle poursuivre les portails et ne pas promouvoir les URL-only.

## Correctif complémentaire — collision de contenu intra-batch

Le premier commit J6 `2b44c1533bfc3761128ab6f5b1763adcc28bbfaf` a obtenu [CI J6 #43395861642](https://github.com/hraaaaf/Akarfinder/actions/runs/43395861642) **SUCCESS : 8/8 tests**, et [CI Policy #43395861528](https://github.com/hraaaaf/Akarfinder/actions/runs/43395861528) SUCCESS. L'audit a identifié un deuxième cas : même URL et identifiant mais contenu normalisé divergent au sein d'un batch. Ce lot renforce le fail-closed en rejetant cette contradiction plutôt qu'en la comptant comme deux observations. Un neuvième test est ajouté. La nouvelle CI au HEAD corrigé doit être vérifiée avant de qualifier ce correctif.
