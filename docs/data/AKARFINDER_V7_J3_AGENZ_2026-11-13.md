# V7 J3 — Agenz : corpus de captures intègres

**GOAL :** évaluer plusieurs fiches Agenz, pas seulement la capture J1. Les originaux doivent être archivés en privé avec manifeste HTTP 200, SHA-256 et date UTC.

**CODE de préparation :** `scripts/acquisition/v7_parallel/j3_agenz_corpus.py` utilise le validateur existant `snapshot_evidence.py`, compare les sept champs L4/V3, exige IDs individuels uniques, marque écarts de complétude, refuse HTML altéré ou identifiant dupliqué.

**J1 acquis :** une fiche réelle `444291` a exposé prix courant 980000 MAD, surface 104 m², conflit quartier Al Qods vs Tabriquet. Ceci ne constitue pas une précision représentative.

**Cible de travail J3 :** cinq IDs distincts au minimum pour rendre un corpus *prêt pour annotations humaines*, sans déclarer précision indépendante. Aucune requête HTTP ni DB dans le comparateur. Les tests CI synthétiques ne sont pas des captures réelles.

**NEXT :** réunir 5 snapshots réels via parcours autorisé, annoter champs manuellement et corriger les divergences. Pas de cron, merge, Vercel, Supabase ou écriture PROD.

## J3 — corpus candidat de 5 fiches réelles, accès HTML limité

**Preuve liens :** la page publique Agenz `https://agenz.ma/fr/acheter/immo-sale/vente-appartements` contient les quatre URLs de détail suivantes ; chacune a été consultée en lecture seule via HTML rendu (mais **pas** enregistrée en HTML brut source) :
- `https://agenz.ma/fr/annonces/immo-sale/vente-appartements/sale-el-jadida/445495`
- `https://agenz.ma/fr/annonces/immo-sale/vente-appartements/said-hajji/420510`
- `https://agenz.ma/fr/annonces/immo-sale/vente-appartements/zone-industrielle-tabriquet/387448`
- `https://agenz.ma/fr/annonces/immo-sale/vente-appartements/assonboula/500006`

