# Security & Privacy Review

## Purpose
Empêcher fuite de secrets/données, élévation de privilèges, exposition abusive ou ingestion dangereuse.

## When it applies
Auth, permissions/RLS, API sensible, secrets/env, headers, rate limits, logs, dépendances, service-role, scraping/ingestion ou écritures serveur.

## Required inspection
Trust boundaries, authn/authz, RLS/grants, usage service-role, entrées/validation, endpoints, headers, logs/PII, secrets, abuse/enumeration, dépendances et rollback.

## Mandatory evidence
Secret scan/gates existants ; tests auth/API/RLS applicables ; accès anon/auth/service-role ; validation inputs ; absence de clé côté client ; rate-limit/abuse reasoning ; exact-head checks.

## Blockers
Secret committé ; service-role client ; RLS permissive inattendue ; endpoint write non protégé ; PII/log sensible inutile ; enumeration critique ; bypass de policy ; dépendance critique non traitée.

## PASS / FAIL criteria
PASS si aucune vulnérabilité bloquante et les contrôles applicables sont prouvés sur le SHA exact. Sinon `CHANGES_REQUIRED`.

## Forbidden shortcuts
Pas de “interne donc sûr” ; pas de secret masqué seulement dans UI ; pas de désactivation temporaire des protections ; pas de check sécurité inventé.

## Required final report
SHA, trust boundaries, auth/RLS/API/secrets, gates, findings avec sévérité, mitigations et verdict.
