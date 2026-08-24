# AkarFinder — Partner → Neighborhood → Market Intelligence Pipeline V2

Date : 2026-08-24  
Statut : **P1 CLOSED — 1/5 lots certifiés = 20 %**

## Chantier

**Partner → Neighborhood → Market Intelligence Pipeline V2**

## Goal global

Faire d'une annonce partenaire riche une vérité canonique unique capable d'alimenter, sans duplication de logique :

`Partenaire → Canonical Property/Offer → Geo Resolver → Neighborhood ID → Search + Carte + fiche quartier + métriques admissibles`

Le pipeline doit préserver les doctrines existantes AkarFinder : provenance explicite, géographie fail-closed, confidentialité de l'adresse, séparation vente/location, absence d'imputation, distinction inventaire observé / représentativité marché et aucune frontière territoriale inventée.

## Succès global

Le chantier est réussi lorsqu'une annonce partenaire conforme peut :

1. être ingérée de manière idempotente avec une identité partenaire stable ;
2. être normalisée vers le schéma canonique AkarFinder sans perte des faits utiles de l'Annonce modèle V1 ;
3. être résolue vers le meilleur niveau géographique réellement prouvé ;
4. alimenter Search et la Carte depuis la même vérité canonique ;
5. contribuer uniquement aux métriques auxquelles ses faits et son scope la rendent éligible ;
6. être mise à jour, réservée, vendue/louée, retirée puis éventuellement réactivée sans créer un faux nouveau bien ;
7. conserver les droits médias/contact/localisation et la provenance partenaire ;
8. ne jamais transformer un inventaire partenaire en prétendue exhaustivité du marché.

## Preuves globales attendues

- contrats/types versionnés ;
- tests unitaires de validation/normalisation/dédup/lifecycle ;
- tests du Geo Resolver ;
- fixtures partenaires représentatives ;
- preuve DB/read-model sans mutation implicite du ranking ;
- preuves Search + Map sur les mêmes identifiants canoniques ;
- certification métriques avec `NULL` fail-closed ;
- certification navigateur 390 / 430 / 768 / 1280 pour tout changement UI ;
- aucune activation ou déploiement production implicite.

---

# P1 — Contract V2 ✅ CLOSED

## Goal

Figer le contrat unique entre :

- `docs/AKARFINDER_ANNONCE_MODEL_V1.md` ;
- `docs/PARTNER_LISTING_STANDARD.md` ;
- `lib/property-schema/core.ts` ;
- les futurs adaptateurs CSV/XLSX/API/feed ;
- Search, Carte et Market Intelligence.

P1 ne réalise aucune ingestion production, migration, activation publique, changement de ranking ni déploiement.

## 1. Identité stable

Chaque offre partenaire doit porter :

- `partner_id` ;
- `partner_listing_id` stable chez le partenaire ;
- `source_id` / `source_name` AkarFinder ;
- `external_offer_id = partner_listing_id` ;
- `property_id` canonique AkarFinder ;
- `offer_id` canonique AkarFinder.

Clé d'idempotence prioritaire :

`partner_id + partner_listing_id`

Le fingerprint heuristique existant reste un signal de rapprochement/déduplication, jamais l'identité primaire d'une offre partenaire lorsque l'identifiant partenaire existe.

## 2. Lifecycle canonique

Les états partenaire doivent être projetés vers le contrat existant :

- `available` ;
- `upcoming` ;
- `reserved` ;
- `sold` ;
- `rented` ;
- `withdrawn` ;
- `unknown`.

Champs temporels minimaux :

- `published_at_source` ;
- `first_observed_at` ;
- `last_observed_at` ;
- `updated_at_source` / `last_partner_update_at`.

Une modification de prix, de disponibilité, de média ou de description met à jour l'offre existante ; elle ne crée pas une nouvelle propriété par défaut.

## 3. Mapping Annonce modèle → canonique

### Classification

- transaction → `CanonicalOfferV1.transaction_type` ;
- type de bien → `facts.classification.property_type` ;
- segment neuf/revente → `facts.classification.market_segment` lorsque fourni/prouvé.

### Localisation

