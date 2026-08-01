import {
  TYPESENSE_ODM_SHADOW_COLLECTION,
  TYPESENSE_ODM_SHADOW_SCHEMA,
  projectOdmRowToTypesense,
  type OdmSearchProjectionRow,
  type TypesenseOdmShadowDocument,
} from "./odm-projection";

export type ShadowPageLoader = (offset: number, limit: number) => Promise<OdmSearchProjectionRow[]>;
export type ShadowImporter = (documents: TypesenseOdmShadowDocument[]) => Promise<{ indexed: number; failed: number }>;

export type ShadowRebuildReport = {
  scanned: number;
  eligible: number;
  rejected: number;
  indexed: number;
  failed: number;
  batches: number;
};

export async function rebuildOdmTypesenseShadow(options: {
  loadPage: ShadowPageLoader;
  importBatch: ShadowImporter;
  pageSize?: number;
  batchSize?: number;
}): Promise<ShadowRebuildReport> {
  const pageSize = Math.max(1, Math.min(options.pageSize ?? 1000, 5000));
  const batchSize = Math.max(1, Math.min(options.batchSize ?? 500, 1000));
  const report: ShadowRebuildReport = {
    scanned: 0,
    eligible: 0,
    rejected: 0,
    indexed: 0,
    failed: 0,
    batches: 0,
  };

  for (let offset = 0; ; offset += pageSize) {
    const rows = await options.loadPage(offset, pageSize);
    if (rows.length === 0) break;
    report.scanned += rows.length;

    const documents = rows
      .map(projectOdmRowToTypesense)
      .filter((value): value is TypesenseOdmShadowDocument => value !== null);
    report.eligible += documents.length;
    report.rejected += rows.length - documents.length;

    for (let index = 0; index < documents.length; index += batchSize) {
      const result = await options.importBatch(documents.slice(index, index + batchSize));
      report.indexed += result.indexed;
      report.failed += result.failed;
      report.batches += 1;
    }

    if (rows.length < pageSize) break;
  }

  return report;
}

export function getOdmTypesenseShadowSchema() {
  return TYPESENSE_ODM_SHADOW_SCHEMA;
}

export function getOdmTypesenseShadowCollectionName() {
  return TYPESENSE_ODM_SHADOW_COLLECTION;
}
