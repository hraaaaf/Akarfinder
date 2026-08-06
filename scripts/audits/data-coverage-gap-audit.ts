import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  buildCoverageAuditReport,
  renderCoverageAuditMarkdown,
  type CoverageAuditOptions,
  type CoverageSegmentInput,
} from "../coverage/coverage-gap-auditor";

interface AuditInputFile {
  generatedAt?: string;
  options?: CoverageAuditOptions;
  segments: CoverageSegmentInput[];
}

interface CliArguments {
  inputPath: string;
  jsonPath: string;
  markdownPath: string;
}

function parseArguments(argv: string[]): CliArguments {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || !value) {
      throw new Error(
        "Usage: tsx scripts/audits/data-coverage-gap-audit.ts --input <file> --json <file> --markdown <file>",
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

  return {
    inputPath: resolve(inputPath),
    jsonPath: resolve(jsonPath),
    markdownPath: resolve(markdownPath),
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
  if (!Array.isArray(input.segments)) {
    throw new Error("Input must contain a segments array");
  }

  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const report = buildCoverageAuditReport(
    input.segments,
    generatedAt,
    input.options,
  );

  await Promise.all([
    writeOutput(args.jsonPath, `${JSON.stringify(report, null, 2)}\n`),
    writeOutput(args.markdownPath, renderCoverageAuditMarkdown(report)),
  ]);

  process.stdout.write(
    `${JSON.stringify({
      schemaVersion: report.schemaVersion,
      generatedAt: report.generatedAt,
      segments: report.summary.segments,
      coverageRatio: report.summary.coverageRatio,
      gapCount: report.summary.gapCount,
      partitionRequiredSegments: report.summary.partitionRequiredSegments,
      jsonPath: args.jsonPath,
      markdownPath: args.markdownPath,
    })}\n`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`DATA-COVERAGE-1 audit failed: ${message}\n`);
  process.exitCode = 1;
});
