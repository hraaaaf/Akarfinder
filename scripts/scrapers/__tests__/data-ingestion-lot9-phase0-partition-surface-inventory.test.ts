import test from "node:test";
import assert from "node:assert/strict";

import { extractPartitionSurfaceInventory } from "../../../data-ingestion/sources/mubawab/partition-surface-inventory";

const html = `
<form action="/fr/sd/casablanca/oasis/appartements-a-louer" method="get">
  <input type="number" name="priceMin" />
  <select name="rooms"><option value="1">1</option><option value="2">2</option></select>
</form>
<a href="/fr/is/logement-location_casablanca_oasis_pas-cher">Cheap</a>
<a href="/fr/tw/casablanca/oasis">Oasis</a>
<a href="/fr/a/123/example">Detail</a>
<a href="/fr/sd/casablanca/oasis/appartements-a-louer:p:2">Page 2</a>
<a href="https://example.com/fr/is/fake">External</a>
`;

test("inventories only exposed internal non-detail non-pagination routes and form controls", () => {
  const result = extractPartitionSurfaceInventory(html, "https://www.mubawab.ma/fr/sd/casablanca/oasis/appartements-a-louer");

  assert.equal(result.route_family_counts.is, 1);
  assert.equal(result.route_family_counts.tw, 1);
  assert.equal(result.route_links.some((item) => item.url.includes("/fr/a/123/")), false);
  assert.equal(result.route_links.some((item) => item.url.includes(":p:2")), false);
  assert.equal(result.route_links.some((item) => item.url.includes("example.com")), false);

  const byName = new Map(result.form_controls.map((item) => [item.name, item]));
  assert.equal(byName.get("priceMin")?.type, "number");
  assert.deepEqual(byName.get("rooms")?.option_values, ["1", "2"]);
  assert.equal(byName.get("rooms")?.form_method, "get");
});
