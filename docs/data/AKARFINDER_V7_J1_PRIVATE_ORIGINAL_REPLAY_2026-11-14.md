# Akarfinder V7 — J1, replay original privé hors artefact GitHub expirant — 2026-11-14

## GOAL
Restaurer un chemin de vérification J1 sur l'HTML immuable réellement conservé, sans rendre publiques les archives et sans contourner le required check existant de la PR mère.

## SUCCESS démontré — périmètre tests synthétiques uniquement
- PR Draft [#1213](https://github.com/hraaaaf/Akarfinder/pull/1213), branche `feat/akar-v7-j1-private-preflight-20261114` empilée sur la PR mère #1204.
- Nouveau `scripts/acquisition/v7_parallel/j1_private_original_replay.py` : exécutable manuel non-réseau, utilise les **vraies fonctions** `snapshot_evidence.verify_evidence`, `offline_benchmark`, `akarparser_v3_raw_bulk.parse_raw`. Pin ZIP indépendant obligatoire + source.html SHA256 et 237450 octets, URL/ID `444291`, résultats L4/V3 prix 980000 MAD, surface 104m2, Salé/Al Qods, appartement à vendre ; exige explicitement le rejet d'admission lié au conflit de quartier. Résultat JSON métadonnées uniquement, sans HTML ni secret.
- Code original J1 attaché **à aucun fichier GitHub** ; `replay_j1_private_original` n'est pas appelé en CI publique sans ZIP d'origine.
- Nouveau `test_v7_j1_private_original_replay.py` : **6 tests synthétiques** (valeurs de référence, prix différent, revue quartier absente, admission incorrectement autorisée, source privée manquante, pin externe faux).
- Contrat préflight existant : **10 tests** (ZIP borné, SHA, homogénéité source, pin opérateur externe, refus des faux fichiers).
- [CI synthétique #43583081887](https://github.com/hraaaaf/Akarfinder/actions/runs/43583081887) **COMPLETED SUCCESS**, [CI Policy #43583081883](https://github.com/hraaaaf/Akarfinder/actions/runs/43583081883) **COMPLETED SUCCESS**, HEAD de code et workflow `40eef9a633e29385df3873dbd1c60d7d462bbf4f`. Cette CI ne possède pas le vrai HTML J1. **Ne jamais la présenter comme validation du replay original au nouveau HEAD.**

## Source privée attestée par intégrité (pas par disponibilité commerciale)
- Library `/AkarFinder/V7/private/AKARFINDER_V7_J3_AGENZ_ARCHIVES_PRIVEES_2026-11-13.zip` (hors Git), ZIP SHA256 **a1fb0a2ccf59fc57955abf15b4a4e4986e44bd7e534aeddd1d256dd45b37f037** ;
- nested `original_artifacts/agenz-444291.zip`, original `source.html` 237450 bytes SHA256 **788355d9050f4b3ee6061c51ebf259c89acff19bb583a03a895ab8889ece6d61**, manifeste et CRC contrôlés ;
- 5/5 HTML Agenz et manifestes validés par le préflight hors réseau, **aucune localisation indépendante, 0 staging**.

## Exécution contrôlée sur un poste disposant du checkout exact et du ZIP privé
Le contrôleur humain fournit **le chemin du ZIP déjà provisionné en privé** et **le SHA du ZIP reçu par un canal opérateur indépendant**. Les commandes ne prennent jamais de clé privée, ne téléchargent rien depuis Agenz et n'écrivent aucune DB :

```bash
PYTHONPATH=scripts/acquisition python -m v7_parallel.j1_private_original_replay \
  --j3 "/chemin/prive/AKARFINDER_V7_J3_AGENZ_ARCHIVES_PRIVEES_2026-11-13.zip" \
  --operator-pin "a1fb0a2ccf59fc57955abf15b4a4e4986e44bd7e534aeddd1d256dd45b37f037"
```

La preuve demandée est le retour code 0, une sortie JSON ne contenant que hashes/valeurs non sensibles, et la version exacte de code. En cas d'absence d'archive, pin divergent, HTML modifié, prix/zone ou qualité divergents : FAIL fermé. Aucun appel réseau source prévu dans le code (hors installation Python préalable sur poste préparé).

## Blocage CI mère et J3, preuves exactes
- [PR mère #1204, J1 #43580181146](https://github.com/hraaaaf/Akarfinder/actions/runs/43580181146) FAILURE : `actions/download-artifact@v4` introuvable pour `akar-v7-j1-agenz-source-private` du run #43330609367 ; le replay **n'a pas été exécuté**.
- [PR J3 #1206, replay 5 snapshots #43578584200](https://github.com/hraaaaf/Akarfinder/actions/runs/43578584200) FAILURE au même `Download artifact`, aucune erreur L4/V3 démontrée.
- Le corpus privé **existe encore dans Library**, mais **aucun mécanisme d'injection sûr vers GitHub-hosted runners n'est configuré**. Ne pas réparer un required check en le supprimant, en le marquant skipped/success, en enregistrant les HTML dans Git public ni en faisant croire qu'un test synthétique vaut le replay original.

## NEXT EXACT / gate
1. Exécuter le CLI sur checkout autorisé ayant accès à la Library privée, conserver le JSON et son SHA comme preuve d'exécution réelle ; sinon indiquer blocage d'accès.
2. Avec accord opérateur sur stockage et identités, établir source durable, privée et auditée accessible aux runners autorisés (ou contrôle privé externe attesté explicitement accepté comme gate), rétention/versioning/rotation, aucune exposition HTML/log/artefact public.
3. Réécrire ensuite les workflows J1 et J3 **pour consommer cette source contrôlée** ; refaire leurs véritables assertions L4/V3 et 5/5 HTML ; seulement ensuite certifier CI mère.
4. Après preuve au HEAD exact, closeout canonique, revue PR et intégration sous gates de merge/Vercel distincts.

## État
Sous-lot J1 reproductibilité de CLI préparé et testé synthétiquement ; **vrai replay original au HEAD actuel NON CERTIFIÉ**. J1 historique fermé selon roadmap V7 mais preuve CI actuelle en échec. J3/J4/J5/J6/J7 métier encore ouverts ; V7 **2/8 jalons métier**, aucun merge, migration DB réelle, cron live, source GET ou Vercel.
