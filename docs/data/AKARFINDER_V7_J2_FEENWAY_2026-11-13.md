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

## Décision de conception — FeenWay comme radar d'URLs originales

**Observation terrain (13 novembre 2026) :** lecture des deux liens FeenWay puis consultation directe des pages originales :
- FeenWay 258638 -> Mubawab **8449079** ; original Mubawab affiche **4 350 000 DH / 169 m²** pour un appartement à Riyad/Rabat ; FeenWay affiche 4,35 M DH / 169 m².
- FeenWay 256946 -> Avito **59015264** ; original Avito affiche **5 500 000 DH / 165 m²** dans Hay Riad/Rabat ; FeenWay affiche 5,5 M DH / 165 m².

**Choix optimal :** FeenWay sert seulement à découvrir un lien sortant explicite ; la queue V7 doit garder **directement URL/ID original du portail**, jamais un identifiant FeenWay comme ID d'offre, et regrouper plusieurs miroirs pointant vers un même (portail, ID). Contradiction de slug/URL pour un même ID : échec fermé. La présence d'un lien d'origine ne démontre pas la disponibilité durable, la fraîcheur, la précision de tous les champs, ni l'unicité physique du bien.

**Code J2 :** `build_upstream_candidate_queue` extrait les URLs originelles candidates et assure le dedup par source+ID, sans admission privée/publique. `compare_rendered_claims` confronte, sur observations rendues fournies, les prix/surfaces de FeenWay et du portail original ; zéro DB et aucun appel réseau à partir du comparateur. Le résultat **2/2 cohérent sur prix et surface** dans les deux exemples ne constitue pas un benchmark brut HTML ni une statistique représentative.

**Prochaine validation :** tests CI ajoutés sur cas d'origine, doublons, variantes de slug et désaccord de prix ; puis véritables captures HTML originaux hachées, comparaison L4/V3, et garde de disponibilité. Pas de merge, cron LIVE, DB ou Vercel.
