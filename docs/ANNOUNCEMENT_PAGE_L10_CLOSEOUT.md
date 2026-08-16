# ANN-L10 — Finance Maroc closeout

## Verdict

ANN-L10 est fermé sur preuve exact-head. Le module Finance Maroc reste un simulateur déterministe et indicatif : aucun taux bancaire, frais réglementaire ou poste d'acquisition n'est présumé silencieusement.

## Preuves exactes

- PR runtime : `#763` ;
- exact head certifié : `787416614a4de1de8fa0805d0d553396b4152547` ;
- merge runtime : `ab3602fcb10fa4ac4b5fad31dcb6a3300d88756a` ;
- workflow : `Announcement Page L10 Finance Maroc` ;
- run : `31960358141` — SUCCESS ;
- tests finance : **5/5 PASS** ;
- TypeScript : SUCCESS ;
- production build : SUCCESS ;
- certification Chromium ciblée : SUCCESS ;
- scénarios : **4/4 captures, 0 finding** sur 390×844 / 430×932 / 768×900 / 1280×900 ;
- artefact : `9267110347` ;
- digest : `sha256:8bd4180e1a4e2c1cc15fd390689c8573ce751d9cdaeed0b996fb563853f84995`.

## Contrat livré

- prix du bien, apport, taux annuel et durée sont des entrées explicites ;
- taux vide par défaut : AkarFinder ne choisit aucun taux bancaire à la place de l'utilisateur ;
- taux 0 et apport couvrant 100 % du prix sont traités déterministiquement ;
- entrées invalides échouent proprement ;
- aucun frais/taxe réglementaire marocain n'est hardcodé silencieusement ;
- le résultat est explicitement présenté comme simulation indicative, jamais comme offre bancaire ;
- calcul métier hors React, UI consommatrice uniquement ;
- QA visuelle couvre responsive, absence d'overflow, erreurs console/ressource et états calculés.

## Incidents de certification corrigés

Trois défauts de test, sans défaut moteur correspondant, ont été identifiés puis corrigés avant certification finale :

1. attentes d'arrondi au centime incorrectes dans le test ;
2. lecture de l'état React avant rerender dans l'audit ;
3. assertion trop stricte sur le séparateur de milliers français (`1.600.000 DH` rendu valide mais non reconnu).

Le gate final compare désormais la valeur financière de manière indépendante du séparateur typographique.

## Crédit

- poids ANN-L10 : **7 %** ;
- progression précédente : **76 %** ;
- progression après closeout : **83 %** ;
- prochain lot : **ANN-L11 — Pro & conversion**.
