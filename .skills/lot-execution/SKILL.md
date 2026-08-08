# LOT Execution

## Purpose
Exécuter un seul LOT AkarFinder de façon inspectable, bornée et réversible sans auto-certification.

## When it applies
À chaque changement de code, DATA, schéma, UX, documentation opérationnelle ou infrastructure du repo.

## Required inspection
Lire `AGENTS.md`, README, ROADMAP, SESSION, architecture/specs du domaine, état de `main`, diff concurrent et workflows applicables. Identifier le ou les reviewers obligatoires avant d'écrire.

## Mandatory evidence
Critères d'acceptation écrits ; branche unique ; diff limité ; validations Builder ; head SHA exact ; Reviewer indépendant ; CI/gates exact-head ; diff final ; ROADMAP ; verdict Certifier ; merge attendu ; post-merge checks.

## Blockers
Scope mixte non justifié ; absence de Reviewer ; preuves sur SHA ancien ; secret/artefact parasite ; gate requis rouge/absent non traité ; violation no-bypass/provenance ; tentative d'auto-certification.

## PASS / FAIL criteria
PASS Builder = implémentation conforme + validations locales documentées, prête à être revue. Ce PASS n'est jamais une certification. FAIL si un critère ou invariant obligatoire manque.

## Forbidden shortcuts
Pas de merge avant Reviewer PASS/Certifier GO ; pas de `100 %`; pas d'affirmation basée sur intuition ; pas de workflow temporaire survivant ; pas de mélange silencieux DATA/UX/Search.

## Required final report
LOT, scope, Builder, critères, fichiers, validations, Reviewer(s) requis, head SHA, risques ouverts et prochaine étape du processus 18 étapes.
