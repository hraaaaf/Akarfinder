# AkarFinder Experience — N0 Audit

Statut : **N0 AUDITÉ — TARGET CONTRACT À MERGER**
Date : 2026-08-19
Base auditée : `main@49b80c4c1deffb1f1999f91412b5092151ac63c5`

## Goal

Auditer l'état final après Carte intelligence marché Lot 11 et définir la base vérifiée du nouveau chantier Carte + Search + Listing + Onboarding.

## Preuves récupérées

### Carte

- HEAD produit certifié : `3db92d158ca2c388e5d53857089fce304348899b` ;
- run C7 : `32244517896` — SUCCESS ;
- artifact : `9366976831` ;
- digest : `sha256:8ac9c4758d66986215795621c2b180a155e7b75fc54b5a217d35ffccc0d905eb` ;
- captures inspectées : desktop 1280, mobile 390, états Prix et zone sheet.

### Audit UI global post-Lot 11

- run : `32267867957` — SUCCESS ;
- artifact : `9371334718` ;
- digest : `sha256:cdbb98b51619ececd9e3739c3a49a89fb20312997f798236258cc1c0a8b8dfd9` ;
- 12 routes × 4 viewports ;
- captures Search et Map inspectées sur 390/1280.

### Listing

- PR historique : `#814` ;
- HEAD produit Listing : `367fe07f74653e61025e80ed0cfaf31d87e211d7` ;
- run certification L13 : `32129531035` — SUCCESS ;
- artifact : `9321690793` ;
- digest : `sha256:789e46815bee9618008b61d9b0763a72760fbd43f047b70231d7f6ed2e21456b` ;
- captures fiche 390/1280 inspectées.

## Findings vérifiés

### N0-F1 — Carte isolée du flux de recherche

La Carte expose les couches Prix / Densité / Annonces et la navigation territoriale, mais la recherche active de biens reste un passage vers une autre surface. La valeur territoriale est bonne ; la continuité `Carte → résultats → fiche → retour` n'est pas encore l'expérience principale.

### N0-F2 — Search possède déjà des briques Zillow-like mais comme modes séparés

Search expose `Liste / Mixte / Carte`, filtres, navigation bridge et résultats. Le futur chantier doit réutiliser ces briques au lieu de recréer un moteur parallèle.

### N0-F3 — Fiche annonce riche mais hiérarchie trop longue

Desktop : la colonne décisionnelle est structurée et utile, mais la page devient très longue après le hero et les blocs intelligents.

Mobile : la totalité des blocs est empilée verticalement ; la continuité décisionnelle existe mais le coût de scan est élevé.

La cible n'est pas de supprimer l'intelligence, mais de mieux hiérarchiser `Bien → Confiance → Marché → Vie locale → Décision`.

### N0-F4 — Les certifications historiques ne suffisent pas comme score UX global

`0 overflow`, accessibilité, build et captures sans finding prouvent la robustesse technique. Ils ne prouvent pas à eux seuls :

- la compréhension immédiate du produit ;
- la continuité entre surfaces ;
- la densité d'information appropriée ;
- la qualité du parcours mobile ;
- la ressemblance avec une cible produit unifiée.

Le nouveau standard impose donc une comparaison humaine BEFORE / target / AFTER.

### N0-F5 — Le chemin propriétaire n'est pas cassé

L'hypothèse initiale d'un bug du Registry est retirée.

`/listings/owner-*` est résolu explicitement avant le garde `canShowInternalListingDetail()`. `source_name: "Propriétaire"` n'empêche donc pas actuellement l'affichage de la fiche propriétaire.

Dette réelle : harmoniser la modélisation source/acteur en N1 afin d'éviter une exception implicite durable, sans casser le chemin existant.

### N0-F6 — Le schéma d'onboarding est déjà une bonne fondation

`lib/property-schema/onboarding.ts` possède un contrat dynamique par type de bien, transaction et segment de marché, avec champs conditionnels et droits médias. N8 devra le faire converger vers le Listing Standard plutôt que le remplacer.

## Évaluation humaine baseline

Ces scores sont une revue UX comparative N0, pas des métriques automatisées :

- **Carte : 6,5/10** — intelligence intéressante, mais composition desktop peu équilibrée et rôle produit encore isolé ;
- **Search : 7,0/10** — contrôles propres, mais la page reste pensée comme une surface séparée et l'état vide occupe trop de place ;
- **Listing desktop : 8,0/10** — bonne hiérarchie initiale et forte richesse décisionnelle, mais longueur excessive ;
- **Listing mobile : 6,8/10** — contenu complet, mais scan très long et densité élevée ;
- **Cohérence Carte ↔ Search ↔ Listing : 6,5/10**.

Ces scores constituent uniquement le point de départ du nouveau chantier. Ils ne remplacent pas les scores historiques des lots précédents.

## Décisions N0

1. conserver les fondations runtime existantes ;
2. ne pas refaire MapLibre, Search Gateway, comparables, POI ou métriques marché ;
3. introduire une session de recherche unifiée ;
4. passer à une logique de semantic zoom ;
5. afficher la précision géographique honnêtement ;
6. séparer complétude et confiance ;
7. préparer Property vs Offer/Listing ;
8. imposer le Listing Standard aux publications propriétaires/agences/promoteurs ;
9. conserver les droits source comme garde distinct du schéma de données ;
10. aucun déploiement Vercel sans autorisation explicite.

## Target

Référentiel : `docs/AKARFINDER_EXPERIENCE_STANDARD_V1.md`.
Roadmap : `docs/AKARFINDER_EXPERIENCE_ROADMAP.md`.

N0 ne modifie aucun composant runtime.
