// Unit tests: rooms_count vs bedrooms_count separation.
// Verify that "pièces" never fills bedrooms and "chambres" never fills rooms.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractDetail } from "../utils/extract.js";

function html(body: string): string {
  return `<html><body>${body}</body></html>`;
}

describe("rooms vs bedrooms separation", () => {
  it("'3 pièces' sets rooms only, bedrooms stays null", () => {
    const d = extractDetail(html("<p>3 pièces</p>"));
    assert.equal(d.rooms, 3, "rooms should be 3");
    assert.equal(d.bedrooms, null, "bedrooms should remain null");
  });

  it("'2 chambres' sets bedrooms only, rooms stays null", () => {
    const d = extractDetail(html("<p>2 chambres</p>"));
    assert.equal(d.bedrooms, 2, "bedrooms should be 2");
    assert.equal(d.rooms, null, "rooms should remain null");
  });

  it("'3 pièces, 2 chambres' sets both independently", () => {
    const d = extractDetail(html("<p>3 pièces, 2 chambres</p>"));
    assert.equal(d.rooms, 3, "rooms should be 3");
    assert.equal(d.bedrooms, 2, "bedrooms should be 2");
  });

  it("Mubawab-style: 'N chambres / N salles de bains / Superficie N m²'", () => {
    const d = extractDetail(
      html("<p>4 chambres / 2 salles de bains / Superficie 120 m²</p>")
    );
    assert.equal(d.bedrooms, 4, "bedrooms from chambre text");
    assert.equal(d.bathrooms, 2, "bathrooms from sdb text");
    assert.equal(d.surface_raw, "120 m²", "surface from m²");
    assert.equal(d.rooms, null, "rooms stays null when only 'chambres' present");
  });

  it("'pièces' text does not bleed into bedrooms", () => {
    // Ensure regex boundaries: "pièces" must not match the bedrooms pattern
    const d = extractDetail(html("<p>5 pièces au total</p>"));
    assert.equal(d.rooms, 5);
    assert.equal(d.bedrooms, null);
  });

  it("'chambres' text does not bleed into rooms", () => {
    const d = extractDetail(html("<p>3 chambres disponibles</p>"));
    assert.equal(d.bedrooms, 3);
    assert.equal(d.rooms, null);
  });
});

describe("field confidence for rooms/bedrooms", () => {
  it("regex-filled fields get 'medium' confidence", () => {
    const d = extractDetail(html("<p>2 pièces, 1 chambre</p>"));
    assert.equal(d._confidence.rooms, "medium");
    assert.equal(d._confidence.bedrooms, "medium");
  });

  it("absent fields get 'missing' confidence", () => {
    const d = extractDetail(html("<p>Bel appartement à vendre</p>"));
    assert.equal(d._confidence.rooms, "missing");
    assert.equal(d._confidence.bedrooms, "missing");
  });
});
