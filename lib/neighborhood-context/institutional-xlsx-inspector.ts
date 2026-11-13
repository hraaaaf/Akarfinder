import { inflateRawSync } from "node:zlib";

const MAX_ARCHIVE_BYTES = 3 * 1024 * 1024;
const MAX_UNCOMPRESSED_XML = 8 * 1024 * 1024;
const MAX_ENTRIES = 2048;
const MAX_SAMPLE_ROWS = 12;
type ZipEntry = { name: string; method: number; compressed: number; uncompressed: number; localOffset: number };

export type InstitutionalXlsxHeaderInspection = {
  sheet_entry: string;
  sheet_entries_found: number;
  reported_dimension: string | null;
  sampled_row_count: number;
  header_row_number: number | null;
  header_candidates: string[];
  latitude_header_candidate: string | null;
  longitude_header_candidate: string | null;
  gps_columns_candidate: boolean;
  column_detection_is_heuristic: true;
  coordinates_verified: false;
  individual_entity_verified: false;
};

function must(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function xmlDecode(value: string): string {
  return value.replace(/&#(?:x([0-9a-fA-F]+)|([0-9]+));|&(amp|lt|gt|quot|apos);/g, (full, hex, decimal, named) => {
    const num = hex ? Number.parseInt(hex, 16) : decimal ? Number.parseInt(decimal, 10) : null;
    if (num != null) return num >= 0 && num <= 0x10ffff && !(num >= 0xd800 && num <= 0xdfff)
      ? String.fromCodePoint(num) : full;
    return ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" } as Record<string, string>)[named] ?? full;
  });
}
function attr(raw: string, name: string): string | null {
  const m = raw.match(new RegExp("(?:^|\\s)" + name + '="([^"]*)"'));
  return m ? xmlDecode(m[1]) : null;
}
function entriesOfZip(file: Buffer): Map<string, ZipEntry> {
  must(file.length >= 22 && file.length <= MAX_ARCHIVE_BYTES, "invalid_archive_size");
  let end = -1;
  for (let pos = file.length - 22; pos >= Math.max(0, file.length - 65557); pos -= 1) {
    if (file.readUInt32LE(pos) === 0x06054b50) { end = pos; break; }
  }
  must(end >= 0 && end + 22 <= file.length, "zip_eocd_missing");
  must(file.readUInt16LE(end + 4) === 0 && file.readUInt16LE(end + 6) === 0, "zip_multidisk_not_allowed");
  const count = file.readUInt16LE(end + 10);
  const directorySize = file.readUInt32LE(end + 12);
  const start = file.readUInt32LE(end + 16);
  must(count > 0 && count <= MAX_ENTRIES, "zip_entry_count_invalid");
  must(start + directorySize <= end, "zip_directory_out_of_bounds");
  const entries = new Map<string, ZipEntry>();
  let at = start;
  for (let i = 0; i < count; i += 1) {
    must(at + 46 <= file.length && file.readUInt32LE(at) === 0x02014b50, "zip_directory_entry_invalid");
    const flags = file.readUInt16LE(at + 8);
    const method = file.readUInt16LE(at + 10);
    const compressed = file.readUInt32LE(at + 20);
    const uncompressed = file.readUInt32LE(at + 24);
    const nameSize = file.readUInt16LE(at + 28);
    const extraSize = file.readUInt16LE(at + 30);
    const commentSize = file.readUInt16LE(at + 32);
    const localOffset = file.readUInt32LE(at + 42);
    const next = at + 46 + nameSize + extraSize + commentSize;
    must(next <= file.length && next <= start + directorySize, "zip_directory_name_out_of_bounds");
    must((flags & 1) === 0 && (method === 0 || method === 8), "zip_encrypted_or_unsupported_method");
    must(compressed !== 0xffffffff && uncompressed <= MAX_UNCOMPRESSED_XML, "zip_entry_too_large");
    const name = file.subarray(at + 46, at + 46 + nameSize).toString("utf8");
    must(!name.startsWith("/") && !name.includes("..") && !name.includes("\\"), "zip_unsafe_name");
    entries.set(name, { name, method, compressed, uncompressed, localOffset });
    at = next;
  }
  return entries;
}
function unzipXml(file: Buffer, entry: ZipEntry): string {
  const local = entry.localOffset;
  must(local >= 0 && local + 30 <= file.length && file.readUInt32LE(local) === 0x04034b50, "zip_local_header_invalid");
  const nameLength = file.readUInt16LE(local + 26);
  const extraLength = file.readUInt16LE(local + 28);
  const dataStart = local + 30 + nameLength + extraLength;
  must(dataStart + entry.compressed <= file.length, "zip_entry_out_of_bounds");
  const packed = file.subarray(dataStart, dataStart + entry.compressed);
  const raw = entry.method === 0 ? packed : inflateRawSync(packed, { maxOutputLength: MAX_UNCOMPRESSED_XML });
  must(raw.length === entry.uncompressed, "zip_entry_length_mismatch");
  return raw.toString("utf8");
}
function sharedStrings(xml: string): string[] {
  const result: string[] = [];
  for (const si of xml.matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)) {
    const texts = [...si[1].matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => xmlDecode(m[1]));
    result.push(texts.join(""));
    if (result.length >= 100000) throw new Error("xlsx_shared_strings_count_exceeded");
  }
  return result;
}
function valueOfCell(attrs: string, xml: string, shared: string[]): string {
  const v = xml.match(/<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/)?.[1];
  if (attr(attrs, "t") === "s") {
    const index = Number(v);
    return Number.isInteger(index) && index >= 0 && index < shared.length ? shared[index] : "";
  }
  if (attr(attrs, "t") === "inlineStr") {
    return [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => xmlDecode(m[1])).join("");
  }
  return v == null ? "" : xmlDecode(v);
}
function tidy(value: string): string { return value.replace(/\s+/g, " ").trim().slice(0, 110); }
function normalized(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[_\-\s]+/g, " ").trim();
}
function latHeader(s: string): boolean {
  return /^(lat|latitude|gps latitude|coord latitude|coordonnee latitude|latitude gps)$/.test(normalized(s));
}
function lonHeader(s: string): boolean {
  return /^(lon|long|longitude|gps longitude|coord longitude|coordonnee longitude|longitude gps)$/.test(normalized(s));
}

