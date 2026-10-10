# AkarFinder — Certification Active / Fraîche / Unique SHADOW V1

Source: ledger neuf inputs GitHub CI 38069957917; 9 745 IDs par portail, 7 610 cartes à cinq champs, 0 activité certifiée.

Un logement est prêt publication UNIQUEMENT après cinq preuves distinctes: carte cohérente sans conflit; détail à identité et prix/surface correspondants avec date de publication attestée <=30j; confirmation disponibilité par propriétaire ou agent mandaté vérifié <=7j; revue humaine de l'unicité physique avec comparaison; droits de réutilisation explicitement autorisés. Ni HTTP200, ni date récente ni même signature de quartier/prix/surface ne valident l'activité ou l'unicité. Les lignes douteuses ne sont pas fusionnées.

Workflow read-only produit un échantillon de 60 IDs (30 Mubawab, 30 Domio, signatures suspectes prioritaires). Tests positifs et négatifs des cinq gates. **Aucun résultat positif pour l'instant**, faute de preuves externes indépendantes. Aucune DB, Vercel ou fusion. Prochaine action : audit humain des 60 dossiers, preuve indépendante et estimation des taux nets fiables.


## Correction du biais d'échantillonnage — 10 octobre 2026

Le premier run CI 38070451726 ✅, artifact 11676178521, a révélé **60/60 candidats de signatures dupliquées**. Ce pool est utile pour contrôler les doublons mais biaisé pour mesurer l'activité. Correctif : **par portail 10 dossiers suspects + 20 contrôles à cinq champs sans signature suspecte** (20 à risque + 40 contrôles pour 60), tirage déterministe par SHA256 et étiquette explicite `sampling_stratum`. Les taux de chaque strate devront être rapportés séparément; aucune extrapolation d'activité de 60 dossiers biaisés. Conditions de décision humaine sur l'ID de bien et autorisation du titulaire durcies. L'échantillon révisé doit être contrôlé par CI et artifact sur HEAD exact avant utilisation.
