# Carte des quartiers premium — Lot 5 Interactions Rabat

## Goal
Certifier les interactions et états de la carte premium Rabat sans modifier les contrats Geo/Search canoniques ni fabriquer de données.

## Baseline
Base de travail : merge Lot 4 `6238a4b0035bd608b511d59569afc0f5fb30e92c`.

État déjà prouvé avant Lot 5 :
- desktop Rabat premium certifié et mergé ;
- mobile Rabat premium certifié et mergé ;
- sélection quartier -> rich zone sheet ;
- CTA Search conserve `city + district` ;
- fiche quartier seulement lorsqu'un référentiel canonique existe ;
- mode density certifié desktop ;
- sheet mobile reste au-dessus de la bottom navigation ;
- cockpit mobile masqué quand la sheet est ouverte ;
- fail-closed de l'API intelligence déjà actif.

## Contrats Lot 5 à fermer
1. Ville : les six villes phares restent navigables sans état fantôme ; Rabat conserve son expérience intelligence dédiée.
2. Quartier : sélection et fermeture mettent l'URL canonique à jour et restaurent l'état ville.
3. Fiche : la rich sheet correspond toujours au `district` URL ; aucune fiche n'est inventée pour une zone sans référentiel quartier.
4. Modes : Prix / Densité / Annonces changent uniquement le mode intelligence et conservent le quartier sélectionné.
5. Transaction : Vente / Location change le payload et le Search handoff sans perdre ville/quartier.
6. URL : `city`, `district`, `layer` et contexte Search restent canoniques après navigation.
7. Search handoff : `/search` reçoit les noms canoniques `city + district` et le contexte transaction/filtres disponible.
8. Empty/loading/fail-closed : aucun fallback ne doit fabriquer prix, frontière ou disponibilité ; les états doivent rester lisibles.
9. Mobile : fermeture de sheet rend le cockpit à nouveau accessible ; aucune interaction ne dépend d'un clic derrière la sheet.
10. Accessibilité : contrôles critiques nommés, focusables et utilisables au clavier.

## Succès
- audit navigateur dédié Lot 5 vert sur exact-head ;
- build et gates Map/Geo/Search concernés verts ;
- aucune régression C5 Browser ;
- aucune modification du contrat géographique ou Search sauf correction démontrée nécessaire ;
- captures uniquement si une correction visuelle est introduite dans ce lot.

## Preuve attendue
Rapport navigateur machine-readable couvrant au minimum : sélection/fermeture quartier, modes, transaction, URL canonique, Search href et restauration cockpit mobile.

Aucun déploiement Vercel sans autorisation explicite.
