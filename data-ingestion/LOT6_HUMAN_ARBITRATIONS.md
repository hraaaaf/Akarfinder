# Lot 6 — Human Arbitrations

Purpose: record user-confirmed transaction classifications for rejected Mubawab listings before generalizing contextual inference rules.

## Confirmed

### #8192907 — Superbe Villa PARANFA
- canonical_url: https://www.mubawab.ma/fr/a/8192907/superbe-villa-paranfa
- property_type: villa
- price: 24,000,000 MAD
- discovery_context: villa_sale
- extractor_transaction: null
- user_arbitration: sale
- rationale: route context and price make sale unambiguous; not yet used alone to define a global villa threshold.

### #8370499 — Villa Contemporaine d’Exception à Ain Diab
- canonical_url: https://www.mubawab.ma/fr/a/8370499/villa-contemporaine-d%E2%80%99exception-%C3%A0-ain-diab
- property_type: villa
- price: 45,000 MAD
- discovery_context: villa_rent
- extractor_transaction: null
- user_arbitration: rent
- rationale: route context and price make rent unambiguous; still insufficient alone to define a global villa threshold.

### #7952262 — Maison à 2 façades, Ain Chok / Casablanca
- canonical_url: https://www.mubawab.ma/fr/a/7952262/maison-%C3%A0-2-fa%C3%A7ades-%C3%A0-1-minute-du-busway-sefrou-%C3%A0-hay-moulay-abdellah-ain-chok-casablanca
- property_type: house
- price: 2,520,000 MAD
- discovery_context: house_sale
- extractor_transaction: null
- user_arbitration: sale
- rationale: route context and price make sale unambiguous.

### #8403866 — Dar Jwhara Sidi Moumen
- canonical_url: https://www.mubawab.ma/fr/a/8403866/dar-jwhara-sidi-moumen
- property_type: house
- price: 2,300,000 MAD
- discovery_context: house_sale
- extractor_transaction: null
- user_arbitration: sale
- rationale: route context and price make sale unambiguous.

### #8408402 — DEPOT 10000m2 Ain Sebaa, Excellent Etat
- canonical_url: https://www.mubawab.ma/fr/a/8408402/depot-10000m2-ain-sebaa-excellent-etat
- property_type: commercial
- price: on_request
- discovery_context: commercial_rent
- extractor_transaction: null
- user_arbitration: rent
- rationale: user confirmed rental classification despite missing numeric price; keep as explicit human override rather than generalizing route-only inference for on-request listings.
