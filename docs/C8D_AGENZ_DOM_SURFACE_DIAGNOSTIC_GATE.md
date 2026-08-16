# C8D — Agenz DOM surface diagnostic gate

Goal: determine whether remaining Agenz × Diour Jamaa surface failures can be isolated from DOM elements belonging to the current listing while excluding recommendation cards linked to other listing IDs.

Allowed derived evidence only:
- current listing ID from canonical URL;
- count of leaf DOM elements containing m²;
- count linked to a foreign listing ID;
- count not linked to a foreign listing;
- count inside semantic surface/feature/detail containers;
- unique numeric m² candidates from those bounded classes.

Forbidden:
- raw HTML or raw page text persistence;
- DB writes;
- public activation;
- accepting a candidate solely because it appears somewhere in body text;
- price/m² publication.

Success: bounded live artifact distinguishes foreign recommendation-card surfaces from current-page DOM candidates with `productionWriteCount=0` and `rawHtmlPersisted=false`.
