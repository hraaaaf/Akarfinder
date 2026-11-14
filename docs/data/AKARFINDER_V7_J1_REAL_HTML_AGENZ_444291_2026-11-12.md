# Akarfinder V7 — J1 : première preuve HTML brute Agenz — 12 novembre 2026

## Goal / succès / preuve

**Goal J1 :** obtenir de vrais octets HTML de fiche immobilière, avec manifeste
SHA-256/UTC/HTTP 200, les soumettre aux deux extracteurs L4 et AkarParser V3,
comparer les **7 champs**, corriger les erreurs démontrées, garder toute
publication/staging désactivés.

**Succès technique : OUI pour 1 annonce Agenz.** L'acquisition réelle et le
replay ont eu lieu dans un GitHub-hosted runner, pas sur l'ordinateur Windows.
La précision à l'échelle multi-sites n'est **pas** certifiée par cet exemple.

## Captures source réelles

URL : https://agenz.ma/fr/annonces/immo-sale/vente-appartements/al-qods/444291

| Élément | Capture de référence | Deuxième capture |
| --- | --- | --- |
| GitHub Actions | [#43330609367](https://github.com/hraaaaf/Akarfinder/actions/runs/43330609367) | [#43331534434](https://github.com/hraaaaf/Akarfinder/actions/runs/43331534434) |
| Horodatage UTC | 2026-11-12T23:39:02Z | 2026-11-12T23:45:46Z |
| Réponse | HTTPS 200, text/html | HTTPS 200, text/html |
| Octets | 237450 | 237450 |
| SHA-256 | `788355d9050f4b3ee6061c51ebf259c89acff19bb583a03a895ab8889ece6d61` | `4bc28c2ca3eeaf74353290fc075f3fc228cd00d619d51daad08b20930f2cc241` |
| Archive privée | [#13993958357](https://github.com/hraaaaf/Akarfinder/actions/runs/43330609367/artifacts/13993958357) | [#13994518838](https://github.com/hraaaaf/Akarfinder/actions/runs/43331534434/artifacts/13994518838) |

Les ZIP sont **privés et éphémères** (rétention 1 jour, expiration le
13 novembre 2026 vers 23h39/23h45 UTC). Leur HTML n'est pas committé dans
Git. Le ZIP primaire et son manifeste ont été téléchargés et vérifiés :
hash réellement recalculé sur 237450 octets = hash du manifeste.

**Limitation importante et correction de sécurité :** la première version
du workflow J1 contenait un marqueur de capture présent dans la diff
cumulative de la PR. Le déclencheur pull_request a donc provoqué un
**deuxième GET autorisé par le code mais non prévu opérationnellement**
lors d'un commit de correctif. Le marqueur a été supprimé et le workflow
remplacé par un **replay exclusivement hors ligne** au commit
`617295768363426b57cf3e3accb738334b219688`. Plus aucun job J1 ne
contient de commande de capture HTTP vers les portails. Aucun nouveau GET
n'est autorisé par le workflow. Les deux archives sont des captures
distinctes du même ID source, pas deux annonces.

Les octets diffèrent en particulier dans des attributs de coordonnées
chiffrées de la carte, tandis que les mentions `data-old-price=1100000`,
`data-price=980000` et « quartier de Tabriquet » restent identiques.
Un SHA HTML identifie **une capture**, pas une annonce stable : la
déduplication doit utiliser (portail, ID source) et la provenance.

## Résultat réel sur les 7 champs

L'ancienne extraction depuis la première capture renvoyait **1 100 000 DH**
sur L4 **et** V3. C'était le prix barré, exposé dans la source HTML sous
`data-old-price="1100000"` et au début du bloc microdata, alors que
le prix courant est `data-price="980000"`.

| Champ | Valeur soutenue par le HTML/URL | L4 après correctif | V3 après correctif |
| --- | --- | --- | --- |
| Titre | « Grand appartement – À proximité des commodités à Al Qods, Salé » | Présent | Présent |
| Prix courant | **980 000 DH** | **980 000** | **980 000** |
| Surface | 104 m² | 104 | 104 |
| Ville | Salé (route + titre) | **Absent** | Sale (normalisé) |
| Quartier | Al Qods (route/titre), **Tabriquet dans description** | **Absent** | Al Qods + revue |
| Type | Appartement | apartment | apartment |
| Transaction | Vente | sale | sale |

**Accord L4 / V3 : 5/7 valeurs égales, 2 champs absents côté L4.**
Ceci est un diagnostic de complétude comparative, **pas** un taux de
précision sur un corpus étiqueté. La mention Tabriquet contredit Al Qods :
**aucun quartier « corrigé » automatiquement**.
La page peut encore changer après la capture ; ni la disponibilité actuelle,
ni la publication éditoriale, ni la qualité géographique indépendante
n'ont été vérifiées.

### Correctifs et CI

- L4 et V3 reconnaissent dorénavant la paire de marqueurs
  `data-old-price` + `data-price` et refusent la réintroduction du
  prix barré si le prix courant est contradictoire.
- Parser ciblé sans nouvelle dépendance BeautifulSoup pour préserver
  les CI historiques V3.
- [Rejeu réel hors réseau #43331725808](https://github.com/hraaaaf/Akarfinder/actions/runs/43331725808)
  SUCCESS au SHA `6172957683` :
  **L4 980 000, V3 980 000**, 104 m², quartier en revue,
  même SHA de capture primaire ; 0 appel au portail, 0 DB.
- Le code suivant renforce le refus des fallback V2 et la compatibilité
  des tests standalone L4. **Consulter la CI du dernier code pour le
  verdict**, ne pas déduire GREEN des seuls runs antérieurs.

## J1 → J2 / J3

Pour J1, le système a une preuve réelle SHA vérifiée, un diagnostic des
7 champs et une correction testée contre la capture source. Le cas
**ville/quartier absent de L4** est un écart documenté, à étudier sans
forcer une concordance entre extracteurs. Un échantillon unique ne
constitue pas un benchmark représentatif.

**Next exact :** confirmer le dernier code + replay hors réseau, faire
un bilan de synthèse (rappel anti-doublon source ID), mettre à jour Notion,
puis passer à **J2 FeenWay** : rechercher les URLs et identifiants
originels de ses miroirs, benchmarker un premier cas, sans ingestion privée
ni publication et sans nouveau contournement d'accès.

Aucun merge, déploiement Vercel, migration Supabase ou activation du cron
10 minutes. PR V7 #1204 toujours Draft.
