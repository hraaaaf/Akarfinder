# Tamis annonces fraîches

Objectif utilisateur : **200 000 annonces**, six champs obligatoires (`ville`, `quartier`, `superficie` en m², `prix`, `type`, `url`), **publication depuis moins de 7 jours**, aucune photo téléchargée. `devise` est obligatoire : le prix conserve sa monnaie source (`MAD`, `EUR`, `USD`), sans conversion inventée.

Le nombre d'URL découvertes ne représente pas le nombre d'annonces complètes ou de biens uniques. La présence sitemap, `lastmod`, la date de modification, une date de contrôle et un HTTP 200 ne remplacent jamais la date de publication.

## Exécution

Python 3.10+ ; aucune dépendance externe, aucun secret.

```powershell
python -m unittest discover -s scripts/fresh-listings -p 'test_*.py' -v
python scripts/fresh-listings/pipeline.py --max-details 60 --target 200000
```

Sorties dans `data/annonces-fraiches/` :

- `annonces fraiches.json` : tableau des seules annonces acceptées ; vide si aucune ne passe.
- `rejets.jsonl` : extraction textuelle minimale, provenance par champ, raisons de rejet.
- `rapport.json` : volumes mesurés, objectif atteint ou déficit, erreurs d'accès.
- `checkpoint.sqlite` : reprise locale par URL ; aucune écriture en base produit.

Chaque exécution revérifie les fiches sélectionnées. Les observations déjà vérifiées depuis moins de 24 heures restent utilisables uniquement si elles passent toujours le filtre de publication des 7 jours et les six champs ; une vérification expirée ou future est rejetée. Cette reprise évite de vider le fichier pendant une collecte longue. Un instantané est écrit toutes les 10 fiches. Les URLs sont dédupliquées par identité canonique ; cela ne garantit pas des biens distincts entre sites. La limite de fiches est **par source**, et peut être augmentée explicitement. Le quota ne peut pas être garanti avant mesure de l'offre réellement fraîche.

## Perfectionner le parser

1. Grouper les rejets selon `rapport.json`, notamment champ manquant, ambiguïté et date absente.
2. Examiner la fiche concernée accessible sans protection, en isolant l'annonce des recommandations.
3. Ajouter un extracteur spécifique à la source et sa provenance ; ne pas inventer de ville/quartier/prix/date.
4. Ajouter un cas de régression minimal à `test_pipeline.py` ; ne pas conserver les photos ou pages intégrales.
5. Relancer le tamis et mesurer les récupérations. Un rejet trop ancien n'est jamais « corrigé » en annonce fraîche.

Les adaptateurs couvrent DarAgadir (H1, unités, quartier nommé), Mubawab (`adBread` et `adDetails`), MarocImmo (JSON-LD URL-bound `RealEstateListing.mainEntity`, quartier `containedInPlace`) et Sawim (offre imbriquée, bien lié, labels `dl`). `datePosted` est accepté uniquement sur une `RealEstateListing` liée à l'URL courante ; `dateModified` ne remplace jamais une publication. Les dates contradictoires sont rejetées.

Avito : extraction de l'annonce exacte dans le cache SSR public `__NEXT_DATA__`, résolution des références ville/quartier/catégorie, surface avec unité explicite et prix principal. Le paiement mensuel et les autres annonces sont ignorés. `listTime` reste dans `source_list_time` avec rejet `publication_semantics_unverified` : cet horodatage n'est pas certifié comme première publication et ne passe pas le filtre de fraîcheur.

Le chemin détail et l'identité canonique sont obligatoires. Les objets imbriqués déclarant une autre URL sont rejetés ; les biens liés peuvent être dans `mainEntity` ou `itemOffered`. Une adresse de rue n'est pas un quartier. Une unité `MTR` n'est pas convertie en m² : Mubawab exige le libellé visible `m²`. Les prix « à partir de » sont rejetés ; aucun taux de change n'est fabriqué. Aucun apprentissage automatique ou auto-modification du code n'est prétendu.

