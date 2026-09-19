# AkarFinder — District registry reconciliation

Date: 2026-09-19

## Goal

Réconcilier le dictionnaire historique `lib/geo/district-dictionary.ts` avec le registre géographique canonique `lib/geo/geo-entity-registry.ts` sans promouvoir automatiquement des quartiers historiques non revérifiés.

## Inventaire vérifié

- Legacy district dictionary: **65 entrées / 6 villes**.
- Canonical `GEO_NEIGHBORHOODS`: **23 entités**.
- Correspondances sûres déjà présentes dans les deux couches: **18**.
- Entrées legacy non encore canoniques: **47**.
- Entités canoniques absentes du legacy: **5**.
- Union logique actuelle: **70 identités candidates**, avant revue des 47 legacy-only.

### Correspondances sûres

- Rabat (5): Agdal, Hay Riad, Souissi, Hassan, Océan.
- Casablanca (5): Maârif/Maarif, Racine, Bourgogne, Aïn Diab/Ain Diab, Casablanca Finance City/Finance City.
- Marrakech (3): Guéliz, Hivernage, Route de l'Ourika.
- Agadir (2): Founty, Talborjt.
- Tanger (2): Malabata, Marchan/Marshan.
- Fès (1): Ville Nouvelle.

### Canonical-only (5)

- Casablanca: Bouskoura.
- Tanger: Ville Nouvelle.
- Fès: Fès el-Bali.
- Kénitra: Centre-ville.
- Mohammedia: Centre.

## Décision d'architecture

1. `geo-entity-registry.ts` reste l'unique source de vérité d'identité.
2. `district-dictionary.ts` reste temporairement une source legacy de matching; ses 47 entrées non canoniques deviennent un **backlog de vérification**, pas des entités validées.
3. Aucune entrée legacy-only ne reçoit `validation_status="validated"`, `map_eligible=true` ou un landmark tant que son rattachement territorial n'est pas vérifié.
4. Les alias sûrs doivent converger vers les entités canoniques existantes plutôt que créer des doublons.
5. Après revue des 47, le matcher legacy devra consommer le registre canonique + alias validés; le tableau legacy pourra ensuite être supprimé ou généré depuis le canonique.
6. Aucun write Supabase, aucun changement ranking, aucun deploy Vercel.

## Next exact

Créer le backlog ville par ville des 47 legacy-only, avec statut `pending_review`; commencer par les villes/quartiers utiles à Vivre Ici et ne promouvoir qu'après preuve territoriale suffisante. Les ambiguïtés d'axe routier, de secteur informel ou de nom homonyme restent fail-closed.
