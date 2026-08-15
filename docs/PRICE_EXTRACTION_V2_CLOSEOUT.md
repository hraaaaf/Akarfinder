# SEARCH Price Extraction v2 — closeout evidence

Snapshot production vérifié le 2026-08-15.

## Résultat

- Représentations publiques Search : **15 438**.
- Prix sûrs avant Price Extraction v2 : **915 / 15 438 = 5,93 %**.
- Backfill texte strict : **+124** prix sûrs.
- Après backfill texte : **1 039 / 15 438 = 6,73 %**.
- Snapshot production final avant closeout : **1 351 / 15 438 = 8,75 %**.
- Gain total observé vs baseline : **+436 prix sûrs**.
- `15 438` désigne des représentations publiques, pas un nombre garanti de biens uniques.

## DarAgadir

- Prix publics : **319**.
- Prix DarAgadir tous états : **335**, dont **16 non publics**.
- QA publique : min **1 600 DH**, médiane **850 000 DH**, max **31 000 000 DH**.
- **0** prix < 1 000 DH.
- **0** vente < 10 000 DH.
- **0** URL short-stay/journalier avec prix publié.
- **0** suspicion de prix au m² détectée par le contrôle URL ciblé.

Un canary initial avait extrait 11 tarifs de location de vacances. Ils ont été identifiés avant expansion comme des prix à cadence journalière potentiellement trompeurs pour une card affichant seulement `DH`, puis retirés. Une garde DB fail-closed et une exclusion crawler interdisent désormais de remplir `normalized_price_mad` pour ces URLs tant que la cadence n'est pas modélisée explicitement.

## Autres sources

- PromoImmo Marrakech : **30 pages accessibles / 0 prix suffisamment sûr** selon les règles strictes → HOLD.
- Avito : **30/30 HTTP 403** sur le canary → HOLD ; aucun contournement anti-bot, spoofing, login, captcha ou API privée tenté.

## Gardes techniques

- Extraction source-spécifique et URL de fiche uniquement.
- Aucun prix inventé ; champ absent reste absent.
- Exclusion des pages catégorie/recherche.
- Exclusion des prix au m² comme prix total.
- Normalisation correcte des décimales `.00` / `,00`.
- Seuils de plausibilité : vente >= 10 000 DH ; location >= 1 000 DH pour cette lane sans cadence.
- DarAgadir short-stay : fail-closed DB + crawler.
- Fetch public identifiable, timeout, respect robots.txt ; aucun bypass.
- CI de pull request read-only ; toute future écriture détail nécessite un `workflow_dispatch` explicite.

## Artefacts code

- `supabase/migrations/20260814203000_price_extraction_v2_safe_text_backfill.sql`
- `supabase/migrations/20260814205500_guard_daragadir_short_stay_price_without_cadence.sql`
- `scripts/scrapers/price-detail-enrichment-v2.ts`
- `scripts/scrapers/daragadir-long-term-price-enrichment.ts`
- `.github/workflows/price-extraction-v2.yml`
- `.github/workflows/price-detail-enrichment-v2.yml`
- tests dédiés sous `scripts/scrapers/__tests__/`.

## GitHub

- #639 : canary initial, fermé comme superseded.
- #640 : replay intermédiaire, fermé comme superseded après drift de `main`.
- #647 : recertification exact-current-main ; merge requis avant closeout canonique final.

Ce document ne prétend ni une couverture prix complète, ni une autorisation de tiers. La publication des représentations externes reste le choix de risque produit déjà acté, avec provenance et URL source conservées.
