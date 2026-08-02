import {
  projectOdmRowToTypesense,
  type OdmSearchProjectionRow,
  type TypesenseOdmShadowDocument,
} from "./odm-projection";

export type ShadowSyncCursor = { updated_at: string; representation_id: string };
export type ShadowSyncPageLoader = (cursor: ShadowSyncCursor | null, limit: number) => Promise<OdmSearchProjectionRow[]>;
export type ShadowSyncWriter = (documents: TypesenseOdmShadowDocument[]) => Promise<{ indexed: number; failed: number }>;
export type ShadowSyncDeleter = (ids: string[]) => Promise<{ deleted: number; failed: number }>;

export type ShadowSyncReport = {
  scanned: number;
  upsert_candidates: number;
  delete_candidates: number;
  indexed: number;
  deleted: number;
  failed: number;
  batches: number;
  started_from: ShadowSyncCursor | null;
  next_cursor: ShadowSyncCursor | null;
};

function compareCursor(left: ShadowSyncCursor, right: ShadowSyncCursor): number {
  const byTime = left.updated_at.localeCompare(right.updated_at);
  return byTime !== 0 ? byTime : left.representation_id.localeCompare(right.representation_id);
}

export function cursorFromRow(row: OdmSearchProjectionRow): ShadowSyncCursor {
  return { updated_at: row.updated_at, representation_id: row.representation_id };
}

export async function syncOdmTypesenseShadowIncrementally(options: {
  loadPage: ShadowSyncPageLoader;
  upsertBatch: ShadowSyncWriter;
  deleteBatch: ShadowSyncDeleter;
  cursor?: ShadowSyncCursor | null;
  pageSize?: number;
  batchSize?: number;
}): Promise<ShadowSyncReport> {
  const pageSize = Math.max(1, Math.min(options.pageSize ?? 1000, 5000));
  const batchSize = Math.max(1, Math.min(options.batchSize ?? 500, 1000));
  const startedFrom = options.cursor ?? null;
  let cursor = startedFrom;
  const report: ShadowSyncReport = {
    scanned: 0,
    upsert_candidates: 0,
    delete_candidates: 0,
    indexed: 0,
    deleted: 0,
    failed: 0,
    batches: 0,
    started_from: startedFrom,
    next_cursor: startedFrom,
  };

  for (;;) {
    const rows = await options.loadPage(cursor, pageSize);
    if (rows.length === 0) break;
    const ordered = [...rows].sort((a, b) => compareCursor(cursorFromRow(a), cursorFromRow(b)));
    const next = cursorFromRow(ordered[ordered.length - 1]);
    if (cursor && compareCursor(next, cursor) <= 0) throw new Error("typesense_shadow_incremental_cursor_not_advancing");

    report.scanned += ordered.length;
    const documents: TypesenseOdmShadowDocument[] = [];
    const deleteIds: string[] = [];
    for (const row of ordered) {
      const document = projectOdmRowToTypesense(row);
      if (document) documents.push(document);
      else deleteIds.push(row.representation_id);
    }
    report.upsert_candidates += documents.length;
    report.delete_candidates += deleteIds.length;

    for (let index = 0; index < documents.length; index += batchSize) {
      const result = await options.upsertBatch(documents.slice(index, index + batchSize));
      report.indexed += result.indexed;
      report.failed += result.failed;
      report.batches += 1;
    }
    for (let index = 0; index < deleteIds.length; index += batchSize) {
      const result = await options.deleteBatch(deleteIds.slice(index, index + batchSize));
      report.deleted += result.deleted;
      report.failed += result.failed;
      report.batches += 1;
    }

    cursor = next;
    report.next_cursor = next;
    if (ordered.length < pageSize) break;
  }

  return report;
}