/** Inspects headers ONLY from sheet1/first worksheet. No entity rows or GPS values are accepted. */
export function inspectInstitutionalXlsxHeaders(file: Buffer): InstitutionalXlsxHeaderInspection {
  const archive = entriesOfZip(file);
  const sheets = [...archive.keys()].filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
    .sort((a, b) => Number(a.match(/sheet(\d+)/)?.[1]) - Number(b.match(/sheet(\d+)/)?.[1]));
  must(sheets.length > 0, "xlsx_no_worksheet");
  const sheet = sheets[0];
  const xml = unzipXml(file, archive.get(sheet)!);
  must(xml.includes("<worksheet") && xml.includes("<sheetData"), "xlsx_invalid_worksheet");
  const strings = archive.get("xl/sharedStrings.xml") ? sharedStrings(unzipXml(file, archive.get("xl/sharedStrings.xml")!)) : [];
  const rows: Array<{ row: number; values: string[] }> = [];
  for (const row of xml.matchAll(/<row\b([^>]*?)>([\s\S]*?)<\/row>/g)) {
    if (rows.length >= MAX_SAMPLE_ROWS) break;
    const rowNumber = Number(attr(row[1], "r"));
    const values: string[] = [];
    for (const cell of row[2].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const content = tidy(valueOfCell(cell[1], cell[2] ?? "", strings));
      if (content) values.push(content);
      if (values.length > 100) break;
    }
    if (values.length) rows.push({ row: Number.isInteger(rowNumber) ? rowNumber : rows.length + 1, values });
  }
  const likelyHeader = [...rows].sort((a, b) => b.values.length - a.values.length || a.row - b.row)[0];
  const candidates = likelyHeader?.values ?? [];
  const lat = candidates.find(latHeader) ?? null;
  const lon = candidates.find(lonHeader) ?? null;
  return {
    sheet_entry: sheet, sheet_entries_found: sheets.length,
    reported_dimension: xml.match(/<dimension\b[^>]*ref="([^"]+)"/)?.[1] ?? null,
    sampled_row_count: rows.length,
    header_row_number: likelyHeader?.row ?? null,
    header_candidates: candidates,
    latitude_header_candidate: lat,
    longitude_header_candidate: lon,
    gps_columns_candidate: Boolean(lat && lon),
    column_detection_is_heuristic: true,
    coordinates_verified: false,
    individual_entity_verified: false,
  };
}
