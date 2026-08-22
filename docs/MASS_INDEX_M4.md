# DATA MASS-INDEX — M4 National MASS ingest

**Issue : #854**  
**Lot : M4**  
**Statut : ACTIVE — final safety certification before writes**

## Goal
Matérialiser nationalement les fiches détail validées des sources M3 positives dans l'External Index, sans écraser de seed existant et sans activer Search avant M6.

## Wave 1
- marocannonces.com
- domio.ma
- sakane.ma
- 1000-annonces.com
- housing.place
- expat.com
- milkiya.ma

`yakeey.com`, `2p.ma` et `portail-immobilier.ma` restent hors wave 1 faute de rendement positif certifié M3. Ils ne sont pas exclus définitivement.

## Pipeline
`discovery_candidates -> M1 universal promotion -> M3 source-specific detail guard -> external-index safety gate -> M2 write plan -> canary -> atomic batches -> Thin Index`

Search public reste inchangé jusqu'à M6.

## Certification dry-run
Le workflow M4 doit prouver avant tout write :
- scan limité aux 7 domaines wave 1 ;
- providers uniquement `openserp` / `serper_mass_harvest` ;
- aucune dépendance au legacy `discovery_status` ;
- canonicalisation/dédup M1 ;
- garde détail M3 ;
- rejet des URLs canoniques contenant téléphone, email, WhatsApp, secret ou handle social ;
- redaction des contacts dans title/snippet/query ;
- snippet externe borné à 320 caractères ;
- lookup collisions contre `source_offer_seeds` ;
- `INSERT_NATIVE` uniquement net-new ;
- seeds existants préservés ;
- plan complet sérialisé dans l'artifact ;
- canary <=10, réparti entre sources quand possible ;
- 0 write DB ; 0 source request ; 0 provider relabel ; 0 activation publique.

## Pourquoi le safety gate a été ajouté
Le premier artifact M4 certifié (`run 32594775550`, artifact `9481264358`) était correct sur les invariants d'écriture mais contenait encore, dans quelques snippets/URLs de discovery, des coordonnées de contact issues des résultats de recherche et des snippets allant jusqu'à 1 872 caractères. Aucun write M4 n'a été exécuté avec cet artifact. Le plan final doit donc être recertifié après sanitization avant tout canary réel.

## Write gate
Aucun write M4 avant workflow final vert + artifact exploitable et safety-clean.

Après certification :
1. canary <=10 atomique ;
2. vérifier matérialisation Thin Index ;
3. vérifier provider/canonical/classification ;
4. vérifier que les URLs M4 restent absentes de Search public ;
5. si anomalie -> rollback des IDs insérés ;
6. si vert -> ingestion des net-new en batches atomiques bornés ;
7. chaque batch vérifie son propre nombre de Thin rows avant de continuer ;
8. bilan DB before/after ;
9. Search reste hors provider M4 jusqu'à M6.

## Baseline avant M4
Capturée le 2026-08-22 avant toute mutation M4 :
- `source_offer_seeds` = 56 871 ;
- `thin_index_search_documents` = 56 867 ;
- `search_public_representations_v2` varie avec la fraîcheur ; snapshot du premier plan = 15 339, relecture ultérieure = 15 321.

Ces compteurs peuvent évoluer à cause d'autres travaux ; les validations M4 utilisent donc surtout les IDs/URLs propres au lot et une fenêtre before/after immédiate plutôt qu'une égalité globale naïve.

## Potentiel structurel wave 1
Plafond URL detail-like observé avant classification M1 finale :
- marocannonces.com : 473 ;
- sakane.ma : 193 ;
- milkiya.ma : 131 ;
- expat.com : 104 ;
- 1000-annonces.com : 76 ;
- housing.place : 22 ;
- domio.ma : 5.

Total structurel : 1 004 URLs wave 1. Ce nombre n'est ni un nombre de listings M4 validés ni un nombre de propriétés uniques.

## Premier plan certifié — remplacé avant write
Run `32594775550` : SUCCESS. Artifact `9481264358`, digest `sha256:6f34bdd65c9092f515f1dc358257a2d7741f03ce3b6b46192123958d63957b3f`.

Résultat brut avant safety hardening :
- 3 447 canonical candidates ;
- 1 605 M1 accepted ;
- 967 source-specific valid selon l'ancien plan ;
- 967 `INSERT_NATIVE`, 0 preserve ;
- 842 OpenSERP + 125 Serper MASS.

Ce plan n'est **pas** autorisé pour write : le nouveau safety gate doit produire le chiffre final, nécessairement <= 967.

## Succès M4
- plan national déterministe certifié ;
- artifact final sans contact personnel ni snippet long ;
- canary réel vert ;
- net-new matérialisés sans collision ;
- Thin Index augmenté du nombre exact d'insertions M4 matérialisées ;
- aucune activation Search accidentelle ;
- accounting par source/provider ;
- rollback documenté ;
- closeout canonique puis M5.

## Interdits
- aucun bypass CAPTCHA/login/paywall/anti-bot ;
- aucun fetch furtif ;
- aucun contenu riche externe copié implicitement ;
- aucun Vercel sans autorisation explicite.
