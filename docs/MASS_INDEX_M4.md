# DATA MASS-INDEX — M4 National MASS ingest

**Issue : #854**  
**Lot : M4**  
**Statut : ✅ CLOSED**

## Goal
Matérialiser nationalement les fiches réellement validées des 7 sources M3 positives dans `source_offer_seeds`, en net-new seulement, sans écraser l’existant et sans activer Search.

## Représentation persistée
M4 persiste uniquement :
- URL canonique ;
- domaine source ;
- provenance/provider + fenêtre d’observation technique ;
- `metadata: null` ;
- `freshness_status: seed_only`.

Aucun texte long, photo, snippet ou contenu éditorial source n’est recopié par défaut.

## Wave 1
- marocannonces.com
- domio.ma
- sakane.ma
- 1000-annonces.com
- housing.place
- expat.com
- milkiya.ma

## M4-A — plan read-only ✅
- 3 447 candidats canoniques ;
- 1 605 acceptés M1 ;
- 967 détails structurels M3 ;
- 2 URLs rejetées sécurité ;
- **965 URLs valides** ;
- 0 write DB ; 0 source fetch ; 0 activation publique.

Preuve : run `32609000430` SUCCESS ; artifact `9484969203`.

## M4-B — canary ✅
- run `32609756948` SUCCESS ;
- 10 inserts ;
- `source_offer_seeds` : 56 871 -> 56 881 ;
- Thin Index : 56 866 -> 56 866 ;
- 10/10 `metadata:null` + `seed_only` ;
- Search OFF ;
- PR #869 merge `ad43aadcd0c3be44c5fc67fca0fab4032fda8b98`.

## M4-C — batches ✅
Write certifié :
- run `32610430027` SUCCESS ;
- batch max 100 ;
- 10 batches ;
- **955 inserts + 10 préservés = 965/965** ;
- `source_offer_seeds` : **56 881 -> 57 836** ;
- Thin Index : **56 866 -> 56 866** ;
- inserted providers : OpenSERP 834, Serper MASS 121 ;
- aucun provider relabel ;
- aucune mutation de seed existant ;
- aucun document Thin Index créé pour ces seeds ;
- aucune activation Search ;
- rollback compensatoire complet disponible sur anomalie.

Certification terminale idempotente :
- HEAD `12bff5fafd29eec8fee0059975fcef6629e3d187` ;
- run `32610621902` SUCCESS ;
- **0 insert + 965 préservés** ;
- `source_offer_seeds` : 57 836 -> 57 836 ;
- Thin Index : 56 866 -> 56 866 ;
- artifact `9485403997` ;
- digest `sha256:e64364b4ada0bb2545e4aa722834e72c575affc56b689d31f4beffff70f3f7af` ;
- PR #871 merge `206672c8a24b7aa95271f2f7d32dbc733dba08b5`.

## Conclusion
M4 est CLOSED : la cohorte nationale Wave 1 certifiée est entièrement matérialisée comme index externe minimal, sans fuite vers Thin Index/Search.

Le Thin Index `+0` est le comportement attendu par le contrat M3 corrigé : M4 ne fabrique pas de metadata riche uniquement pour forcer une projection Search.

## Invariants validés
- aucun bypass login/CAPTCHA/anti-bot/paywall ;
- aucune donnée riche source réutilisée implicitement ;
- aucun écrasement de seed existant ;
- aucun provider relabel ;
- aucune métrique de propriétés uniques avant M5 ;
- aucun déploiement Vercel.

## Next
M5 — audit et durcissement dédup + fraîcheur.
