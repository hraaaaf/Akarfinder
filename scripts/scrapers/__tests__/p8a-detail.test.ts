import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { extractDetail } from "../utils/extract.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeHtml(body: string): string {
  return `<!DOCTYPE html><html><head></head><body>${body}</body></html>`;
}

function charBlock(items: string): string {
  return `<ul class="blockDetails">${items}</ul>`;
}

function charItem(label: string, value: string): string {
  return `<li><span class="titreFiche">${label}</span><span class="titreFicheValue">${value}</span></li>`;
}

// ── Surface extraction ────────────────────────────────────────────────────────

describe("P8A — plot_surface_m2", () => {
  test("extracts from labeled text 'Surface du terrain 1094 m²'", () => {
    const html = makeHtml("<p>Surface du terrain 1094 m²</p>");
    const d = extractDetail(html);
    assert.equal(d.plot_surface_m2, 1094);
  });

  test("extracts from labeled text with colon", () => {
    const html = makeHtml("<p>Surface du terrain : 500 m²</p>");
    const d = extractDetail(html);
    assert.equal(d.plot_surface_m2, 500);
  });

  test("extracts from DOM block", () => {
    const html = makeHtml(
      charBlock(charItem("Surface du terrain", "1094 m²"))
    );
    const d = extractDetail(html);
    assert.equal(d.plot_surface_m2, 1094);
  });

  test("extracts from 'parcelle' label", () => {
    const html = makeHtml("<p>Surface de la parcelle 800 m²</p>");
    const d = extractDetail(html);
    assert.equal(d.plot_surface_m2, 800);
  });

  test("does not return 0 or negative", () => {
    const html = makeHtml("<p>Surface du terrain 0 m²</p>");
    const d = extractDetail(html);
    assert.equal(d.plot_surface_m2, null);
  });
});

describe("P8A — built_surface_m2", () => {
  test("extracts from labeled text 'Surface construite 450 m²'", () => {
    const html = makeHtml("<p>Surface construite 450 m²</p>");
    const d = extractDetail(html);
    assert.equal(d.built_surface_m2, 450);
  });

  test("extracts from DOM block", () => {
    const html = makeHtml(
      charBlock(charItem("Surface construite", "450 m²"))
    );
    const d = extractDetail(html);
    assert.equal(d.built_surface_m2, 450);
  });

  test("does not confuse with plot surface", () => {
    const html = makeHtml(
      "<p>Surface du terrain 1094 m²</p><p>Surface construite 450 m²</p>"
    );
    const d = extractDetail(html);
    assert.equal(d.plot_surface_m2, 1094);
    assert.equal(d.built_surface_m2, 450);
  });
});

// ── Condition / âge ───────────────────────────────────────────────────────────

describe("P8A — condition", () => {
  test("extracts from DOM block", () => {
    const html = makeHtml(charBlock(charItem("État", "À rénover")));
    const d = extractDetail(html);
    assert.equal(d.condition, "À rénover");
  });

  test("extracts from labeled text", () => {
    const html = makeHtml("<p>État du bien : Bon état</p>");
    const d = extractDetail(html);
    assert.ok(d.condition?.toLowerCase().includes("bon état"));
  });
});

describe("P8A — property_age_range", () => {
  test("extracts range pattern '30-50 ans'", () => {
    const html = makeHtml("<p>Ancienneté : 30-50 ans</p>");
    const d = extractDetail(html);
    assert.ok(d.property_age_range?.includes("30"));
  });

  test("extracts from DOM block", () => {
    const html = makeHtml(charBlock(charItem("Âge du bien", "30-50 ans")));
    const d = extractDetail(html);
    assert.ok(d.property_age_range?.includes("30"));
  });
});

// ── Orientation ───────────────────────────────────────────────────────────────

describe("P8A — orientation", () => {
  test("extracts 'Ouest'", () => {
    const html = makeHtml("<p>Orientation : Ouest</p>");
    const d = extractDetail(html);
    assert.ok(d.orientation?.toLowerCase().includes("ouest"));
  });

  test("extracts 'Nord-Est'", () => {
    const html = makeHtml("<p>Orientation Nord-Est</p>");
    const d = extractDetail(html);
    assert.ok(d.orientation?.toLowerCase().includes("nord"));
  });

  test("extracts from DOM block", () => {
    const html = makeHtml(charBlock(charItem("Orientation", "Ouest")));
    const d = extractDetail(html);
    assert.ok(d.orientation?.toLowerCase().includes("ouest"));
  });
});

// ── Jardin / Terrasse / Garage ────────────────────────────────────────────────

describe("P8A — garden_m2", () => {
  test("extracts 'Jardin 500 m²'", () => {
    const html = makeHtml("<p>Jardin 500 m²</p>");
    const d = extractDetail(html);
    assert.equal(d.garden_m2, 500);
  });

  test("extracts from DOM block", () => {
    const html = makeHtml(charBlock(charItem("Jardin", "500 m²")));
    const d = extractDetail(html);
    assert.equal(d.garden_m2, 500);
  });
});

describe("P8A — terrace_m2", () => {
  test("extracts 'Terrasse 20 m²'", () => {
    const html = makeHtml("<p>Terrasse 20 m²</p>");
    const d = extractDetail(html);
    assert.equal(d.terrace_m2, 20);
  });

  test("extracts from DOM block", () => {
    const html = makeHtml(charBlock(charItem("Terrasse", "20 m²")));
    const d = extractDetail(html);
    assert.equal(d.terrace_m2, 20);
  });
});

describe("P8A — garage_spaces", () => {
  test("extracts 'Garage 10 places'", () => {
    const html = makeHtml("<p>Garage 10 places</p>");
    const d = extractDetail(html);
    assert.equal(d.garage_spaces, 10);
  });

  test("extracts from DOM block", () => {
    const html = makeHtml(charBlock(charItem("Garage", "2 places")));
    const d = extractDetail(html);
    assert.equal(d.garage_spaces, 2);
  });
});

