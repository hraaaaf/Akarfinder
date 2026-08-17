# Refonte carte — Matrice exacte des pages AkarFinder

**Compagnon canonique de `docs/Refonte carte.md`.**  
Source de vérité : découverte automatique de chaque `app/**/page.tsx` hors `app/api/**`.

## Règle

Chaque route ci-dessous conserve les tokens, composants invariants, viewports et protocole avant/référence/après définis dans `Refonte carte.md`. Le champ **Référence premium spécifique** fixe la cible propre à la page. Les pages QA/démo reproduisent le canon : elles ne créent jamais un design parallèle.

## Pages produit et publiques

| Route | Famille | Référence premium spécifique |
|---|---|---|
| `/` | Accueil | recherche dominante, intentions Acheter/Louer/Vendre, découverte quartiers/marché, preuve avant marketing |
| `/a-propos` | Institutionnel | mission, méthode, confiance, contenu court et lisible |
| `/accompagnement` | Service | parcours par besoin, preuve, prochaine action, un CTA dominant |
| `/acheter` | Transaction | recherche Achat + filtres rapides + résultats + quartiers |
| `/alerts` | Outil personnel | création immédiate, résumé humain, état actif/pause explicite |
| `/comment-ca-marche` | Pédagogie | 3–5 étapes, diagrammes utiles, CTA final vers recherche |
| `/compagnon` | Assistance | guidance immobilière compacte, actions séparées, aucun chatbot générique envahissant |
| `/compare` | Décision | comparaison alignée, différences d'abord, mobile en cartes empilées |
| `/conditions-utilisation` | Légal | largeur de lecture maîtrisée, ancres, zéro artifice commercial |
| `/contact` | Formulaire | formulaire court, motifs structurés, confirmation nette |
| `/credit` | Finance | capacité/hypothèses/étapes, chiffres hiérarchisés, aucune promesse non vérifiée |
| `/demande-retrait` | Légal / action | demande explicite, formulaire sobre, confirmation traçable |
| `/faq` | Pédagogie | recherche/accordéons sobres, réponses lisibles, liens vers action pertinente |
| `/favorites` | Outil personnel | cartes Search canoniques, retirer/comparer sans ambiguïté |
| `/immobilier` | Hub | accès rapide intentions, quartiers, neuf, investissement et recherche |
| `/immobilier/[city]` | Ville | ville → recherche → quartiers → données marché sourcées → annonces |
| `/immobilier/[city]/[district]` | Quartier | quartier → carte zone → marché sourcé → stock → recherche filtrée ; no-data explicite |
| `/investir` | Investissement | rendement/risque/données sourcées, quartiers et annonces sans faux score |
| `/listings` | Boundary annonces | si publique : langage Search ; sinon aucune nouvelle surface publique |
| `/listings/[id]` | Fiche annonce | galerie → prix/titre/lieu → caractéristiques → description → Vivre ici → carte → action |
| `/louer` | Transaction | même structure qu'Acheter, vocabulaire et métriques location |
| `/map` | Carte | page pilote : liste 44 % / carte 56 %, Zones/Prix/Tendances, légende explicite |
| `/mon-projet` | Projet personnel | progression, décisions et prochaine action, sans dashboard surchargé |
| `/mon-projet/espace` | Espace projet | vue opérationnelle du projet, tâches/étapes prioritaires, continuité stricte avec Mon projet |
| `/mre` | Parcours MRE | contexte Maroc, étapes, confiance et recherche ; même design public |
| `/neuf` | Immobilier neuf | projets/promoteurs, localisation, prix/statut prouvés, cartes compatibles Search |
| `/onboarding` | Flow | une décision par étape, progression visible, sortie/reprise prévisibles |
| `/politique-confidentialite` | Légal | lisibilité, ancres, aucune distraction commerciale |
| `/pro` | Professionnel | proposition claire, outils/preuves, CTA pro unique par section |
| `/pro/agences` | Pro / agences | portefeuille/agences, recherche et actions pro dans le même shell |
| `/pro/alerts` | Pro / alertes | alertes orientées activité pro, densité maîtrisée, états explicites |
| `/pro/analytics` | Pro / analytics | KPIs hiérarchisés, graphiques sobres, méthode/période visibles, zéro vanity metric |
| `/pro/leads` | Pro / leads | pipeline lisible, priorité/statut/action suivante, pas de CRM visuellement étranger |
| `/professionnels` | Annuaire pro | segmentation agence/promoteur, recherche, cartes professionnelles homogènes |
| `/professionnels/[slug]` | Fiche professionnel | identité/statut → portefeuille → preuves → coordonnées/actions, contenu marketing subordonné |
| `/profil-recherche` | Outil personnel | critères lisibles, édition compacte, résumé humain du profil |
| `/projets` | Programmes | cartes projet homogènes, statut/prix/localisation avant storytelling |
| `/projets/[slug]` | Fiche projet | identité/statut → média → localisation → offre/prix prouvés → promoteur → action |
| `/promoteurs` | Professionnels | identité promoteur, projets, preuves/labels réels, hiérarchie sobre |
| `/promoteurs/[slug]` | Fiche promoteur | identité/statut → projets → zones → preuves → contact, même canon public |
| `/quartiers` | Quartiers / marché | recherche quartier, contexte, prix/tendances sourcés, entrée carte |
| `/quartiers/[citySlug]/[neighborhoodSlug]` | Fiche quartier | nom/ville → carte → marché sourcé → prix/tendance → stock → contexte → recherche filtrée |
| `/search` | Recherche | liste premium dense + filtres + bascule carte, source/prix/surface/lieu prioritaires |
| `/vendre` | Transaction | parcours vendeur, étapes, estimation seulement si prouvée, CTA clair |
| `/vendre/dossier` | Dossier vendeur | progression du dossier, pièces/étapes/statut, action suivante prioritaire |

