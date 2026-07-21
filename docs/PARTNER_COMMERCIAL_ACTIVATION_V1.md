# Partner Commercial Activation V1 — #19C

## Purpose

Activate the professional foundation from #19B without mixing commercial status with search relevance.

## Gates

Organization lifecycle:
`pending → onboarding → review → active | paused | rejected`.

Written source/publication authorization is independent:
`none → pending → confirmed | revoked`.

Draft onboarding is allowed during `onboarding`/`review`. Publication request and assigned-lead access require all three conditions:
1. `validation_status=validated`
2. `activation_status=active`
3. `source_authorization_status=confirmed`

Gold/Premium only unlock business tooling. They never boost ranking, AkarScore or Property Fit.

## Seven-step property onboarding

1. Identité du bien
2. Usage & potentiel
3. Localisation & environnement
4. Caractéristiques & mode de vie
5. Investissement & coûts
6. Médias & projection
7. Transparence, vérification & publication

The UI contract is dynamic: only fields relevant to the current step/property type are exposed. The full Property Schema V1 remains canonical and exhaustive.

## Provenance boundary

`professional_property_submissions.declared_facts` accepts only partner-declared fields whitelisted by the onboarding contract. Calculated/derived fields such as price/m², market position and documentary verification counts cannot be submitted as declared facts.

Completeness is weighted. Essential fields carry materially more weight than optional valued fields. Derived fields do not inflate declared completeness.

## Media rights

Every partner media row stores explicit `rights_status` and `publication_permission`. Unknown/forbidden rights are not implicitly promoted to public media.

## Lead management

Lead visibility stays explicit and tenant-scoped through `professional_lead_assignments`. No city similarity, commercial tier or source similarity grants lead access.

The legacy `/pro/leads?token=...` inbox is retired. New professional APIs use verified Supabase Bearer identity and membership permissions.

## Staff decisions

Activation and submission approval endpoints require the server-controlled Supabase `app_metadata.akarfinder_staff=true` claim. `user_metadata` is never trusted for authorization.

Organizations cannot self-validate, self-activate, self-confirm source authorization, self-upgrade Gold/Premium, or self-approve a property submission.

## Publication boundary

#19C does not insert approved submissions directly into the public listing index. It returns an eligible publication request only after the organization is live-authorized and the submission is approved. Canonical authorized ingestion/publication remains a separate guarded step.
