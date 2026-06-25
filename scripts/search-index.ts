#!/usr/bin/env tsx
// Index current database listings into Typesense.
// Usage: npm run search:index

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { queryListings } from "../lib/db/index";
import { assignDuplicateGroups } from "../lib/listings/duplicate";
import { mapDbRowToListing } from "../lib/listings/map-db-listing";
import { mapListingToTypesenseDocument } from "../lib/search/mapping";
import { isTypesenseConfigured } from "../lib/search/provider";
import {
  ensureTypesenseCollection,
  importTypesenseDocuments,
} from "../lib/search/typesense-client";

const envFile = join(process.cwd(), ".env.local");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const match = line.match(/^([^#\s][^=]*)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
  }
}

async function loadListings() {
  const rows = [];
  const limit = 100;
  let offset = 0;
  let total = 0;

  do {
    const result = await queryListings({ limit, offset });
    rows.push(...result.listings);
    total = result.total;
    offset += limit;
  } while (rows.length < total);

  const allPersisted = rows.every(
    (row) => row.reliability_score != null && row.duplicate_score != null
  );

  if (allPersisted) {
    return rows.map((row) => mapDbRowToListing(row));
  }

  const partial = rows.map((row) => mapDbRowToListing(row));
  const duplicateMap = assignDuplicateGroups(partial);
  return rows.map((row) => mapDbRowToListing(row, duplicateMap.get(String(row.id))));
}

async function main() {
  if (!isTypesenseConfigured()) {
    console.error("[search:index] Typesense env is incomplete. Indexing aborted.");
    process.exit(1);
  }

  const listings = await loadListings();
  const documents = listings.map(mapListingToTypesenseDocument);

  console.log(`[search:index] attempted: ${documents.length}`);

  try {
    await ensureTypesenseCollection();
    const result = await importTypesenseDocuments(documents);
    console.log(
      `[search:index] indexed: ${result.indexed}, failed: ${result.failed}`
    );

    for (const error of result.errors.slice(0, 5)) {
      console.error(`[search:index] import error: ${error}`);
    }

    if (result.failed > 0) process.exit(1);
    process.exit(0);
  } catch (error) {
    console.error(
      "[search:index] Fatal:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

main();
