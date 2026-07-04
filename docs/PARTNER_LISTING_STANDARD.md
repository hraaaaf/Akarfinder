# PARTNER_LISTING_STANDARD.md - Standard de fiche partenaire AkarFinder

## 1. Objectif du standard

AkarFinder ne se contente pas d'afficher des annonces. AkarFinder impose un standard de fiche partenaire structuree pour les promoteurs, agences premium et agences partenaires qui veulent beneficier d'une presence enrichie.

Le standard sert a garantir que les fiches partenaires sont exploitables, autorisees, pertinentes et distinctes des resultats web externes.

## 2. Pourquoi un modele structure

Un partenaire ne peut pas passer devant uniquement parce qu'il paie ou parce qu'il est partenaire.

Ordre produit:
1. Pertinence d'abord.
2. Partenaire ensuite.
3. Qualite de fiche ensuite.
4. Source externe en dernier.

Le modele structure protege:
- la qualite de recherche;
- la credibilite produit;
- la separation entre partenaires autorises et resultats web externes;
- les futurs profils de recherche utilisateur;
- les futures regles de ranking sans fausse promesse.

## 3. Champs obligatoires minimum

### Identite

- `partner_id`
- `partner_type`: `promoter` | `agency`
- `partner_tier`: `promoter_partner` | `agency_premium` | `agency_partner`
- `authorization_status`: `partner_authorized`
- `source_authorization_note`

### Transaction

- `transaction_type`: `sale` | `rent` | `new` | `sell_request`
- `property_type`: `apartment` | `villa` | `house` | `land` | `office` | `retail` | `project`

### Localisation

- `city`
- `district`
- `location_level`
- `approximate_area_label`
- `address_public_allowed`

Regles:
- le quartier est obligatoire;
- la localisation doit etre exploitable;
- l'adresse exacte publique est autorisee uniquement si le partenaire l'autorise explicitement.

### Prix

- `currency`: `MAD`
- `price_display_mode`: `exact` | `range` | `on_request`
- `price_amount` si affichage exact
- `price_range_min` et `price_range_max` si affichage par fourchette

### Caracteristiques

- `surface_m2`

### Statut

- `availability_status`: `available` | `upcoming` | `reserved` | `sold` | `rented` | `unknown`

### Medias

- `photos_authorized`
- `photo_count`
- `media_usage_scope`: `akarfinder_partner_page` | `partner_campaign` | `none`

### Contact

- `contact_authorized`
- `contact_mode`: `form` | `partner_page` | `phone` | `hidden`

### Description

- `title`
- `short_description`
- `normalized_description`
- `highlights`
- `points_to_verify`

### Enrichissement autorise

- `proximity_allowed`
- `neighborhood_context_allowed`
- `mobility_context_allowed`

## 4. Champs recommandes

- `latitude`
- `longitude`
- `bedrooms`
- `bathrooms`
- `floor`
- `orientation`
- `elevator`
- `parking`
- `terrace`
- `furnished`
- `condition`
- `last_partner_update_at`

## 5. Niveaux de localisation

1. `district_only`: quartier public uniquement.
2. `approximate_zone`: zone approximative exploitable, sans adresse exacte.
3. `exact_address_authorized`: adresse exacte utilisable publiquement parce que l'autorisation est claire.

Regle: AkarFinder ne publie jamais une adresse exacte si `address_public_allowed` n'est pas `true`.

## 6. Niveaux de qualite de fiche

Niveaux internes:
- `limited`: champs minimum manquants.
- `standard`: champs minimum presents.
- `enriched`: fiche structuree avec specs, photos autorisees et contact autorise.
- `premium_ready`: fiche complete avec mise a jour recente et enrichissements quartier/proximite/mobilite autorises.

Labels publics autorises:
- `Informations limitees`
- `Fiche structuree`
- `Fiche enrichie`
- `Presentation premium`

Les labels ne signifient jamais que l'annonce est garantie, certifiee ou juridiquement controlee.

## 7. Regles medias/photos

Les photos partenaires peuvent etre affichees uniquement si:
- `photos_authorized` vaut `true`;
- `photo_count` est superieur a 0;
- `media_usage_scope` autorise l'usage AkarFinder.

Les resultats web externes restent sans galerie et sans image reutilisee par defaut.

## 8. Regles contact

Un CTA partenaire peut etre affiche uniquement si:
- `contact_authorized` vaut `true`;
- `contact_mode` n'est pas `hidden`;
- la fiche est rattachee a un partenaire autorise.

Les resultats web externes restent sans contact direct, sans WhatsApp et sans formulaire AkarFinder.

## 9. Regles proximite/quartier

AkarFinder peut afficher des informations de proximite, quartier ou mobilite uniquement si:
- la localisation est exploitable;
- le partenaire autorise l'enrichissement correspondant;
- le wording reste indicatif.

Les donnees quartier ne doivent pas devenir une promesse de valeur, securite, temps de trajet ou disponibilite.

## 10. Regles d'affichage public

Labels autorises:
- Promoteur partenaire
- Agence premium
- Agence partenaire
- Resultat web externe
- Source originale
- Apercu limite
- Fiche enrichie
- Informations limitees
- Page partenaire autorisee

Labels interdits:
- verifie
- certifie
- officiel
- fiable
- meilleur
- garanti
- prix reel
- annonce verifiee
- annonce fiable
- agence de confiance
- partenaire officiel

## 11. Partenaire autorise vs resultat web externe

Resultats web externes:
- sans images;
- sans contact direct;
- sans galerie;
- avec source originale;
- avec apercu limite;
- redirection vers la source.

Resultats partenaires autorises:
- images autorisees possibles;
- details enrichis possibles;
- proximite, mobilite et quartier possibles;
- CTA partenaire possible;
- page projet ou fiche partenaire possible si l'autorisation est claire.

## 12. Wording autorise/interdit

Wording autorise:
- Sources immobilieres analysees
- Recherche multi-sources
- Doublons detectes
- Version beta
- Promoteurs partenaires
- Page partenaire autorisee
- Fiche structuree
- Fiche enrichie
- Informations limitees

Wording interdit pour les fiches partenaires:
- verifie
- certifie
- officiel
- fiable
- meilleur
- garanti
- prix reel
- annonce verifiee
- annonce fiable
- agence de confiance
- partenaire officiel

## 13. Impact futur sur ranking

Cette mission documente la regle future, sans l'implementer.

Ordre logique futur:
1. Resultats partenaires autorises tres pertinents.
2. Promoteurs partenaires si recherche neuf ou achat neuf.
3. Agences premium si achat ou location classique.
4. Agences partenaires standards.
5. Resultats web externes sans images.

Regle centrale: un partenaire ne passe jamais devant si son resultat n'est pas pertinent.

Exemples:
- recherche `location studio Casablanca`: agences location pertinentes avant promoteurs neuf;
- recherche `programme neuf Bouskoura`: promoteurs partenaires pertinents avant agences generalistes;
- recherche `terrain Marrakech`: terrain pertinent avant appartement premium non pertinent.

## 14. Preparation pour profil de recherche utilisateur

Le standard prepare les futurs profils de recherche:
- type d'intention;
- budget;
- type de bien;
- quartier;
- mobilite;
- proximite;
- besoin MRE;
- achat neuf vs achat classique;
- location vs vente.

Ces profils pourront aider a classer les fiches autorisees pertinentes, sans modifier les droits d'affichage et sans promouvoir une fiche non pertinente.
