# AkarFinder — Audit profond pages partenaires B2B

**Date :** 2026-08-14  
**Scope :** acquisition Agence `/pro/agences`, acquisition Promoteur `/promoteurs`, démonstrations `/demo/agence` + `/demo/promoteur`, formulaire `/pro#contact`, profils publics professionnels et promoteurs.  
**Méthode :** code + contrats data/auth + inspection visuelle des captures certifiées 390×844 / 430×932 / 768×900 / 1280×900.

## Progression stricte

Le chantier utilise **5 jalons binaires de poids égal** ; seuls les jalons prouvés comptent :

1. **B1 Inventaire / architecture ✅ CLOSED** — routes, composants, démos, formulaire et profils publics cartographiés.
2. **B2 Baseline visuelle ✅ CLOSED** — agence, promoteur et démos inspectés sur 390 / 430 / 768 / 1280 à partir de l’artefact All Pages certifié.
3. **B3 Truth / data / sécurité ✅ CLOSED** — modèle canonique, legacy promoteur, activation, consentement et validation analysés ; dettes #641 et #643 isolées.
4. **B4 Remédiation sûre + recertification ⏳ ACTIVE** — correctifs P1/P2 posés ; exact-head et captures post-correctif requis avant fermeture.
5. **B5 Merge + closeout canonique ⏳ PENDING**.

**Progression actuelle : 3/5 = 60 %.**

## Résumé

Les surfaces sont techniquement propres et truth-safe dans leur mode démo, mais le produit B2B présente trois faiblesses principales :

1. **double source de vérité promoteur** entre `professional_organizations` et le legacy local `lib/promoters/*` ;
2. **funnel d’activation qui perdait le contexte agence/promoteur** et réutilisait un choix de profil inutilement ;
3. **landing pages trop génériques par rapport à la richesse réelle des démonstrations**, donc proposition de valeur commerciale insuffisamment concrète.

Aucun vrai promoteur n’est actuellement actif dans le dataset legacy, donc aucune fausse revendication publique de partenariat n’a été constatée sur ce chemin au moment de l’audit.

## Inventaire vérifié

### Acquisition
- `/pro/agences` → `ProfessionalAudiencePage audience="agency"`
- `/promoteurs` → `ProfessionalAudiencePage audience="promoter"`
- `/pro` → page mère + formulaire `ProActivationForm`

### Démonstrations
- `/demo/agence` — robots `noindex,nofollow`, données fictives, bannière Mode démo persistante
- `/demo/promoteur` — robots `noindex,nofollow`, données fictives, bannière Mode démo persistante
- les CTA démo sont visuels uniquement et n’écrivent aucun lead réel

### Profils publics
- `/professionnels/[slug]` — source canonique Supabase ; exige `validation_status=validated` + `public_visibility=public` ; badge dérivé de `commercial_tier`
- `/promoteurs/[slug]` — ancien modèle local, `visibility_status=active` suffit à rendre le profil ; dette de migration suivie par issue #641

## Findings

### P0 avant premier vrai promoteur — double source de vérité partenaire

**Vérifié.** Le modèle canonique protège correctement la visibilité et le badge commercial. Le modèle legacy `/promoteurs/[slug]` peut, lui, produire le titre `Promoteur partenaire AkarFinder` et le badge `Projet partenaire` à partir d’une entrée locale active, sans consulter le modèle professionnel canonique.

**État actuel :** aucun objet legacy `visibility_status="active"`.  
**Action :** issue #641 ; interdire tout onboarding réel via ce dataset avant migration/retrait du chemin legacy.

### P1 — contexte perdu dans le funnel d’activation

**Avant correctif :** les deux landing pages renvoyaient vers `/pro#contact`. Le prospect devait re-sélectionner son profil et la provenance de la landing était perdue.

**Correctif dans ce lot :** liens contextuels :
- agence → `/pro?type=agence&source=agency#contact`
- promoteur → `/pro?type=promoteur&source=promoter#contact`

Le formulaire préremplit désormais le profil et conserve `source_page` = `/pro/agences` ou `/promoteurs`.

