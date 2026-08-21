# AkarFinder — Annonce modèle V1

Status: PRODUCT CONTRACT — P8

## Goal

Faire du flow vendeur une fabrique d’annonces AkarFinder riches, structurées et comparables.

Le formulaire n’est pas le produit final. Le produit final est l’annonce AkarFinder.

Chaîne canonique :

`Formulaire vendeur → faits structurés → Score dossier AkarFinder → vérification humaine → décision explicite de publication → annonce publique enrichie AkarFinder`

## Principes non négociables

1. Le score mesure la **complétude / qualité du dossier**, jamais la qualité intrinsèque du bien.
2. Un champ ne compte que s’il contient une information réelle fournie ou vérifiée.
3. Les données marché, vie locale, comparables, financement et historique ajoutées par AkarFinder sont séparées du score vendeur afin de ne pas pénaliser un vendeur lorsque ces données externes sont indisponibles.
4. Aucun fait n’est inventé pour augmenter un score.
5. Les champs non applicables au type de bien sont exclus du dénominateur.
6. Les données sensibles, notamment l’adresse exacte, peuvent rester privées tout en améliorant la précision géographique.
7. Le score seul ne rend jamais une annonce publiable : les hard gates restent obligatoires.
8. La publication reste fail-closed : vérification humaine puis confirmation explicite du vendeur.

## Structure publique de l’annonce AkarFinder

### 1. Identité du bien
- transaction : vente / location
- type de bien
- titre public
- ville
- quartier
- résidence / repère si pertinent
- statut de disponibilité

### 2. Prix
- prix demandé
- devise
- prix/m² calculé lorsque surface et prix sont disponibles
- négociable déclaré
- charges / syndic lorsque pertinent

### 3. Caractéristiques essentielles
- surface principale
- chambres lorsque pertinent
- salles de bain lorsque pertinent
- pièces lorsque pertinent
- étage lorsque pertinent
- état du bien

### 4. Équipements et caractéristiques détaillées
Exemples selon le type de bien :
- ascenseur
- parking / garage
- terrasse / balcon
- jardin / piscine
- climatisation / chauffage
- cuisine équipée
- meublé
- sécurité / concierge / résidence fermée
- orientation / exposition
- vue
- année de construction
- standing / niveau de finition

### 5. Localisation
- ville / quartier public
- adresse exacte privée facultative
- précision géographique
- résidence / rue / repère facultatifs
- carte selon politique de confidentialité

### 6. Médias
- photo principale
- galerie
- ordre des photos
- plan facultatif
- vidéo facultative
- contrôles minimum de format, taille et résolution

### 7. Description vendeur
- description structurée
- points forts
- disponibilité
- informations pratiques pertinentes

### 8. Confiance et provenance
- déclaré par le vendeur
- cohérent / vérifié lorsqu’une preuve existe
- documents disponibles
- documents vérifiés séparément
- source et provenance affichables selon politique

### 9. Intelligence AkarFinder
Ajoutée par AkarFinder uniquement lorsque la donnée existe :
- prix/m²
- comparables marché
- position marché
- vie locale
- réalité de rue
- financement Maroc
- historique réel
- provenance

Ces enrichissements ne sont jamais inventés et ne gonflent pas artificiellement le score du dossier vendeur.

## Matrice des champs V1

### Obligatoires avant soumission du dossier

| Champ | Niveau | Schéma canonique / cible |
| --- | --- | --- |
| Transaction | obligatoire | `offer.transaction_type` |
| Type de bien | obligatoire | `classification.property_type` |
| Ville | obligatoire | `location.city` |
| Surface principale | obligatoire | `surfaces.surface_total_m2` |
| Prix demandé | obligatoire pour publication V1 | `offer.price_amount` |
| Téléphone de contact | obligatoire | lead/contact, non public par défaut |
| Consentement | obligatoire | lead/contact |

### Recommandés à fort impact

| Champ | Niveau | Schéma canonique / cible |
| --- | --- | --- |
| Quartier | recommandé | `location.neighborhood` |
| Chambres | recommandé si applicable | `layout.bedrooms_count` |
| Salles de bain | recommandé si applicable | `layout.bathrooms_count` |
| État | recommandé | `condition.condition` |
| Description ≥ 80 caractères | recommandé | `offer.description` |
| Au moins 3 photos acceptées | recommandé / hard gate publication | media |
| Étage | recommandé si applicable | `building.floor_number` |
| Orientation | recommandé | `building.orientation` |
| Parking / garage | recommandé si applicable | `features.has_parking`, `features.has_garage` |

### Bonus de richesse

- nombre de pièces
- surface habitable / construite / terrain
- terrasse / balcon / jardin
- piscine
- ascenseur
- cuisine équipée
- climatisation / chauffage
- sécurité / concierge / accès fermé
- meublé
- année de construction
- standing / finition
- vue
- résidence / repère
- charges / syndic
- négociable
- disponibilité
- plan / vidéo
- informations juridiques et documents disponibles

### Calculés automatiquement, jamais demandés comme faits vendeur

