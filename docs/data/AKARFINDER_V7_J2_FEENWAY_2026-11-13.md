# V7 J2 — FeenWay : provenance, pas de fausse annonce

**GOAL :** rattacher un miroir FeenWay à une annonce originale via un lien explicite, sans confondre ID FeenWay et ID portail.

**CODE de préparation :** `scripts/acquisition/v7_parallel/j2_feenway_provenance.py` lit du HTML fourni, utilise uniquement le CTA explicite « Visiter le site de l'annonce » ou équivalent, exige URL originale HTTPS individuelle et ID canonique plausible. Badge « Source : X » seul insuffisant.

**Garde :** doublons/URLs concurrentes → statut ambigu ; source inconnue → non prouvée. Même une URL extraite reste **non indépendamment vérifiée** tant que la page originale n'a pas été consultée et capturée. Zéro nouvelle annonce, zéro DB, zéro réseau, aucune publication.

**Tests préparés :** cinq vérifications synthétiques, y compris badge seul, lien externe, origines contradictoires, spoofing et URL miroir invalide. La CI GitHub est la preuve exigée ; ne déclarer PASS qu'après son verdict.

**NEXT :** obtenir un vrai HTML FeenWay /listings/..., extraire l'URL source, capturer la fiche originale avec preuve SHA-256 et tester déduplication par (portail, ID original). Pas de cron, merge, Vercel, Supabase ou écriture PROD.

## Premier constat externe — deux liens d'origine observés, 13 novembre 2026

Lecture publique de deux pages FeenWay (HTML sémantique rendu et liste de href, PAS HTML brut SHA) :
- **FeenWay [258638](https://www.feenway.com/listings/258638)** : CTA « Voir sur Mubawab », lien vers [Mubawab source ID 8449079](https://www.mubawab.ma/fr/a/8449079/%C3%A0-vendre-%E2%80%93-bel-appartement-%C3%A0-hay-riad-rabat). Les accents et le tiret de la route sont encodés en UTF-8.
- **FeenWay [256946](https://www.feenway.com/listings/256946)** : CTA « Voir sur Avito », lien vers [Avito source ID 59015264](https://www.avito.ma/fr/hay_riad/appartements/Appartement_PRESTIGIA_HAU_RIAD_59015264.htm), titre de fichier conservant des majuscules.

**Progrès concret :** le contrat J2 prend en charge les CTA réels « Voir sur ... », la casse de slug Avito et les accents percent-encoded du slug Mubawab (les encodages ASCII dangereux restent bloqués). Tests réels de forme d'URL basés sur ces deux liens, sans dépôt du contenu HTML source.

**Limite :** le fait que FeenWay fournisse un lien Mubawab/Avito n'atteste pas que l'annonce est encore en ligne, que ses champs concordent, ou qu'il s'agit d'un bien physique distinct. Les IDs source sont **des identités candidates** seulement ; une vérification de la page originale avec hash et date UTC est nécessaire avant toute admission. Aucune requête automatique nouvelle, aucun DB, aucun merge/cron/Vercel.
