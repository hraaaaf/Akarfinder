# Lead API Hardening #643 — Closeout

## Statut

**#643 ✅ CLOSED (code + CI).**

Issue: `Lead API: harden server-side phone validation and abuse controls`.

## Livraison

- PR fonctionnelle **#660** mergée sur `main`.
- Merge : `4eac716b8fb25ed1578addb366f132078596c545`.
- Exact head certifié : `c524e65f8f26f693e7cde08d33ead4cf52de15b2`.
- Issue **#643** fermée avec raison `completed`.

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

## Performance DB

`db/supabase-leads-migration.sql` définit l’index :

`buyer_leads_phone_created_at_idx (phone_whatsapp, created_at DESC)`

Le garde fonctionnel ne dépend pas de la présence de cet index, mais l’index borne efficacement la requête sous charge.

### Vérification production

Contrôle read-only effectué sur le projet Supabase production `AqarFinder` (`kusfiyimwvxblvsrhaes`) via `pg_indexes` : **0 ligne retournée** pour `buyer_leads_phone_created_at_idx`.

**Fait vérifié : l’index n’est pas appliqué actuellement en production.** Le garde anti-abus reste fonctionnel, mais sa requête n’est pas encore optimisée par cet index composite.

L’application de l’index est une mutation DDL production distincte et n’est pas revendiquée comme effectuée dans ce closeout.

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

## Dette restante

**Human gate production :** appliquer l’index composite `buyer_leads_phone_created_at_idx` sur Supabase production, puis revérifier sa présence et les advisors. Cette étape n’est pas requise pour le fonctionnement logique du garde, mais elle est recommandée avant de qualifier la protection comme optimisée sous charge production.
