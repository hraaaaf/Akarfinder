# AkarFinder — Session courante

**Mise à jour : 2026-09-05**

> `docs/ROADMAP.md` est l’unique vérité canonique globale. Ce fichier est uniquement un handover opérationnel court.

## Chantier actif — MARKET COVERAGE / M200K

### North Star

- stretch : **>=250 000 candidates L0/L1** ;
- goal : **>=200 000 candidates exploitables** ;
- bruit accepté en discovery ;
- `candidate != active` et `candidate != property unique` ;
- provenance conservée, déduplication tardive et non destructive.

## Baseline certifiée actuelle — Avito indirect

**19 739 IDs candidats uniques**.

Dernier closeout : AlerteImmo full sitemap 24 shards.
- run `33971383335` SUCCESS ;
- artifact `9971118875` ;
- digest `sha256:8db625a5217b4032af9b5a9202e74603c3b6c2d5f4f4f612eb3fa56b79455393` ;
- 14 540 IDs AlerteImmo ;
- overlap baseline 10 976 : 5 777 ;
- net-new : **8 763** ;
- union : **19 739** ;
- sitemap : 4 434/4 434 routes ;
- 24/24 shards complets ;
- 0 erreur ;
- 0 requête directe Avito ;
- aucun contenu Avito fetché.

## Probe multi-sites

Run `33971441131` SUCCESS ; artifact `9971074508`.

**Racine publique autorisée :** Akaar, Domio, MarocAnnonces, ImmoDirect, MAnonce.

**HOLD crawl direct racine :** Sarout, MarocImmo, Sekna (`root_allowed=false`). Chercher seulement une route explicitement autorisée ou une surface tierce.

## Next exact

1. **Mubawab inventory & reconciliation** des artifacts existants ; ne publier aucun exact avant preuve.
2. **Akaar sitemap expansion**.
3. **Domio sitemap expansion**.
4. **MarocAnnonces pagination expansion**.
5. **ImmoDirect sitemap expansion**.
6. MAnonce, Agenz, Yakeey, autres surfaces publiques autorisées.
7. Common Crawl multi-collection / search indexes / archives pour augmenter le lac de discovery.
8. Candidate Lake unifié : provenance, exact dedupe, layer, freshness, `property_cluster_id`.

## Jalons

- M10K ✅
- M20K : **19 739 / 20 000**
- M25K NEXT
- M50K
- M100K
- M200K NORTH STAR
- M250K+ STRETCH

## Invariants

- respect robots / contraintes publiques ;
- aucun bypass login/CAPTCHA/paywall/anti-bot/API privée ;
- 0 direct Avito dans les lanes indirectes ;
- pas de métrique “biens uniques” sans preuve dédiée ;
- aucune écriture Supabase/prod sans gate humain explicite ;
- aucun Vercel sans autorisation explicite ;
- CI pending n’arrête pas les travaux indépendants.
