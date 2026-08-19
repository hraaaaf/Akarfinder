# AkarFinder Experience — N0 Closeout Checklist

Statut : **READY FOR PR**

## Goal

Verrouiller l'audit, la doctrine, le référentiel UX/navigation et la roadmap du nouveau chantier avant toute modification runtime.

## Vérifications

- [x] HEAD de base vérifié : `49b80c4c1deffb1f1999f91412b5092151ac63c5`.
- [x] Baseline Map exact-head récupérée et inspectée.
- [x] Baseline Search post-Lot 11 récupérée et inspectée.
- [x] Baseline Listing desktop/mobile récupérée et inspectée.
- [x] Audit N0 documenté.
- [x] Doctrine `Territoire → Marché → Vie locale → Biens → Décision` documentée.
- [x] États UX Carte/Search/Listing documentés.
- [x] Semantic zoom documenté.
- [x] Précision géographique documentée.
- [x] Standard Listing documenté.
- [x] Navigation Carte ↔ Search ↔ Listing documentée.
- [x] Onboarding cible documenté.
- [x] Wireframes contractuels desktop/mobile documentés.
- [x] Roadmap N0→N9 documentée.
- [x] Dénominateur fixé : 10 lots cœur.
- [x] Aucun runtime modifié.
- [x] Aucun déploiement Vercel.

## Gate de fermeture N0

N0 pourra passer `CLOSED` après :

1. PR mergée sur `main` ;
2. HEAD post-merge vérifié ;
3. documentation canonique de reprise cohérente ;
4. ouverture de N1 sur le HEAD post-merge.

Un mockup haute fidélité est obligatoire avant N3 (premier lot de changement visuel structurel). Les wireframes N0 fixent déjà la hiérarchie et les comportements.
