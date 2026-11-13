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

## J3 — Capture vraie 5/5, benchmark initial et correction L4 (13 novembre 2026)

**Preuve brute réelle :** [GHA J3 #43339490949](https://github.com/hraaaaf/Akarfinder/actions/runs/43339490949) SUCCESS pour 4 captures individuelles avec HTTP200, SHA256, UTC, 4 artefacts privés 1 jour ; job corpus combine ces 4 + la capture J1 #444291 avec **5 IDs distincts et 5 hashes vérifiés** :
- #444291 : `788355d9050f4b3ee6061c51ebf259c89acff19bb583a03a895ab8889ece6d61` (J1)
- #445495 : `4e2d6d4ed51dd86896356baf84e76ba5a7eb0b798acb62086262d72819d9274a` (prix L4/V3 1 650 000 DH)
- #420510 : `1714113517ad3179f70645ae56722b286ab790d20e88e4fdd9a5febb24eaff9d` (prix 730 000 DH)
- #387448 : `d9faa5bf7ab4ab6721bf13752e311ab8d4a44626c61311317087f089cce389d1` (prix 740 000 DH)
- #500006 : `047d6e02ee82a3d4cd724b9c447dea5cc42c24397f77f08617c3a546b468aafe` (prix 1 224 000 DH)

**Benchmark avant correctif :** 5/5 accords de prix L4/V3, désaccords sur `city` et `district` **5/5**, et sur `surface_total_m2` **1/5**. **Ce sont des concordances entre parseurs, pas des exactitudes indépendamment étiquetées.**

**Sécurité :** autorisation de capture unitaire supprimée au SHA `6742f88d5d12540262b80023035de1c9a86c854c`, pas de nouvelles requêtes programmé. [J3 original #43339490949](https://github.com/hraaaaf/Akarfinder/actions/runs/43339490949) est la preuve d'acquisition, le workflow ultérieur avec marqueur absent doit avoir les étapes réseau SKIPPED.

**Correctif proposé ici :** L4 `canonical_listing_extractor.py` renseigne par fallback prudent les deux labels ville/quartier **dérivés de la route de détail Agenz uniquement**, si JSON-LD n'a rien fourni ; conserve les valeurs structurées lorsqu'elles existent. Indique dans l'évidence `agenz.detail_url.city` ou `agenz.detail_url.district` (URL != géolocalisation indépendante). Trois régressions synthétiques ajoutées, aucune écriture DB ni source GET.

**Nouvelle vérification réelle préparée :** workflow `akar-v7-j3-corpus-replay.yml` télécharge le corpus déjà capturé depuis GitHub et refait les sept comparaisons L4/V3 **sans aucun appel aux portails**. Succès exige zéro divergence ville/quartier sur les cinq originaux ; l'écart de surface restant doit être analysé séparément, pas inventé.

**Prochaine preuve :** CI aux commits exacts et rapport de rejeu ; labels manuels indépendants pour certifier la précision sur les 7 champs. J3 partiellement validé, pas encore précision représentative. Aucun merge, staging privé, cron actif, Vercel ou publication.

## J3 — Diagnostic vérité terrain #445495 : 105 habitables + 45 terrasse = 150 m² totaux

**Preuve des octets réels** : [workflow replay diagnostique #43340844303](https://github.com/hraaaaf/Akarfinder/actions/runs/43340844303), SHA256 original `4e2d6d4ed51dd86896356baf84e76ba5a7eb0b798acb62086262d72819d9274a` inchangé. Sur la fiche #445495 :
- **105 m²** : la description précise « Avec 105m2 habitables et une terrasse de 45 m² » ;
- **150 m²** : valeur affichée plusieurs fois dans la zone de caractéristiques principale (2 CH, 2 SDB, 150 m²) ;
- L4 captait **105** (motif générique `text:surface`) ; V3 retournait **150**. L4 ne doit pas confondre surface habitable et totale.

**Correction proposée :** L4 privilégie pour les fiches détails **Agenz uniquement** la première valeur de surface visible dans le corps HTML, avant la description Meta qui peut présenter habitable+terrasse. Le motif général corrige aussi la prise en charge de `m²` Unicode (la frontière `\\b` après `²` était mal formée). Tests synthétiques : cas exact 150 total/105 habitables/45 terrasse et Unicode, en conservant JSON-LD quand présent.

**Nouvelle certification attendue :** `akar-v7-j3-corpus-replay.yml` doit prouver **zéro divergence** L4/V3 sur les surfaces, ville et quartier des 5 mêmes originaux, sans nouvelle requête. Même si vert, **accord des parseurs ≠ précision indépendante des sept champs** ; annotation humaine reste indispensable. Pas de DB, merge, cron ni Vercel.

## Closeout comparatif cinq originaux : 0 divergences (13 novembre 2026)

**Code exact :** `6b6ce0c1a285aca1174911326a298cd5b58064af`, dans la Draft PR #1206 (non mergée).

**Preuve CI complète :** [GitHub Actions replay #43341257516](https://github.com/hraaaaf/Akarfinder/actions/runs/43341257516) SUCCESS, source des cinq archives **inchangées**, statut `disagreements_by_field = {}` sur les **7 champs** comparés L4/V3 : prix, surface totale, ville, quartier, titre, type, transaction. Le différentiel de #445495 est corrigé de **105 habitable** à **150 total**, méthode L4 `agenz.visible_first_surface`; original SHA `4e2d6d4ed51dd86896356baf84e76ba5a7eb0b798acb62086262d72819d9274a`. **Six workflows au même commit SUCCESS** : replay corpus #43341257516, V7 #43341257349, J1 replay #43341257439, J3 tests #43341257322, CI Policy #43341257311, one-shot #43341257269 avec les étapes de capture SKIPPED (marqueur retiré).

**Succès précis du sous-lot :** cinq annonces originales Agenz ont une archive HTML brute SHA256+UTC unique et une comparaison L4/V3 sans divergence. **Limite :** la concordance sur sept colonnes peut inclure deux valeurs `null` et ne certifie ni complétude, ni précision indépendante, ni date réelle de publication ou statut actif. Les valeurs doivent être étiquetées indépendamment sur les vrais documents pour prétendre à une qualité certifiée. Aucune propriété en DB/PROD.

**NEXT exact :** audit indépendant des sept champs, quantification `present/missing/correct/incorrect` par source, puis décision de validation du lot J3 ; continuer J4 et J5 en parallèle. Toutes les activations réseau périodiques, SQL staging, merge et Vercel restent non autorisées.