**Référence J1 :** Agenz `444291`, HTML source archivé privé SHA256 `788355d9050f4b3ee6061c51ebf259c89acff19bb583a03a895ab8889ece6d61` ; [artifact J1](https://github.com/hraaaaf/Akarfinder/actions/runs/43330609367) existant à la première vérification (expiration prévue 2026-11-13T23:39:02Z).

**Nouveau canary préparé :** workflow `.github/workflows/akar-v7-j3-original-once.yml` une requête HTTPS unique par fiche, sans retry/redirect, capture privée 1 jour SHA256/UTC/HTTP200. Après les 4 jobs, le corpus d'analyse en lecture seule télécharge leurs quatre artefacts et le cinquième J1 pour vérifier **5 IDs distincts** via `assess_corpus`. Le marqueur `.github/v7-j3-original-once-enabled` sera supprimé après premier essai. Aucun cron live, SQL/DB, merge, Vercel, ni promesse de disponibilité future.

**Critère à prouver :** seulement si les 5 manifests valident ensemble, déclarer `corpus_ready_for_human_labels`. Cela ne certifie pas la précision des 7 champs tant que leurs valeurs ne sont pas étiquetées indépendamment. Si un job échoue, ne jamais affirmer corpus 5/5.

## J3 — Capture vraie 5/5, benchmark initial et correction L4 (13 novembre 2026)

**Preuve brute réelle :** [GHA J3 #43339490949](https://github.com/hraaaaf/Akarfinder/actions/runs/43339490949) SUCCESS pour 4 captures individuelles avec HTTP200, SHA256, UTC, 4 artefacts privés 1 jour ; job corpus combine ces 4 + la capture J1 #444291 avec **5 IDs distincts et 5 hashes vérifiés** :
- #444291 : `788355d9050f4b3ee6061c51ebf259c89acff19bb583a03a895ab8889ece6d61` (J1)
- #445495 : `4e2d6d4ed51dd86896356baf84e76ba5a7eb0b798acb62086262d72819d9274a` (prix L4/V3 1 650 000 DH)
- #420510 : `1714113517ad3179f70645ae56722b286ab790d20e88e4fdd9a5febb24eaff9d` (prix 730 000 DH)
- #387448 : `d9faa5bf7ab4ab6721bf13752e311ab8d4a44626c61311317087f089cce389d1` (prix 740 000 DH)
- #500006 : `047d6e02ee82a3d4cd724b9c447dea5cc42c24397f77f08617c3a546b468aafe` (prix 1 224 000 DH)

**Benchmark avant correctif :** 5/5 accords de prix L4/V3, désaccords sur `city` et `district` **5/5**, et sur `surface_total_m2` **1/5**. **Ce sont des concordances entre parseurs, pas des exactitudes indépendamment étiquetées.**

**Sécurité :** autorisation de capture unitaire supprimée au SHA `6742f88d5d12540262b80023035de1c9a86c854c`, pas de nouvelles requêtes programmé. [J3 original #43339490949](https://github.com/hraaaaf/Akarfinder/actions/runs/43339490949) est la preuve d'acquisition, le workflow ultérieur avec marqueur absent doit avoir les étapes réseau SKIPPED.

**Correctif proposé ici :** L4 `canonical_listing_extractor.py` renseigne par fallback prudent les deux labels ville/quartier **dérivés de la route de détail Agenz uniquement**, si JSON-LD n'a rien fourni ; conserve les valeurs structurées lorsqu'elles existent. Indique dans l'évidence `agenz.detail_url.city` ou `agenz.detail_url.district` (URL != géolocalisation indépendante). Trois régressions synthétiques ajoutées, aucune écriture DB ni source GET.

**Nouvelle vérification réelle préparée :** workflow `akar-v7-j3-corpus-replay.yml` télécharge le corpus déjà capturé depuis GitHub et refait les sept comparaisons L4/V3 **sans aucun appel aux portails**. Succès exige zéro divergence ville/quartier sur les cinq originaux ; l'écart de surface restant doit être analysé séparément, pas inventé.

**Prochaine preuve :** CI aux commits exacts et rapport de rejeu ; labels manuels indépendants pour certifier la précision sur les 7 champs. J3 partiellement validé, pas encore précision représentative. Aucun merge, staging privé, cron actif, Vercel ou publication.

## J3 — Diagnostic vérité terrain #445495 : 105 habitables + 45 terrasse = 150 m² totaux

**Preuve des octets réels** : [workflow replay diagnostique #43340844303](https://github.com/hraaaaf/Akarfinder/actions/runs/43340844303), SHA256 original `4e2d6d4ed51dd86896356baf84e76ba5a7eb0b798acb62086262d72819d9274a` inchangé. Sur la fiche #445495 :
- **105 m²** : la description précise « Avec 105m2 habitables et une terrasse de 45 m² » ;
- **150 m²** : valeur affichée plusieurs fois dans la zone de caractéristiques principale (2 CH, 2 SDB, 150 m²) ;
- L4 captait **105** (motif générique `text:surface`) ; V3 retournait **150**. L4 ne doit pas confondre surface habitable et totale.

**Correction proposée :** L4 privilégie pour les fiches détails **Agenz uniquement** la première valeur de surface visible dans le corps HTML, avant la description Meta qui peut présenter habitable+terrasse. Le motif général corrige aussi la prise en charge de `m²` Unicode (la frontière `\\b` après `²` était mal formée). Tests synthétiques : cas exact 150 total/105 habitables/45 terrasse et Unicode, en conservant JSON-LD quand présent.

**Nouvelle certification attendue :** `akar-v7-j3-corpus-replay.yml` doit prouver **zéro divergence** L4/V3 sur les surfaces, ville et quartier des 5 mêmes originaux, sans nouvelle requête. Même si vert, **accord des parseurs ≠ précision indépendante des sept champs** ; annotation humaine reste indispensable. Pas de DB, merge, cron ni Vercel.

## Closeout comparatif cinq originaux : 0 divergences (13 novembre 2026)

**Code exact :** `6b6ce0c1a285aca1174911326a298cd5b58064af`, dans la Draft PR #1206 (non mergée).

**Preuve CI complète :** [GitHub Actions replay #43341257516](https://github.com/hraaaaf/Akarfinder/actions/runs/43341257516) SUCCESS, source des cinq archives **inchangées**, statut `disagreements_by_field = {}` sur les **7 champs** comparés L4/V3 : prix, surface totale, ville, quartier, titre, type, transaction. Le différentiel de #445495 est corrigé de **105 habitable** à **150 total**, méthode L4 `agenz.visible_first_surface`; original SHA `4e2d6d4ed51dd86896356baf84e76ba5a7eb0b798acb62086262d72819d9274a`. **Six workflows au même commit SUCCESS** : replay corpus #43341257516, V7 #43341257349, J1 replay #43341257439, J3 tests #43341257322, CI Policy #43341257311, one-shot #43341257269 avec les étapes de capture SKIPPED (marqueur retiré).

**Succès précis du sous-lot :** cinq annonces originales Agenz ont une archive HTML brute SHA256+UTC unique et une comparaison L4/V3 sans divergence. **Limite :** la concordance sur sept colonnes peut inclure deux valeurs `null` et ne certifie ni complétude, ni précision indépendante, ni date réelle de publication ou statut actif. Les valeurs doivent être étiquetées indépendamment sur les vrais documents pour prétendre à une qualité certifiée. Aucune propriété en DB/PROD.

**NEXT exact :** audit indépendant des sept champs, quantification `present/missing/correct/incorrect` par source, puis décision de validation du lot J3 ; continuer J4 et J5 en parallèle. Toutes les activations réseau périodiques, SQL staging, merge et Vercel restent non autorisées.

## Audit indépendant des 35 valeurs affichées — 13 novembre 2026 (CI PASS, géolocalisation NON CERTIFIÉE)

**GOAL :** comparer les 35 champs (5 fiches × 7 champs) à des annotations produites par lecture directe des HTML originaux **sans dériver les labels de L4 ni V3**. Les cinq ZIP privés ont été retéléchargés le 13/11 ; les SHA-256 des fichiers `source.html` concordent tous avec les manifestes historiques déjà consignés.

**Données annotées hors parseurs :** `scripts/acquisition/v7_parallel/j3_independent_labels.json` contient pour chaque ID le titre exact HTML, prix courant affiché, surface totale affichée, ville, quartier de l'en-tête, type et vente. Les 35 valeurs sont présentes dans les sources ; comparaison automatique avec L4/V3 ajoutée dans `j3_source_label_audit.py` et `akar-v7-j3-corpus-replay.yml`. La concordance calculée doit encore être établie par le run exact du nouveau HEAD, pas seulement par le précédent replay inter-parseurs.

**Contradictions internes à Agenz (blocage pour géolocalisation réelle) :**
- **#444291** : en-tête `Al Qods`, description `Tabriquet`.
- **#387448** : en-tête `Zone industrielle Tabriquet`, description `Hay Rahma`.
- **#500006** : en-tête `Assonboula`, description `Bab Lamrissa`.

Le contrôle compare la **fidélité aux champs visibles dans l'en-tête** ; il normalise les diacritiques/casse pour comparer les toponymes (ex. `Sale` vs `Salé`), sans interpréter cette normalisation comme précision géographique indépendante. Trois quartiers restent **contestés dans la source même**. La date de publication, disponibilité, réalité géographique et représentativité sont **non certifiées**. Ne pas confondre `35 valeurs annotées` avec `35 valeurs correctes`.

**Preuve CI vérifiée :** [replay GitHub #43391085979](https://github.com/hraaaaf/Akarfinder/actions/runs/43391085979) **SUCCESS** au SHA `004412f65d2fcdb21697cc82a7ef54d35f534720` : 5/5 archives SHA vérifiées, **35/35 labels affichés couverts, 70/70 comparaisons L4/V3 conformes après normalisation, 0 champ manquant, 0 erreur face à l'en-tête**, et 16 différences mineures de casse/diacritiques comptées pour les deux parseurs (notamment `Sale`/`Salé`). **Six workflows SUCCESS** au même SHA ; capture one-shot toujours désactivée. La conformité au texte principal affiché n'autorise **aucun staging** et n'est pas une certification géographique/fraîcheur.

**Statut :** J3 reste avancé, non clôturé, car trois descriptions contredisent le quartier affiché en en-tête ; aucune géolocalisation réelle indépendante n'est établie. J0–J1 clôturés ; V7 = 2/8 jalons, et non 25 % du travail. Aucun DB, activation cron, capture réseau, merge ou déploiement Vercel. **Next exact :** spécifier une règle de publication/staging qui traite les quartiers conflictuels en incertains, puis valider les sources si un usage géographique est envisagé. Les 16 variantes d'accents/casse sont un sujet de rendu/normalisation, distinct d'une erreur géographique.

## J3 — Contrôle géographique indépendant : source ≠ localisation (13 novembre 2026)

**Goal :** empêcher qu'une concordance de parseurs ou une répétition entre portails soit prise pour une adresse/quartier certifié. Les 5 originaux SHA256 ont été relus hors ligne. Le balisage JSON-LD observé se limite à des éléments de navigation et des attributs immobiliers, sans preuve de coordonnées propres au bien sur ces captures. Les liens `/fr/estimation/map` ne sont pas des points du bien. Cette observation n'exclut pas une carte dynamique non présente dans l'archive.

**Preuve externe de contamination possible :** [Mubawab annonce #8413785](https://www.mubawab.ma/fr/a/8413785/appartement-%C3%A0-vendre-104-m%C2%B2-3-chambres-al-qods-sal%C3%A9), même référence commerciale `SAL-TA-1004` et même description mentionnant Tabriquet. La duplication de texte ne produit **pas** une preuve indépendante d'adresse. Aucune coordonnée d'annonce indépendante n'est certifiée.

**Règle fail-closed implémentée en Draft :** `j3_geo_qualification.py` exige le SHA de l'archive validé avant toute qualification, distingue `source_internal_conflict` de `source_claim_unverified`, conserve les libellés de provenance et refuse **dans tous les cas** quartier d'index, coordonnées, publication géographique et admission en staging. Même les deux annonces sans divergence textuelle ne sont pas géolocalisées indépendamment. Pour cette évaluation : 3 conflits (#444291, #387448, #500006), 2 déclarations source non certifiées, 0/5 droit d'indexation géographique. Ce garde-fou est un protocole du corpus J3 **non raccordé à une ingestion DB** ; J6 restera strictement OFF.

**Preuve CODE + CI :** commit `9166d59bacc0f218d281d6228c64111e5e107ea5` ; [replay hors ligne #43392986533](https://github.com/hraaaaf/Akarfinder/actions/runs/43392986533) **SUCCESS**, 6 tests ciblés PASS, 5/5 SHA d'originaux vérifiés, 35 labels testés sur 70 sorties L4/V3, 0 valeur manquante/incorrecte face aux champs affichés, 3 conflits géographiques mis en quarantaine, 2 déclarations non certifiées, 0 publication/staging autorisé. **Six workflows SUCCESS au même commit.** Le garde-fou ne prétend pas vérifier le terrain et n'est pas intégré à une ingestion.

**Décision J3 :** audit des valeurs visibles terminé, **certification de précision géographique REFUSÉE**. J3 demeure ouvert si son critère de clôture requiert des lieux fiables. Aucune autorisation de mise en carte, staging, cron, merge, SQL ou Vercel. Les artefacts privés originaux ont une rétention courte (13–14 novembre 2026) : prévoir une conservation privée conforme au protocole avant expiration, sans publier les HTML en Git.

**Next exact :** CI au HEAD, préserver les sources originales via un mécanisme privé autorisé et fournir une attestation spécifique à l'adresse du bien avant d'envisager l'indexation géographique ; autrement continuer avec statut source-only et quarantaines.

### Conservation hors Git des preuves d'origine

Le 13/11/2026, un bundle ZIP privé de **199 159 octets** a été créé depuis les cinq artefacts GitHub originaux **sans changer les ZIP internes**. Les cinq `source.html` ont été rehashés SHA256 et correspondent aux manifestes attendus. Bundle SHA256 : `a1fb0a2ccf59fc57955abf15b4a4e4986e44bd7e534aeddd1d256dd45b37f037`.

- Bibliothèque personnelle ChatGPT : `/AkarFinder/V7/private/AKARFINDER_V7_J3_AGENZ_ARCHIVES_PRIVEES_2026-11-13.zip` ; Library file ID `libfile_d65652741e4081919dc6b44db0b689f0`. Lecture de la liste Library confirmée, 199159 octets. Également disponible en pièce jointe de la conversation. **Pas** de HTML brut commité ou publié.
- La sauvegarde sécurise une copie du corpus contre l'expiration des artefacts Actions. Ce n'est pas une preuve de permanence contractuelle du stockage ni une autorisation de mise en ligne ; maintenir l'archive privée.
- Anomalie source additionnelle : le titre de #387448 mentionne « 4 chambres », tandis que l'en-tête affiche « 3 Ch ». Il faut éviter de transformer un titre recopié fidèlement en caractéristique structurée « 4 chambres » ; cette différence n'affecte pas les sept comparaisons actuelles, qui vérifient seulement le texte du titre.

**Décision au gate J3 : NO-GO pour localisation géographique certifiée et connecteur qualifié au sens complet.** La fidélité aux champs principaux du portail a été contrôlée, mais les 3 quartiers contradictoires et les 2 quartiers sans attestation indépendante interdisent la promotion en géo-index. Lot V7 **2/8 jalons clôturés**, pas 25 % de travail. Aucune action prod, merge, staging, 10-min cron ou déploiement.

## J3 — Re-vérification indépendante du bundle privé original (13 novembre 2026)

**Goal :** confirmer que les cinq vrais documents d'origine Agenz déjà archivés sont intègres, disponibles et identifiables, plutôt que supposer que la sauvegarde antérieure suffit. Aucune nouvelle requête portail.

**Source :** `/AkarFinder/V7/private/AKARFINDER_V7_J3_AGENZ_ARCHIVES_PRIVEES_2026-11-13.zip`, materialisée en lecture seule dans un dossier privé de cette conversation. **Taille : 199 159 octets**, SHA256 du conteneur `a1fb0a2ccf59fc57955abf15b4a4e4986e44bd7e534aeddd1d256dd45b37f037`, identique au précédent indice canonique ; ZIP externe CRC PASS, **5 ZIP internes CRC PASS**.

**Contrôle des vrais octets `source.html` et manifestes :** cinq identifiants de la même archive, chacun exactement un `source.html`, empreinte SHA256 égale à la référence et au `html_sha256` du manifeste. Les cinq manifestes déclarent HTTP 200 avec horodatage UTC.

- Agenz **444291**, 237450 octets, SHA256 `788355d9050f4b3ee6061c51ebf259c89acff19bb583a03a895ab8889ece6d61`.
- Agenz **445495**, 248662 octets, SHA256 `4e2d6d4ed51dd86896356baf84e76ba5a7eb0b798acb62086262d72819d9274a`.
- Agenz **420510**, 216245 octets, SHA256 `1714113517ad3179f70645ae56722b286ab790d20e88e4fdd9a5febb24eaff9d`.
- Agenz **387448**, 186116 octets, SHA256 `d9faa5bf7ab4ab6721bf13752e311ab8d4a44626c61311317087f089cce389d1`.
- Agenz **500006**, 271176 octets, SHA256 `047d6e02ee82a3d4cd724b9c447dea5cc42c24397f77f08617c3a546b468aafe`.

**Preuve qualifiée :** intégrité des octets des cinq fiches sauvegardées et cohérence avec leurs manifestes, **pas** vérification indépendante que la page internet ait été éditée/actualisée à cette heure, ni certification des quartiers/adresses. Les trois conflits source internes #444291, #387448, #500006 restent en quarantaine et les deux autres quartiers non géolocalisés indépendamment ; **0/5 autorisées pour géo-index**. Aucune nouvelle preuve de fraîcheur, disponibilité, adresse exacte ou propriété physique unique.

**Closeout :** sous-lot vérification de conservation **5/5 PASS** ; jalon J3 complet toujours OUVERT/NO-GO géographique. Aucun HTML source brut publié en Git, aucune source HTTP, DB, cron live, merge ou déploiement. Reste nécessaire un élément d'adresse ou coordonnées réellement indépendant avant tout changement du gate J3 ou J6.


## J3 — Audit complémentaire des cinq HTML originaux, 13 novembre 2026 (source-only)

- Bundle privé hors Git : **199159 octets**, SHA256 externe a1fb0a2ccf59fc57955abf15b4a4e4986e44bd7e534aeddd1d256dd45b37f037, CRC ZIP PASS ; **5/5 source.html recalculés et conformes au SHA de leur manifeste**. Aucun nouveau GET.
- **5/5 annonces** présentent des attributs data-lat et data-lng dont le contenu est encodé sous la signature OpenSSL Salted__. Ce sont des données **chiffrées, pas des coordonnées vérifiables** ; ne pas les déchiffrer ni les interpréter comme une attestation de géolocalisation du bien. Le marqueur existant eligible_for_geo_index=false reste obligatoire.
- **#387448** : titre HTML « Appartement de **4** chambres », mais caractéristiques « **3** Chambres simples » et section centrale « 3 Ch ». Contradiction interne de nombre de chambres **1/5**, pas un défaut de déchiffrement. Aucun comptage indépendant de pièces réel.
- **Précision importante sur les quartiers :** une divergence de libellés ne démontre pas nécessairement deux lieux incompatibles. La [Commune de Salé](https://fr.villedesale.ma/arrondissements/arrondissement-tabriquet/) confirme que **Al Qods est un quartier de l'arrondissement Tabriquet** : #444291 peut simplement mélanger quartier et arrondissement. En revanche, la [Commune de Salé](https://fr.villedesale.ma/zones-industrielles/) distingue « Zone industrielle de Hay Rahma » et « Zone industrielle de Tabriquet » ; #387448 nécessite un examen. Pour #500006, correspondance hiérarchique Assonboula / Bab Lamrissa **non certifiée** au niveau du bien. Ces éléments vérifient la topologie administrative générale, **jamais la localisation physique des 5 appartements**.
- Correction de lecture, sans relâcher le garde-fou : « source_internal_conflict » est un statut de **désaccord de libellés de source** conservateur, pas une preuve que deux zones sont géographiquement exclusives. Les trois fiches restent à examiner ; deux autres ne disposent d'aucune géolocalisation indépendante. **0/5 index géographique, 0 staging, 0 admission.**
- Nouveau code hors ligne sur cette PR : j3_source_internal_consistency.py, avec tests test_v7_j3_consistency.py, plus rejeu des cinq véritables ZIP depuis le workflow J3 existant. L'auditeur exige les SHA/manifestes lors du rejeu CI, détecte une contradiction de chambres et qualifie les valeurs de carte comme chiffrées/non attestées ; aucune voie de promotion ou déchiffrement. **Preuve locale : 6/6 tests synthétiques PASS, 5/5 SHA de HTML conformes, 1/5 discordance chambres et 5/5 coordonnées chiffrées observées.** Le résultat GitHub Actions à HEAD exact doit être vérifié séparément après le code SHA 03073c805723bbc60d32eb3920a25589079e47a4.
- Gate toujours ouvert : obtenir une **attestation propre au bien** venant d'une source indépendante ; ne pas remplacer par l'existence administrative d'un quartier ou une reprise textuelle multi-portail. Production, import, cron live, merge et Vercel : aucun.


## Clôture technique du nouveau contrôle de cohérence (13/11/2026)

**Code exact :** bb842259bcfd7d37ddf3e20bcbac75f8d947edee. Le premier rejeu #43454446109 était FAILED après 6/6 tests unitaires verts : inadéquation de contrat entre verify_evidence.raw_html (texte UTF-8 validé) et l'auditeur (bytes bornés). Correction de l'appel après vérification d'intégrité par réencodage UTF-8, aucune modification de captures ni retrait des garde-fous.

**CI corrigée :** [rejeu cinq originaux #43454800957](https://github.com/hraaaaf/Akarfinder/actions/runs/43454800957) COMPLETED SUCCESS. Le log vérifie **6/6 tests unitaires PASS**, les 5 archives anciennes, 1/5 conflit chambres (#387448), 5/5 paires de coordonnées chiffrées, **0 localisation indépendante, 0 staging, 0 HTTP de source, 0 DB**. Les six workflows du code SHA sont SUCCESS : J3 replay #43454800957, J3 corpus #43454800706, J1 replay #43454800722, V7 #43454800789, CI policy #43454800591 et J3 one-shot #43454800884. **Important :** le one-shot SUCCESS a des étapes de GET/artifact SKIPPED, aucune capture nouvelle ; la seule preuve de vrai HTML reste le corpus privé original.

**Clôture limitée :** sous-lot technique « cohérence chambre et provenance de carte sur 5 originaux » certifié ; **J3 métier demeure OUVERT** avec 0/5 geo-index. Aucune autorisation de merge/staging/cron/Vercel. Prochaine preuve : attestation indépendante au niveau du bien, pas seulement concordance administrative.

### 14/11/2026 — Contrôle croisé hors ligne des 5 archives privées Agenz

Contrôle indépendant en lecture seule par `v7_private_archive_preflight.py` (nouvelle [PR Draft J1 #1213](https://github.com/hraaaaf/Akarfinder/pull/1213), encore non mergée) sur l'archive Library privée `AKARFINDER_V7_J3_AGENZ_ARCHIVES_PRIVEES_2026-11-13.zip`. SHA256 du ZIP original `a1fb0a2ccf59fc57955abf15b4a4e4986e44bd7e534aeddd1d256dd45b37f037`. **5/5 ZIP internes, manifestes HTTP200, SHA256 des HTML et IDs distincts PASS** : #387448 (186116 octets), #420510 (216245), #444291/J1 (237450), #445495 (248662), #500006 (271176). Aucun contenu HTML injecté dans Git. La géographie demeure **0/5 attestée**, coordonnées chiffrées non exploitées ; **0 staging / 0 DB / 0 requête source**. Cela confirme l'intégrité et pas une indépendance géographique ni la fraîcheur actuelle. **NEXT :** pièces d'identité géographique de chaque bien, par source réellement indépendante ; ne pas supprimer les avis de contradiction internes.

## 14/11/2026 — J3 : replay privé des cinq HTML depuis archive originale (CI synthétique distincte)

**GOAL :** ne plus dépendre exclusivement de cinq artifacts GitHub dont la rétention est éphémère pour rendre le rejeu Agenz original reproductible. Ne rien publier des HTML, et ne jamais dégrader les required checks existants.

**CAUSE CI CONFIRMÉE** : [run J3 #43578584200](https://github.com/hraaaaf/Akarfinder/actions/runs/43578584200) échoue en étape `actions/download-artifact@v4` : `Artifact not found for name: akar-v7-j1-agenz-source-private` du run `43330609367`. Aucun rejeu des cinq pages n'a commencé. La copie privée des cinq HTML est conservée dans Library et ses SHA sont intègres.

**CODE** : `scripts/acquisition/v7_parallel/j3_private_original_replay.py` : exige le ZIP privé `AKARFINDER_V7_J3_AGENZ_ARCHIVES_PRIVEES_2026-11-13.zip`, un SHA256 du ZIP **indépendant de l'archive**, les cinq IDs exacts 444291/445495/420510/387448/500006, contrôle ZIP CRC/fichiers bornés, extrait temporairement les `source.html` et manifestes en dehors de Git. Le CLI appelle le **vrai** `j3_agenz_corpus.assess_corpus` (comparaison L4/V3 des cinq originaux) puis `j3_source_internal_consistency.audit_verified_snapshot`. Il refuse tout désaccord L4/V3 sur ville/quartier/surface totale, exige le conflit 4 chambres vs 3 dans la fiche #387448, refuse de prendre les coordonnées chiffrées comme preuve de localisation indépendante, retourne seulement des métadonnées/hash, **0 staging/DB/GET source**.

**TESTS** : `test_v7_j3_private_original_replay.py` : 7 scénarios synthétiques (5 IDs, champs divergents, quartier faux, conflit chambres dissimulé, pin ZIP invalide, archive hostile). Ils sont ajoutés à la CI corpus hors réseau `.github/workflows/akar-v7-j3-corpus.yml`; cet ajout ne convertit PAS le replay réel en synthétique. Code HEAD `680ef00367b8a0c8bd2bf5a57e9d071529ef2ad4`, [CI J3 corpus #43583537139](https://github.com/hraaaaf/Akarfinder/actions/runs/43583537139) initialement IN_PROGRESS ; [CI réel #43583537152](https://github.com/hraaaaf/Akarfinder/actions/runs/43583537152) lancé, mais sans preuve de disponibilité des artefacts privés. Ne pas déclarer les tests verts avant leur conclusion exacte.

**Commande sur un poste autorisé disposant du checkout et du ZIP privé** :

```bash
PYTHONPATH=scripts/acquisition python -m v7_parallel.j3_private_original_replay \
  --j3 "/chemin/prive/AKARFINDER_V7_J3_AGENZ_ARCHIVES_PRIVEES_2026-11-13.zip" \
  --operator-pin "a1fb0a2ccf59fc57955abf15b4a4e4986e44bd7e534aeddd1d256dd45b37f037"
```

**SUCCESS métier non démontré :** ni localisation de bien indépendante, ni fraîcheur réelle, ni admission ; 0/5 logements qualifiés géographiquement. Réel replay au nouveau HEAD doit être exécuté dans un environnement autorisé ayant le ZIP ; requiert l'accès opérateur à une archive privée durable. Aucun merge/staging, DB, cron, Vercel.
