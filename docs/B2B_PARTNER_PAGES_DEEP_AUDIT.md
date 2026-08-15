# AkarFinder — Audit profond pages partenaires B2B

**Date :** 2026-08-15  
**Scope :** `/pro/agences`, `/promoteurs`, `/pro#contact`, `/demo/agence`, `/demo/promoteur`, profils publics professionnels/promoteurs.  
**Méthode :** code + contrats data/auth + inspection visuelle 390×844 / 430×932 / 768×900 / 1280×900 + recertification exact-head.

## Progression stricte

5 jalons binaires de poids égal :

1. **B1 Inventaire / architecture ✅ CLOSED**
2. **B2 Baseline visuelle ✅ CLOSED**
3. **B3 Truth / data / sécurité ✅ CLOSED**
4. **B4 Remédiation sûre + recertification ✅ CLOSED**
5. **B5 Merge + closeout canonique ✅ CLOSED**

**Progression finale : 5/5 = 100 %.**

## Résultat

Les surfaces Agence/Promoteur sont techniquement stables et truth-safe dans le périmètre audité. Les correctifs sûrs ont été mergés sans activation de partenaire réel, sans permission inventée et sans mutation DATA/ranking/Registry.

### Correctifs mergés

- contexte agence/promoteur conservé jusqu’au formulaire ;
- pré-sélection automatique du profil ;
- `source_page` métier conservée ;
- canonical explicite `/pro/agences` et `/promoteurs` ;
- `/promoteurs` rendu statique ;
- validation téléphone client 8–15 chiffres + `inputMode="tel"` / `autoComplete="tel"` ;
- test de régression B2B branché dans le gate officiel ;
- proposition de valeur rendue concrète par #650 : aperçu visuel, onboarding, formats d’intégration, livrables, reporting truth-safe, FAQ et différenciation nette Agence/Promoteur.

## Preuves finales

### Audit/remédiation structurelle
- PR initiale **#642** supersédée proprement après dérive orthogonale de `main`.
- Replay propre **PR #646**, exact head `f280d69ac2f0304d06e58fc28de2700235452f6a`.
- Merge #646 : `d44e4d7145dae9c04f5ad6bd413175183e15f14e`.
- Gate B2B run `31855231126` : **13/13 tests**, TypeScript ✅, production build ✅.
- UI All Pages Certification run `31855231168` : **64 routes comptabilisées = 52 rendables + 12 blockers explicites**, **208/208 captures**, **0 finding**, **0 route en défaut**.
- Artefact UI : `9238878207`, digest `sha256:b65527fcb38e8120b3529c0dfa9e757ccf790dc4b69f9dac59db63d9350114d5`.
- Tous les workflows globaux du head #646 observés en **SUCCESS**.
- Inspection post-correctif des landings `/pro/agences` et `/promoteurs` sur 390 / 430 / 768 / 1280 : hiérarchie stable, CTA lisibles, aucun overflow observé.

### Productisation commerciale post-audit
- PR **#650** mergée : `32c0b3635f9f8aec2fe92722eef09f0484dfec1b`.
- Head applicatif certifié : `0cb53e589be45bff61449e56a08004dbb3e0ec03`.
- Head documentaire final #650 : `8c149a73e3e4b0c4da0c09326b34f10be6dc7699`.
- **11/11 workflows SUCCESS**.
- UI All Pages Certification `31890674154` : **208/208 captures, 0 finding, 0 route en défaut**.
- Artefact `9248515094`, digest `sha256:c62174a05664ad0695fa02971a9757e99c5e24a691b306aebffd9718f2c7f11f`.
- Les contrats B2B couvrent désormais aussi la preuve visuelle, l’onboarding, les formats d’intégration, les livrables, le reporting, la FAQ, la différenciation métier et l’absence de promesses commerciales non prouvées.

## Findings structurants

### P0 avant premier vrai promoteur — double source de vérité

Le profil public canonique `/professionnels/[slug]` exige `professional_organizations.validation_status="validated"` + `public_visibility="public"` et dérive le badge du `commercial_tier`.

Le chemin legacy `/promoteurs/[slug]` repose encore sur `lib/promoters/*` et peut produire des labels partenaire à partir de `visibility_status="active"` sans consulter le modèle canonique.

**État vérifié lors de l’audit :** aucun vrai promoteur legacy actif. Aucune fausse revendication publique observée.  
**Dette bloquante avant première activation réelle :** issue **#641**. Ne pas activer un partenaire réel via le dataset legacy.

### P1 — attribution `source_channel="promoter"`

L’API historique utilise `promoter` comme canal générique de demande Pro, y compris pour une agence. Le type métier reste préservé séparément via `requested_type`, mais l’analytics du canal est sémantiquement imparfaite.

**Recommandation :** migration transverse vers un canal `professional`, avec compatibilité historique ; hors scope de cet audit UI.

### P1 — proposition de valeur trop abstraite ✅ RÉSOLU

Le finding initial a été traité dans **#650** sans inventer de partenaire ni de métrique commerciale.

Les deux landings exposent maintenant :
- un aperçu concret du résultat final basé sur les composants des démos ;
- un onboarding pilote en trois étapes ;
- les formats d’intégration ;
- des livrables distincts agence/promoteur ;
- un reporting opérationnel truth-safe ;
- une FAQ commerciale courte ;
- une différenciation métier explicite entre portefeuille agence et projets promoteur.

### P2 — API leads transverse

Le client Pro est désormais plus strict, mais `/api/leads` conserve une validation serveur plus permissive et aucun rate-limit dédié n’a été identifié dans ce chemin pendant l’audit.

**Dette transverse :** issue **#643** pour validation téléphone serveur + anti-abus + tests de tous les funnels.

## Points forts vérifiés

- démos explicitement fictives : bannière persistante, badges, footer, `noindex,nofollow` ;
- CTA démo sans écriture de lead réel ;
- aucune promesse de volume, classement ou vente ;
- sponsorisé séparé de la pertinence organique ;
- activation Pro ne crée automatiquement ni organisation publique, ni badge, ni publication ;
- profil public canonique fail-closed ;
- landing pages maintenant concrètes et différenciées sans faux social proof ;
- responsive certifié sur les quatre viewports.

## Statut

**CLOSED.** Le chantier d’audit/remédiation des pages Agence partenaire et Promoteur partenaire est mergé, recertifié et complété par la productisation #650. Les deux dettes restantes sont explicitement gouvernées par **#641** et **#643** et ne sont pas masquées par cette certification.
