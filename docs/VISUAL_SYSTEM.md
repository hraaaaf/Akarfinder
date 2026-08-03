# AkarFinder — Système visuel canonique

**Version : 2026-08-03**  
**Statut : Option A Property Types en Production**

## 1. Architecture visuelle

Le système comporte trois couches :

1. **photographie réelle et autorisée** pour un bien, une ville, un quartier ou un contexte factuel ;
2. **illustrations propriétaires AkarFinder** pour catégories, intentions, services, onboarding et empty states ;
3. **icônes Lucide** pour les actions et contrôles fonctionnels.

Une illustration ne doit jamais remplacer une vraie photo autorisée déjà disponible pour une annonce.

## 2. Famille Property Types — Option A

La famille approuvée par le fondateur et actuellement canonique pour les types de biens est **Option A**.

Types couverts :

- Appartement ;
- Villa ;
- Terrain ;
- Studio ;
- Riad ;
- Bureau.

Intégrations :

- Acheter ;
- Louer ;
- filtres et sélection Recherche ;
- fallback des cartes sans photo ;
- résultats externes uniquement lorsque le type normalisé est fiable ;
- parcours Vendre.

Composants et assets :

- `components/property-types/PropertyTypeArtwork.tsx` ;
- `components/property-types/PropertyTypeVisualSelector.tsx` ;
- `lib/property-types/presentation.ts` ;
- `public/images/property-types-premium/appartement.svg` ;
- `public/images/property-types-premium/villa.svg` ;
- `public/images/property-types-premium/terrain.webp` ;
- `public/images/property-types-premium/studio.webp` ;
- `public/images/property-types-premium/riad.webp` ;
- `public/images/property-types-premium/bureau.webp`.

Référence livraison : PR #249, commit `fa983a3`, Production `dpl_8XqdkUnMvVRgKVTCU2bNVnXbYg5f`.

## 3. Grammaire Option A

- composition premium et lisible à petite taille ;
- sujet architectural immédiatement reconnaissable ;
- fond clair ;
- bleu marine, bleu AkarFinder, blanc et accents dorés contrôlés ;
- profondeur visuelle sans effet 3D bon marché ;
- cohérence de cadrage entre les six assets ;
- aucun texte intégré dans l’image ;
- aucun badge commercial implicite.

L’accent doré est autorisé dans cette famille visuelle parce qu’il fait partie du visuel explicitement approuvé. Il reste **décoratif** et ne signifie ni Gold, ni Premium, ni vérifié, ni partenaire.

## 4. Proposition 3

La grammaire historique « Proposition 3 » reste une référence pour les autres familles d’illustrations propriétaires : services, intentions, écosystème professionnel et empty states.

Elle ne doit plus être utilisée pour remplacer ou redessiner les six assets Option A sans une nouvelle validation explicite.

## 5. Règles photographie

Utiliser une photographie lorsque la vérité du sujet compte :

- bien réel ;
- ville ;
- quartier ;
- monument ;
- projet promoteur ;
- contenu éditorial factuel.

Conditions :

- droit d’utilisation établi ;
- source et crédit si nécessaire ;
- pas de téléchargement/rehosting depuis un résultat externe sans autorisation ;
- pas d’image approximative présentée comme le bien réel ;
- pas d’image d’un autre bien comme placeholder trompeur.

## 6. Fallbacks

Ordre :

1. vraie photo autorisée ;
2. asset Option A correspondant à un type reconnu ;
3. fallback générique neutre si type inconnu ;
4. aucun visuel plutôt qu’une fausse représentation.

Pour un résultat externe, l’illustration typée n’est autorisée que si la normalisation du type est suffisamment fiable.

## 7. Icônes fonctionnelles

Lucide reste la référence pour :

- recherche ;
- filtres ;
- favoris ;
- comparaison ;
- carte ;
- fermer/menu ;
- partage ;
- tri ;
- lien externe ;
- états de formulaire.

Ne pas transformer un contrôle universel en illustration décorative.

## 8. Villes

Pour les cartes de ville :

- photographie réelle privilégiée ;
- cadre et overlay AkarFinder ;
- aucun monument approximatif ;
- futur emblème vectoriel uniquement après revue de fidélité architecturale.

## 9. Accessibilité et responsive

Chaque famille doit être vérifiée :

- 390 px ;
- 768 px ;
- 1280/1440 px ;
- contraste ;
- texte alternatif adapté au contexte ;
- absence de texte essentiel dans l’image ;
- reduced motion ;
- thème sombre avant utilisation sur fond sombre.

## 10. Release rule

Un asset peut être livré seulement si :

1. la famille complète est cohérente ;
2. les tests techniques sont verts ;
3. il ne remplace aucune donnée factuelle ;
4. ses droits sont clairs ;
5. la priorité photo/fallback est respectée ;
6. le rendu est validé sur les viewports principaux ;
7. le fondateur a approuvé toute nouvelle direction majeure.