MarocImmo : le label explicite `Type de bien` corrige les classes génériques (`SingleFamilyResidence`, `Store`, `Place`). Une `Place` non liée à la fiche ne fournit jamais une ville ou une surface. Pour un terrain lié à la fiche, `additionalProperty` nommé `Surface du terrain` en unité `MTK` permet de récupérer la superficie. `python scripts/fresh-listings/review_rejections.py` revérifie seulement les rejets récents de cette source après une amélioration du parser.

## Accès

Sources configurées explicitement. Respect des règles robots, délai minimum d'une seconde (ou délai déclaré supérieur), requêtes textuelles plafonnées, aucun téléchargement de média. Les redirections sont arrêtées pour revue de l'origine. Les challenges, erreurs d'accès et robots indisponibles bloquent la source ; aucune rotation de proxy, résolution de CAPTCHA ou utilisation d'API privée. Aucune activation Search, mutation du Source Registry ou ingestion en production.

Les fiches HTML sont plafonnées à 3 Mo ; les sitemaps XML à 50 Mio. Seuls les `loc` des entrées `url` sont suivis, jamais les images contenues dans les sitemaps. Les liens des catalogues publics sont prioritaires ; `lastmod` sert uniquement à ordonner le reste des candidats et n'est pas une preuve de publication. DarAgadir et Mubawab sont temporairement hors collecte active à la suite du pilote, sans mutation du registre produit ; ils restent configurés pour une revue ultérieure.

Un `robots.txt` réellement absent (HTTP 404) peut être traité explicitement via `allow_missing_robots`, selon [RFC 9309 §2.3.1.3](https://www.rfc-editor.org/rfc/rfc9309.html#section-2.3.1.3). Cette option n'est pas une preuve de permission métier ; 401, 403, 429, 5xx, challenges et erreurs réseau restent bloquants. Elle est désactivée par défaut et aucun proxy ou changement d'identité n'est introduit.

`python scripts/fresh-listings/survey.py` contrôle huit origines publiques, sans ouvrir les routes privées. Son rapport `source-survey.json` conserve les résultats d'accès et les liens publics de découverte. MarocAnnonces est exclu en raison de `Disallow: /` pour notre agent ; aucune impersonation de Googlebot.

Le mode `--input observations.json` rejoue des extractions déjà inspectées hors réseau, mais ne les certifie pas comme récemment vérifiées. Publier un fichier de rejets n'accorde pas de droits d'exploitation supplémentaires sur une source.

## Flux JSON public Sawim

Sawim documente explicitement `https://sawim.ma/recherche.json` dans `https://sawim.ma/llms.txt`, sans clé, pour les agents et scripts. `python scripts/fresh-listings/sawim_feed.py` lit les pages triées par `posted_at` (`sort=recent`), normalise les champs documentés et vérifie chaque fiche récente en HTML. Le champ `cover` et les contacts sont jetés, sans téléchargement. Une divergence de date ou d'identité met la fiche en rejet ; le prix HTML courant prime. Les publications trop anciennes sont rejetées avant requête détail. Un arrêt de pagination n'est permis que si le contrat de tri et les horodatages monotones vérifiés mettent une page entière hors des 7 jours. Le stock total annoncé par la source n'est pas présenté comme un nombre d'annonces fraîches.

Quand la source les fournit, `transaction` et `periode_prix` distinguent prix total, loyer mensuel et tarif par nuit.

Le workflow GitHub Actions `Annonces fraiches - tamis 7 jours` lance uniquement les tests sur les PR concernées. Un déclenchement manuel relance les tests et le pilote, puis fournit les trois fichiers de résultat comme artefact. Il ne s'exécute pas périodiquement et ne modifie pas le dépôt ou la production. Le pilote n'est pas une certification d'une collecte nationale à 200 000 annonces.
