# AkarFinder — Session courante (réconciliation 2026-10-30)

**Source opérationnelle** : `docs/AKARFINDER_RECONCILIATION_2026-10-30.md`, branch `docs/reconcile-pr-product-canonicals-20261030`.  
**Main observé avant cette branche** : `c02d0b73ed18b0e136d478fab39e71df425173a7` (merge #1129).  
**État** : chantier de rationalisation en cours ; aucune revue CI/UI ni merge produit certifié par ce lot.

## GOAL / SUCCESS / PROOF
- Goal : réduire les branches concurrentes, actualiser la boussole produit et préparer un seul delta certifiable par domaine.
- Success : tri motivé de toutes les PR, métadonnées et décisions documentées, dérives GitHub/Notion corrigées, fermeture sans perte de preuves.
- Proof : GitHub 50 PR ouvertes initiales ; #1032 et #1097 fermées sans merge ; 48 PR ouvertes après ces deux actions. Docs de branche de revue ; Notion Command Center actualisé.

## Décisions de reprise (remplacent le « Q1A commence maintenant » de 2026-09-06)
1. **Acquisition/licences** : Mubawab en offline DRAFT #1134, issue #1135 bloquante pour nouveau live. Ne jamais considérer robots/indexation comme licence. Auditer #997/#1028/#1105 avant fermeture ou portage.
2. **Données** : `253 372` = historique L0/L1, pas 200k biens actifs. Contrats sémantiques #1104 à préserver ; droits et fraîcheur séparés.
3. **Base de données** : ne pas inférer le provider LIVE de `lib/db/provider.ts` seul. #1082/#1087/#1101 exigent une décision d'architecture + preuve indépendante.
4. **Carte** : réconcilier #1090 parent / #1108 flat / #1112 canary / #1111 source avant toute intégration. Capture TARGET vs AFTER 390/430/768/1280 obligatoire.
5. **Search** : #1035 ancien P3 candidat, #1102 harmonisation, #1029/#622 index sources, #936 trust ; un seul lot Search sur current main.
6. **CI/PR** : #1133 sécurité privilégie main-only sur jobs à secrets ; #1132 closeout ; aucun merge sans gate humain, aucun Vercel sans autorisation explicite.

## Exécution en cours
- [x] Inventaire initial des PR ouvertes / architecture des routes / canonical docs relus.
- [x] Fermeture documentée des PR non fusionnables #1032 et #1097.
- [x] Nouvelle source de décisions d'audit créée dans branche de revue.
- [ ] Audit ciblé des diffs et dépendances #997/#1028/#1105/#991/#1087.
- [ ] Redéfinition des PR produit finales par domaine + preuves CI/visuelles actuelles.
- [ ] Revue humaine de toute intégration et vérification post-merge.

**Next exact** : lire `docs/AKARFINDER_RECONCILIATION_2026-10-30.md`, vérifier GitHub main/HEAD/open PR count, puis qualifier les chevauchements et droits des collecteurs. Ne pas relancer un crawl live.

**Invariants** : pas de fabrication de chiffres, de lieux précis, de prix, de photos ; pas de DB writes ; pas de Vercel ; pas de merge automatique.
