# AkarFinder Experience — décisions canoniques

Statut : **LOCKED pour les invariants numérotés 1–14 ; amendements 2026-10-30 en revue**

## Décisions

1. La Carte ne remplace pas Search ; elles deviennent deux vues d'une même session.
2. Le pattern Zillow-like retenu est mécanique, pas visuel : split map/list, pins, synchronisation, recherche dans la zone.
3. La différenciation AkarFinder reste territoriale : Prix / Densité / Annonces / Confiance + Vie locale.
4. Le semantic zoom détermine quelles informations apparaissent avec le niveau de zoom.
5. La précision géographique reste explicite et truth-safe : exact / quartier / ville / inconnu.
6. Les annonces sans position exacte ne reçoivent jamais de faux pin exact.
7. La fiche annonce devient la vue décisionnelle canonique : Bien → Confiance → Marché → Vie locale → Décision.
8. Complétude et confiance restent deux notions distinctes.
9. Le futur modèle prépare Property vs Offer/Listing sans fusion sur signaux faibles.
10. L'onboarding User / Agence / Promoteur doit produire un dossier conforme au Listing Standard.
11. Les droits source restent indépendants du schéma de données.
12. Aucun déploiement Vercel sans autorisation explicite.
13. Toute étape UX/UI significative doit être croisée **avant implémentation** avec 2 à 3 références externes sérieuses. Quand pertinent, le panier doit inclure au moins une autorité UX/accessibilité et une référence produit immobilier réelle. Le lot documente les sources, leur date/contexte et l'implication concrète retenue. Le benchmark externe ne remplace jamais les contrats de vérité, les preuves machine ni le human gate.
14. Le logo/branding est hors scope par défaut. Une variante visuelle du logo compte comme une modification de branding et exige une autorisation explicite.

## Amendements proposés 2026-10-30 — sans effet de production avant validation

15. Les chiffres candidats L0/L1 ne sont jamais assimilés à des biens uniques, actifs ou publiables ; la fraîcheur et les droits source sont des gates indépendants.
16. Une source web publique, indexée ou accessible aux robots ne confère pas de droit de réutilisation commerciale des annonces ou photos ; autorisation par source/usage/média à établir avant lancement live.
17. Un seul fil de convergence produit par route ou système ; anciens PR/contrats ne remplacent pas une preuve actuelle du code, des captures et de la CI au HEAD exact.
18. Le choix entre quartier MapLibre 3D historique et Flat Living Map V0 reste une décision visuelle soumise à BEFORE/AFTER et revue humaine ; ne pas le qualifier de livré.