## Démonstrations

Les routes démo sont des **références d'usage**, jamais une deuxième identité graphique.

| Route | Référence premium spécifique |
|---|---|
| `/demo` | index de démonstration fidèle aux composants canoniques |
| `/demo/acheter` | démonstration exacte de l'archétype Acheter |
| `/demo/agence` | fiche agence dans le canon Professionnel |
| `/demo/bien` | fiche annonce conforme à l'archétype Listing |
| `/demo/demande` | demande utilisateur, formulaire/état/actions canoniques |
| `/demo/louer` | démonstration exacte de l'archétype Louer |
| `/demo/partenaire` | partenaire mis en valeur sans mini-site ou palette parallèle |
| `/demo/projet` | fiche projet conforme au canon Projets |
| `/demo/promoteur` | fiche promoteur conforme au canon Promoteurs |
| `/demo/vendre` | démonstration exacte du parcours Vendre |
| `/demo/visual-system` | catalogue des tokens/composants canoniques, aucune variante non approuvée |

## Visual QA

Ces pages servent de **preuve visuelle**. Elles doivent reproduire fidèlement les composants qu'elles certifient et ne jamais devenir une source de style concurrente.

| Route | Référence premium spécifique |
|---|---|
| `/visual-qa` | index QA neutre et fonctionnel |
| `/visual-qa/agdal` | fiche quartier Agdal selon l'archétype quartier |
| `/visual-qa/akkari` | fiche quartier Akkari selon l'archétype quartier |
| `/visual-qa/aviation` | fiche quartier Aviation selon l'archétype quartier |
| `/visual-qa/hassan` | fiche quartier Hassan selon l'archétype quartier |
| `/visual-qa/hay-riad` | fiche quartier Hay Riad selon l'archétype quartier |
| `/visual-qa/les-orangers` | fiche quartier Les Orangers selon l'archétype quartier |
| `/visual-qa/medina` | fiche quartier Médina selon l'archétype quartier |
| `/visual-qa/ocean` | fiche quartier Océan selon l'archétype quartier |
| `/visual-qa/souissi` | fiche quartier Souissi selon l'archétype quartier |
| `/visual-qa/yacoub-el-mansour` | fiche quartier Yacoub El Mansour selon l'archétype quartier |
| `/visual-qa/rabat-neighborhood-resolver-p2` | QA du resolver : vérité/data avant esthétique, états ambigu/no-data visibles |
| `/visual-qa/announcement-page` | assemblage complet de la fiche annonce canonique |
| `/visual-qa/announcement-page-core` | noyau fiche : galerie, prix, titre, lieu, caractéristiques |
| `/visual-qa/announcement-page-media` | galerie/médias : ratios, navigation, fallback et responsive canoniques |
| `/visual-qa/announcement-page-living-here` | section Vivre ici subordonnée à la vérité de l'annonce |
| `/visual-qa/announcement-page-street-reality` | réalité rue/proximité avec provenance et états indisponibles explicites |
| `/visual-qa/announcement-page-finance-maroc` | finance : hypothèses visibles, chiffres hiérarchisés, aucune fausse précision |
| `/visual-qa/announcement-page-intelligence` | intelligence/data : preuves et confiance avant scores/insights |
| `/visual-qa/announcement-page-market-comparables` | comparables : échantillon/source/période visibles, no-data fail-closed |
| `/visual-qa/announcement-page-akar-estimate-history` | estimation/historique : méthode, dates et incertitude clairement présentées |
| `/visual-qa/announcement-page-pro-conversion` | conversion pro : CTA intégré, jamais dominant sur la vérité de l'annonce |
| `/visual-qa/announcement-page-pro-conversion/source-only` | source-only : provenance et sortie source prioritaires, aucune donnée inventée |

