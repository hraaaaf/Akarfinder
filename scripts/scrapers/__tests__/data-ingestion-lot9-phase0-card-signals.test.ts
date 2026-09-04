import test from "node:test";
import assert from "node:assert/strict";

import {
  extractListingCardSignals,
  reviewCardSemantics,
} from "../../../data-ingestion/sources/mubawab/listing-card-signals";

test("extracts detail identity and visible card evidence without opening detail pages", () => {
  const html = `
    <div class="listing-card">
      <h2><a href="/fr/a/123456/appartement-centre">Appartement lumineux à vendre</a></h2>
      <p>Appartement 3 chambres à Casablanca, Maarif. 120 m².</p>
    </div>
    <div class="listing-card">
      <h2><a href="https://www.mubawab.ma/fr/pa/789012/lot-bureau-commerce">Bureau ou local commercial</a></h2>
      <p>Casablanca.</p>
    </div>`;

  const signals = extractListingCardSignals(html, "https://www.mubawab.ma/fr/is/example");
  assert.equal(signals.length, 2);
  assert.equal(signals[0].source_id, "123456");
  assert.equal(signals[0].title_text, "Appartement lumineux à vendre");
  assert.match(signals[0].card_text ?? "", /120 m²/);
  assert.equal(signals[1].detail_family, "pa");
});

test("marks explicit single-type titles clear and multi-type titles ambiguous", () => {
  const apartment = reviewCardSemantics({
    source_id: "1",
    detail_family: "a",
    url: "https://www.mubawab.ma/fr/a/1/x",
    route_url: "https://www.mubawab.ma/fr/is/x",
    title_text: "Appartement moderne à Casablanca",
    card_text: null,
  });
  assert.equal(apartment.status, "clear");
  assert.deepEqual(apartment.property_type_candidates, ["apartment"]);

  const ambiguous = reviewCardSemantics({
    source_id: "2",
    detail_family: "a",
    url: "https://www.mubawab.ma/fr/a/2/x",
    route_url: "https://www.mubawab.ma/fr/is/x",
    title_text: "Bureau ou local commercial à vendre",
    card_text: null,
  });
  assert.equal(ambiguous.status, "ambiguous_or_unmapped");
  assert.deepEqual(ambiguous.property_type_candidates.sort(), ["commercial", "office"]);
});