### P1 — attribution interne `source_channel="promoter"` pour toute activation Pro

**Vérifié.** Le backend utilise historiquement le canal `promoter` comme déclencheur générique de `professional_activation_requests`, y compris lorsque `requested_type=agency`.

La donnée métier agence/promoteur n’est pas perdue car `requested_type` est normalisé séparément, mais l’analytics `source_channel` reste sémantiquement trompeuse.

**Recommandation :** migration séparée vers un canal `professional` en préservant la compatibilité historique. Ne pas modifier silencieusement les dashboards/queries existants dans un audit UI.

### P1 — landing pages trop abstraites

**Inspection visuelle :** les deux pages sont lisibles, sans overflow, avec CTA visibles sur les quatre viewports. En revanche elles sont presque isomorphes et très courtes : elles expliquent surtout la donnée, les droits et le schéma, alors que les démos montrent une proposition beaucoup plus forte.

Manquent notamment sur les landings :
- aperçu concret du résultat final ;
- étapes d’onboarding ;
- formats d’intégration acceptés ;
- exemples de livrables agence vs promoteur ;
- preuve de ce que reçoit le professionnel côté demandes/reporting ;
- FAQ commerciale courte ;
- différence nette entre agence et promoteur au-delà des champs de données.

**Recommandation :** prochain lot UX B2B dédié, sans inventer de partenaire ni de métrique commerciale.

### P2 — SEO / rendu acquisition

**Avant correctif :** `/pro/agences` et `/promoteurs` n’avaient pas de canonical explicite ; `/promoteurs` forçait inutilement le rendu dynamique alors que la landing est statique.

**Correctif dans ce lot :** canonical explicite sur les deux routes ; suppression du `force-dynamic` de la landing promoteur.

### P2 — validation téléphone côté formulaire

**Avant correctif :** huit caractères quelconques suffisaient côté client.

**Correctif dans ce lot :** activation du submit uniquement pour 8 à 15 chiffres, tout en conservant les séparateurs usuels dans la saisie et `inputMode="tel"` / `autoComplete="tel"`.

**Dette :** le serveur `/api/leads` reste plus permissif et doit être durci dans un lot API transverse ; issue #643.

### P2 — démo promoteur : lisibilité des plans à vérifier

Sur la capture 768×900, les zones `Plan 2D` occupent beaucoup de hauteur et apparaissent visuellement très vides à l’échelle de la page. L’asset existe dans `public/demo/floorplans`, donc ce n’est pas classé comme ressource absente. Il faut néanmoins vérifier son contraste/cadrage à taille réelle lors de la recertification ciblée.

## Points forts vérifiés

- marquage démo extrêmement explicite : bannière sticky, badge, footer et `noindex,nofollow` ;
- aucun CTA démo ne crée réellement un lead ;
- aucune promesse de volume, classement ou vente sur les landings ;
- séparation claire sponsorisé / pertinence organique ;
- activation Pro ne crée pas automatiquement organisation publique, badge ou publication ;
- profil public canonique fail-closed sur validation + visibilité publique ;
- responsive sans overflow sur les quatre captures certifiées du programme All Pages.

## Correctifs inclus dans la branche d’audit

- contexte agence/promoteur conservé jusqu’au formulaire ;
- pré-sélection automatique du type professionnel ;
- `source_page` métier conservée ;
- canonical `/pro/agences` + `/promoteurs` ;
- landing `/promoteurs` rendue statique ;
- filtre téléphone client 8–15 chiffres ;
- test de régression B2B dédié branché dans le gate B2B officiel ;
- issue #641 pour la suppression de la double source de vérité promoteur ;
- issue #643 pour le durcissement serveur transverse des leads.

## Gates de sortie du chantier

1. inventaire + code/data/truth audit ;
2. inspection visuelle 4 viewports des surfaces acquisition/démo ;
3. truth/security audit + dettes explicitement gouvernées ;
4. CI exact-head + recertification ciblée des pages modifiées ;
5. merge + closeout canonique.
