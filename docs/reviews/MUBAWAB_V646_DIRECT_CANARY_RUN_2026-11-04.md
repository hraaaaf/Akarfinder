# Akarfinder V6.4.6 — lanceur direct des trois canaries (04/11/2026)

## Goal / Succès / Preuve
**Goal :** exécuter le code P1 réel sur les trois premières pages autorisées, en séquence et sans instrumentation intrusive. **Succès :** trois JSON (`parsed_quality_pass`), robots fraîchement vérifiés, HTTP 200, 1 navigation par shard, SHA du code identifié. **Preuve :** `batch-summary.json`, logs et JSON par ville provenant du navigateur réel.

## État actuel vérifié
- Dernier vrai live pré-P1 : [GitHub run #41730963403](https://github.com/hraaaaf/Akarfinder/actions/runs/41730963403), 32/32/33 cartes éligibles. Ce run n'homologue **pas** les correctifs P1.
- Suite offline post-P1 : [run #41747650430](https://github.com/hraaaaf/Akarfinder/actions/runs/41747650430) = SUCCESS, 123 tests (119 réussis, 4 skipped).
- **Tentative de préflight direct dans l'environnement de cette session :** requête unique `GET https://www.mubawab.ma/robots.txt` ; échec **DNS `NameResolutionError`**, **sans réponse HTTP** ni navigation des pages. `git ls-remote https://github.com/hraaaaf/Akarfinder.git` échoue également sur résolution DNS. Le navigateur local Chromium 144 est installé, mais ce conteneur ne dispose pas de l'accès réseau nécessaire. **Ce n'est pas un refus établi de Mubawab**, ni une réponse 403/429. Aucune rotation IP, proxy, stealth ou autre contournement tenté.
- Workflow manuel bloqué : ce connecteur GitHub n'offre pas de `workflow_dispatch`, et le workflow V646 est absent de `main`. Il ne couvre d'ailleurs que Rabat dans son état actuel.

## Action exécutable hors de ce conteneur
Branche isolée : `test/akar-v646-direct-canary-cli-20261104`. Outils :
- `scripts/pilots/mubawab-v646/run_three_canaries.py` : vérifie manifeste exact (Rabat / Casablanca Maârif / Agadir Hay Salam), Git HEAD et suite offline; appelle `live_canary.py` **une fois par ville**, séquentiellement, arrêt dès une sortie non-zéro ou preuve insuffisante. Produit `batch-summary.json`, trois JSON et logs, ou les seuls résultats obtenus jusqu'au premier refus.
- `scripts/pilots/mubawab-v646/tests/test_three_canaries_runner.py` : cinq tests de contrôle synthétiques. Tous les cinq ont réussi localement sans réseau.

Exécution depuis un **checkout du dépôt autorisé**, disposant d'un accès réseau ordinaire :

```bash
git fetch origin test/akar-v646-direct-canary-cli-20261104
git switch test/akar-v646-direct-canary-cli-20261104
python -m pip install beautifulsoup4 playwright
python -m playwright install --with-deps chromium
cd scripts/pilots/mubawab-v646
python run_three_canaries.py --check-only
python run_three_canaries.py --output artifacts/v646-post-p1-first-live
```

La commande `--check-only` ne visite pas Mubawab et ne fait pas de tests offline. La commande normale exécute d'abord toute la suite offline, puis fait **au plus trois navigations**, avec robots vérifié par `live_canary.py` avant chaque navigation. Elle n'ajoute aucune requête HTTP de détail, image ou pagination.

## Limites et stop
- Le code ne contourne ni `robots.txt` ni les refus HTTP 403/429 ; il s'arrête au premier blocage, sans reprise automatique.
- Le `git rev-parse HEAD` est enregistré dans les rapports ; la qualité exacte des données provient du `live_canary.py` du checkout et de ses SHA internes.
- Une navigation pass n'est **pas** une preuve d'exhaustivité nationale, de caractère actif d'une annonce, de droits de réutilisation, d'unicité physique ni de 200 000 annonces.
- Le protocole longitudinal impose toujours ses propres critères statistiques ; une mesure fonctionnelle n'est pas comptée automatiquement comme observation indépendante.
- **No merge / no Vercel / no production DB** sans autorisation explicite. Le lanceur ne modifie ni workflow GitHub Actions ni `main`.

## Next exact
Faire exécuter les deux commandes `run_three_canaries.py` (check-only puis normal) dans un checkout autorisé avec DNS/Chromium fonctionnels. Importer trois JSON et `batch-summary.json`, inspecter les refus, mettre à jour GitHub et Notion, calibrer seulement sur données réellement admissibles. Si le premier robots/HTTP bloque, publier un verdict NO-GO en conservant les preuves et sans retry.
