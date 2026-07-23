import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Phase 1 P1 — canonical intent hubs", () => {
  const acheterPage = source("app/acheter/page.tsx");
  const louerPage = source("app/louer/page.tsx");
  const hub = source("components/intent/IntentHubV2.tsx");

  it("keeps Acheter and Louer as hubs that hand off to canonical Search", () => {
    assert.ok(acheterPage.includes("IntentHubV2"));
    assert.ok(louerPage.includes("IntentHubV2"));
    assert.ok(acheterPage.includes('transaction_type: "buy"'));
    assert.ok(louerPage.includes('transaction_type: "rent"'));
    assert.ok(louerPage.includes('"max_price"'));
    assert.ok(louerPage.includes('"min_price"'));
    assert.ok(hub.includes('action="/search"'));
    assert.ok(hub.includes("Tous les filtres"));
  });

  it("does not expose fake favorites, pseudo furnishing filters, or the legacy rent alert flow", () => {
    assert.equal(hub.includes("Heart"), false);
    assert.equal(hub.includes("Meublé"), false);
    assert.equal(hub.includes("Vide"), false);
    assert.equal(hub.includes("RentAlertForm"), false);
    assert.equal(hub.includes("/api/alerts"), false);
    assert.equal(louerPage.includes("RentAlertForm"), false);
  });

  it("uses information-level language instead of a generic reliability promise", () => {
    assert.ok(hub.includes("Niveau d’information explicite"));
    assert.ok(hub.includes("Analysé par AkarFinder"));
    assert.ok(hub.includes("Analyse partielle"));
    assert.ok(hub.includes("Offre observée"));
    assert.equal(hub.includes("PRIX_OBSERVES"), false);
    assert.equal(hub.includes("LOYERS_QUARTIERS"), false);
  });
});

describe("Phase 1 P1 — Neuf audience and inventory truth", () => {
  const page = source("app/neuf/page.tsx");
  const shell = source("components/neuf/NeufPageShellV2.tsx");

  it("does not promise an active partner inventory in metadata or public content", () => {
    assert.ok(page.includes("NeufPageShellV2"));
    assert.equal(page.includes("Projets partenaires"), false);
    assert.ok(shell.includes("Aucun inventaire partenaire"));
    assert.equal(shell.includes("EXAMPLE_PROJECT"), false);
  });

  it("separates buyer search, fictional demo, and promoter conversion", () => {
    assert.ok(shell.includes('/search?transaction_type=new'));
    assert.ok(shell.includes('/demo/promoteur'));
    assert.ok(shell.includes('/promoteurs'));
    assert.ok(shell.includes("Vous êtes acheteur"));
    assert.ok(shell.includes("Vous êtes promoteur"));
  });
});
