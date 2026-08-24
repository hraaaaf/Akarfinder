import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  LEGACY_PARTNER_CSV_WRITE_STATUS,
  importPartnerCsv,
} from "../../../scripts/import-partner-csv.js";

const CSV = [
  "title,price_mad,city,district,property_type,transaction_type,surface_m2,source_name,source_url",
  "Appartement partenaire,1200000,Casablanca,Maarif,apartment,sale,100,agence-test,https://example.ma/partner-1",
].join("\n");

describe("Partner CSV legacy write boundary P5", () => {
  it("keeps the legacy command validation-only in dry-run mode", async () => {
    const dir = await mkdtemp(join(tmpdir(), "akarfinder-partner-p5-"));
    try {
      const filePath = join(dir, "partner.csv");
      await writeFile(filePath, CSV, "utf8");
      const stats = await importPartnerCsv({ filePath, dryRun: true });
      assert.equal(LEGACY_PARTNER_CSV_WRITE_STATUS, "disabled_p5_canonical_boundary");
      assert.equal(stats.input_rows, 1);
      assert.equal(stats.valid_rows, 1);
      assert.equal(stats.created_property_listings, 0);
      assert.equal(stats.updated_property_listings, 0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("fails closed instead of performing a legacy direct DB write", async () => {
    const dir = await mkdtemp(join(tmpdir(), "akarfinder-partner-p5-"));
    try {
      const filePath = join(dir, "partner.csv");
      await writeFile(filePath, CSV, "utf8");
      await assert.rejects(
        () => importPartnerCsv({ filePath, dryRun: false }),
        /legacy Partner CSV direct DB writes are disabled/,
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
