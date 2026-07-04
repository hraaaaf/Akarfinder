# Partner Quality Scoring Policy

Mission: PARTNER-QUALITY-SCORING-POLICY-1 (2026-07-05)

## Regle centrale

AkarFinder ne score pas "la verite" d'une annonce.
AkarFinder score la qualite, la structure, l'autorisation et l'exploitabilite
d'une fiche partenaire.

Aucun score interne n'est affiche tel quel. La seule sortie publique reste
les labels definis dans `lib/partners/partner-listing-quality.ts` :

- Informations limitees
- Fiche structuree
- Fiche enrichie
- Presentation premium

Termes interdits en sortie publique (liste `FORBIDDEN_PARTNER_PUBLIC_LABEL_TERMS`) :
fiable, verifie, certifie, officiel, garanti, meilleur, et derives.
Ce scoring ne doit jamais etre presente comme un "score de fiabilite".

## Scores internes (0-100)

Implementation : `lib/partners/partner-quality-score.ts`
Types : `lib/partners/partner-quality-score-types.ts`

### 1. search_relevance_score

Correspondance ponderee entre une intention de recherche
(`PartnerSearchIntent`) et une fiche :

| Critere | Poids |
| --- | --- |
| transaction | 30 |
| ville | 25 |
| quartier | 10 |
| type de bien | 15 |
| budget | 10 |
| surface | 5 |
| profil utilisateur | 5 |

Regles :
- Un critere non specifie dans l'intention ne penalise jamais.
- Un mismatch de transaction plafonne le score a 20 : un partenaire
  non pertinent ne peut jamais depasser un resultat pertinent.
- Une intention "sale" (achat) accepte l'inventaire "new" ; l'inverse est
  faux, et "rent" ne matche jamais sale/new.

### 2. partner_listing_quality_score

Contrepartie numerique du niveau de qualite (somme = 100) :
champs obligatoires (25), localisation exploitable (10), signal prix (10),
surface (5), photos autorisees (10), plan 2D affichable (10), contact
autorise (10), description normalisee (5), mise a jour recente (10),
proximite autorisee (5).

### 3. authorization_score

Hierarchie interne d'autorisation / exploitabilite :

| Source | Score |
| --- | --- |
| web_external | 10 |
| partner_authorized | 60 |
| agency_partner | 70 |
| agency_premium | 85 |
| promoter_partner | 85 |
| first_party | 100 |

`web_external` reste un apercu limite avec source originale : sans image,
sans contact, sans galerie.

### 4. location_completeness_score

Base : district_only (40), approximate_zone (60),
exact_address_authorized (90). Bonus : proximity_allowed (+4),
mobility_context_allowed (+3), neighborhood_context_allowed (+3).
Plafond 100.

### 5. freshness_score

Tiers : recent (<= 90 jours) = 100, stale = 40, unknown = 0.

## Composite

`computePartnerQualityScores(listing, intent?, now?)` retourne les cinq
scores + `quality_level` + `public_label`, en reutilisant
`getPartnerListingQualityLevel` (les regles plan 2D promoteur/agence de
PARTNER-LISTING-FLOORPLAN-STANDARD-1 restent la source de verite du niveau).

## Tests

`scripts/scrapers/__tests__/partner-quality-score.test.ts` (19 tests,
inclus dans `npm test`) :
- fiche minimale -> limited
- fiche standard -> standard
- fiche enrichie -> enriched
- promoteur avec plan 2D + localisation + photos/contact -> premium_ready
- promoteur sans plan 2D -> jamais premium_ready
- agence complete -> premium_ready sans plan 2D
- aucun label interdit retourne
- ordre des sources d'autorisation
- plafond relevance sur mismatch transaction
- tiers freshness et localisation

## Hors scope

Pas de DB, pas de Supabase, pas de Search Gateway, pas d'API, pas de page
live, pas de ranking live. Logique pure et testable uniquement.
