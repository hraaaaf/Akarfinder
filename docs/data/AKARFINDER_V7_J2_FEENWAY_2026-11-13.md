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

## J2 — pont preuves HTML originales (13 novembre 2026)

**GOAL:** le lien FeenWay original (portail, ID, URL) devient uniquement un **candidat URL source**, puis l'archive HTML brute de l'original est vérifiée par SHA256 + manifeste, et rejouée dans les extracteurs existants L4/V3. Ne jamais insérer FeenWay comme nouvelle propriété ni transformer un accord entre L4/V3 en certitude éditoriale.

**Code:** nouvelle fonction `verify_upstream_snapshot(candidate, dossier)` dans `j2_feenway_provenance.py`. Elle exige source + ID exacts et URL identique entre découverte et manifest, `record_kind=url_candidate_only`, vérifie les octets source, puis rapporte les sept champs comparés L4/V3 ; **0 DB/0 admission**, même après hash valide.

**Format d'URL corrigé:** `detail_compare._domain` accepte désormais uniquement les octets UTF-8 **non ASCII** percent-encoded dans les slugs (nécessaire pour le vrai lien Mubawab) tout en refusant les échappements ASCII dangereux, invalides ou non UTF-8. `snapshot_evidence` réutilise ce contrat. Régressions correspondantes ajoutées.

**Acquisition unitaire:** le workflow PR `akar-v7-j2-original-once.yml` comporte une matrice de **deux GET maximum** : Mubawab #8449079 et Avito #59015264, strictement sans retry/redirect/proxy, captures privées et éphémères d'un jour. Un marqueur explicite `.github/v7-j2-original-once-enabled` est ajouté après le GO utilisateur puis sera retiré après premier essai. Aucune cadence, cron ou import Supabase. Si 403, redirection, contenu non HTML ou incohérence : **stop et preuve d'échec**, pas contournement.

**SUCCESS requis :** CI de tests offline au HEAD + preuves GitHub Actions exactes par source (HTTP200, bytes, SHA, horodatage UTC, L4/V3 sept champs) ; seuls les cas vérifiés peuvent être qualifiés, et une capture ne garantit ni fraîcheur ni propriété physiquement unique.

## J2 — Tentatives d'archives originales, verdicts contrôlés (13 novembre 2026)

**GOAL:** deux captures HTML source directes, sous double gate et 1 GET par portail, depuis GitHub Actions, puis preuve SHA-256 + UTC et replay L4/V3 via les identifiants d'origine FeenWay. Aucune insertion en DB.

**Code vérifié:** commit `731adb054905116b6bc78c43b7cf7c1550ea41fa` ajoute `verify_upstream_snapshot` à la file FeenWay→portail original : comparaison stricte URL/domaine/ID avec la capture, SHA/manifest et mêmes octets dans L4 et V3 ; **jamais d'admission automatique**. Corrige les URLs Mubawab aux slugs avec UTF-8 percent-encoded, en interdisant l'encodage de caractères ASCII trompeurs.

**Preuves CI offline:** [J2 #43338121874](https://github.com/hraaaaf/Akarfinder/actions/runs/43338121874) SUCCESS (12 tests J2 + 6 tests L4/V3 + 7 tests manifestes = **25/25**), [CI Efficiency #43338122006](https://github.com/hraaaaf/Akarfinder/actions/runs/43338122006) SUCCESS, [V7 #43338121818](https://github.com/hraaaaf/Akarfinder/actions/runs/43338121818) SUCCESS.

**Véritable capture unitaire:** [workflow #43338121837](https://github.com/hraaaaf/Akarfinder/actions/runs/43338121837) FAILED (les deux jobs) avec une requête par source :
- **Mubawab #8449079 :** réponse HTTP200 et type HTML acceptés avant `_manifest`, mais `INVALID_RAW_CAPTURE` ; la version initiale du module ne séparait pas les causes possibles (document ne commençant pas directement par DOCTYPE/HTML, corps trop grand, etc.). **Pas de HTML brut archivé, donc aucune précision réelle L4/V3 vérifiée**. Ne pas attribuer une cause plus spécifique sans données.
- **Avito #59015264 :** **HTTP 403 Forbidden**, aucun HTML capturé, arrêt sans reprise et sans contournement.
- **Après premier essai :** le marqueur d'activation `.github/v7-j2-original-once-enabled` a été **SUPPRIMÉ** au commit `26354bac10a9fbc6f8eb836456009be72cbd67ef`. [Workflow #43338320668](https://github.com/hraaaaf/Akarfinder/actions/runs/43338320668) SUCCESS au SHA suivant **parce que les étapes de capture sont SKIPPED**, pas parce que l'acquisition a réussi. Aucun troisième GET n'est déclenché.

**Durcissement hors réseau suivant :** différenciation des échecs de validation `INVALID_RAW_CAPTURE:BODY_TOO_LARGE` et `INVALID_RAW_CAPTURE:HTML_MAGIC_MISMATCH` dans `snapshot_evidence.py` sans imprimer de contenu source, plus test unitaire dédié ; ces changements n'autorisent pas de nouvelle requête.

**Statut J2 :** provenance de **2 liens originaux** réellement observée et prix/surface confrontés via pages rendues ; contrats/tests offline valides ; **0/2 archives brutes originales réussies** via GitHub-hosted. J2 non clôturé. L'archive J1 Agenz est distincte et ne vaut pas comme preuve de ces deux portails.

**Next exact :** obtenir une capture brute des pages originales depuis un accès dont le site accepte une requête, avec manifestes SHA+UTC et preuve de provenance ; exécuter le replay J2 offline sur ce HTML, puis corriger les divergences de champs. Toute nouvelle campagne HTTP sur les portails bloqués doit rester sous une décision de source distincte. Dédup par portail+ID reste sans PROD/DB/staging.

**J3/J4/J5 :** quatre PR Draft indépendantes #1205–#1208, tests métier offline et politiques CI verts au dernier contrôle précédent ; aucune activation automatique des sources. Aucun Vercel, merge, cron live ou Supabase.
