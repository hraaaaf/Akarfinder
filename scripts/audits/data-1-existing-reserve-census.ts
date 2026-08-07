import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import {
  buildExistingReserveCensusReport,
  renderExistingReserveCensusMarkdown,
} from "../census/existing-reserve-census";
import type { B3UnregisteredReserveRow } from "../census/existing-reserve-adapter";

interface AuditInputFile {
  generatedAt?: string;
  rows: B3UnregisteredReserveRow[];
}

interface CliArguments {
  inputPath: string;
  jsonPath: string;
  markdownPath: string;
  top: number;
}

function parseArguments(argv: string[]): CliArguments {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || !value) {
      throw new Error(
        "Usage: tsx scripts/audits/data-1-existing-reserve-census.ts --input <file> --json <file> --markdown <file> [--top <n>]",
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
  const args = parseArguments(process.argv.slice(2));
  const raw = await readFile(args.inputPath, "utf8");
  const input = JSON.parse(raw) as AuditInputFile;
  if (!Array.isArray(input.rows)) throw new Error("Input must contain a rows array");

  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const report = buildExistingReserveCensusReport(input.rows, generatedAt);

  await Promise.all([
    writeOutput(args.jsonPath, `${JSON.stringify(report, null, 2)}\n`),
    writeOutput(args.markdownPath, renderExistingReserveCensusMarkdown(report, args.top)),
  ]);

  process.stdout.write(
    `${JSON.stringify({
      schemaVersion: report.schemaVersion,
      generatedAt: report.generatedAt,
      rows: report.rows,
      domains: report.domains,
      priorityStats: report.priorityStats,
      jsonPath: args.jsonPath,
      markdownPath: args.markdownPath,
    })}\n`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`DATA-1.2 census audit failed: ${message}\n`);
  process.exitCode = 1;
});
