import { inflateRawSync } from "node:zlib";

export const MAX_FEED_ROWS = 10_000;
export const MAX_FEED_COLUMNS = 200;
export const PREVIEW_ROWS = 20;

export type ParsedFeed = {
  format: "csv" | "xlsx";
  sheetName: string | null;
  headers: string[];
  rows: Array<Record<string, string>>;
  preview: Array<Record<string, string>>;
  formulaCellsNeutralized: number;
};

export type ParseFeedOptions = {
  filename: string;
  mimeType?: string | null;
  sheetName?: string | null;
};

function neutralizeFormula(value: string): { value: string; neutralized: boolean } {
  const trimmed = value.trimStart();
  const risky = /^[=+@]/.test(trimmed) || /^-[^0-9.,]/.test(trimmed);
  return risky ? { value: `'${value}`, neutralized: true } : { value, neutralized: false };
}

function normalizeHeaders(values: string[]): string[] {
  const seen = new Map<string, number>();
  return values.map((raw, index) => {
    const base = raw.trim().toLowerCase().replace(/\s+/g, "_") || `column_${index + 1}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}_${count + 1}`;
  });
}

function matrixToFeed(
  matrix: string[][],
  format: "csv" | "xlsx",
  sheetName: string | null,
  formulaCellsNeutralized = 0,
): ParsedFeed {
  if (matrix.length === 0) throw new Error("feed_empty");
  if (matrix.length - 1 > MAX_FEED_ROWS) throw new Error("feed_row_limit_exceeded");
  const width = Math.max(...matrix.map((row) => row.length));
  if (width > MAX_FEED_COLUMNS) throw new Error("feed_column_limit_exceeded");

  const headers = normalizeHeaders(matrix[0]);
  const rows = matrix.slice(1).map((values) => {
    const row: Record<string, string> = {};
    for (let index = 0; index < headers.length; index += 1) {
      row[headers[index]] = values[index] ?? "";
    }
    return row;
  });

  return {
    format,
    sheetName,
    headers,
    rows,
    preview: rows.slice(0, PREVIEW_ROWS),
    formulaCellsNeutralized,
  };
}

function detectDelimiter(text: string): string {
  const firstLine = text.replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0] ?? "";
  const candidates = [",", ";", "\t"];
  return candidates
    .map((delimiter) => ({ delimiter, count: firstLine.split(delimiter).length - 1 }))
    .sort((a, b) => b.count - a.count)[0]?.delimiter ?? ",";
}

export function parseCsvBuffer(buffer: Buffer): ParsedFeed {
  const text = buffer.toString("utf8").replace(/^\uFEFF/, "");
  const delimiter = detectDelimiter(text);
  const matrix: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let neutralized = 0;

  const pushField = () => {
    const safe = neutralizeFormula(field);
    field = "";
    if (safe.neutralized) neutralized += 1;
    row.push(safe.value);
  };
  const pushRow = () => {
    pushField();
    matrix.push(row);
    row = [];
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      pushField();
    } else if (char === "\n") {
      if (field.endsWith("\r")) field = field.slice(0, -1);
      pushRow();
      if (matrix.length > MAX_FEED_ROWS + 1) throw new Error("feed_row_limit_exceeded");
    } else {
      field += char;
    }
  }
  if (quoted) throw new Error("csv_unclosed_quote");
  if (row.length > 0 || field.length > 0) pushRow();
  while (matrix.length > 0 && matrix[matrix.length - 1].every((value) => value === "")) matrix.pop();
  return matrixToFeed(matrix, "csv", null, neutralized);
}

