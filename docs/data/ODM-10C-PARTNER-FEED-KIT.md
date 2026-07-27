# ODM-10C — Partner Feed Kit

## Objective

Replace fragile discovery-only coverage with authorized, fresh and attributable partner inventory.

This kit applies to the five ODM-10B priority candidates:

1. Promo Immo Marrakech
2. Dar Agadir
3. Atlas Immobilier
4. L’Immobilier Sans Frontières
5. Aykana

No direct detail acquisition or content republication is authorized by this document. Activation requires written source-specific approval recorded in `source_policy_registry`.

## Proposed integration modes

### Mode A — Partner feed

Preferred option. The partner provides JSON, XML, CSV or scheduled export.

Minimum fields:

- stable partner listing ID;
- canonical source URL;
- transaction type;
- property type;
- city and district;
- price and currency;
- surface;
- title;
- short factual description;
- image URLs with explicit redistribution rights;
- publication date;
- last update date;
- active/withdrawn status;
- agency or advertiser identity;
- contact-routing policy.

### Mode B — Authorized sitemap plus bounded detail fetch

Acceptable only with written authorization defining:

- allowed paths;
- request frequency;
- approved User-Agent;
- permitted factual fields;
- image and text reuse rights;
- attribution format;
- refresh and deletion rules;
- termination mechanism.

### Mode C — Canonical-link index

Fallback when content reuse is not licensed:

- canonical URL;
- source name;
- minimal non-copyrightable facts explicitly authorized;
- no copied description or images;
- outbound click to the source.

## AkarFinder commitments

- preserve source attribution;
- link to the canonical source page;
- honor withdrawals and expiry signals;
- apply deduplication without changing source ownership;
- expose provenance and freshness internally;
- never bypass robots, authentication, CAPTCHA or access controls;
- stop acquisition immediately when authorization is withdrawn.

## Requested written decisions

Each source must confirm:

1. authorized discovery method;
2. authorized detail-fetch method;
3. authorized fields;
4. text reuse rights;
5. image reuse rights;
6. attribution wording;
7. update frequency;
8. withdrawal/deletion SLA;
9. contact-routing arrangement;
10. commercial terms, if any.

## Outreach message — default

Objet : Proposition de partenariat data immobilier avec AkarFinder

Bonjour,

AkarFinder développe un moteur de recherche immobilier dédié au marché marocain. Notre objectif est d’améliorer la visibilité des professionnels tout en conservant l’attribution, le lien canonique et le contrôle de la source sur ses annonces.

Nous souhaitons étudier avec vous une intégration autorisée de votre inventaire, idéalement par flux JSON, XML, CSV ou sitemap encadré. Aucune extraction directe ni réutilisation de contenu ne serait activée sans votre accord écrit.

L’intégration pourrait inclure la déduplication, la normalisation des villes et quartiers, la détection de fraîcheur et le renvoi des utilisateurs vers vos pages ou contacts selon les modalités convenues.

Nous proposons un échange pour définir les champs autorisés, la fréquence de mise à jour, l’attribution, les règles de retrait et les éventuelles conditions commerciales.

Cordialement,

L’équipe AkarFinder

## Source-specific angle

| Source | Partnership angle |
|---|---|
| Promo Immo Marrakech | Structured Marrakech inventory and promoter/agency visibility |
| Dar Agadir | Strong Agadir coverage and local market reference |
| Atlas Immobilier | Clear governance and high-value Essaouira diversification |
| L’Immobilier Sans Frontières | Rabat–Salé diversification and professional inventory |
| Aykana | Casablanca–Rabat structured partner coverage |

## Activation gate

A source can move to ODM-10C acquisition only when:

- `content_reuse_policy` is `authorized` or `link_and_facts_only`;
- `detail_fetch_policy` is `allowed_bounded` or the feed is `partner_feed_only`;
- evidence of authorization is stored;
- the initial canary run is bounded and non-publication-first;
- CI, provenance, deduplication and withdrawal tests are green.