- ville → `facts.location.city` ;
- quartier/district déclaré → `facts.location.neighborhood` / `district` selon résolution ;
- résidence → `facts.location.residence_name` ;
- rue/repère → `street_name` / `location_landmark` ;
- adresse exacte privée → `address_private`, visibilité INTERNAL/PARTNER_ONLY ;
- adresse publique autorisée → `address_display`, uniquement avec permission explicite ;
- latitude/longitude → faits canoniques avec provenance ;
- précision/source géographique → `geo_precision` / `geo_source`.

### Offre

- titre / description → `CanonicalOfferV1.title` / `description` ;
- prix exact → `price_amount`, MAD, `price_status=valid` si valide ;
- fourchette → `price_range_min/max`, sans fabriquer de prix exact ;
- sur demande → `price_status=not_disclosed` ;
- négociable → `negotiable_declared` ;
- charges/syndic → `monthly_charges` / `syndic_fee` ;
- disponibilité → `availability_status`.

### Caractéristiques

Les champs surface, agencement, bâtiment, équipements, état, terrain et juridique sont projetés dans les groupes déjà présents dans `CanonicalPropertyFactsV1`. Un champ non fourni reste absent/null avec sa provenance ; il n'est jamais inféré pour améliorer artificiellement la fiche.

### Médias

Photo, vidéo, plan et document utilisent `MediaAssetV1` et ses droits :

- `rights_status` ;
- `publication_permission` ;
- cache/download permissions ;
- attribution/provenance.

Aucun média partenaire n'est rendu public si l'autorisation ne le permet pas.

## 4. Provenance et droits partenaire

Une offre partenaire doit utiliser un canal canonique compatible :

- `partner_api` ;
- `partner_feed` ;
- `manual_partner` lorsque saisie/import opérateur.

Le statut commercial ne suffit jamais à prouver les droits. L'exposition publique `partner` reste soumise aux règles C6 existantes : organisation validée, active et autorisation source confirmée.

Les faits conservent séparément : valeur, provenance, confiance, date d'observation, source, statut de vérification et visibilité.

## 5. Geo Resolver V2 — contrat de sortie

Le resolver doit produire, sans jamais forcer un quartier :

- `city_raw` + ville canonique ;
- `neighborhood_raw` ;
- `canonical_neighborhood_id | null` ;
- nom canonique quartier | null ;
- `latitude/longitude | null` ;
- niveau de précision ;
- source/preuve de résolution ;
- confiance ;
- possibilité de publication de la position ;
- état : `resolved_exact | resolved_neighborhood | resolved_city | unresolved`.

Ordre de preuve :

1. coordonnées/adresse partenaire exploitables et autorisées pour résolution interne ;
2. correspondance quartier + ville sur autorité AkarFinder ;
3. alias/synonyme explicitement enregistré ;
4. ville seule ;
5. unresolved.

L'adresse exacte privée peut augmenter la précision interne sans jamais devenir publique.

## 6. Éligibilité aux métriques

### Prix/m² annonce

Calcul uniquement si :

- prix exact MAD positif et valide ;
- surface canonique pertinente positive ;
- même offre/propriété sans ambiguïté critique.

Formule : `price_amount / surface_m2`.

Une fourchette ou un prix sur demande ne devient jamais un faux prix exact.

### Volume d'annonces

`listing_count` compte uniquement les offres éligibles au snapshot défini, dédupliquées et dans le scope exact `territoire × transaction` (et autres dimensions lorsque requises).

Le wording reste **annonces observées / inventaire partenaire AkarFinder** tant que la représentativité marché n'est pas certifiée.

### Densité/km²

Contrat inchangé :

`listing_density_km2 = eligible_listing_count / certified_area_km2`

Le dénominateur doit appartenir au **même territoire canonique** et provenir d'une géométrie Polygon/MultiPolygon ou d'une autorité territoriale qui fournit une surface équivalente vérifiable.

Interdictions :

- aire d'une bounding box ;
- rayon autour d'un point/centroïde ;
- surface déduite d'un nombre de quartiers ;
- surface inventée depuis les valeurs de prix.

### Référentiel national des prix AkarFinder

Le référentiel national des prix peut être branché comme **source de référence marché** et comme candidat d'autorité territoriale.

Pour la densité, il ne devient dénominateur que si, pour le territoire concerné, il fournit ou référence de manière vérifiable :

- le même identifiant territorial canonique ;
- une géométrie/surface territoriale exploitable ;
- provenance/version ;
- `area_km2 > 0` recomputable ou autrement certifiée.

