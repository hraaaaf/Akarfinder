# LISTING-VISUAL L19 — Premium illustrative fallback

## Goal
Remplacer uniquement le fallback de la galerie d’annonce lorsqu’aucun média réel autorisé n’est disponible par une illustration intérieure immobilière premium, sans jamais la présenter comme une photo réelle.

## Baseline vérifiée
- HEAD précédent: `0f9a06b4fff1c029b3f8c1dc10621ff800ab96e4`
- L18 exact-head: CI complète verte.
- Revue visuelle 390/1280: environ 8,9/10 de convergence au mockup canonique.
- Écart dominant restant: le fallback urbain nocturne est trop éloigné du langage immobilier premium du mockup.

## Référence visuelle
Le mockup canonique confirmé le 18/08/2026 reste la référence: grande image immobilière chaleureuse, lumineuse, éditoriale, premium. L19 ne copie pas une photographie et n’invente aucun média réel; il transpose seulement ce langage visuel dans une illustration locale clairement étiquetée.

## Wireframe L19
- arrière-plan intérieur clair et chaud;
- grande baie vitrée / profondeur architecturale;
- canapé premium + table basse + tapis;
- végétation / lampe / décoration minimale;
- palette AkarFinder: bleu profond, neutres chauds, accents bronze;
- aucun visage, logo tiers, photo ou contenu externe;
- label `Visuel illustratif` conservé dans `PropertyMediaGallery`;
- contrôles partage/favori inchangés;
- média réel, provider preview et vraie galerie inchangés.

## Succès
1. fallback seulement modifié;
2. aucune régression de vérité média;
3. 390/430/768/1280 sans overflow/collision;
4. L2/L13/L18 + a11y + TypeScript/build verts;
5. captures exact-head comparées au mockup canonique;
6. score humain de convergence >= 9,2/10 avant fermeture;
7. aucun déploiement Vercel.
