# DATA MASS-INDEX — M4 National MASS ingest

**Issue : #854**  
**Lot : M4**  
**Statut : ACTIVE — dry-run certification before writes**

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
`discovery_candidates -> M1 universal promotion -> M3 source-specific detail guard -> M2 write plan -> canary -> atomic batches -> Thin Index`

Search public reste inchangé jusqu'à M6.

## Certification dry-run
Le workflow M4 doit prouver avant tout write :
- scan limité aux 7 domaines wave 1 ;
- providers uniquement `openserp` / `serper_mass_harvest` ;
- aucune dépendance au legacy `discovery_status` ;
- canonicalisation/dédup M1 ;
- garde détail M3 ;
- lookup collisions contre `source_offer_seeds` ;
- `INSERT_NATIVE` uniquement net-new ;
- seeds existants préservés ;
- plan complet sérialisé dans l'artifact ;
- canary <=10, réparti entre sources quand possible ;
- 0 write DB ; 0 source request ; 0 provider relabel ; 0 activation publique.

## Write gate
Aucun write M4 avant workflow dry-run vert + artifact exploitable.

Après certification :
1. canary <=10 en transaction atomique ;
2. vérifier matérialisation Thin Index ;
3. vérifier provider/canonical/classification ;
4. si anomalie -> transaction rollback ;
5. si vert -> ingestion des net-new en batches SQL atomiques ;
6. chaque batch vérifie son propre nombre de Thin rows avant commit ;
7. bilan DB before/after ;
8. Search reste hors provider M4 jusqu'à M6.

## Baseline avant M4
Capturée le 2026-08-22 avant toute mutation M4 :
- `source_offer_seeds` = 56 871 ;
- `thin_index_search_documents` = 56 867 ;
- `search_public_representations_v2` = 15 339.

Ces compteurs peuvent évoluer à cause d'autres travaux ; les validations M4 utilisent donc aussi les IDs/URLs propres au lot plutôt qu'une égalité globale naïve.

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

## Succès M4
- plan national déterministe certifié ;
- canary réel vert ;
- net-new matérialisés sans collision ;
- Thin Index augmenté du nombre exact d'insertions M4 ;
- aucune activation Search accidentelle ;
- accounting par source/provider ;
- rollback documenté ;
- closeout canonique puis M5.

## Interdits
- aucun bypass CAPTCHA/login/paywall/anti-bot ;
- aucun fetch furtif ;
- aucun contenu riche externe copié implicitement ;
- aucun Vercel sans autorisation explicite.