// ── Boolean features ──────────────────────────────────────────────────────────

describe("P8A — has_pool", () => {
  test("detects 'Piscine' in page text", () => {
    const html = makeHtml("<p>Piscine privée</p>");
    const d = extractDetail(html);
    assert.equal(d.has_pool, true);
  });

  test("'sans piscine' does not trigger has_pool", () => {
    const html = makeHtml("<p>Appartement sans piscine</p>");
    const d = extractDetail(html);
    assert.equal(d.has_pool, false);
  });

  test("defaults to false when absent", () => {
    const html = makeHtml("<p>Belle villa à Casablanca</p>");
    const d = extractDetail(html);
    assert.equal(d.has_pool, false);
  });
});

describe("P8A — has_concierge", () => {
  test("detects 'Concierge'", () => {
    const html = makeHtml("<p>Immeuble avec concierge</p>");
    const d = extractDetail(html);
    assert.equal(d.has_concierge, true);
  });
});

describe("P8A — has_equipped_kitchen", () => {
  test("detects 'Cuisine équipée'", () => {
    const html = makeHtml("<p>Cuisine équipée moderne</p>");
    const d = extractDetail(html);
    assert.equal(d.has_equipped_kitchen, true);
  });

  test("detects accent-free variant 'Cuisine equipee'", () => {
    const html = makeHtml("<p>cuisine equipee</p>");
    const d = extractDetail(html);
    assert.equal(d.has_equipped_kitchen, true);
  });
});

describe("P8A — has_moroccan_living_room / has_european_living_room", () => {
  test("detects 'Salon Marocain'", () => {
    const html = makeHtml("<p>Salon Marocain spacieux</p>");
    const d = extractDetail(html);
    assert.equal(d.has_moroccan_living_room, true);
  });

  test("detects 'salon européen'", () => {
    const html = makeHtml("<p>salon européen avec cheminée</p>");
    const d = extractDetail(html);
    assert.equal(d.has_european_living_room, true);
  });
});

// ── PII safety ────────────────────────────────────────────────────────────────

describe("P8A — PII safety", () => {
  test("does not extract phone numbers into P8A fields", () => {
    const html = makeHtml(
      "<p>Villa avec piscine. Appelez le 0612345678 pour plus d'info.</p>"
    );
    const d = extractDetail(html);
    assert.equal(d.has_pool, true);
    // Phone should not leak into any P8A text field
    assert.ok(!d.condition?.match(/\d{10}/));
    assert.ok(!d.orientation?.match(/\d{10}/));
    assert.ok(!d.property_age_range?.match(/\d{10}/));
  });

  test("does not extract email into P8A fields", () => {
    const html = makeHtml(
      "<p>Orientation Ouest. Contact: contact@agence.ma</p>"
    );
    const d = extractDetail(html);
    assert.ok(d.orientation?.toLowerCase().includes("ouest"));
    assert.ok(!d.condition?.includes("@"));
  });
});

// ── Anti-bruit: biens similaires ─────────────────────────────────────────────

describe("P8A — anti-bruit: biens similaires", () => {
  test("plot surface from main content, not from similar section", () => {
    // Main listing has 1094 m² terrain; similar listing has 200 m²
    // The regex returns the first match, which is the main listing's value.
    const html = makeHtml(`
      <div class="adContent">
        <p>Surface du terrain 1094 m²</p>
        <p>Belle villa avec piscine</p>
      </div>
      <div class="similar">
        <p>Surface du terrain 200 m²</p>
      </div>
    `);
    const d = extractDetail(html);
    assert.equal(d.plot_surface_m2, 1094);
  });
});

// ── premium_features aggregation ─────────────────────────────────────────────

describe("P8A — premium_features", () => {
  test("aggregates detected features into list", () => {
    const html = makeHtml(
      "<p>Piscine privée. Jardin 500 m². Terrasse 20 m². Concierge.</p>"
    );
    const d = extractDetail(html);
    assert.ok(Array.isArray(d.premium_features));
    assert.ok(d.premium_features.some((f) => f.includes("Piscine")));
    assert.ok(d.premium_features.some((f) => f.includes("Jardin")));
    assert.ok(d.premium_features.some((f) => f.includes("Terrasse")));
    assert.ok(d.premium_features.some((f) => f.includes("Concierge")));
  });

  test("is empty array when no features detected", () => {
    const html = makeHtml("<p>Appartement 3 pièces à vendre</p>");
    const d = extractDetail(html);
    assert.deepEqual(d.premium_features, []);
  });
});

// ── Default values ────────────────────────────────────────────────────────────

describe("P8A — defaults", () => {
  test("all P8A fields default to null/false on minimal page", () => {
    const html = makeHtml("<p>Appartement à vendre</p>");
    const d = extractDetail(html);
    assert.equal(d.built_surface_m2, null);
    assert.equal(d.plot_surface_m2, null);
    assert.equal(d.condition, null);
    assert.equal(d.property_age_range, null);
    assert.equal(d.orientation, null);
    assert.equal(d.floor_type, null);
    assert.equal(d.floors_count, null);
    assert.equal(d.garden_m2, null);
    assert.equal(d.terrace_m2, null);
    assert.equal(d.garage_spaces, null);
    assert.equal(d.has_pool, false);
    assert.equal(d.has_concierge, false);
    assert.equal(d.has_moroccan_living_room, false);
    assert.equal(d.has_european_living_room, false);
    assert.equal(d.has_equipped_kitchen, false);
    assert.deepEqual(d.premium_features, []);
  });
});
