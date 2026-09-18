import { copyFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, sep } from "node:path";

import type { CanonicalPropertyV1 } from "../lib/property-schema/core";
import { Lot7SandboxStore } from "./sandbox-store";

export type ControlledIngestionOptions = {
  batchSize?: number;
  startBatch?: number;
  shouldStop?: () => boolean;
};

export type ControlledIngestionReport = {
  status: "completed" | "stopped";
  total_properties: number;
  batch_size: number;
  batches_planned: number;
  batches_committed: number;
  inserted: number;
  updated: number;
  next_batch: number;
};

function assertIsolatedSqlitePath(dbPath: string): void {
  const resolvedPath = resolve(dbPath);
  const resolvedTmp = resolve(tmpdir());
  const insideTmp = resolvedPath === resolvedTmp || resolvedPath.startsWith(`${resolvedTmp}${sep}`);

  if (!insideTmp) {
    throw new Error(`lot8_non_isolated_db_path:${resolvedPath}`);
  }

  if (resolvedPath.endsWith(`${sep}scripts${sep}scrapers${sep}output${sep}akarfinder.db`)) {
    throw new Error("lot8_historical_sqlite_forbidden");
  }
}

export class ControlledSqliteBatchIngestor {
  constructor(readonly dbPath: string) {
    assertIsolatedSqlitePath(dbPath);
  }

  ingest(
    properties: CanonicalPropertyV1[],
    options: ControlledIngestionOptions = {},
  ): ControlledIngestionReport {
    const batchSize = Math.min(Math.max(Math.trunc(options.batchSize ?? 500), 1), 5_000);
    const batchesPlanned = Math.ceil(properties.length / batchSize);
    const startBatch = Math.max(Math.trunc(options.startBatch ?? 0), 0);

    if (startBatch > batchesPlanned) {
      throw new Error(`lot8_invalid_start_batch:${startBatch}/${batchesPlanned}`);
    }

    let inserted = 0;
    let updated = 0;
    let batchesCommitted = 0;

    for (let batchIndex = startBatch; batchIndex < batchesPlanned; batchIndex += 1) {
      if (options.shouldStop?.()) {
        return {
          status: "stopped",
          total_properties: properties.length,
          batch_size: batchSize,
          batches_planned: batchesPlanned,
          batches_committed: batchesCommitted,
          inserted,
          updated,
          next_batch: batchIndex,
        };
      }

      const batch = properties.slice(batchIndex * batchSize, (batchIndex + 1) * batchSize);
      const rollbackPath = `${this.dbPath}.lot8-batch-${batchIndex}.rollback`;
      const hadDatabase = existsSync(this.dbPath);

      if (hadDatabase) {
        copyFileSync(this.dbPath, rollbackPath);
      }

      const store = new Lot7SandboxStore(this.dbPath);
      let batchInserted = 0;
      let batchUpdated = 0;

      try {
        for (const property of batch) {
          const result = store.importCanonical(property);
          if (result === "inserted") batchInserted += 1;
          else batchUpdated += 1;
        }
        store.close();
        rmSync(rollbackPath, { force: true });
      } catch (error) {
        store.close();
        if (hadDatabase) {
          copyFileSync(rollbackPath, this.dbPath);
        } else {
          rmSync(this.dbPath, { force: true });
        }
        rmSync(rollbackPath, { force: true });
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`lot8_batch_rollback:${batchIndex}:${message}`);
      }

      inserted += batchInserted;
      updated += batchUpdated;
      batchesCommitted += 1;
    }

    return {
      status: "completed",
      total_properties: properties.length,
      batch_size: batchSize,
      batches_planned: batchesPlanned,
      batches_committed: batchesCommitted,
      inserted,
      updated,
      next_batch: batchesPlanned,
    };
  }
}
