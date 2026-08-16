# Carte intelligence marché — C4 closeout

Date : 2026-08-16
Statut : CLOSED

## Résultat

La vue Rabat de `/map` utilise désormais une heat map polygonale MapLibre dédiée à l'intelligence marché, conforme au contrat C4 et alimentée par l'API C3.

Livré et certifié :
- trois modes réels `Prix / Densité / Annonces` ;
- séparation `Vente / Location` ;
- fills, légende et états neutres dérivés du payload C3 ;
- aucune interpolation ni valeur mock hardcodée ;
- clic/tap sur un polygone rendu → district canonique → fiche de zone ;
- CTA Search filtré sur ville, district et transaction ;
- erreur API fail-closed sans couleur de substitution ;
- autres villes conservées sur l'expérience Carte historique ;
- cockpit mobile 390 px sans overflow des trois modes ;
- H1 sémantique restauré pour la vue intelligence Rabat ;
- audit Responsive P1A.6 adapté aux deux expériences `legacy` et `intelligence` sans supprimer les contrôles legacy.

## Preuves exact-head

Head PR #703 : `17a027bef93239355cb614251668e63fff05e71e`.

- Carte C4 Rabat Heatmap Gate `31922357603` : SUCCESS ;
- P1A.6 Responsive Hardening `31922357579` : SUCCESS ;
- Phase 1 Final Design Accessibility Gate `31922357533` : SUCCESS ;
- Carte C4 Rabat Browser Smoke `31922357584` : SUCCESS ;
- artefact browser `9256782867` ;
- digest `sha256:f9fba92e71d1a75aa261f612f9cc0cda1421d330b5e06e465558416cbc5d827a`.

Le smoke navigateur certifie en mobile 390 px et desktop 1280 px :
- chargement API C3 ;
- changement des trois modes ;
- absence d'overflow des tabs ;
- détection d'un polygone MapLibre réellement interactif ;
- clic réel sur le canvas ;
- sélection d'un district autorisé ;
- ouverture du panneau zone ;
- CTA Search cohérent avec la sélection ;
- 0 page error et 0 échec de requête C3 dans la preuve.

Inspection visuelle de l'artefact :
- mobile : trois tabs complets, carte lisible, panneau compact, CTA visible, navigation basse intacte ;
- desktop : quatre zones lisibles, légende visible et panneau latéral sans collision bloquante.

## Merge

PR #703 mergée sur `main` : `97d1b070d4a8cd7eb9cce18de76d12b35b167b05`.

Le drift `main` préalable provenait de #704 et ne touchait que trois fichiers SEARCH Price Coverage v6 ; aucun fichier Carte/UI/API C3 n'était concerné.

## Incidents qualifiés pendant C4

- un ancien UI All Pages Baseline avait 208/208 captures et 0 finding, puis a échoué uniquement sur `FinalizeArtifact` avec `ECONNRESET` ;
- un ancien P5 avait échoué sur le téléchargement Google Fonts ;
- deux premiers essais du browser smoke utilisaient une projection théorique trop fragile. Après deux échecs similaires, la stratégie a été remplacée par un scan du canvas rendu jusqu'à une vraie zone `cursor:pointer`.

Aucun de ces incidents n'est utilisé pour masquer un finding produit.

## Handoff C5

C5 doit enrichir la fiche zone sans modifier la vérité statistique :
- métriques live exclusivement C3 ;
- contexte quartier canonique séparé des métriques ;
- aucun contexte inventé lorsqu'il manque, notamment Souissi dans le dataset `NeighborhoodPoint` actuellement audité ;
- Search CTA et disclaimer `market_zone` conservés.
