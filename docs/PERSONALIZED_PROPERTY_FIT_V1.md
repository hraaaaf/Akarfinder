# Personalized Property Fit & Ranking V1 — #19E

Property Fit answers one question: how well does this property fit this specific SearchProfile?

It is deliberately separate from:
- AkarScore — quality/documentation of available information;
- Completeness — amount of information available;
- commercial tier/badge — business relationship.

## Rules

1. Hard constraints produce explicit mismatches and make a candidate ineligible.
2. Preferences create weighted fit components.
3. Unknown property/neighborhood evidence is excluded from the weighted score and lowers coverage; it is never scored as zero.
4. Explicit profile preferences carry more weight than weak behavioral inference.
5. Neighborhood dimensions are consumed only from evidence-backed AkarFinder neighborhood scores.
6. Same property can have materially different Fit results for different search projects.
7. Personalized ranking runs after baseline relevance. When Fit is unavailable, baseline order is preserved.
8. Commercial badges never boost Fit or personalized ranking.

## Output

The engine returns:
- `eligible`;
- `score` or null;
- coverage;
- strong matches;
- compromises;
- hard mismatches;
- unavailable dimensions;
- auditable component breakdown.

This output is designed for explanations such as “Ce bien semble adapté à votre projet” only when actual profile/evidence coverage exists. It must not be fabricated for anonymous/default users.
