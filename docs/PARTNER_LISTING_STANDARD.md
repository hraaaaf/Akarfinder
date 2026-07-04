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

### Plans 2D / plans de vente

- `floor_plan_authorized`
- `floor_plan_available`
- `floor_plan_type`: `unit_floor_plan` | `floor_plate` | `project_master_plan` | `site_plan` | `lot_plan` | `none`
- `floor_plan_display_mode`: `hidden` | `available_on_request` | `visible_on_partner_page` | `visible_in_demo`
- `floor_plan_source`: `partner_provided` | `architect_provided_by_partner` | `sales_brochure` | `demo_placeholder`
- `floor_plan_scope`: `unit` | `building` | `project` | `parcel` | `unknown`
- `floor_plan_has_dimensions`
- `floor_plan_has_room_labels`
- `floor_plan_has_orientation`
- `floor_plan_has_surface_breakdown`

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
- `floor_plan_usage_note`

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
- `premium_ready`: fiche complete avec mise a jour recente, enrichissements quartier/proximite/mobilite autorises et, pour promoteur ou programme neuf, plan 2D autorise ou disponible sur demande.

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

## 10. Plans 2D et documents visuels

### Pourquoi le plan 2D est important

Le plan 2D aide l'acheteur a comprendre l'organisation du bien avant contact: distribution des pieces, surface exploitable, orientation indicative, circulation interne, plan d'etage ou implantation projet.

Pour AkarFinder, le plan 2D est un element structurant de qualite de fiche, surtout pour:
- promoteurs partenaires;
- programmes neufs;
- residences;
- projets en vente sur plan;
- projets avec unites types.

### Cas promoteur / programme neuf

Pour les promoteurs et programmes neufs:
- le plan 2D est fortement recommande;
- il devient necessaire pour atteindre `premium_ready`;
- il doit etre autorise par le partenaire;
- il doit etre presente comme document fourni par le partenaire;
- il ne doit jamais etre presente comme controle, certifie ou officiel par AkarFinder.

Si un projet neuf n'a aucun plan 2D, il peut rester `standard` ou `enriched`, mais ne doit pas atteindre `premium_ready` sauf decision produit explicite documentee.

### Cas agence

Pour les agences:
- le plan 2D est optionnel;
- il ameliore la qualite percue si autorise;
- il peut etre utile pour villas, grands appartements, bureaux et locaux;
- il ne bloque pas `premium_ready` si le reste de la fiche est complet.

### Autorisation d'affichage

Regle stricte: si `floor_plan_authorized` vaut `false`, AkarFinder ne doit pas afficher le plan.

Un plan peut etre considere affichable uniquement si:
- `floor_plan_authorized` vaut `true`;
- `floor_plan_available` vaut `true`;
- `floor_plan_type` n'est pas `none`;
- `floor_plan_display_mode` n'est pas `hidden`.

### Niveaux d'affichage

- `hidden`: aucun affichage public.
- `available_on_request`: mention possible, sans affichage du document.
- `visible_on_partner_page`: affichage possible sur page partenaire autorisee.
- `visible_in_demo`: affichage limite a une demonstration clairement fictive.

### Mentions obligatoires

Wording autorise:
- Plan 2D fourni par le partenaire
- Plan indicatif
- Plan disponible sur demande
- Plan de vente partenaire
- A confirmer aupres du partenaire

Un plan 2D ne remplace jamais:
- visite;
- verification terrain;
- documents contractuels;
- confirmation par le partenaire.

### Wording interdit

Ne jamais utiliser:
- plan certifie;
- plan officiel;
- plan verifie;
- plan garanti;
- surface garantie;
- conformite garantie.

### Impact sur qualite de fiche

Pour promoteur / programme neuf:
- un plan 2D autorise ou disponible sur demande est requis pour `premium_ready`;
- sans plan 2D, la fiche peut rester `standard` ou `enriched`.

Pour agence:
- le plan 2D est un plus;
- il ne doit pas bloquer `premium_ready` si localisation, prix, surface, photos, contact, mise a jour et enrichissements autorises sont complets.

### Impact futur sur ranking

Le plan 2D pourra devenir un signal de qualite pour les fiches partenaires autorisees, mais ne doit jamais remplacer la pertinence de recherche.

Un promoteur avec plan 2D ne passe pas devant une agence plus pertinente pour une recherche location. Un programme neuf avec plan 2D peut etre favorise uniquement si l'intention utilisateur correspond au neuf ou au projet.

### Plan affiche vs plan disponible sur demande

Un plan affiche est visible sur une page partenaire autorisee ou dans une demo clairement fictive.

Un plan disponible sur demande signifie que l'utilisateur doit confirmer aupres du partenaire; AkarFinder ne montre pas le document et ne promet pas son exactitude.

## 11. Regles d'affichage public

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
- Plan 2D fourni par le partenaire
- Plan indicatif
- Plan disponible sur demande
- Plan de vente partenaire
- A confirmer aupres du partenaire

Labels interdits:
- verifie
- certifie
- officiel
- fiable
- meilleur
- garanti
- prix reel
- plan certifie
- plan officiel
- plan verifie
- plan garanti
- surface garantie
- conformite garantie
- annonce verifiee
- annonce fiable
- agence de confiance
- partenaire officiel

## 12. Partenaire autorise vs resultat web externe

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
- plan 2D possible uniquement si fourni ou autorise par le partenaire.

## 13. Wording autorise/interdit

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
- Plan 2D fourni par le partenaire
- Plan indicatif
- Plan disponible sur demande
- Plan de vente partenaire
- A confirmer aupres du partenaire

Wording interdit pour les fiches partenaires:
- verifie
- certifie
- officiel
- fiable
- meilleur
- garanti
- prix reel
- plan certifie
- plan officiel
- plan verifie
- plan garanti
- surface garantie
- conformite garantie
- annonce verifiee
- annonce fiable
- agence de confiance
- partenaire officiel

## 14. Impact futur sur ranking

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

## 15. Preparation pour profil de recherche utilisateur

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
