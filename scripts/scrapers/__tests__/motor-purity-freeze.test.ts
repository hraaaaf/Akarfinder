import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  getThirdPartyIngestionGuard,
  isMubawabExpansionEnabled,
  isNightlyIngestionEnabled,
  isThirdPartyDbIngestionEnabled,
} from "../utils/motor-purity-guard.js";
import { runP0Scrape } from "../p0-run.js";
import { ingestCleanListings } from "../ingest-clean-listings.js";
import { runMubawabExpansionCli } from "../../mubawab-depth-expansion-run.js";

function withEnv<T>(
  vars: Record<string, string | undefined>,
  fn: () => Promise<T> | T
): Promise<T> | T {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(vars)) {
    previous.set(key, process.env[key]);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  const restore = () => {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };

  try {
    const result = fn();
    if (result instanceof Promise) return result.finally(restore);
    restore();
    return result;
  } catch (error) {
    restore();
    throw error;
  }
}

describe("motor purity guard flags", () => {
  it("defaults all third-party ingestion flags to false when not explicitly set", () => {
    withEnv(
      {
        THIRD_PARTY_DB_INGESTION_ENABLED: undefined,
        NIGHTLY_INGESTION_ENABLED: undefined,
        MUBAWAB_EXPANSION_ENABLED: undefined,
      },
      () => {
        assert.equal(isThirdPartyDbIngestionEnabled(), false);
        assert.equal(isNightlyIngestionEnabled(), false);
        assert.equal(isMubawabExpansionEnabled(), false);
      }
    );
  });

  it("reports the explicit flags required for nightly ingestion", () => {
    const guard = withEnv(
      {
        THIRD_PARTY_DB_INGESTION_ENABLED: "false",
        NIGHTLY_INGESTION_ENABLED: "false",
      },
      () =>
        getThirdPartyIngestionGuard({
          scriptName: "nightly:ingest",
          requireNightlyFlag: true,
        })
    );

    assert.equal(guard.blocked, true);
    assert.match(guard.message, /THIRD_PARTY_DB_INGESTION_ENABLED=true/);
    assert.match(guard.message, /NIGHTLY_INGESTION_ENABLED=true/);
  });
});

describe("motor purity freeze", () => {
  it("blocks p0-run cleanly when THIRD_PARTY_DB_INGESTION_ENABLED=false", async () => {
    const result = await withEnv(
      {
        THIRD_PARTY_DB_INGESTION_ENABLED: "false",
      },
      () => runP0Scrape()
    );

    assert.equal(result.blocked, true);
    assert.equal(result.totalScraped, 0);
    assert.equal(result.totalClean, 0);
  });

  it("blocks ingest-clean-listings cleanly when THIRD_PARTY_DB_INGESTION_ENABLED=false", async () => {
    const cleanPath = join(tmpdir(), `motor-purity-clean-${Date.now()}.json`);
    const qualityPath = join(tmpdir(), `motor-purity-quality-${Date.now()}.json`);

    try {
      await writeFile(cleanPath, "[]", "utf8");
      await writeFile(qualityPath, "{}", "utf8");

      const stats = await withEnv(
        {
          THIRD_PARTY_DB_INGESTION_ENABLED: "false",
        },
        () => ingestCleanListings({ cleanPath, qualityPath })
      );

      assert.deepEqual(stats, {
        totalCleanRead: 0,
        insertedRaw: 0,
        insertedProperty: 0,
        updatedProperty: 0,
        insertedSources: 0,
        updatedSources: 0,
        skipped: 0,
        errors: 0,
      });
    } finally {
      try { await unlink(cleanPath); } catch {}
      try { await unlink(qualityPath); } catch {}
    }
  });

  it("blocks mubawab expansion cleanly when flags are off", async () => {
    const result = await withEnv(
      {
        THIRD_PARTY_DB_INGESTION_ENABLED: "false",
        MUBAWAB_EXPANSION_ENABLED: "false",
      },
      () => runMubawabExpansionCli()
    );

    assert.equal(result.blocked, true);
    assert.equal(result.created, 0);
    assert.equal(result.updated, 0);
  });
});
