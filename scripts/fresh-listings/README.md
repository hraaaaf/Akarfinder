# Tamis annonces fraîches

Objectif utilisateur : **200 000 annonces**, six champs obligatoires (`ville`, `quartier`, `superficie` en m², `prix` en MAD, `type`, `url`), **publication depuis moins de 7 jours**, aucune photo téléchargée.

Le nombre d'URL découvertes ne représente pas le nombre d'annonces complètes ou de biens uniques. La présence sitemap, `lastmod`, la date de modification, une date de contrôle et un HTTP 200 ne remplacent jamais la date de publication.

## Exécution

Python 3.10+ ; aucune dépendance externe, aucun secret.

```powershell
python -m unittest discover -s scripts/fresh-listings -p test_pipeline.py -v
python scripts/fresh-listings/pipeline.py --max-details 60 --target 200000
```

Sorties dans `data/annonces-fraiches/` :

- `annonces fraiches.json` : tableau des seules annonces acceptées ; vide si aucune ne passe.
- `rejets.jsonl` : extraction textuelle minimale, provenance par champ, raisons de rejet.
- `rapport.json` : volumes mesurés, objectif atteint ou déficit, erreurs d'accès.
- `checkpoint.sqlite` : reprise locale par URL ; aucune écriture en base produit.

Chaque exécution revérifie les fiches sélectionnées. Une ancienne vérification du checkpoint n'autorise pas une nouvelle exportation. Les URLs sont dédupliquées par identité canonique ; cela ne garantit pas des biens distincts entre sites. La limite de fiches est **par source**, et peut être augmentée explicitement. Le quota ne peut pas être garanti avant mesure de l'offre réellement fraîche.

## Perfectionner le parser

1. Grouper les rejets selon `rapport.json`, notamment champ manquant, ambiguïté et date absente.
2. Examiner la fiche concernée accessible sans protection, en isolant l'annonce des recommandations.
3. Ajouter un extracteur spécifique à la source et sa provenance ; ne pas inventer de ville/quartier/prix/date.
4. Ajouter un cas de régression minimal à `test_pipeline.py` ; ne pas conserver les photos ou pages intégrales.
5. Relancer le tamis et mesurer les récupérations. Un rejet trop ancien n'est jamais « corrigé » en annonce fraîche.

Les adaptateurs spécifiques couvrent DarAgadir (H1, unités, quartier explicitement nommé dans un dictionnaire revu, prix MAD) et Mubawab (quartier du fil d'Ariane `adBread`, superficie des caractéristiques principales `adDetails`). Le chemin détail est obligatoire. Le JSON-LD générique exige une identité URL explicite correspondant à la fiche et accepte un `itemOffered` directement lié à celle-ci. Une adresse de rue n'est pas automatiquement un quartier. Une unité `MTR` dans le JSON-LD n'est pas convertie en m² : l'adaptateur Mubawab exige le libellé visible `m²`. Un prix en EUR n'est pas converti en MAD sans preuve de change ; les prix « à partir de » et tarifs journaliers ambigus sont exclus. Les autres sources nécessitent des adaptateurs évalués avant augmentation du volume. Aucun apprentissage automatique ou auto-modification du code n'est prétendu.

## Accès

Sources configurées explicitement. Respect des règles robots, délai minimum d'une seconde (ou délai déclaré supérieur), requêtes textuelles plafonnées, aucun téléchargement de média. Les redirections sont arrêtées pour revue de l'origine. Les challenges, erreurs d'accès et robots indisponibles bloquent la source ; aucune rotation de proxy, résolution de CAPTCHA ou utilisation d'API privée. Aucune activation Search, mutation du Source Registry ou ingestion en production.

Le mode `--input observations.json` rejoue des extractions déjà inspectées hors réseau, mais ne les certifie pas comme récemment vérifiées. Publier un fichier de rejets n'accorde pas de droits d'exploitation supplémentaires sur une source.

Le workflow GitHub Actions `Annonces fraiches - tamis 7 jours` lance uniquement les tests sur les PR concernées. Un déclenchement manuel relance les tests et le pilote, puis fournit les trois fichiers de résultat comme artefact. Il ne s'exécute pas périodiquement et ne modifie pas le dépôt ou la production. Le pilote n'est pas une certification d'une collecte nationale à 200 000 annonces.