## Archétypes visuels canoniques

Chaque route ci-dessus doit se rattacher à l'un de ces archétypes. Les différences de contenu n'autorisent pas un changement d'identité.

### A — Recherche / catalogue

```text
Header stable
Recherche compacte + filtres
Résumé / tri / bascule Liste-Carte
┌ Carte résultat ┐
│ média          │ prix
│ lieu / surface │ provenance
└────────────────┘
```

### B — Carte

```text
Recherche + filtres
┌ Liste 44 % ─────────┐┌ Carte 56 % ─────────────┐
│ résultats compacts  ││ Zones | Prix | Tend.    │
│ synchronisés        ││ polygones + légende     │
└─────────────────────┘└──────────────────────────┘
```

### C — Fiche annonce / projet / professionnel

```text
Header
Média / identité
Titre + donnée principale + lieu + provenance
┌ Contenu principal ──────────┐┌ Action ──────────┐
│ faits → contexte → détails  ││ CTA/contextuel   │
└─────────────────────────────┘└───────────────────┘
```

### D — Ville / quartier / marché

```text
Nom + contexte géographique
Carte / zone
Résumé marché sourcé
Prix / tendance / stock
Annonces pertinentes
Contexte secondaire
```

### E — Formulaire / flow

```text
Titre + bénéfice
Progression si multi-étapes
Une décision dominante
Aide contextuelle
Action principale
```

### F — Outil personnel / pro

```text
Shell AkarFinder stable
Résumé opérationnel
Priorités / états
Contenu ou pipeline
Action suivante
```

### G — Éditorial / légal / pédagogie

```text
Header stable
Titre + contexte
Colonne de lecture maîtrisée
Navigation ancrée si longue
CTA seulement si utile
```

## Definition of Done par page

Une page n'est conforme que si :
1. capture avant disponible aux viewports concernés ;
2. cible de cette matrice + `Refonte carte.md` utilisée ;
3. référence/mockup de son archétype disponible ;
4. capture après aux mêmes viewports ;
5. aucune dérive de palette/typo/rayons/composants ;
6. responsive et états principaux validés ;
7. score /10 calculé selon le canon ;
8. aucune régression critique ;
9. aucun déploiement Vercel sans autorisation explicite.

## Anti-dérive

Toute nouvelle `app/**/page.tsx` hors API doit être ajoutée explicitement à cette matrice. Le test `refonte-carte-pages.test.ts` découvre l'arborescence réelle et bloque la CI si une route n'a pas de référence.
