import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import {
  buildCommonCrawlUrlIndexReport,
  type CommonCrawlUrlIndexAggregateRow,
} from "../census/commoncrawl-url-index";
import { renderCommonCrawlUrlIndexMarkdown } from "../census/commoncrawl-url-index-report";

interface AuditInputFile {
  generatedAt?: string;
  crawl?: string;
  knownDomains?: string[];
  rows: CommonCrawlUrlIndexAggregateRow[];
}

interface CliArgs {
  inputPath: string;
  jsonPath: string;
  markdownPath: string;
  top: number;
}

function parseArgs(argv: string[]): CliArgs {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || !value) {
      throw new Error(
        "Usage: tsx scripts/audits/data-1-commoncrawl-url-index-report.ts --input <file> --json <file> --markdown <file> [--top <n>]",
      );
    }
    values.set(key, value);
  }

  const inputPath = values.get("--input");
  const jsonPath = values.get("--json");
  const markdownPath = values.get("--markdown");
  if (!inputPath || !jsonPath || !markdownPath) {
    throw new Error("--input, --json and --markdown are required");
  }

  const top = Number(values.get("--top") ?? "100");
  if (!Number.isInteger(top) || top < 1 || top > 1000) {
    throw new Error("--top must be an integer between 1 and 1000");
  }

  return {
    inputPath: resolve(inputPath),
    jsonPath: resolve(jsonPath),
    markdownPath: resolve(markdownPath),
    top,
  };
}

async function writeOutput(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const raw = await readFile(args.inputPath, "utf8");
  const input = JSON.parse(raw) as AuditInputFile;
  if (!Array.isArray(input.rows)) throw new Error("Input must contain a rows array");
  if (input.knownDomains != null && !Array.isArray(input.knownDomains)) {
    throw new Error("knownDomains must be an array when provided");
  }

  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const report = buildCommonCrawlUrlIndexReport(
    input.rows,
    input.knownDomains ?? [],
    generatedAt,
    input.crawl,
  );

  await Promise.all([
    writeOutput(args.jsonPath, `${JSON.stringify(report, null, 2)}\n`),
    writeOutput(args.markdownPath, renderCommonCrawlUrlIndexMarkdown(report, args.top)),
  ]);

  process.stdout.write(
    `${JSON.stringify({
      schemaVersion: report.schemaVersion,
      crawl: report.crawl,
      domains: report.domains,
      knownDomains: report.knownDomains,
      newDomains: report.newDomains,
      jsonPath: args.jsonPath,
      markdownPath: args.markdownPath,
    })}\n`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`DATA-1.3 URL Index report failed: ${message}\n`);
  process.exitCode = 1;
});
