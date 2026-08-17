# Refonte carte — Matrice exacte des pages AkarFinder

**Compagnon canonique de `docs/Refonte carte.md`.**  
Source de l'inventaire : arborescence `app/` sur le HEAD de départ `d96aa78977e54a5060cbeb4b6e899c9790e49e94`.

## Règle

Chaque route ci-dessous doit conserver les tokens, composants invariants, viewports et protocole avant/référence/après définis dans `Refonte carte.md`. Le champ **Référence premium** fixe la cible fonctionnelle/visuelle propre à la page.

| Route | Famille | Référence premium spécifique |
|---|---|---|
| `/` | Accueil | recherche dominante, intentions Acheter/Louer/Vendre, découverte quartiers/marché, preuve avant marketing |
| `/a-propos` | Institutionnel | mission, méthode, confiance, contenu court et lisible |
| `/accompagnement` | Service | parcours par besoin, preuve, prochaine action, un CTA dominant |
| `/acheter` | Intention transaction | recherche + filtres rapides + résultats + découverte quartiers |
| `/alerts` | Outil personnel | création d'alerte immédiate, résumé humain, état actif/pause explicite |
| `/comment-ca-marche` | Pédagogie | 3–5 étapes, diagrammes utiles, CTA final vers recherche |
| `/compagnon` | Assistance | guidance immobilière compacte, actions séparées des réponses, aucun chatbot envahissant |
| `/compare` | Décision | comparaison alignée, différences d'abord, mobile en cartes empilées |
| `/conditions-utilisation` | Légal | largeur de lecture maîtrisée, ancres, zéro artifice commercial |
| `/contact` | Formulaire | formulaire court, motifs structurés, confirmation nette |
| `/credit` | Finance | capacité/hypothèses/étapes, chiffres hiérarchisés, aucune promesse non vérifiée |
| `/demande-retrait` | Légal / action | action réglementaire explicite, formulaire sobre, confirmation traçable |
| `/demo` | Démo interne/publique | reproduire strictement les composants canoniques, aucun langage parallèle |
| `/faq` | Pédagogie | recherche/accordéons sobres, réponses lisibles, liens vers action pertinente |
| `/favorites` | Outil personnel | grille/liste d'annonces cohérente avec Search, actions retirer/comparer non ambiguës |
| `/immobilier` | Hub | accès rapide aux intentions, quartiers, neuf, investissement et recherche |
| `/investir` | Intention investissement | rendement/risque/données sourcées, quartiers et annonces sans faux score |
| `/listings` | Boundary technique / annonces | si surface publique active : même carte annonce que Search ; sinon ne pas créer de nouvelle UI publique |
| `/louer` | Intention transaction | même système qu'Acheter, vocabulaire location et métriques pertinentes |
| `/map` | Carte | page pilote : liste 44 % / carte 56 %, modes Zones/Prix/Tendances, légende explicite |
| `/mon-projet` | Outil personnel | progression du projet, décisions/action suivante, contenu sans tableau de bord surchargé |
| `/mre` | Parcours spécifique | besoins MRE, contexte Maroc, étapes et confiance, même design system public |
| `/neuf` | Immobilier neuf | projets/promoteurs, localisation, prix/statut prouvés, cartes compatibles Search |
| `/onboarding` | Flow | une décision par étape, progression visible, sortie/reprise prévisibles |
| `/politique-confidentialite` | Légal | lisibilité, ancres, aucune distraction commerciale |
| `/pro` | Professionnel | proposition claire, outils/preuves, CTA professionnel unique par section |
| `/professionnels` | Annuaire / hub pro | segmentation agence/promoteur, recherche, cartes professionnelles homogènes |
| `/profil-recherche` | Outil personnel | critères de recherche lisibles, édition compacte, aperçu humain du profil |
| `/projets` | Programmes | cartes projet homogènes, statut/prix/localisation avant storytelling |
| `/promoteurs` | Professionnels | identité promoteur, projets, preuves/labels réels, hiérarchie premium sobre |
| `/quartiers` | Quartiers / marché | recherche de quartier, cartes de contexte, prix/tendances sourcés, entrée naturelle vers carte |
| `/search` | Recherche | liste premium dense + filtres + bascule carte, source/prix/surface/localisation prioritaires |
| `/vendre` | Intention transaction | parcours vendeur, estimation/étapes si prouvées, CTA clair, pas de promesse de prix magique |
| `/visual-qa` | QA interne | utilitaire de contrôle ; doit exposer fidèlement composants/states du canon, pas définir un style concurrent |

## Sous-routes dynamiques

Les sous-routes de `immobilier`, `projets`, `promoteurs`, `quartiers`, `search` ou autres segments dynamiques héritent **obligatoirement** du référentiel de leur parent, puis ajoutent uniquement la hiérarchie nécessaire au contenu spécifique.

### Fiche annonce dynamique

Référence premium : galerie dominante → prix/titre/lieu → caractéristiques → description → contexte `Vivre ici` → carte/proximité/réalité rue → action/contact. Les enrichissements ne doivent jamais dominer la vérité de l'annonce.

### Fiche quartier dynamique

Référence premium : nom + ville → carte zone → résumé marché sourcé → prix → tendance → stock d'annonces → contexte utile → CTA vers recherche filtrée. No-data explicite.

### Fiche promoteur / projet dynamique

Référence premium : identité et statut → projets/offre → localisation → données vérifiables → actions. Les badges premium/partenaire restent sémantiques et ne modifient pas la structure de base.

## Definition of Done par page

Une page n'est conforme que si :

1. capture avant disponible aux viewports concernés ;
2. cible de cette matrice + `Refonte carte.md` utilisée ;
3. capture après aux mêmes viewports ;
4. aucune dérive de palette/typo/rayons/composants ;
5. responsive et états principaux validés ;
6. score /10 calculé selon le canon ;
7. aucune régression critique ;
8. aucun déploiement Vercel sans autorisation explicite.
