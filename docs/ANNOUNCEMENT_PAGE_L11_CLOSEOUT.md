# ANN-L11 — Pro & conversion closeout

## Verdict

ANN-L11 est fermé sur preuve exact-head. La conversion professionnelle est désormais pilotée par une matrice fail-closed unique, consommée par desktop et mobile, avec identité visuelle alignée sur le design system AkarFinder.

## Preuves exactes

- PR runtime : `#769` ;
- exact head certifié : `a8bf6b300b22e9b425da22ecaba7f1b77cc1aa2a` ;
- merge runtime : `36bc8f086e728179b7c801f7fc54393089a7572f` ;
- workflow dédié : `Announcement Page L11 Pro Conversion` ;
- run : `31983200516` — SUCCESS ;
- contrats CTA et régressions : SUCCESS ;
- TypeScript : SUCCESS ;
- production build : SUCCESS ;
- certification Chromium ciblée : SUCCESS ;
- scénarios : **6/6 captures, 0 finding** ;
- artefact : `9272995434` ;
- digest : `sha256:b8a9947efc62e42cbf46b97a4786d2a0b5f8d31f4d4495a1e388e04ab1ea424c`.

## Contrat livré

- `buildProConversionModel` est l'autorité CTA hors React ;
- contact direct uniquement avec `partner_full`, permission explicite et CTA explicitement autorisé ;
- WhatsApp uniquement avec permission + numéro explicitement fourni ;
- téléphone reste indisponible tant qu'aucun champ public dédié et autorisé n'existe ;
- badge commercial uniquement après autorité partenaire active, source confirmée et validation complète ;
- desktop et mobile consomment la même vérité CTA ;
- source indexée sans contact tombe proprement sur `Voir la source d’origine` ;
- aucune fuite `tel:` ni WhatsApp sur le scénario source-only ;
- Favori, Comparer et Mon Projet restent secondaires face au CTA principal ;
- signalement passe par le canal AkarFinder existant.

## Standard visuel AkarFinder premium

Référentiel verrouillé :

- fond `#F8FAFC` ;
- deep blue `#0B1F3A / #0B2545` ;
- primary `#0B63CE` ;
- surfaces blanches et ombres froides légères ;
- bronze limité aux accents de confiance/badges ;
- vert réservé au canal WhatsApp.

La dernière correction produit impose explicitement le CTA mobile `Visite` en `#0B63CE` et le certifieur contrôle la couleur rendue.

Score final contre le référentiel AkarFinder strict : **9,3/10 mobile** et **9,3/10 desktop**. La réserve restante relève surtout de la longueur intrinsèque de la fiche complète, pas d'un défaut L11 bloquant.

## Incidents de certification résolus

- tests historiques `pb-24` réalignés sur le nouveau dock `pb-40` ;
- microcopy mobile `Mon Projet` synchronisée dans les contrats ;
- motion-reduce restauré ;
- sélecteurs d'audit corrigés ;
- vrai défaut mobile identifié puis corrigé : CTA `Visite` transparent sur 390/430/768 ;
- deux derniers rouges transversaux provenaient d'un fetch externe Google Fonts ; reruns du même exact-head ensuite SUCCESS, sans modification produit.

## Crédit

- poids ANN-L11 : **6 %** ;
- progression précédente : **83 %** ;
- progression après closeout : **89 %** ;
- prochain lot : **ANN-L12 — Mon Projet personnalisé**.
