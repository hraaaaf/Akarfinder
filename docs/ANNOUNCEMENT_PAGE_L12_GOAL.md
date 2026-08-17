# ANN-L12 — Mon Projet personnalisé — Goal

## Goal

Brancher la fiche `/listings/[id]` sur le projet utilisateur explicite déjà enregistré par AkarFinder, sans créer de second profil parallèle ni inférer de préférences personnelles absentes.

## Succès observable

- aucun projet/profil explicite → aucun score de fit ni trajet personnalisé affiché ;
- projet possédé par l’utilisateur → budget, type, surface/chambres, préférences et priorités peuvent produire des raisons explicables de match/mismatch uniquement à partir de données disponibles ;
- destinations personnalisées (`travail`, `école`, autre libellé explicite) sont éditables/supprimables et restent rattachées au profil du projet ;
- aucun temps de trajet n’est affiché sans coordonnées de destination valides + `ExactGeoTruth` du bien + `RoutingProvider` mesuré ;
- aucune destination ou préférence d’un autre utilisateur n’est lisible/écrivable ;
- absence de donnée → état masqué ou honnête, jamais score/temps inventé ;
- UI alignée sur le design system AkarFinder et certifiée aux mêmes viewports 390/430/768/1280 ;
- convergence L12 vers le target visuel global : desktop = module `Mon Projet` dans le rail droit, sous le module Pro / conversion ; mobile/tablette = module compact dans le flux, sans concurrencer le dock décisionnel.

## Preuve requise

1. tests contrat profil/destinations/fail-closed ;
2. tests ownership/isolation continuité existante + nouveaux cas L12 ;
3. baseline visuelle avant mutation UI sur la fiche ;
4. mockup/référentiel AkarFinder écrit avant implémentation UI ;
5. TypeScript + production build ;
6. audit Chromium exact-head avec scénarios : aucun projet, projet match, mismatch, destination routable, destination non routable ;
7. comparaison baseline / mockup / après + score premium ;
8. validation du placement desktop `Pro → Mon Projet → Marché & comparables` et adaptation mobile cohérente ;
9. merge SHA-lock + closeout canonique.

## État initial vérifié

- `/mon-projet` utilise `MonProjetWizardP1A` et crée un profil explicite `DynamicSearchProfileV2` ;
- la continuité persistée passe par `/api/me/continuity` et filtre les données par `user_id` ;
- `ensureOwnedProject` bloque les écritures sur un projet non possédé ;
- le schéma `DynamicSearchProfileV2.location.anchors` existe déjà ;
- le moteur d’événements `search-profile-v2` ne permet pas encore de créer/modifier/supprimer ces anchors ;
- aucun trajet personnalisé L12 ne doit donc être revendiqué avant ce câblage.

## Standard visuel

Référentiel AkarFinder existant uniquement : fond froid `#F8FAFC`, deep blue `#0B1F3A/#0B2545`, primary `#0B63CE`, surfaces blanches, ombres froides légères, bronze réservé à la confiance et non aux CTA principaux.

Le target global de la page annonce est désormais normé par `docs/ANNOUNCEMENT_PAGE_CANONICAL_VISUAL_TARGET.md`. L13 devra certifier la convergence de toute la page vers ce target sans régression fonctionnelle ni invention de données.
