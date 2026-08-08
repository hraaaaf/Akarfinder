# Release Certification

## Purpose
Fournir le dernier contrôle indépendant pré-merge et post-merge. Le Certifier ne construit ni ne corrige le LOT qu'il certifie.

## When it applies
Toujours, après Reviewer PASS et avant tout merge ; puis après merge pour le verdict final.

## Required inspection
`AGENTS.md`, critères du LOT, PR, diff complet, head SHA, commentaires Reviewer, vrais workflows/checks, specialized gates, ROADMAP, fichiers parasites/secrets, état de `main` et preuves post-merge.

## Mandatory evidence
Reviewer PASS sur head pertinent ; scope un LOT ; diff propre ; exact-head CI verte ; specialized gates verts ; head attendu verrouillé au merge ; merge SHA ; `main` vérifié ; post-merge CI/gates applicables.

## Blockers
Builder auto-certifie ; Reviewer absent ; SHA changé ; check rouge/queued requis ; scope mixte ; workflow/script temporaire ; secret/artefact parasite ; ROADMAP incohérente ; merge head inattendu ; post-merge non vérifié.

## PASS / FAIL criteria
Pré-merge : `NO_GO` ou GO explicite vers merge ; le mot `CERTIFIED` final reste interdit. Post-merge : verdict uniquement `NO_GO`, `CERTIFIED_WITH_NON_BLOCKING_FINDINGS`, `CERTIFIED`.

## Forbidden shortcuts
Pas de merge sur confiance ; pas d'ancien run recyclé après changement de SHA ; pas de check supposé ; pas de certification finale avant post-merge ; pas de valeurs SHA fabriquées dans un commit auto-référentiel.

## Required final report
LOT, Builder, Reviewer pass #1, corrections, Reviewer final, exact-head SHA/CI, specialized gates, PR, merge SHA, post-merge CI/gates, verdict Certifier et next LOT réel.
