# AkarFinder — Session courante

**Mise à jour : 2026-08-06**  
**Lot actif : MON-PROJET-P1A — parcours guidé et vérité de sauvegarde**

Ce fichier est le handover opérationnel court du projet. L’historique détaillé reste dans Git, les PR et les preuves techniques.

## Branche et PR actives

- branche : `ux/mon-projet-p1a` ;
- PR vers `main` : **#314** ;
- composant principal : `components/companion/MonProjetWizardP1A.tsx` ;
- route canonique : `/mon-projet` ;
- ancien `/compagnon` : redirection permanente ;
- espace de continuité préservé : `/mon-projet/espace`.

## État produit acquis

- Accueil P1 ✅
- Neuf P1 ✅ — score 9,1/10
- Acheter P1 ✅ — score 9,1/10
- Louer P1 ✅ — PR #313 mergée, score 9,0/10

## MON-PROJET-P1A livré dans le code

- huit écrans visibles ;
- progression avec numéro, intitulé et barre ;
- objectif + usage regroupés ;
- zone + budget regroupés ;
- budget facultatif ;
- types de biens adaptés à l’objectif ;
- contraintes parking/ascenseur extensibles ;
- préférences principales puis Voir plus ;
- trois priorités explicites ;
- compromis centralité/calme et surface/localisation ;
- synthèse humaine ;
- sauvegarde invitée honnête ;
- persistance authentifiée conservée ;
- lancement vers Search via le profil structuré existant ;
- bouton Retour fonctionnel : l’état serveur est reconstruit en rejouant les événements validés jusqu’à l’étape cible.

## Vérité produit

- aucune recommandation ou donnée de quartier fabriquée ;
- les préférences ne deviennent pas des exclusions silencieuses ;
- le Fit reste conditionné aux données comparables ;
- un invité n’est pas présenté comme ayant sauvegardé durablement son projet ;
- Search reste le moteur canonique ;
- aucune seconde machine à états n’a été créée.

## Validation visuelle initiale

Gate dédié vert sur le commit `b09922a8867a8cc8c2bc6b9816bd91c3ab9c8a27` :

- build production vert ;
- route `/mon-projet` verte ;
- captures 390 / 768 / 1280 ;
- hauteurs : 1300 / 1037 / 1021 px ;
- overflow horizontal : 0 ;
- H1 : 1 ;
- `main` : 1 ;
- IDs dupliqués : 0 ;
- liens et boutons sans nom : 0.

Le premier échec User Journey provenait de deux contrats attachés à l’ancien composant et à l’ancien rôle de `/mon-projet`. Ces tests ont été mis à jour vers l’architecture P1A sans modification produit.

## Hors périmètre

MON-PROJET-P1B portera :

- reprise automatique d’un projet réel ;
- bandeau Projet actif dans Search ;
- modifier/enregistrer/retirer depuis Search ;
- continuité vers favoris et comparaison.

## Prochaine action exacte

1. attendre la CI complète du commit final humain ;
2. corriger uniquement les régressions réelles ;
3. confirmer le score UX/UI final ;
4. merger la PR #314 dans `main` ;
5. ouvrir MON-PROJET-P1B uniquement après clôture.