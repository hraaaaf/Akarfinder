# AkarFinder — Carte + Search + Listing Roadmap

Statut : **N0 EN COURS**
Date : 2026-08-19
Référentiel : `docs/AKARFINDER_EXPERIENCE_STANDARD_V1.md`
Base : `main@49b80c4c1deffb1f1999f91412b5092151ac63c5`

## Goal global

Unifier Carte, Search, fiche annonce et publication autour d'un même contrat UX et data :

**Territoire → Marché → Vie locale → Biens → Décision**

## Succès global

- Carte et Search deviennent une expérience cohérente, sans perte de contexte ;
- la fiche annonce devient la vue décisionnelle canonique ;
- la publication User / Agence / Promoteur produit des annonces conformes au même standard ;
- aucune fausse précision géographique ni donnée marché inventée ;
- mobile et desktop disposent de comportements dédiés ;
- chaque lot visuel est certifié BEFORE / target / AFTER ;
- aucun déploiement Vercel sans autorisation explicite.

## N0 — Audit + doctrine + référentiel

Statut : **EN COURS**

Goal : transformer les baselines finales existantes en contrat cible avant toute modification runtime.

Scope :
- audit Map / Search / Listing / publication ;
- figer state machine UX ;
- figer standards navigation ;
- figer semantic zoom ;
- figer Listing Standard ;
- wireframes contractuels ;
- identifier les composants réutilisables et les dettes réelles.

Succès :
- `AKARFINDER_EXPERIENCE_STANDARD_V1.md` versionné ;
- roadmap versionnée ;
- aucun runtime modifié ;
- baseline et HEAD sources documentés.

Preuve : diff docs + comparaison aux artefacts exact-head existants.

## N1 — Listing Standard + contrats source

Goal : rendre explicite et cohérent le contrat commun des annonces propriétaires, agences, promoteurs et résultats externes admissibles.

Scope :
- types acteur/source ;
- profondeur d'affichage par droits ;
- précision géographique canonique ;
- complétude vs confiance ;
- Property vs Offer/Listing ;
- harmonisation du chemin propriétaire avec le Registry sans régression de publication.

Succès : tests de contrat + fiche propriétaire/partenaire inchangée ou améliorée, aucun externe promu implicitement.

## N2 — Session de recherche + navigation unifiée

Goal : préserver le contexte Carte ↔ Search ↔ Listing.

Scope :
- session URL canonique ;
- ville/quartier/filtres/projet ;
- back/forward ;
- retour fiche vers contexte précédent ;
- `Voir sur la carte` ;
- suppression des resets inutiles.

Succès : scénarios de navigation automatisés sur desktop/mobile.

## N3 — Shell map/list cible

Goal : créer le shell Zillow-like AkarFinder sans perdre l'identité territoriale.

Desktop : split map/list.
Mobile : map-first + bottom sheet.

Scope :
- filtres sticky ;
- compteur résultats ;
- panneau résultats ;
- sheet mobile ;
- responsive 390/430/768/1280.

Gate visuel obligatoire : BEFORE → mockup haute fidélité verrouillé → AFTER.

## N4 — Viewport search + pins + clusters

Goal : faire de la carte une surface de recherche réelle.

Scope :
- bounds/viewport ;
- `Rechercher dans cette zone` ;
- pins prix pour `exact` uniquement ;
- représentation quartier/ville sans faux pin ;
- clustering ;
- synchronisation résultat ↔ pin.

Succès : aucun bien city-only/neighborhood-only affiché comme exact.

## N5 — Semantic zoom Marché

Goal : exploiter pleinement les acquis Prix / Densité / Annonces et ajouter Confiance.

Scope :
- lentilles Prix ;
- Densité ;
- Annonces ;
- Confiance ;
- transitions ville → quartier → biens ;
- géométries certifiées uniquement ;
- fail-closed.

Succès : métriques identiques entre carte et fiches quartier pour un même snapshot.

## N6 — Semantic zoom Vie locale

Goal : faire comprendre la qualité pratique du lieu sans saturer la carte.

Scope :
- POI par catégorie et zoom ;
- transport, écoles, santé, commerces, espaces verts, loisirs ;
- distances/isochrones uniquement lorsque la précision le permet ;
- hiérarchie et filtrage du bruit visuel.

Succès : pas de temps de trajet inventé pour les localisations approximatives.

## N7 — Listing ↔ Carte + propriété canonique multisource

Goal : relier la décision sur une fiche à son contexte cartographique et préparer le rapprochement Property/Offer.

Scope :
- preview depuis carte ;
- retour exact au contexte ;
- autres offres du même bien uniquement si rapprochement sûr ;
- provenance et prix de chaque offre ;
- aucune fusion silencieuse.

Succès : scénarios de navigation et de provenance certifiés.

## N8 — Onboarding normatif User / Agence / Promoteur

Goal : faire produire aux déclarants des dossiers conformes au AkarFinder Listing Standard.

Scope :
- formulaire dynamique ;
- champs conditionnels ;
- localisation et précision ;
- droits médias ;
- qualité/complétude en temps réel ;
- preview avant publication ;
- variantes acteur sans divergence de schéma.

Succès : un dossier valide produit une fiche conforme sans retouche manuelle structurelle.

## N9 — Certification globale

Goal : certifier l'expérience complète et fermer le chantier.

Scope :
- desktop/mobile ;
- Carte/Search/Listing/Onboarding ;
- navigation ;
- performance ;
- accessibilité ;
- états vides/error/fail-closed ;
- cohérence visuelle ;
- documentation et closeout.

Succès : tous les scénarios critiques passent et chaque surface UI possède sa preuve BEFORE / target / AFTER + score visuel.

## Options post-N9

Non incluses dans le dénominateur du chantier cœur :

- dessin polygonal de zone ;
- temps de trajet avancés/multimodaux ;
- nouvelles couches territoriales ;
- alertes géographiques ;
- recommandations explicables supplémentaires.

## Progression

Le dénominateur cœur est désormais **10 lots : N0 à N9**.

- lots CLOSED : **0/10** ;
- progression stricte : **0 %** ;
- N0 est actif.

Le précédent programme `Carte intelligence marché` reste historiquement fermé à 11/11 et n'est pas rouvert par ce nouveau chantier.
