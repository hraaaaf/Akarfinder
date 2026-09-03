import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { extractMubawabCollectionListing } from "../../../data-ingestion/sources/mubawab/extractor.js";

const HTML = `<!doctype html><html><head><meta property="og:title" content="Appartement 2 Chambres Haut Standing à Vendre"><meta property="og:image" content="https://www.mubawab-media.com/image1.jpg"></head><body><h1>Appartement 2 Chambres Haut Standing à Vendre</h1><div>1 390 000 DH</div><div>82 m²</div><div>3 Pièces</div><div>2 Chambres</div><div>2 Salles de bains</div><div>Franceville à Casablanca</div><div>Étage du bien 5ème</div><div>Terrasse Garage Ascenseur Climatisation Sécurité</div><div data-testid="listing-gallery"><img src="https://www.mubawab-media.com/image1.jpg"><img src="https://www.mubawab-media.com/image2.jpg"></div><section class="recommendations"><div>Terrain à louer à Casablanca</div><img src="https://www.mubawab-media.com/recommended-x.jpg"></section><script type="application/ld+json">{"@type":"Apartment","name":"Appartement 2 Chambres Haut Standing à Vendre","offers":{"price":"1390000","priceCurrency":"MAD"},"address":{"addressLocality":"Casablanca","streetAddress":"Franceville"},"floorSize":{"value":82},"numberOfRooms":3,"numberOfBedrooms":2,"numberOfBathroomsTotal":2,"description":"Appartement neuf haut standing à Franceville.","url":"https://www.mubawab.ma/fr/a/8345081/appartement-2-chambres-haut-standing-a-vendre"}</script></body></html>`;

describe("Mubawab Lot 3 extractor", () => {
  it("maps /a/ detail HTML into the collection contract", () => {
    const listing = extractMubawabCollectionListing("https://www.mubawab.ma/fr/a/8345081/appartement-2-chambres-haut-standing-a-vendre", HTML, "2026-09-03T18:45:00.000Z");
    assert.equal(listing.source.source_id, "8345081");
    assert.equal(listing.source.name, "mubawab");
    assert.equal(listing.transaction, "sale");
    assert.equal(listing.property_type, "apartment");
    assert.equal(listing.price.amount, 1390000);
    assert.equal(listing.price.period, "total");
    assert.equal(listing.surface.total_m2, 82);
    assert.equal(listing.location.city, "Casablanca");
    assert.equal(listing.provenance.source_type, "portal");
    assert.match(listing.source.content_hash, /^[a-f0-9]{64}$/);
    assert.deepEqual(listing.images.map((image) => image.url), [
      "https://www.mubawab-media.com/image1.jpg",
      "https://www.mubawab-media.com/image2.jpg",
    ]);
  });

  it("does not let recommendation text override the primary listing transaction or type", () => {
    const listing = extractMubawabCollectionListing("https://www.mubawab.ma/fr/a/8345081/appartement-2-chambres-haut-standing-a-vendre", HTML, "2026-09-03T18:45:00.000Z");
    assert.equal(listing.transaction, "sale");
    assert.equal(listing.property_type, "apartment");
    assert.equal(listing.price.period, "total");
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

  it("prefers a visible on-request price over a stale numeric JSON-LD price", () => {
    const html = `<!doctype html><html><head><meta property="og:title" content="Local commercial titré à Derb Omar"><meta property="og:image" content="https://www.mubawab-media.com/local.jpg"></head><body>
<div>Immobilier Casablanca Locaux commerciaux Casablanca Derb Omar</div>
<div>Prix à consulter</div>
<div>Demander le prix</div>
<div>107 m²</div>
<div>1 Salle de bain</div>
<div>Derb Omar à Casablanca</div>
<h1>Local commercial titré à Derb Omar</h1>
<script type="application/ld+json">{"@type":"Product","name":"Local commercial titré à Derb Omar","offers":{"price":"2500000","priceCurrency":"MAD"},"address":{"addressLocality":"Casablanca","streetAddress":"Derb Omar"},"floorSize":{"value":107},"description":"Local commercial titré idéalement situé au cœur de Derb Omar."}</script></body></html>`;
    const listing = extractMubawabCollectionListing("https://www.mubawab.ma/fr/pa/8311288/local-commercial-titre-a-derb-omar", html, "2026-09-03T18:45:00.000Z");
    assert.equal(listing.price.amount, null);
    assert.equal(listing.price.on_request, true);
    assert.equal(listing.price.period, null);
  });

  it("does not treat current rental usage as the listing transaction", () => {
    const html = `<!doctype html><html><head><meta property="og:title" content="Riad traditionnel au cœur de la médina 4 chambres"><meta property="og:image" content="https://www.mubawab-media.com/riad.jpg"></head><body><div>4 750 000 DH</div><div>160 m²</div><div>10 Pièces</div><div>4 Chambres</div><div>3 Salles de bains</div><div>Kaat Ben Nahid à Marrakech</div><h1>Riad traditionnel au cœur de la médina 4 chambres</h1><script type="application/ld+json">{"@type":"House","name":"Riad traditionnel au cœur de la médina 4 chambres","offers":{"price":"4750000","priceCurrency":"MAD"},"address":{"addressLocality":"Marrakech","streetAddress":"Kaat Ben Nahid"},"floorSize":{"value":160},"description":"Le bien est actuellement exploité en location privative, offrant une bonne rentabilité."}</script></body></html>`;
    const listing = extractMubawabCollectionListing("https://www.mubawab.ma/fr/a/8370483/riad-traditionnel-au-coeur-de-la-medina-4-chambres", html, "2026-09-03T18:45:00.000Z");
    assert.equal(listing.transaction, null);
    assert.equal(listing.price.period, null);
  });

  it("keeps numbered districts and short Ch. stats when parsing primary location", () => {
    const html = `<!doctype html><html><head><meta property="og:title" content="Appartement à l'achat à Bournazil"><meta property="og:image" content="https://www.mubawab-media.com/a.jpg"></head><body>
<div>880 000 DH</div>
<div>80m² 3 Pièces Hay Almassira 2 à Casablanca</div>
<h1>Appartement à l'achat à Bournazil</h1>
<script type="application/ld+json">{"@type":"Apartment","name":"Appartement à l'achat à Bournazil","offers":{"price":"880000","priceCurrency":"MAD"},"address":{"addressLocality":"Casablanca"},"floorSize":{"value":80},"description":"Ne laissez pas passer cet appartement à vendre."}</script></body></html>`;
    const listing = extractMubawabCollectionListing("https://www.mubawab.ma/fr/pa/8294692/appartement-a-l-achat-a-bournazil", html, "2026-09-03T18:45:00.000Z");
    assert.equal(listing.location.district, "Hay Almassira 2");
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