- prix/m²
- score dossier AkarFinder
- label de complétude
- position marché
- comparables
- contexte quartier / vie locale
- financement indicatif
- provenance normalisée
- historique réel disponible

### Vérifiables par document

- titre foncier / statut de titre
- référence cadastrale disponible
- permis de construire / habiter lorsque pertinent
- documents de copropriété lorsque pertinent
- autres preuves supportées par le pipeline documentaire

Déclaré et vérifié restent deux états distincts.

## Score dossier AkarFinder — 100 points

Le score est affiché avec son détail par dimension.

### A. Données essentielles — 30 pts

- type de bien : 5
- transaction : 3
- ville : 4
- quartier : 3
- surface principale : 5
- prix : 4
- chambres / équivalent applicable : 2
- salles de bain / équivalent applicable : 2
- état : 2

Les champs non applicables sont retirés du dénominateur puis la dimension est renormalisée sur 30.

### B. Caractéristiques détaillées — 20 pts

Score calculé sur un profil de champs applicable au type de bien. Exemples :
- agencement
- étage / bâtiment
- orientation / vue
- surfaces secondaires
- équipements majeurs
- état / finition

La dimension atteint 20 lorsque le profil applicable est suffisamment renseigné ; les champs sans pertinence pour le type de bien ne pénalisent pas.

### C. Médias — 20 pts

- 1 photo acceptée : 5 pts
- 3 photos acceptées : 10 pts
- 6 photos acceptées : 15 pts
- 8 photos acceptées : 18 pts
- 10 photos acceptées ou plus : 20 pts

Les photos doivent passer les contrôles format / taille / résolution. La quantité seule ne contourne pas ces contrôles.

### D. Localisation — 10 pts

- ville : 2
- quartier : 2
- résidence / rue / repère utile : jusqu’à 2
- position privée ou précision géographique meilleure que ville seule : jusqu’à 4

L’adresse exacte n’a pas à être publique.

### E. Confiance / documents — 20 pts

- identité/contact du déclarant suffisamment renseignés : jusqu’à 4
- informations juridiques déclarées : jusqu’à 4
- documents disponibles : jusqu’à 4
- documents effectivement vérifiés : jusqu’à 8

Aucun point de “vérifié” n’est attribué sur simple déclaration.

## Labels score

- 0–39 : `À compléter`
- 40–59 : `Correcte`
- 60–79 : `Bonne annonce`
- 80–89 : `Très complète`
- 90–100 : `Excellente fiche`

Ces labels parlent de la qualité de la fiche, pas de la valeur du bien.

## Hard gates de publication V1

Une annonce n’est publiable que si toutes les conditions suivantes sont remplies :

1. score dossier ≥ 60/100 ;
2. type de bien présent ;
3. transaction présente ;
4. ville présente ;
5. surface principale valide ;
6. prix valide pour Publication V1 ;
7. téléphone de contact valide au niveau syntaxique ;
8. consentement explicite ;
9. au moins 3 photos acceptées ;
10. vérification humaine `approved` ;
11. confirmation explicite du vendeur avant mise en ligne.

Le score ne peut jamais contourner un hard gate.

## Profils par type de bien

### Appartement / studio / duplex
Priorité : surface, chambres/pièces, salles de bain, étage, ascenseur, parking, balcon/terrasse, orientation, état, charges/syndic, meublé.

### Villa / maison / riad
Priorité : surface terrain, surface construite/habitable, chambres, salles de bain, jardin, piscine, garage, terrasse, orientation, état, année/finition.

### Terrain
Priorité : surface terrain, statut constructible, zonage/usage, façade, accès routier, eau/électricité/assainissement, forme/pente, informations juridiques.

### Bureau / local commercial / entrepôt
Priorité : surface utile, étage, façade, hauteur sous plafond, parking, accès, état, usage, charges, sécurité et équipements pertinents.

## Conséquence pour P8

Le futur formulaire doit être un assistant progressif qui collecte cette matrice par étapes et affiche en permanence :

- progression du flow ;
- score dossier actuel ;
- dimension la plus faible ;
- prochaine action qui augmente réellement le score ;
- aperçu de l’annonce AkarFinder produite.

Le formulaire ne doit pas présenter des champs sans pertinence pour le type de bien choisi.

## Preuves existantes dans le repo

- `lib/property-schema/core.ts` porte les groupes canonical classification/location/surfaces/layout/building/features/condition/land/legal.
- `components/listings/PropertyDetailV2.tsx` affiche déjà les groupes essentiels, surfaces, agencement, bâtiment/état, équipements, environnement, comparables, financement, historique et provenance.
- `lib/seller/readiness.ts` fournit déjà une base déterministe de complétude.
- `lib/seller/seller-property-draft.ts` produit déjà un brouillon structuré fail-closed.
- `SellerReviewStatusPanel` et `SellerPublicationPanel` séparent validation humaine et décision explicite de publication.

## P8 Success

P8 sera réussi lorsque le flow `/vendre/dossier` permet de construire une annonce conforme à ce contrat sans fabrication, avec score explicable, hard gates de publication et aperçu fidèle de la fiche publique cible.