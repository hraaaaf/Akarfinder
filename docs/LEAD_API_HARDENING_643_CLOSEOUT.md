# Lead API Hardening #643 — Closeout

## Statut

**#643 ✅ CLOSED (code + CI + optimisation DB production).**

Issue: `Lead API: harden server-side phone validation and abuse controls`.

## Livraison

- PR fonctionnelle **#660** mergée sur `main`.
- Merge : `4eac716b8fb25ed1578addb366f132078596c545`.
- Exact head certifié : `c524e65f8f26f693e7cde08d33ead4cf52de15b2`.
- Issue **#643** fermée avec raison `completed`.
- Closeout documentaire **#662** mergé : `49c185543c320c1b4d03c04300f1c14038b54817`.

## Contrat téléphone

- validation centralisée dans `lib/leads/validate.ts` ;
- `+` international optionnel ;
- **8 à 15 chiffres** après normalisation ;
- espaces, tirets, parenthèses et points tolérés comme séparateurs ;
- lettres, slashs et `+` mal placé rejetés ;
- client Pro et serveur utilisent le même validateur.

## Anti-abus

- garde persistant avant insert sur `/api/leads` ;
- seuil : **3 soumissions par numéro normalisé sur 10 minutes** ;
- dépassement : HTTP **429** + `Retry-After: 600` ;
- contrôle impossible : **503 fail-closed** ;
- aucune IP ni nouvelle PII ajoutée ; la garde réutilise `buyer_leads.phone_whatsapp` ;
- client Supabase serveur utilise `SUPABASE_SERVICE_ROLE_KEY`, donc le comptage n’est pas neutralisé par RLS.

## Performance DB production

Index composite appliqué sur Supabase production `AqarFinder` (`kusfiyimwvxblvsrhaes`) via migration :

`20260815173028 add_buyer_leads_phone_created_at_idx`

DDL appliqué :

`buyer_leads_phone_created_at_idx (phone_whatsapp, created_at DESC)`

Vérifications post-migration :

- `pg_indexes` retourne bien `buyer_leads_phone_created_at_idx` ;
- définition vérifiée : B-tree `(phone_whatsapp, created_at DESC)` ;
- le planner peut utiliser cet index pour la requête `phone_whatsapp + created_at >= cutoff` ; sur la table actuelle minuscule, PostgreSQL choisit naturellement un seq scan par coût, ce qui est attendu ;
- migration présente dans l’historique Supabase ;
- table `buyer_leads` observée à **1 ligne**, table **8 KB**, relation totale **296 KB** au moment de l’activation.

## Certification exacte

Run dédié **Lead API Hardening Gate #2 — `31898115021` : SUCCESS**.

- tests `lead-api-hardening.test.ts` + `p11d-leads.test.ts` : SUCCESS ;
- TypeScript : SUCCESS ;
- production build : SUCCESS.

Gates complémentaires observés SUCCESS sur le même head :

- Phase 1 P1 B2B Productization `31898115017` ;
- Phase 1 P0 Closure `31898114987` ;
- Phase 1 P1 Final Sweep `31898114999` ;
- Phase 1 P2 Residual Closure `31898114993` ;
- UX Gate 0 Contracts `31898115039` ;
- Phase 1 P1 Seller Structured Draft `31898115033` ;
- UX P2 Seller Secure Publish Flow `31898115038`.

Le premier passage B2B avait échoué uniquement parce qu’un contrat de test exigeait encore l’ancienne implémentation locale `phoneDigits.length >= 8 && <= 15`. Ce test a été migré vers le validateur partagé `isValidPhone`; le replay B2B est ensuite passé avec contrats + TypeScript + build SUCCESS.

## Invariants préservés

- endpoint partagé buyer / seller / credit / professional conservé ;
- rollbacks seller et activation Pro conservés ;
- aucune dépendance externe de rate-limiting ajoutée ;
- aucune promesse commerciale, badge ou statut partenaire modifié ;
- aucune nouvelle donnée personnelle stockée.

## Advisors post-DDL

Aucun finding advisor n’est attribué à la création de cet index.

Dettes existantes observées, hors scope #643 :
- plusieurs index dupliqués historiques sur `buyer_leads` ;
- advisor sécurité `RLS enabled, no policy` sur `buyer_leads`, cohérent avec un accès réservé au client serveur service-role actuel, à auditer séparément avant toute exposition publique différente ;
- autres warnings globaux Supabase préexistants hors scope.

## Dette restante #643

**Aucune.** Le code, les tests, le build, le merge, le closeout et l’optimisation DB production sont vérifiés.