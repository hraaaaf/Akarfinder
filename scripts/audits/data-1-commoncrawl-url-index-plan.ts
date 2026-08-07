import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  DEFAULT_COMMON_CRAWL_INDEX,
  buildMaTldRealEstateQuery,
  buildMoroccoExternalRealEstateQuery,
} from "../census/commoncrawl-url-index";

type CliArgs = {
  outDir: string;
  crawl: string;
  minSignalPages: number;
};

function parseArgs(argv: string[]): CliArgs {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || !value) {
      throw new Error(
        "Usage: tsx scripts/audits/data-1-commoncrawl-url-index-plan.ts --out-dir <dir> [--crawl <CC-MAIN-YYYY-NN>] [--min-signal-pages <n>]",
      );
    }
    values.set(key, value);
  }

  const outDir = values.get("--out-dir");
  if (!outDir) throw new Error("--out-dir is required");

  const minSignalPages = Number(values.get("--min-signal-pages") ?? "1");
  if (!Number.isInteger(minSignalPages) || minSignalPages < 1) {
    throw new Error("--min-signal-pages must be a positive integer");
  }

  return {
    outDir: resolve(outDir),
    crawl: values.get("--crawl") ?? DEFAULT_COMMON_CRAWL_INDEX,
    minSignalPages,
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  await mkdir(args.outDir, { recursive: true });

  const maSql = buildMaTldRealEstateQuery({
    crawl: args.crawl,
    minSignalPages: args.minSignalPages,
  });
  const externalSql = buildMoroccoExternalRealEstateQuery({
    crawl: args.crawl,
    minSignalPages: args.minSignalPages,
  });

  const maPath = resolve(args.outDir, "01-ma-tld-real-estate.sql");
  const externalPath = resolve(args.outDir, "02-morocco-external-real-estate.sql");
  const manifestPath = resolve(args.outDir, "manifest.json");

  await Promise.all([
    writeFile(maPath, maSql, "utf8"),
    writeFile(externalPath, externalSql, "utf8"),
    writeFile(
      manifestPath,
      `${JSON.stringify(
        {
          schemaVersion: "data-1-commoncrawl-url-index-plan-v1",
          crawl: args.crawl,
          minSignalPages: args.minSignalPages,
          executionMode: "URL_INDEX_METADATA_ONLY",
          warcFetchAllowed: false,
          files: [maPath, externalPath],
        },
        null,
        2,
      )}\n`,
      "utf8",
    ),
  ]);

  process.stdout.write(
    `${JSON.stringify({
      crawl: args.crawl,
      minSignalPages: args.minSignalPages,
      executionMode: "URL_INDEX_METADATA_ONLY",
      maPath,
      externalPath,
      manifestPath,
    })}\n`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`DATA-1.3 URL Index plan failed: ${message}\n`);
  process.exitCode = 1;
});
