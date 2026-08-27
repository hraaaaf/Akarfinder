# AkarFinder — Audit profond pages partenaires

**Date : 2026-08-14**  
**Chantier : Partner Pages Deep Audit**  
**Progression stricte : 2/5 jalons CLOSED = 40 %**

## Périmètre réel

Le parcours partenaire ne se limite pas aux deux démos. L’audit couvre :

- acquisition B2B agence : `/pro/agences` ;
- acquisition B2B promoteur : `/promoteurs` ;
- démonstration agence : `/demo/agence` ;
- démonstration promoteur : `/demo/promoteur` ;
- page publique agence/professionnel : `/professionnels/[slug]` ;
- page publique promoteur : `/promoteurs/[slug]` ;
- socle partagé : `ProfessionalAudiencePage`, `PromoterPageShell`, repository professionnel et données de démonstration.

## Méthode

- lecture des routes, composants, types et repositories ;
- inspection humaine des captures Chromium certifiées 390×844 / 430×932 / 768×900 / 1280×900 issues de la certification All Pages v1 ;
- vérification des CTA, données affichées, provenance, badges, états démo/public, SEO et cohérence responsive ;
- aucune note visuelle attribuée à une route dynamique non rendue avec une fixture déterministe.

## Jalon P1 — Inventaire / contrats ✅ CLOSED

### Vérité métier confirmée

- Les démos agence/promoteur utilisent uniquement des entités fictives locales et sont `noindex`.
- `DemoRequestButton` n’envoie aucun lead : après clic il annonce explicitement qu’aucune demande réelle n’a été envoyée.
- Aucun promoteur réel n’est actif dans `lib/promoters/promoters-data.ts`; seule une entrée `visibility_status="demo"` existe.
- La page publique professionnelle exige `validation_status="validated"` + `public_visibility="public"`.
- Les compteurs agence exposés sont bornés à `ownership=verified` et projets `published/public`.

## Jalon P2 — Baseline UX / visuelle ✅ CLOSED

### A. `/pro/agences` et `/promoteurs` — acquisition B2B

**État : solide mais trop générique.**

Points forts :
- hiérarchie claire ;
- proposition data-for-value honnête ;
- absence de promesse de leads/classement ;
- séparation publication / sponsoring / validation correctement formulée ;
- responsive propre, sans overflow observé.

Faiblesses :
- agence et promoteur partagent presque exactement la même narration et se différencient surtout par le wording ;
- peu de preuve visuelle du produit cible au-dessus de la ligne de flottaison ;
- CTA principal envoie vers `/pro#contact`, donc le parcours demande un scroll/rupture plutôt qu’une qualification immédiate ;
- architecture URL asymétrique : `/pro/agences` vs `/promoteurs`.

**Score humain baseline : 7.8/10.**

### B. `/demo/agence`

**État : riche et crédible, mais trop longue.**

Points forts :
- très bonne matérialisation de la valeur : biens structurés, quartier, lead qualifié, méthode ;
- vraie lisibilité mobile ;
- images et cartes donnent un produit tangible ;
- disclaimers démo présents et CTA fail-honest.

Faiblesses :
- hero = 3 CTA, dont deux demandes très proches ;
- répétition entre liste de biens, “annonce type”, méthode et CTA final ;
- page mobile extrêmement longue ;
- proposition de valeur partenaire diluée par la quantité de modules ;
- le badge/monogramme n’apporte pas encore une vraie couche de confiance professionnelle.

**Score humain baseline : 7.4/10.**

### C. `/demo/promoteur`

**État : meilleur storytelling produit, mais densité excessive.**

Points forts :
- projets, tranches, typologies, plans et appartement témoin rendent le produit très concret ;
- distinction entre données indicatives et informations à confirmer bien maintenue ;
- responsive propre et cohérent avec la démo agence.

Faiblesses :
- succession projets → brochure → tranches → typologies → témoin → quartier → contrôles crée une longueur disproportionnée ;
- beaucoup de CTA secondaires redondants ;
- le parcours acheteur et le parcours commercial B2B sont mélangés ;
- plusieurs sections illustrent la même promesse de “donnée enrichie”.

**Score humain baseline : 7.6/10.**

### D. `/professionnels/[slug]` — page publique agence/professionnel

**État : dette produit majeure.**

La route n’a pas de fixture publique déterministe dans la certification, donc **pas de score visuel attribué**.

