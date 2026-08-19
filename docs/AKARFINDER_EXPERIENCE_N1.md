# AkarFinder Experience — N1 Listing Standard + contrats source

Statut : **IMPLEMENTED — PR/CI À CERTIFIER**
Date : 2026-08-19
Base : `main@19a7b9bc80eb7220d085b8fc52f698cb3f991c4d`
Référentiel : `docs/AKARFINDER_EXPERIENCE_STANDARD_V1.md`

## Goal

Rendre explicite et cohérent le contrat commun des annonces propriétaire, agence, promoteur et sources externes admissibles, sans élargir implicitement les droits de publication ou d'affichage.

## Succès

1. une identité de source stable est distincte du libellé public ;
2. le propriétaire AkarFinder est first-party via `owner_declared`, sans enregistrer `Propriétaire` comme clé d'autorisation ;
3. les annonces externes/benchmark ne gagnent jamais une fiche interne par fallback ;
4. la précision géographique contrôle explicitement l'éligibilité aux pins ;
5. complétude et confiance sont projetées comme deux mesures séparées ;
6. le contrat reste additif et compatible avec `CanonicalPropertyV1` / `CanonicalOfferV1` existants ;
7. aucun changement visuel intentionnel, aucune mutation DB/source, aucun déploiement Vercel.

## Finding corrigé — fiche propriétaire

Avant N1, `/listings/owner-*` fournissait le libellé humain `Propriétaire` à `buildPublicPropertyDetailV2()`.

Le détail public et l'intelligence SERP appliquent chacun un garde Source Registry. Comme `Propriétaire` n'était pas une clé autorisée, il retombait fail-closed en `third_party_legacy` et le détail pouvait finir en `notFound()`.

N1 corrige le contrat plutôt que de transformer un libellé humain en permission :

- clé stable : `owner_declared` → `first_party` ;
- libellé public : `Propriétaire` inchangé ;
- acteur : `owner` ;
- provenance : `Déclaré par le propriétaire` ;
- `source_id` est propagé jusqu'à l'intelligence publique.

## Listing Standard v1

Nouveau module : `lib/listings/listing-standard-v1.ts`.

Il projette trois contrats :

### Source

- `actor_type` : owner / agency / promoter / broker / akarfinder / external_source / benchmark / unknown ;
- `source_access_type` depuis le Registry ;
- profondeur : `full_internal`, `limited_preview`, `market_signal_only`, `hidden` ;
- droits contact / galerie / détail interne ;
- obligation éventuelle de retourner à la source originale.

Aucun acteur n'est promu par un simple libellé inconnu.

### Géographie

- `exact` ;
- `neighborhood_centroid` ;
- `city_centroid` ;
- `unknown`.

Règle pin : **`exact` + latitude/longitude valides uniquement**.

Un quartier sans coordonnées exactes reste au scope quartier. Une ville seule reste au scope ville. Une précision `exact` déclarée sans coordonnées utilisables ne suffit pas à dessiner un pin.

### Qualité

- `completeness_score` / libellé de complétude ;
- `confidence_score` / libellé de confiance ;
- `measured_separately: true`.

La complétude ne devient jamais une certification de véracité.

## Property vs Offer

N1 ne crée pas un second modèle parallèle. Le repo possède déjà `CanonicalPropertyV1` et `CanonicalOfferV1` dans `lib/property-schema/core.ts`.

Le Listing Standard v1 est une projection runtime additive destinée aux surfaces Search/Map/Listing. Le rapprochement multi-offres reste réservé à N7 et doit rester fail-closed sur signaux faibles.

## Tests N1

`experience-n1-listing-standard.test.ts` couvre :

- stable owner source id ;
- rejet du libellé `Propriétaire` seul comme permission ;
- détail propriétaire accepté via `owner_declared` ;
- external/benchmark non promus ;
- règles de précision géographique et pins ;
- séparation complétude / confiance ;
- projection Listing Standard agrégée.

## Hors scope

- changement visuel de la fiche ;
- navigation Carte ↔ Search ↔ Listing (N2) ;
- nouveau shell map/list (N3) ;
- migration DB ;
- activation d'une nouvelle source ;
- modification des droits média ;
- déploiement Vercel.

## Preuve attendue pour fermer N1

- tests N1 SUCCESS ;
- TypeScript/build SUCCESS via CI applicable ;
- PR mergée ;
- `main` post-merge vérifié ;
- roadmap programme mise à jour à 2/10 = 20 %.
