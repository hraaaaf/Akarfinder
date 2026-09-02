import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { supportsOdmPublicSearchQuery } from "../../../lib/odm/odm-public-routing";

describe("search UI/API page-one routing parity", () => {
  it("treats omitted offset and explicit offset=0 as the same ODM-capable first page", () => {
    assert.equal(supportsOdmPublicSearchQuery({ limit: 24 }), true);
    assert.equal(supportsOdmPublicSearchQuery({ limit: 24, offset: 0 }), true);
  });

  it("keeps positive numbered-page offsets on legacy routing", () => {
    assert.equal(supportsOdmPublicSearchQuery({ limit: 24, offset: 24 }), false);
    assert.equal(supportsOdmPublicSearchQuery({ limit: 24, offset: 48 }), false);
  });

  it("keeps structured district queries on legacy routing", () => {
    assert.equal(
      supportsOdmPublicSearchQuery({ city: "Rabat", district: "Agdal", limit: 24, offset: 0 }),
      false,
    );
  });
});
