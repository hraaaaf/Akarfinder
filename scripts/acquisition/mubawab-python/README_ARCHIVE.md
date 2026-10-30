# Mubawab — import de captures locales (hors réseau)

## Contenu

- `archive_import.py`: importe des pages HTML déjà présentes sur disque.
- `mubawab_full.py`: analyseur HTML et base SQLite servant de dépendance.
- `test_archive_import.py`: 6 tests unitaires synthétiques, sans accès réseau.

## Installation

```bash
python -m pip install requests beautifulsoup4
```

## Utilisation

Placer les pages de résultats `.html` dans `captures/list/` et les pages détaillées dans `captures/details/`. Pour les images **déjà en votre possession**, ranger les fichiers dans `captures/photos/<id_annonce>/<fichier>`. Les pages de détails doivent contenir leur `canonical` ou `og:url` officiel, ou un nom de fichier commençant par un identifiant numérique déjà connu.

```bash
python archive_import.py \
  --list-dir captures/list \
  --detail-dir captures/details \
  --photos-dir captures/photos \
  --db sauvegarde_mubawab.sqlite \
  --out-dir export_mubawab
```

Chaque exécution est reprenable grâce à `archive_files` (empreinte SHA-256 de chaque capture) et les annonces sont dédupliquées par ID. En cas d'erreur, un rapport enregistre le fichier concerné.

## Sorties

- `export_mubawab/listings.jsonl` : annonces structurées, liens et détails importés.
- `export_mubawab/photo_urls.csv` : adresses URL de photos **référencées**, et non images téléchargées.
- `export_mubawab/local_images.csv` : fichiers photos locaux et SHA-256.
- `export_mubawab/provenance.csv` : provenance par annonce et capture.
- `export_mubawab/report.json` : comptages et SHA-256 des exports.

**Important :** cet outil ne lance aucune requête HTTP, ne contourne aucune protection, et ne prétend pas avoir copié tout Mubawab. C'est un processeur d'archives HTML et d'images locales. Le fichier `mubawab_full.py` présent dans ce ZIP est la copie du fichier fourni auparavant par l'utilisateur; sa version GitHub courante peut différer.

## Tests

```bash
python -m unittest -v test_archive_import.py
```

## Import des exports JSONL déjà sauvegardés

Le script accepte aussi les anciens exports JSONL produits par le pilote, sans disposer des fichiers HTML originaux :

```bash
python archive_import.py \
  --jsonl-dir captures/jsonl \
  --db sauvegarde_mubawab.sqlite \
  --out-dir export_mubawab
```

Le contenu est contrôlé : domaine/identifiant/URL source, formats numériques, domaine des URL photos. Chaque fichier d'entrée est associé à une empreinte SHA-256 et une transaction SQLite. Une deuxième exécution n'ajoute pas de doublons.

## Validation du pilote Casablanca — données réellement importées

- Source existante : `Mubawab_pilote_verifie.zip`, fichier `evidence/mubawab_casablanca.jsonl` ; contrôle indépendant contre `mubawab_casablanca.csv` fourni séparément.
- **31 annonces/31 identifiants concordants ; 432 URLs photos/432 concordantes** avec le rapport d'origine. Aucune page de détail sauvegardée, aucun fichier image local dans ce lot.
- **0 erreurs d'import**, 9 tests unitaires hors réseau réussis, relance idempotente confirmée.
- Les images ne sont **pas** téléchargées et la liste des URL n'en garantit pas l'accessibilité.
- **Couverture nationale : non certifiée**. Ce lot est exclusivement un pilote Casablanca à partir de données préexistantes.

Le paquet de données ci-joint (`mubawab_pilot_casablanca_offline.zip`) inclut la base SQLite reconstruite, les exports et les SHA-256, sans aucune nouvelle récupération réseau.