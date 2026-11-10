# J18 — Préparation de repères OSM indicatifs (2026-11-10)

## Goal / succès / preuve
Objectif : préparer un **candidat de diffusion** nationale de repères OpenStreetMap/Geofabrik, distinct de la QA privée et du modèle de POI commerciaux « certifiés ». Le présent lot n'active aucun endpoint public.

Succès technique demandé : source PBF épinglée, MD5 et SHA256 **recalculés sur ses octets**, manifest QA et checksums de toutes les tuiles vérifiés, noms/coordonnées/catégories/identifiants et provenance OSM contrôlés, état de non-publication conservé. Ne pas prétendre que la date d'extraction certifie l'activité des établissements.

Module : scripts/neighborhood-context/j18-public-indicative-candidate.mjs.
Tests : scripts/neighborhood-context/fixtures/j18-public-indicative-candidate.test.mjs.

## Flux technique
- Entrées : le pack national J11 « PRIVATE_QA_ONLY » hors dépôt, le **vrai PBF** correspondant, une attestation JSON épinglée avec les clés schema, source, sourceMd5, sourceSha256, pbfReplicationAt (ISO UTC).
- L'attestation a pour schéma AKARFINDER_J18_PBF_SOURCE_EVIDENCE_V1. Sa date de réplication doit être contrôlée indépendamment depuis l'en-tête source ; le module vérifie la validité, l'âge maximum 30 jours et la cohérence des empreintes, **pas la réalité historique de la date déclarée**.
- Sortie dans un nouveau dossier **hors repo** et hors public/, générée de façon atomique : schéma AKARFINDER_J18_INDICATIVE_RELEASE_CANDIDATE_V1, état REVIEW_CANDIDATE_ONLY_NOT_PUBLIC, publicationAuthorized=false, publicEndpointEnabled=false, attribution ODbL et horodatage/expiration explicités.
- Les tuiles candidates ne contiennent que l'ID OSM, le nom, catégorie, coordonnées, lien source et type de point. L'ouverture et l'appartenance au quartier central restent null. Aucune suppression par proximité ; doublons exacts interdits.
- Aucune écriture DB, API de runtime, URL de distribution, variable NEXT_PUBLIC, Vercel, Cloudflare ni publication automatique.

Commande de préparation privée, après disponibilité du PBF et de son manifest :

    node scripts/neighborhood-context/j18-public-indicative-candidate.mjs --pack /hors-depot/pack-j11 --pbf /hors-depot/morocco.osm.pbf --evidence /hors-depot/evidence.json --out /hors-depot/j18-candidate

## Les cinq axes travaillés ensemble
1. **J18 données** : préparation candidate et tests de corruption/TTL/source. Le seed du 16 août reste expiré (il ne faut pas changer sa date). Prochaine étape : exécuter sur le vrai PBF et qualifier un backend de distribution **distinct** ; aucun pack national public aujourd'hui.
2. **Trois modes** : Quartier 2D, Rue, Limites. Le contenu « Limites » reste explicatif : relation OSM de l'arrondissement Maârif non revue, aucun contour inventé pour Maârif central.
3. **UX** : même famille de captures CI 390x844, 430x932, 768x900, 1280x900. Note cible 9,5/10 non certifiée et pas de nouveau changement UI dans ce lot de données.
4. **QA** : anciens rapports J17, axe automatisé et CI verte du HEAD 476b65de ; exigences suivantes : lecteurs d'écran réels, débits mobiles/CDN, distribution des tuiles, 3 villes et 4 viewports.
5. **Closeout** : PR #1197 Draft ; conserver un gate humain pour source, frontière, UX, merge et tout déploiement Vercel.

## Limites et prochain test
- Ce builder produit seulement un **candidat non publié**. Une transition de schéma vers une nouvelle API publique, un hébergeur/stockage et des autorisations de publication devront être conçus/testés séparément.
- Le PC Desktop Commander était inaccessible lors de la préparation ; aucune exécution sur le PBF national réel, aucun benchmark public, aucune preuve de 27 567 points recalculés sur ce HEAD.
- CI Node du HEAD commité à lire ; en cas d'échec, corriger avant J18 closeout. La comparaison visuelle réelle du produit final ne peut être considérée comme achevée à ce stade.

NEXT EXACT : CI de ce lot, rétablir l'agent de machine, exécuter l'export réel et la vérification des manifestes, concevoir un endpoint distinct de lecture publique avec quotas/cache et source pinning, puis tests 3 modes/4 viewports et validation humaine. Ne pas merger ni déployer Vercel.
