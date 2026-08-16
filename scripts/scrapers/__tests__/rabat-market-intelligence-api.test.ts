import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "@/app/api/geo/rabat-market-intelligence/route";

test("C3 API rejects invalid mode before any market read", async () => {
  const response = await GET(new Request("http://localhost/api/geo/rabat-market-intelligence?mode=fake&transaction=sale"));
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.status, "invalid_request");
  assert.deepEqual(body.allowedModes, ["price", "density", "listings"]);
  assert.equal(response.headers.get("x-akarfinder-market-scope"), "observed-only");
});

test("C3 API rejects invalid transaction before any market read", async () => {
  const response = await GET(new Request("http://localhost/api/geo/rabat-market-intelligence?mode=listings&transaction=all"));
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.status, "invalid_request");
  assert.deepEqual(body.allowedTransactions, ["sale", "rent"]);
});
