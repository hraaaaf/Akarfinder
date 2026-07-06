FRESHNESS_OBSERVATION_SCORE.md — Freshness / Observation prudente
Version : 2026-07-06 — FRESHNESS-OBSERVATION-SCORE-1

1. Objectif

Donner à l'utilisateur une lecture prudente de la fraîcheur apparente d'un
résultat public — en particulier un résultat Gateway externe — sans jamais
promettre que l'annonce est toujours disponible. La couche n'affecte ni le
ranking Search Gateway, ni la doctrine Gateway existante.

2. Pourquoi observation ≠ disponibilité

AkarFinder observe des résultats web publics ; il ne les contrôle pas.
"Observé récemment" décrit seulement le comportement d'indexation
d'AkarFinder (quand il a vu ce résultat), jamais l'état réel de l'annonce
chez la source. La disponibilité, le prix et les conditions restent à
confirmer sur la source originale — ce principe est répété dans l'UI par une
ligne d'aide dédiée pour tout résultat Gateway.

3. Labels autorisés

- Observé récemment
- Observé pendant cette recherche
- Première observation AkarFinder
- Déjà observé
- Observé plusieurs fois
- Dernière observation récente
- Source originale à confirmer
- Aperçu limité

4. Labels interdits

- Disponible confirmé
- Annonce active
- Annonce toujours disponible
- Annonce vérifiée
- Annonce fiable
- Score de fraîcheur
- Score de fiabilité
- Mis à jour par la source
- Prix confirmé

Ces libellés existent uniquement dans `lib/observation/observation-labels.ts`
(`FORBIDDEN_OBSERVATION_WORDING`) pour alimenter les tests de sécurité et les
scans — jamais dans l'UI publique.

5. Règles Gateway

Pour un résultat `source_kind = external_web`, `computeObservationSummary`
(`lib/observation/observation-policy.ts`) ne peut retourner qu'un
sous-ensemble strict :
Observé récemment, Observé pendant cette recherche, Première observation
AkarFinder, Déjà observé, Observé plusieurs fois, Source originale à
confirmer. Le filtrage est fait par un `Set` explicite (`GATEWAY_ALLOWED_LABELS`),
pas par une simple convention — un label hors de cette liste est retiré avant
retour, quel que soit l'état du record.

Sans historique persisté (cas actuel en production), le résultat est
plafonné à `["Observé pendant cette recherche", "Source originale à
confirmer"]` — jamais de fausse ancienneté.

6. Règles partenaire

Non câblé dans cette mission. `buildAkarInfoPassportForListing` (fiches
structurées / partenaires / démo) n'a pas été modifié : le risque de
sur-promettre une disponibilité partenaire ou de perturber le mode démo était
jugé disproportionné par rapport à la valeur ajoutée immédiate. La couche
reste héritable plus tard via le même moteur (`lib/observation/*`), sans
changement d'API.

7. Règles démo

Non affecté. Aucun fichier de démo (`app/demo/**`, mockup partenaire) n'a été
touché. Le mode démo reste prioritaire et ne peut pas être transformé en
donnée réelle par cette mission.

8. Fingerprint

`lib/observation/fingerprint.ts` — `buildObservationFingerprint` :
- priorité à `source_host + original_url` normalisés (accents retirés,
  minuscule, espaces compactés) ;
- repli sur `source_host + title + city + district + property_type +
  transaction_type + price + surface` si `original_url` est absent ;
- aucun champ contact/téléphone/email/image en entrée du tout — le type
  `ObservationFingerprintInput` ne les expose pas ;
- hash déterministe FNV-1a 32 bits (pas de `node:crypto`, compatible
  client/serveur), retourné préfixé `u:` (URL-based) ou `f:` (fallback).

9. Persistance actuelle

Abstraction uniquement (`lib/observation/observation-store.ts`) :
- `ObservationStore` (interface) ;
- `NoopObservationStore` — implémentation par défaut en production,
  `get()` retourne toujours `null`, ne fabrique jamais d'historique ;
- `InMemoryObservationStore` — mémoire de process, utilisée par les tests
  uniquement, non partagée entre instances, non durable.

Aucune table Supabase, aucune migration, aucune écriture en base n'a été
créée. Le front reste fonctionnel à l'identique si aucune persistance réelle
n'existe jamais. La lecture (`store.get(fingerprint)`) est effectuée pendant
le rendu du passeport Gateway ; aucune écriture (`recordObservation`) n'est
déclenchée depuis l'UI, pour éviter tout effet de bord côté rendu React et
toute modification de `app/api/search/gateway`.

10. Limites connues

- Sans persistance réelle, tout résultat Gateway affiche aujourd'hui
  "Observé pendant cette recherche" + "Source originale à confirmer" —
  c'est le comportement prudent attendu, pas un bug.
- La fenêtre "Observé récemment" (72h) est un choix produit initial,
  ajustable sans changement de schéma.
- Le fingerprint fallback (sans `original_url`) peut regrouper deux
  annonces distinctes si elles partagent exactement les mêmes attributs
  normalisés (même ville/quartier/type/transaction/prix/surface).
- La couche partenaire/démo n'hérite pas encore de cette lecture.

11. Tests de sécurité

`scripts/scrapers/__tests__/observation.test.ts` (18 tests, enregistrés dans
`npm run test:scrapers`) couvre : stabilité du fingerprint avec/sans
`original_url`, absence de fuite contact dans le fingerprint,
`assertNoUnsafeObservationExposure` sur des payloads contact/gallery,
mapping `observation_count` → labels (1/2/≥3), recadrage "Observé
récemment", restriction stricte du wording Gateway, stores no-op et mémoire,
et l'intégration bout-en-bout via `buildAkarInfoPassportForGatewayResult`.

12. Prochaines étapes

- GO explicite pour la persistance réelle (table + écriture côté ingestion,
  hors scope de cette mission).
- Étendre la lecture d'observation aux fiches structurées/partenaires si
  validé produit.
- Après validation preview + production : SIMILAR-PUBLIC-RESULTS-1.
