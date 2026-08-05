import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MAX_FEED_COLUMNS,
  MAX_FEED_ROWS,
  parseCsvBuffer,
  parseFeedBuffer,
  parseXlsxBuffer,
} from "../../partner-feeds/quarantine-parser.js";

function zipStored(entries: Record<string, string>): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const [name, value] of Object.entries(entries)) {
    const nameBuffer = Buffer.from(name);
    const data = Buffer.from(value);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt32LE(0, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuffer.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, nameBuffer, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt32LE(0, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuffer.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, nameBuffer);
    offset += local.length + nameBuffer.length + data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(Object.keys(entries).length, 8);
  eocd.writeUInt16LE(Object.keys(entries).length, 10);
  eocd.writeUInt32LE(centralDirectory.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...localParts, centralDirectory, eocd]);
}

function minimalXlsx(): Buffer {
  return zipStored({
    "xl/workbook.xml": `<?xml version="1.0"?><workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Catalogue" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0"?><Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>`,
    "xl/sharedStrings.xml": `<?xml version="1.0"?><sst><si><t>city</t></si><si><t>price</t></si><si><t>Rabat</t></si></sst>`,
    "xl/worksheets/sheet1.xml": `<?xml version="1.0"?><worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row><row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2"><v>1200000</v></c></row><row r="3"><c r="A3" t="inlineStr"><is><t>=IMPORTXML()</t></is></c><c r="B3"><f>1+1</f><v>2</v></c></row></sheetData></worksheet>`,
  });
}

describe("partner feed quarantine parser", () => {
  it("detects semicolon CSV and normalizes duplicate headers", () => {
    const parsed = parseCsvBuffer(Buffer.from("Ville;Ville;Prix\nRabat;Agdal;1200000"));
    assert.equal(parsed.format, "csv");
    assert.deepEqual(parsed.headers, ["ville", "ville_2", "prix"]);
    assert.equal(parsed.rows[0].ville_2, "Agdal");
  });

  it("neutralizes spreadsheet formulas in CSV", () => {
    const parsed = parseCsvBuffer(Buffer.from("title,price\n=HYPERLINK(\"x\"),100"));
    assert.equal(parsed.rows[0].title.startsWith("'="), true);
    assert.equal(parsed.formulaCellsNeutralized, 1);
  });

  it("parses a package-free XLSX sheet without evaluating formulas", () => {
    const parsed = parseXlsxBuffer(minimalXlsx(), "Catalogue");
    assert.equal(parsed.format, "xlsx");
    assert.equal(parsed.sheetName, "Catalogue");
    assert.equal(parsed.rows[0].city, "Rabat");
    assert.equal(parsed.rows[0].price, "1200000");
    assert.equal(parsed.rows[1].city, "'=IMPORTXML()");
    assert.equal(parsed.rows[1].price, "'[FORMULA_BLOCKED]");
    assert.equal(parsed.formulaCellsNeutralized, 2);
  });

  it("rejects macro-enabled workbooks", () => {
    assert.throws(() => parseFeedBuffer(Buffer.alloc(1), { filename: "catalogue.xlsm" }), /xlsx_macros_forbidden/);
  });

  it("rejects unsupported formats", () => {
    assert.throws(() => parseFeedBuffer(Buffer.from("x"), { filename: "catalogue.xls" }), /feed_format_unsupported/);
  });

  it("enforces row limits", () => {
    const csv = ["a", ...Array.from({ length: MAX_FEED_ROWS + 1 }, () => "x")].join("\n");
    assert.throws(() => parseCsvBuffer(Buffer.from(csv)), /feed_row_limit_exceeded/);
  });

  it("enforces column limits", () => {
    const header = Array.from({ length: MAX_FEED_COLUMNS + 1 }, (_, index) => `c${index}`).join(",");
    assert.throws(() => parseCsvBuffer(Buffer.from(`${header}\nvalue`)), /feed_column_limit_exceeded/);
  });

  it("keeps preview bounded to twenty rows", () => {
    const csv = ["id", ...Array.from({ length: 25 }, (_, index) => String(index + 1))].join("\n");
    const parsed = parseCsvBuffer(Buffer.from(csv));
    assert.equal(parsed.rows.length, 25);
    assert.equal(parsed.preview.length, 20);
  });
});
