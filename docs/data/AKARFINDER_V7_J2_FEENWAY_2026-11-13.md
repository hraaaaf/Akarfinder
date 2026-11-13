# V7 J2 — FeenWay : provenance, pas de fausse annonce

**GOAL :** rattacher un miroir FeenWay à une annonce originale via un lien explicite, sans confondre ID FeenWay et ID portail.

**CODE de préparation :** `scripts/acquisition/v7_parallel/j2_feenway_provenance.py` lit du HTML fourni, utilise uniquement le CTA explicite « Visiter le site de l'annonce » ou équivalent, exige URL originale HTTPS individuelle et ID canonique plausible. Badge « Source : X » seul insuffisant.

**Garde :** doublons/URLs concurrentes → statut ambigu ; source inconnue → non prouvée. Même une URL extraite reste **non indépendamment vérifiée** tant que la page originale n'a pas été consultée et capturée. Zéro nouvelle annonce, zéro DB, zéro réseau, aucune publication.

**Tests préparés :** cinq vérifications synthétiques, y compris badge seul, lien externe, origines contradictoires, spoofing et URL miroir invalide. La CI GitHub est la preuve exigée ; ne déclarer PASS qu'après son verdict.

**NEXT :** obtenir un vrai HTML FeenWay /listings/..., extraire l'URL source, capturer la fiche originale avec preuve SHA-256 et tester déduplication par (portail, ID original). Pas de cron, merge, Vercel, Supabase ou écriture PROD.
