# Professional Auth, Ownership & Profiles V1

Mission canonique #19B.

## Objectif
Créer une vraie frontière professionnelle AkarFinder : identité authentifiée -> organisation -> membership/role -> permissions -> ownership -> surfaces publiques/privées.

## Types d'organisation
- `agency`
- `promoter`

## Principes non négociables
1. Une identité Supabase Auth n'est jamais, à elle seule, une organisation.
2. Toute action privée est autorisée via un membership actif dans une organisation.
3. L'ownership d'un bien/projet est explicite et auditable ; il n'est jamais déduit d'un badge commercial.
4. Le statut commercial (`none`, `partner`, `gold`, `premium`) est séparé du ranking et de la pertinence utilisateur.
5. Le statut de validation (`pending`, `validated`, `suspended`, `rejected`) ne signifie jamais qu'AkarFinder certifie les annonces.
6. Les profils publics n'exposent que des champs explicitement publics.
7. Les mécanismes MVP de type token global partagé ne sont pas une base d'autorisation professionnelle.
8. Les accès privés utilisent `Authorization: Bearer <access_token>` et l'identité Supabase Auth.
9. Les tables du schéma public sont protégées par RLS ; le service role reste serveur uniquement.
10. #19B ne crée aucun boost de ranking commercial.

## Rôles
`owner`, `admin`, `editor`, `analyst`, `lead_manager`, `viewer`.

## Permissions
`organization.read`, `organization.manage`, `members.manage`, `listings.read`, `listings.manage`, `projects.read`, `projects.manage`, `leads.read`, `leads.manage`, `stats.read`.

La matrice de permissions est déterministe et versionnée dans le code.

## Ownership
`professional_listing_ownership` lie explicitement un `property_listing_id` à une organisation avec statut `claimed | verified | revoked`. Un simple claim n'est jamais présenté publiquement comme ownership confirmé.

`professional_projects` porte directement `organization_id`. Le CRUD projet/unité complet reste #19C.

## Profil public
Le profil public expose au maximum : slug, type agence/promoteur, nom d'affichage, description, logo, site web, ville, tier commercial visuel et portefeuille public autorisé.

Aucun membership, rôle, email privé, lead ou statistique privée n'est exposé.

## Auth
Supabase Auth est la source d'identité. Les API privées utilisent un Bearer token, valident le user côté serveur, puis résolvent les memberships actifs. Aucun `?token=` partagé n'est ajouté par #19B.

## Scope #19B vs #19C
#19B fournit identité, organisations, rôles, ownership, profils et autorisation.

#19C construira l'expérience commerciale complète : onboarding, CRUD annonces/projets/unités, dashboard avancé, médias, leads opérationnels, statistiques et offres/badges.
