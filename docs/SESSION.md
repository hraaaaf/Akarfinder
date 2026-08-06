# AkarFinder — Session courante

**Mise à jour : 2026-08-06**  
**Lot actif : MON-PROJET-P1B — projet actif dans Search**

Ce fichier est le handover opérationnel court du projet. L’historique détaillé reste dans Git, les PR et les preuves techniques.

## Branche et PR actives

- branche : `ux/mon-projet-p1b` ;
- PR vers `main` : **#315** ;
- composant principal : `components/search/ActiveProjectBanner.tsx` ;
- intégration : `app/search/page.tsx` ;
- API réutilisée : `/api/me/continuity` ;
- aucune migration.

## État produit acquis

- Accueil P1 ✅
- Neuf P1 ✅ — score 9,1/10
- Acheter P1 ✅ — score 9,1/10
- Louer P1 ✅ — score 9,0/10
- Mon Projet P1A ✅ — PR #314 mergée, score 9,2/10

## MON-PROJET-P1B livré dans la PR

- lecture du `project_id` transmis dans l’URL Search ;
- validation du projet via la continuité authentifiée existante ;
- bandeau **Projet actif** uniquement pour un projet réellement détenu, actif et structuré ;
- résumé réel de l’objectif, de la zone et du budget ;
- compteurs de favoris et comparaisons filtrés par `project_id` ;
- accès direct à `/mon-projet/espace` ;
- aucun bandeau pour un invité, un identifiant invalide ou un projet inaccessible ;
- aucun stockage parallèle ;
- aucun `localStorage` ;
- aucune clé service-role exposée au navigateur ;
- contrat P1B ajouté à `User Continuity V1`.

## Vérité produit

- le bandeau ne prétend pas qu’un projet existe si l’API ne le confirme pas ;
- les compteurs reflètent uniquement des lignes réellement rattachées au projet ;
- P1B n’écrit pas de favoris ou de comparaisons fictifs ;
- Search reste le moteur canonique ;
- l’espace `/mon-projet/espace` reste l’autorité de continuité utilisateur.

## CI

Le premier passage sur le commit `25aca9a75a0fef4ee337fc16155e3ecbd64f5295` a produit 10 gates verts et 11 rouges. Les logs montrent une cause d’infrastructure GitHub Actions avant checkout :

`Failed to resolve action download info — Service Unavailable`

Les 11 workflows échoués ont été relancés sans modification produit. Les mises à jour documentaires déclenchent ensuite une certification du nouveau commit final.

## Hors périmètre

- modification du projet directement dans Search ;
- retrait explicite du projet actif depuis le bandeau ;
- nouveaux boutons d’écriture favoris/comparaison sur les cartes ;
- élimination/restauration de biens ;
- refonte générale de la SERP.

Ces décisions devront faire l’objet de questions avant un nouveau lot.

## Prochaine action exacte

1. vérifier la CI complète du commit documentaire final ;
2. distinguer toute régression réelle d’un incident d’infrastructure ;
3. certifier le comportement du bandeau dans Search ;
4. confirmer la mergeabilité de la PR #315 ;
5. merger dans `main` uniquement avec les gates verts ;
6. auditer Carte / Quartier et poser les questions avant tout nouveau code.