# J18-G — Générateur différentiel OSM Blob, hors ligne (2026-11-10)

## Goal / Succès / Preuve
**Goal :** éviter de ré-uploader les tuiles OSM inchangées à chaque PBF Geofabrik ; respecter le quota Vercel Hobby sans sacrifier SHA, fraîcheur et sécurité.

**Succès technique :** comparaison entre un ancien manifeste et un nouveau candidat déjà vérifié par le pipeline J18-A. Pour les tuiles identiques, le nouveau manifeste ajoute le champ blobSourceSha256 désignant la source immuable précédente. Pour les tuiles nouvelles/modifiées, un plan produit uniquement les chemins d'objets à créer, avec manifeste content-addressed. Aucun réseau, upload, DB ou activation publique.

**Preuves :** 19/19 contrats Node sous Windows (SHA, TTL, feature ID, claims, budgets, références héritées, suppression sans DELETE, symlinks), et intégration du manifeste généré au lecteur privé J18-F. Simulation nationale QA avec l'ancien dataset de 1 339 tuiles et un **FAUX prochain snapshot** comportant une seule modification : **1 338 références réutilisées, 1 tuile modifiée, 1 manifeste, 2 PUT minimum contre 1 340 sans différentiel**. Calcul du plan ~1 886,5 ms. Aucun vrai nouveau PBF n'existe dans ce test : ni économie future certifiée, ni source réactualisée. Les dossiers de simulation ont été supprimés. Rapport privé :
C:\Users\lenovo\Desktop\AkarFinder-Vivre-Ici-QA-20261110\j18g-national-synthetic-dry-run-report.json

## Fichiers
- Code : scripts/neighborhood-context/j18-differential-plan.mjs
- Contrats : scripts/neighborhood-context/fixtures/j18-differential-plan.test.mjs
- Pipeline CI : .github/workflows/vivre-ici-j11-national-landmarks.yml
- Lecteur compatible avec blobSourceSha256 : scripts/neighborhood-context/j18-private-blob-read-model.mjs
- Aucun PBF, tuile nationale, manifeste national, token ou dossier QA à committer.

## Usage privé, uniquement après réception d'un nouveau PBF réel
D'abord produire et vérifier le **nouveau** candidat avec j18-public-indicative-candidate.mjs (PBF réel, MD5/SHA256 recalculés et horodatage d'en-tête établi indépendamment). Le module J18-G ne vérifie pas de PBF lui-même et ne constitue donc pas une attestation source.

Commande :
    node scripts/neighborhood-context/j18-differential-plan.mjs --previous <ancien-dossier-prive> --current <nouveau-candidat-verifie> --previous-sha <ancien-sha-pbf> --current-sha <nouveau-sha-pbf> --out <nouveau-dossier-prive-hors-depot>

Option --remaining-ops <valeur> seulement lorsque le quota effectivement restant est vérifié. Sinon budgetStatus=UNVERIFIED. Même avec capacité suffisante, un transfert reste soumis à autorisation.

La sortie est un nouveau dossier contenant manifest.json (REVIEW_CANDIDATE_ONLY_NOT_PUBLIC) et upload-plan.json (REVIEW_ONLY_NOT_UPLOADED). Les fichiers de tuiles nouvelles restent dans le dossier du nouveau candidat. Aucune copie automatique des fichiers privés ni SDK de stockage.

## Limites et sécurité
- L'ancienne source peut être expirée UNIQUEMENT en tant que référence à un objet SHA immuable ; la nouvelle source doit être plus récente, non future et non expirée. Une ancienne expiration ne devient pas celle du nouveau snapshot.
- Chaque SHA de tuile du nouveau candidat, schéma, coordonnées et identifiant sont contrôlés ; doublons, claims d'ouverture et appartenance territoriale officielle sont refusés.
- Une tuile supprimée est listée pour revue, jamais supprimée du Blob. Les symlinks de tuiles et chemins de sortie internes au dépôt sont refusés.
- Toute référence réutilisée indique remoteExistenceVerified=false. Une vérification **réelle** des clés existantes dans le stockage privé demeure obligatoire avant autorisation. Les SHA de contenus restent également validés par le reader.
- minimumNewUploads compte seulement les écritures d'objets et de manifeste, **pas** les autres opérations LIST/HEAD/GET ni la consommation réelle du compte Hobby.
- La simulation utilise une date et un SHA de PBF suivants fictifs. **Ne jamais uploader le résultat simulé**, ni présenter son économie comme mesurée sur le prochain vrai snapshot.
- Aucun déploiement Vercel, stockage public, merge GitHub ou modification D1/Supabase.

## Next exact
Vérifier CI du nouveau HEAD et closeout PR/Notion. Puis préparer la conception d'une API publique dédiée aux **repères OSM indicatifs**, avec pointeur de version approuvé, quota distribué, expiration et cache, mais fail-closed jusqu'au gate humain. Restent : essais mobiles 3 villes x 4 viewports, lecteurs d'écran réels, revue UX >=9,5/10 et géométrie Maârif central certifiée.
