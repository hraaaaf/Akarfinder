import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { extractMubawabCollectionListing } from "../../../data-ingestion/sources/mubawab/extractor.js";

const HTML = `<!doctype html><html><head><meta property="og:title" content="Appartement 2 Chambres Haut Standing à Vendre"><meta property="og:image" content="https://www.mubawab-media.com/image1.jpg"></head><body><h1>Appartement 2 Chambres Haut Standing à Vendre</h1><div>1 390 000 DH</div><div>82 m²</div><div>3 Pièces</div><div>2 Chambres</div><div>2 Salles de bains</div><div>Franceville à Casablanca</div><div>Étage du bien 5ème</div><div>Terrasse Garage Ascenseur Climatisation Sécurité</div><div data-testid="listing-gallery"><img src="https://www.mubawab-media.com/image1.jpg"><img src="https://www.mubawab-media.com/image2.jpg"></div><section class="recommendations"><img src="https://www.mubawab-media.com/recommended-x.jpg"></section><script type="application/ld+json">{"@type":"Apartment","name":"Appartement 2 Chambres Haut Standing à Vendre","offers":{"price":"1390000","priceCurrency":"MAD"},"address":{"addressLocality":"Casablanca","streetAddress":"Franceville"},"floorSize":{"value":82},"numberOfRooms":3,"numberOfBedrooms":2,"numberOfBathroomsTotal":2,"description":"Appartement neuf haut standing à Franceville.","url":"https://www.mubawab.ma/fr/a/8345081/appartement-2-chambres-haut-standing-a-vendre"}</script></body></html>`;

describe("Mubawab Lot 3 extractor", () => {
  it("maps /a/ detail HTML into the collection contract", () => {
    const listing = extractMubawabCollectionListing("https://www.mubawab.ma/fr/a/8345081/appartement-2-chambres-haut-standing-a-vendre", HTML, "2026-09-03T18:45:00.000Z");
    assert.equal(listing.source.source_id, "8345081");
    assert.equal(listing.source.name, "mubawab");
    assert.equal(listing.transaction, "sale");
    assert.equal(listing.property_type, "apartment");
    assert.equal(listing.price.amount, 1390000);
    assert.equal(listing.surface.total_m2, 82);
    assert.equal(listing.location.city, "Casablanca");
    assert.equal(listing.provenance.source_type, "portal");
    assert.match(listing.source.content_hash, /^[a-f0-9]{64}$/);
    assert.deepEqual(listing.images.map((image) => image.url), [
      "https://www.mubawab-media.com/image1.jpg",
      "https://www.mubawab-media.com/image2.jpg",
    ]);
  });

  it("never imports images from recommendation blocks outside the primary gallery", () => {
    const listing = extractMubawabCollectionListing("https://www.mubawab.ma/fr/a/8345081/appartement-2-chambres-haut-standing-a-vendre", HTML, "2026-09-03T18:45:00.000Z");
    assert.equal(listing.images.some((image) => image.url.includes("recommended-x")), false);
  });

  it("falls back to og:image without scanning unrelated page images", () => {
    const html = HTML.replace('<div data-testid="listing-gallery"><img src="https://www.mubawab-media.com/image1.jpg"><img src="https://www.mubawab-media.com/image2.jpg"></div>', "");
    const listing = extractMubawabCollectionListing("https://www.mubawab.ma/fr/a/8345081/appartement-2-chambres-haut-standing-a-vendre", html, "2026-09-03T18:45:00.000Z");
    assert.deepEqual(listing.images.map((image) => image.url), ["https://www.mubawab-media.com/image1.jpg"]);
  });

  it("accepts /pa/ details with the same stable source-id contract", () => {
    const listing = extractMubawabCollectionListing("https://www.mubawab.ma/fr/pa/8398739/test", HTML, "2026-09-03T18:45:00.000Z");
    assert.equal(listing.source.source_id, "8398739");
    assert.equal(listing.raw.detail_family, "pa");
  });

  it("rejects non-detail Mubawab URLs", () => {
    assert.throws(() => extractMubawabCollectionListing("https://www.mubawab.ma/fr/st/casablanca/appartements-a-vendre", HTML), /unsupported_mubawab_detail_url/);
  });
});
