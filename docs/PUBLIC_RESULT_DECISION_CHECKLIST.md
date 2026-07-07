PUBLIC_RESULT_DECISION_CHECKLIST.md — Points à vérifier avant de contacter
Version : 2026-07-07 — PUBLIC-RESULT-DECISION-CHECKLIST-1

1. Objectif

Aider l'utilisateur à décider calmement quoi vérifier avant d'aller sur la
source originale ou avant de contacter l'annonceur, sur les résultats
publics AkarFinder — en particulier les résultats Gateway externes. La
couche n'affecte ni le ranking Search Gateway, ni le cache Gateway, ni la
doctrine Gateway existante.

2. Pourquoi checklist ≠ certification

La checklist ne dit jamais si une annonce est vraie, fausse, bonne ou
mauvaise. Elle rappelle uniquement ce qui reste à confirmer sur la source
originale — prix, surface, photos, disponibilité — sans jamais juger la
fiabilité de l'annonceur ni promettre un résultat. C'est un outil de
préparation à la décision, pas un verdict.

3. Wording public autorisé

- Points à vérifier
- À confirmer sur la source originale
- Avant de contacter
- Informations utiles à comparer
- Vérifier les détails sur la source
- Comparer avec les résultats similaires possibles

4. Wording public interdit

- Annonce fiable
- Annonce vérifiée
- Annonce suspecte
- Arnaque
- Bon plan
- Mauvaise annonce
- Annonce dangereuse
- Disponible confirmé
- Prix réel
- Prix officiel
- Prix de marché
- Score de fiabilité
- Score de risque

Ces libellés existent uniquement dans
`lib/public-result-checklist/checklist-rules.ts`
(`FORBIDDEN_PUBLIC_RESULT_CHECKLIST_WORDING`) pour alimenter les tests de
sécurité et les scans — jamais dans l'UI publique.

5. Règles Gateway

La checklist n'est câblée que dans
`buildAkarInfoPassportForGatewayResult` (résultats Gateway externes). Elle
n'est pas ajoutée à `buildAkarInfoPassportForListing` (fiches
structurées/partenaires) dans cette mission — la valeur ajoutée immédiate
est la plus forte sur les résultats Gateway, où l'utilisateur n'a par
définition que peu d'informations vérifiées par AkarFinder.

`assertPublicResultChecklistSafety` (`lib/public-result-checklist/public-safety.ts`)
garantit à l'exécution :
- au plus `PUBLIC_RESULT_CHECKLIST_MAX_ITEMS` (5) items ;
- aucun wording interdit (comparaison insensible à la casse sur le JSON
  sérialisé) ;
- aucune clé interdite (`value_low`, `value_median`, `value_high`,
  `evidence_ref`, `cache_key`, `similarity_score`, `similarity_group_id`,
  `contact`, `gallery`, `image`, `phone`, `email`) ;
- aucun item ne contient un score numérique (motif `NN/100`, `NN/10`,
  `NN/20` ou `NN%`).

6. Données utilisées

`buildPublicResultChecklist` (`lib/public-result-checklist/build-checklist.ts`)
prend en entrée uniquement : `title`, `snippet`, `original_url`,
`similar_possible` (issu de `PublicResultSimilaritySummary`, déjà public-safe)
et `observation_labels` (issu de `ObservationSummary`, déjà public-safe).
Aucune donnée interne ou sensible n'entre dans le calcul.

Items V1 (3 à 5 selon signaux disponibles, priorité dans cet ordre) :
1. Source — "Vérifier que les informations correspondent sur la source
   originale." (ou "Informations limitées : vérifiez les détails complets
   sur la source originale." si peu d'informations, seuil : snippet < 20
   caractères)
2. Freshness (si `observation_labels` non vide) — "Observation AkarFinder :
   à confirmer sur la source originale."
3. Similarity (si `similar_possible`) — "Comparer avec les résultats
   similaires possibles."
4. Price — "Comparer le prix affiché avec d'autres résultats proches."
5. Surface — "Confirmer la surface, l'étage et les charges si elles sont
   importantes pour vous."
6. Photos — "Vérifier les photos et l'adresse exacte sur la source
   originale."

Les items sont tronqués à 5 via `PUBLIC_RESULT_CHECKLIST_MAX_ITEMS`.

7. Données interdites

- `value_low` / `value_median` / `value_high` (dataset marché interne)
- `evidence_ref`
- `cache_key` (cache Gateway)
- `similarity_score` / `similarity_group_id` (moteur de similarité interne)
- contact, téléphone, email, galerie/image

8. Limites V1

- Pas de section dédiée dans les fiches structurées/partenaires (Gateway
  uniquement pour l'instant).
- Le seuil "informations limitées" (snippet < 20 caractères) est un choix
  produit initial, ajustable sans changement de schéma.
- Aucune persistance : la checklist est recalculée à chaque rendu à partir
  des données déjà disponibles côté client (résultat Gateway + résumé de
  similarité + résumé d'observation).

9. Tests de sécurité

`scripts/scrapers/__tests__/public-result-checklist.test.ts` (12 tests,
enregistrés dans `npm run test:scrapers`) couvre : génération standard (3 à
5 items), item "informations limitées", item de comparaison similaire, item
de confirmation fraîcheur, plafond strict à 5 items, absence de wording
interdit, absence de score numérique, absence de contact/galerie/prix
dataset, absence de checklist si `title`/`original_url` manquant (jamais de
crash), et l'intégration bout-en-bout via
`buildAkarInfoPassportForGatewayResult`.

10. Prochaines étapes

- Étendre la checklist aux fiches structurées/partenaires si validé
  produit.
- GO explicite pour la production.
- Après validation preview + production : SEO-CITY-INTENT-PAGES-1.

Dette wording constatée (hors scope de cette mission, à surveiller) :
`lib/package-score/calculate-package-score.ts` affiche déjà "Annonce
fiable" accompagné d'un score numérique `/100` sur les fiches internes
(premier-parti). Cette wording est antérieure à cette mission et à
FRESHNESS-OBSERVATION-SCORE-1, et gouvernée par une doctrine produit
distincte (Package Score, P10E). Elle entre en tension avec le wording
interdit de cette mission et des précédentes ; à clarifier un jour (scope
séparé, ne bloque pas cette mission car aucun résultat Gateway ne l'utilise).