Constats code vérifiés :
- `logo_url` est chargé mais jamais affiché ;
- `public_email` et `public_phone` existent dans le modèle `ProfessionalOrganization` mais ne sont pas inclus dans `PublicProfessionalProfile` ni dans la requête publique ;
- aucun CTA de contact ;
- aucun bien vérifié n’est rendu, seulement un compteur ;
- aucun projet publié n’est rendu, seulement un compteur ;
- pas de `generateMetadata` spécifique au profil ;
- la page fonctionne comme une carte de visite administrative, pas comme une vraie page partenaire.

### E. `/promoteurs/[slug]` — page publique promoteur

**État : nettement plus mature que la page agence.**

Points forts :
- hero, description, programmes, villes, CTA contact, disclaimer ;
- démo explicitement bannérisée et non indexable ;
- page active seulement si `visibility_status="active"` ;
- données projet séparées et filtrées par visibilité.

Défauts vérifiés :
- le badge hero dit `Projet partenaire` alors qu’il qualifie le promoteur ;
- `contact_email` existe dans le type `Promoter` mais n’est jamais rendu ;
- le bloc `Reporting projet — À venir` est une fonctionnalité B2B future affichée sur une page publique acheteur ;
- `main_image_url`, `gallery_urls`, `brochure_url` existent dans le modèle projet mais ne sont pas exploités dans la carte de programme ;
- `source_note` du promoteur est ignoré au profit d’un libellé hardcodé ;
- palette ambre/brun de la page publique diverge fortement des démos partenaires et du design system Search.

**Score humain baseline démo-shell : 7.2/10.**

## Diagnostic central

Le problème principal n’est pas un bug CSS. C’est une **asymétrie produit** :

1. les démos vendent une expérience partenaire riche ;
2. la page publique promoteur en réalise une partie ;
3. la page publique agence n’en réalise presque rien.

Résultat : AkarFinder promet plus dans les démonstrations qu’il ne matérialise encore dans le profil agence public.

### Dette d’architecture promoteur

Deux modèles de données peuvent aujourd’hui représenter un promoteur :

1. `professional_organizations` avec `organization_type="promoter"`, utilisé par `/professionnels/[slug]` et le workspace professionnel ;
2. le modèle local legacy `PROMOTERS / PROJECTS`, utilisé par `/promoteurs/[slug]` et `/projets/[slug]`.

Cette duplication peut produire à terme deux URLs, deux états de visibilité et deux règles de contact pour la même entité. **Aucune fusion implicite n’est autorisée dans P3.** P4 doit converger les surfaces ; P5 doit décider et documenter la source de vérité canonique avant toute migration de données réelles.

## Cible produit

Une page partenaire publique doit répondre en moins de 10 secondes à cinq questions :

1. Qui est ce professionnel et quel est son statut exact ?
2. Où travaille-t-il / quels projets porte-t-il ?
3. Quelles offres vérifiées sont réellement disponibles ?
4. Pourquoi cette page est-elle fiable et d’où viennent les données ?
5. Quelle action utile puis-je faire maintenant ?

## Roadmap

### P1 — Inventaire / vérité ✅ CLOSED
Routes, données, statuts, permissions, CTA et SEO identifiés.

### P2 — Baseline visuelle ✅ CLOSED
Captures certifiées inspectées aux quatre viewports ; défauts UX classés.

### P3 — Parité fonctionnelle / truth-safe ⏳ ACTIVE

Priorité :
- enrichir le profil public agence avec logo + coordonnées explicitement publiques + metadata ;
- exploiter les données de portefeuille vérifiées sans inventer d’annonces ;
- corriger le libellé promoteur ;
- exposer l’email promoteur lorsqu’il est fourni ;
- retirer le reporting futur de la surface publique acheteur ;
- garder les badges commerciaux séparés de la confiance/pertinence.

### P4 — Convergence UX premium

- réduire la longueur des deux démos ;
- 1 CTA primaire + 1 secondaire maximum par zone ;
- harmoniser agence/promoteur sur les primitives Search ;
- ajouter preuves de portefeuille/projets plutôt que blocs pédagogiques répétitifs ;
- converger les deux surfaces promoteur sans modifier les données réelles ;
- recertifier 390 / 430 / 768 / 1280 avec captures exact-head.

### P5 — Certification / closeout

- tests fonctionnels + TypeScript + build ;
- screenshots après remédiation ;
- inspection humaine ;
- décider/documenter la source de vérité promoteur canonique avant données réelles ;
- canonical docs ;
- merge puis contrôle `main`.

## Invariants

- aucun badge partenaire inventé ;
- aucun contact issu du scraping ;
- aucune annonce/projet non vérifié rendu comme actif ;
- sponsoring et relation commerciale n’influencent pas la pertinence organique ;
- démos clairement fictives et non indexables ;
- une donnée absente reste absente.
