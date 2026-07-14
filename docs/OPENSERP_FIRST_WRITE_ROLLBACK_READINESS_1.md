# OpenSERP First Write Rollback Readiness 1

## Verdict

`GO_FOR_OPENSERP_FIRST_WRITE_EXECUTE_1`

Le first write est autorisable dans une mission separee, plafonnee et
immediatement precedee des controles live prevus. Cette mission n a execute
aucune ecriture Supabase production.

## Environnement isole

- Moteur: PostgreSQL 18.2.
- Cible: `127.0.0.1:55432/akarfinder_openserp_rollback_rehearsal`.
- Preuve de non-production: cluster temporaire local, port non production et
  role local `rehearsal_admin`.
- Schema: `property_listings`, `listing_sources`, FK parent-source, unicites
  de fingerprint et URL, plus les index requis par le writer.
- Etat synthetique avant ecriture: 139 listings et 144 sources.

## Corpus et garde-fous

- Run: `openserp-first-write-2026-07-13-01`.
- Source: `pilot-openserp-quality-remediation-2`.
- Manifeste verrouille:
  `cf03e16422e91fcb29d1f518fdc5ffd2dec1bb45b4b97155758ef16471f602f8`.
- Selection source: 180 candidats; ecriture sure: 177 candidats.
- Trois candidats sont `skip` car leur `price_mad` est hors plage PostgreSQL
  `INTEGER`. Le guard refuse aussi une surface negative, non entiere ou hors
  plage, sans tronquer les donnees ni changer le corpus source.

## Preuve de rollback

- Premier write isole: 177 listings et 177 sources, 0 echec.
- Integrite post-write: 0 source orpheline et 0 fingerprint duplique.
- Rollback cible par IDs: comptes et checksum pre-write restaures.
- Second write: 0 nouveau listing, 0 nouvelle source, IDs et cles stables.
- Rollback final: checksum initial restaure.

Artefacts:

- `data/audits/openserp-first-write-pre-write-snapshot.json`
- `data/audits/openserp-first-write-write-manifest.json`
- `data/audits/openserp-first-write-rollback-manifest.json`
- `data/audits/openserp-first-write-rollback-rehearsal-result.json`

## Procedure du futur write

1. Relever le schema et les comptages Supabase en lecture seule.
2. Rejouer la recherche de collisions sur les 177 candidats writeable.
3. Creer les snapshots et manifests de run avant toute ecriture.
4. Executer une seule fois le writer avec les plafonds 200 listings et 220
   sources.
5. Executer le dry-run d idempotence et les controles relationnels.
6. Garder le flag Production desactive; la validation d affichage reste une
   preview distincte.

## Procedure de rollback production

1. Arreter le run apres la premiere erreur de lot.
2. Utiliser exclusivement le rollback manifest du run cible.
3. Restaurer les sources modifiees, supprimer les nouvelles sources,
   restaurer les listings modifies puis supprimer les nouveaux listings.
4. Verifier comptes, FK, absence de doublon et checksum des snapshots cibles.
5. Ne jamais supprimer par `source_host` seul.

## Limites

La repetition isolee ne remplace pas la verification live du schema de
production juste avant le write. La mission suivante reste responsable de
l ecriture reelle, de la preview et du maintien du flag Production a `false`.