function unzipEntries(buffer: Buffer): Map<string, Buffer> {
  const eocdSignature = 0x06054b50;
  let eocd = -1;
  for (let index = buffer.length - 22; index >= Math.max(0, buffer.length - 65_557); index -= 1) {
    if (buffer.readUInt32LE(index) === eocdSignature) {
      eocd = index;
      break;
    }
  }
  if (eocd < 0) throw new Error("xlsx_zip_directory_missing");

  const entries = new Map<string, Buffer>();
  const count = buffer.readUInt16LE(eocd + 10);
  let cursor = buffer.readUInt32LE(eocd + 16);
  for (let index = 0; index < count; index += 1) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) throw new Error("xlsx_zip_entry_invalid");
    const method = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const name = buffer.subarray(cursor + 46, cursor + 46 + nameLength).toString("utf8");

    if (buffer.readUInt32LE(localOffset) !== 0x04034b50) throw new Error("xlsx_local_entry_invalid");
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = buffer.subarray(dataOffset, dataOffset + compressedSize);
    const data = method === 0 ? compressed : method === 8 ? inflateRawSync(compressed) : null;
    if (!data) throw new Error("xlsx_compression_unsupported");
    entries.set(name, data);
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function xmlDecode(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function columnIndex(reference: string): number {
  const letters = reference.match(/^[A-Z]+/i)?.[0]?.toUpperCase() ?? "A";
  let value = 0;
  for (const letter of letters) value = value * 26 + letter.charCodeAt(0) - 64;
  return value - 1;
}

export function parseXlsxBuffer(buffer: Buffer, requestedSheet?: string | null): ParsedFeed {
  const entries = unzipEntries(buffer);
  if (entries.has("xl/vbaProject.bin")) throw new Error("xlsx_macros_forbidden");
  const workbook = entries.get("xl/workbook.xml")?.toString("utf8");
  const relationships = entries.get("xl/_rels/workbook.xml.rels")?.toString("utf8");
  if (!workbook || !relationships) throw new Error("xlsx_workbook_missing");

  const relTargets = new Map<string, string>();
  for (const match of relationships.matchAll(/<Relationship\b[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"[^>]*\/?\s*>/g)) {
    relTargets.set(match[1], match[2]);
  }

  const sheets = [...workbook.matchAll(/<sheet\b[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"[^>]*\/?\s*>/g)]
    .map((match) => ({ name: xmlDecode(match[1]), relationshipId: match[2] }));
  const selected = requestedSheet ? sheets.find((sheet) => sheet.name === requestedSheet) : sheets[0];
  if (!selected) throw new Error("xlsx_sheet_not_found");
  const target = relTargets.get(selected.relationshipId);
  if (!target) throw new Error("xlsx_sheet_relationship_missing");
  const normalizedTarget = target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`;
  const worksheet = entries.get(normalizedTarget)?.toString("utf8");
  if (!worksheet) throw new Error("xlsx_sheet_missing");

  const sharedStringsXml = entries.get("xl/sharedStrings.xml")?.toString("utf8") ?? "";
  const sharedStrings = [...sharedStringsXml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((item) =>
    [...item[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((text) => xmlDecode(text[1])).join(""),
  );

  const rows = new Map<number, string[]>();
  let neutralized = 0;
  for (const match of worksheet.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
    const attributes = match[1];
    const body = match[2];
    const reference = attributes.match(/\br="([^"]+)"/)?.[1] ?? "A1";
    const rowNumber = Number(reference.match(/\d+$/)?.[0] ?? "1");
    if (rowNumber > MAX_FEED_ROWS + 1) throw new Error("feed_row_limit_exceeded");
    const column = columnIndex(reference);
    if (column >= MAX_FEED_COLUMNS) throw new Error("feed_column_limit_exceeded");
    const type = attributes.match(/\bt="([^"]+)"/)?.[1] ?? "n";
    let value = "";
    if (/<f\b/.test(body)) {
      value = "'[FORMULA_BLOCKED]";
      neutralized += 1;
    } else if (type === "inlineStr") {
      value = xmlDecode(body.match(/<t\b[^>]*>([\s\S]*?)<\/t>/)?.[1] ?? "");
    } else {
      const raw = xmlDecode(body.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "");
      value = type === "s" ? sharedStrings[Number(raw)] ?? "" : raw;
      const safe = neutralizeFormula(value);
      value = safe.value;
      if (safe.neutralized) neutralized += 1;
    }
    const row = rows.get(rowNumber) ?? [];
    row[column] = value;
    rows.set(rowNumber, row);
  }

  const lastRow = Math.max(0, ...rows.keys());
  const matrix = Array.from({ length: lastRow }, (_, index) => rows.get(index + 1) ?? []);
  return matrixToFeed(matrix, "xlsx", selected.name, neutralized);
}

export function parseFeedBuffer(buffer: Buffer, options: ParseFeedOptions): ParsedFeed {
  const filename = options.filename.toLowerCase();
  if (filename.endsWith(".xlsm")) throw new Error("xlsx_macros_forbidden");
  if (filename.endsWith(".csv") || options.mimeType?.includes("csv")) return parseCsvBuffer(buffer);
  if (filename.endsWith(".xlsx") || options.mimeType?.includes("spreadsheetml")) {
    return parseXlsxBuffer(buffer, options.sheetName);
  }
  throw new Error("feed_format_unsupported");
}