**État P1 : l'existence de la partie prix est connue du projet, mais la présence d'une surface nationale neighborhood-grade dans ce référentiel n'est pas prouvée par les fichiers inspectés pendant P1.** Il est donc enregistré comme `candidate_area_authority`, pas comme aire certifiée implicite.

Si cette preuve existe plus tard, elle peut alimenter directement P4 sans modifier le contrat. Sinon, Prix/Volume fonctionnent et Densité reste `NULL` pour le territoire concerné.

### Métriques marché agrégées

- vente/location toujours séparées ;
- `NULL` reste absence de donnée, jamais zéro ;
- fiabilité statistique et représentativité acquisition restent distinctes ;
- partenaires nombreux n'impliquent pas automatiquement marché exhaustif ;
- provenance et taille d'échantillon restent attachées au snapshot.

## 7. Sorties aval

Une même offre canonique pourra alimenter :

### Search

- filtres ville/quartier/type/transaction/prix/surface/etc. ;
- ranking séparé des droits/provenance ;
- page annonce enrichie.

### Carte

- pin/cluster si position publiable/exploitable ;
- rattachement quartier si `canonical_neighborhood_id` résolu ;
- volume observé ;
- CTA vers Search avec même ville/quartier.

### Fiche quartier

Lorsque les données sont admissibles :

- volume ;
- médiane prix/m² ;
- densité si aire certifiée ;
- catégories ;
- fraîcheur ;
- taille d'échantillon ;
- provenance/confiance ;
- inventaire partenaire distinct du marché total.

## 8. Adaptateurs P2

Tous les canaux futurs doivent produire le même contrat :

`CSV/XLSX | Partner API | feed → Adapter → PartnerListingV2 → CanonicalPropertyV1/CanonicalOfferV1`

Aucun adaptateur ne doit écrire directement une logique métier spécifique dans Search ou Map.

Le vieux CSV Light reste une entrée de compatibilité à migrer ; il ne devient pas un second modèle métier.

## 9. Non-goals P1

P1 n'introduit :

- aucune migration DB ;
- aucun write production ;
- aucun changement Search/Ranking ;
- aucune activation Map ;
- aucun nouveau chiffre marché public ;
- aucun déploiement Vercel.

## 10. Certification P1

Preuves fermées :

- Annonce modèle V1 couverte ;
- Partner Listing Standard couvert ;
- `CanonicalPropertyV1` / `CanonicalOfferV1` réutilisés ;
- identité stable + lifecycle définis ;
- contrat Geo Resolver fail-closed défini ;
- contrat métriques compatible avec `docs/CARTE_INTELLIGENCE_METRICS_CONTRACT.md` ;
- Densité protégée par `certified_area_km2` ;
- référentiel national des prix traité sans lui attribuer une géométrie non prouvée ;
- interfaces P2–P5 définies ;
- relecture effectuée sur la branche après le commit initial.

Preuves repo :

- `lib/property-schema/core.ts` expose déjà provenance, visibilité, adresses privée/publique, lat/lng, lifecycle offre, médias et intelligence ;
- `docs/CARTE_INTELLIGENCE_METRICS_CONTRACT.md` impose déjà `listing_count / area_km2` et interdit bounding box/rayon ;
- `docs/CARTE_C2_CLOSEOUT.md` confirme le contrat réel Prix / Volume / Densité ;
- `scripts/import-partner-csv.ts` confirme que le CSV Light actuel est plus pauvre et utilise encore le fingerprint comme identité d'upsert.

**Verdict : P1 CLOSED.**

---

# Roadmap V2

1. **P1 — Contract V2 ✅ CLOSED**
2. **P2 — Partner Ingestion V2 🔵 ACTIVE** : CSV/XLSX/API/feed, validations, médias/droits, stable IDs, lifecycle, idempotence.
3. **P3 — National Geo Resolver** : ville/quartier/adresse/coordonnées → Neighborhood ID, précision et confidentialité.
4. **P4 — National Market Aggregator** : Prix/m², Volume, Densité lorsque l'aire est certifiée, catégories, historique, fraîcheur, confiance.
5. **P5 — Map Intelligence Wiring + Certification** : Search/Map/fiche quartier sur la même vérité, navigateur 390/430/768/1280 et closeout.

## Avancement

**1/5 lots certifiés = 20 %.**