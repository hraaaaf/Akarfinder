# AkarFinder — Onboarding produit 03 : PRO / AGENCES / PROMOTEURS / VENDEUR (fiche PROPOSÉE)

**État : préparation, aucun arbitrage utilisateur encore effectué, aucune activation partenaire.** Date : 2026-10-30, base comparaison `main@c02d0b73`.

## Goal et preuve

**Goal :** transformer des visiteurs en partenaires agences/promoteurs et publier des fiches professionnelles fiables, sans double identité, faux inventaire ou fuite de données. Conserver le parcours vendeur séparé pour les particuliers.

**Succès observable :** landing agence / promoteur contextualisée, formulaire cohérent, validation serveur, fiches réelles uniquement pour identités validées et visibles, un seul URL canonique par professionnel, démos explicites `noindex`, profil public sans compteur inventé, RLS multi-tenant vérifiée.

**Preuves effectuées :** lecture des descriptions PR et inventaire de chaque fichier, comparaison du code de `app/professionnels/[slug]/page.tsx` et `app/promoteurs/[slug]/page.tsx` avec main ; **aucune capture navigateur ni flux réel de paiement, activation ou RLS prod observé**.

## Regroupement des PR

| PR | Rôle exact | Choix proposé |
|---|---|---|
| [#644](https://github.com/hraaaaf/Akarfinder/pull/644) | Profil public `/professionnels/[slug]`, identité et coordonnées publiques, `PromoterPageShell`, démo noindex, métriques truth-safe | **KEEP** source professionnelle canonique, mais portage ciblé après vérification des tests/profil réel |
| [#645](https://github.com/hraaaaf/Akarfinder/pull/645) | Landing `/pro/agences` et `/promoteurs`, préselection et CTA, `ProActivationForm` | **KEEP** les deux entrées segmentées ; corriger l'abus/validation téléphone côté API et états d'erreur |
| [#653](https://github.com/hraaaaf/Akarfinder/pull/653) | Supprime la seconde source promoteur réelle ; redirige `/promoteurs/[slug]` vers `/professionnels/[slug]` | **KEEP EN PRIORITÉ** le modèle à fiche unique (demo isolée/noindex) ; auditer redirection et metadata |
| [#310](https://github.com/hraaaaf/Akarfinder/pull/310) | Sessions, auth et RLS pro | **GATE SÉCURITÉ** avant inscription/activation réelle et avant exposition de nouvelles routes |
| [#1101](https://github.com/hraaaaf/Akarfinder/pull/1101) | Écriture HA fenced sur `lib/professional/*` et les API leads/seller drafts | **DÉPENDANCE TECHNIQUE** ; provider/writer fail-closed avant activation |
| [#938](https://github.com/hraaaaf/Akarfinder/pull/938) | SEO metadata routes `/pro`, `/pro/agences`, `/promoteurs`, `/vendre` | **DÉPENDANCE SEO** ; indexer uniquement l'identité légitime |

**Collision de fichiers inspectée :** #644 et #645 **0 chemin commun** ; #645 et #653 **1 test partagé** `scripts/scrapers/__tests__/b2b-partner-pages-deep-audit.test.ts` ; #644 et #653 **0 fichier partagé**. L'absence de conflit Git ne prouve pas qu'un même parcours UX accepte les trois politiques. Les trois PR sont basées sur main mais les HEAD des branches sont historiques.

**Situation `main` :** `app/promoteurs/[slug]/page.tsx` observé utilise encore `getDemoPromoter/getDemoPromoterProjects` pour le cas de démonstration, avec logique de route réelle à contrôler. #653 introduit une redirection permanente de la fiche promoteur réelle vers le profil professionnel canonique. Un seul modèle d'identité publique est souhaitable.

## Arbitrages à montrer à l'utilisateur

**A — RECOMMANDÉE : vitrines segmentées, profil canonique unique.**
- Garder deux landings « Agences » et « Promoteurs » avec contenus adaptés et formulaires contextuels, mais **une seule fiche publique de confiance** `/professionnels/[slug]` pour toutes les organisations.
- `/promoteurs/[slug]` conserve seulement une redirection permanente sûre vers cette fiche, sauf démos explicites `?preview=demo` en `noindex`.
- Aucune mise en avant « X biens » ou « X projets » sans lecture source certifiée ; les coordonnées privées restent privées.
- Conversion propre : préselection de catégorie, confirmation et messages d'erreur ; validation téléphone côté serveur, audit anti-abus, RLS.

**B — Fiches agences et promoteurs séparées.** Peut aider une identité marque, mais réintroduit deux sources de vérité et crée des incohérences de SEO, validation, inventaire ou rôle. **Déconseillée** si la distinction porte sur l'UI et non sur les données.

**C — Une landing B2B générique.** Plus simple à coder mais dilue la proposition de valeur et dégrade la conversion agence/promoteur. **Déconseillée**.

**Risques :** (1) API leads sans anti-abus et validation, (2) confusion des niveaux public/validé/démo, (3) auth/RLS non certifiée sur provider effectivement utilisé. Aucun « compte pro actif » ne doit être revendiqué à partir du seul HTML.

## BEFORE/TARGET/AFTER et validation

1. Capturer avant `/pro/agences`, `/promoteurs`, `/professionnels/[slug]` avec fixture légitime, `/promoteurs/[slug]?preview=demo`, `/vendre`, mobile/tablette/desktop ; présenter les captures.
2. Fixer TARGET (hiérarchie, CTA, logo, champs, mesures, responsive, trust) ; ne pas livrer de placeholders de données.
3. Porter dans une PR produit cohérente après gate schéma/identité, avec tests redirects, slug, noindex, CTA, erreurs formulaire, server-side validation et RLS.
4. AFTER mêmes pages/viewports et revue indépendante ; audit 403/404/unauthorized ; décision commanditaire puis gate de merge ; pas de déploiement Vercel sans consentement distinct.

**Recommandation A : PROPOSÉE** ; décision utilisateur **EN ATTENTE** ; visuel actuel **NON CERTIFIÉ**.

**Next exact :** clôturer audit sécurité provider/identité, préparer BEFORE B2B et proposer l'arbitrage pendant l'onboarding.
