#!/usr/bin/env python3
import json
import re
import urllib.request
import zipfile
from collections import Counter
from pathlib import Path
from xml.etree import ElementTree as ET

OUT = Path("data/audits/morocco-territory-source-audit")
OUT.mkdir(parents=True, exist_ok=True)

BARID_XLSX = "https://data.gov.ma/data/dataset/e0093dbf-38f0-440a-91da-ad3f0243f378/resource/7f257007-d512-4a2e-9f7f-ba29ee4ac8b1/download/codes-postaux-quartiers-2018.xlsx"
HCP_XLSX = "https://www.hcp.ma/file/242341/"
GEOB_API = "https://www.geoboundaries.org/api/current/gbOpen/MAR/{level}/"

UA = "AkarFinder territorial source audit/1.0 (+https://github.com/hraaaaf/Akarfinder)"

def fetch_bytes(url: str, timeout: int = 60) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read()


def fetch_json(url: str):
    return json.loads(fetch_bytes(url).decode("utf-8"))


def col_index(cell_ref: str) -> int:
    letters = re.match(r"([A-Z]+)", cell_ref or "A").group(1)
    value = 0
    for ch in letters:
        value = value * 26 + (ord(ch) - 64)
    return value - 1


def xlsx_rows(blob: bytes):
    with zipfile.ZipFile(Path("/tmp/source.xlsx"), mode="w") as _:  # pragma: no cover
        pass


def parse_xlsx(blob: bytes):
    tmp = Path("/tmp/territory-source.xlsx")
    tmp.write_bytes(blob)
    with zipfile.ZipFile(tmp) as z:
        shared = []
        if "xl/sharedStrings.xml" in z.namelist():
            root = ET.fromstring(z.read("xl/sharedStrings.xml"))
            ns = {"a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
            for si in root.findall("a:si", ns):
                shared.append("".join((t.text or "") for t in si.findall(".//a:t", ns)))

        workbook = ET.fromstring(z.read("xl/workbook.xml"))
        rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
        ns = {
            "a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
            "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
            "p": "http://schemas.openxmlformats.org/package/2006/relationships",
        }
        rel_map = {rel.attrib["Id"]: rel.attrib["Target"] for rel in rels.findall("p:Relationship", ns)}
        sheets = []
        for sheet in workbook.findall("a:sheets/a:sheet", ns):
            rid = sheet.attrib[f"{{{ns['r']}}}id"]
            target = rel_map[rid]
            if not target.startswith("xl/"):
                target = "xl/" + target.lstrip("/")
            xml = ET.fromstring(z.read(target))
            rows = []
            for row in xml.findall(".//a:sheetData/a:row", ns):
                values = []
                for cell in row.findall("a:c", ns):
                    idx = col_index(cell.attrib.get("r", "A1"))
                    while len(values) <= idx:
                        values.append("")
                    cell_type = cell.attrib.get("t")
                    v = cell.find("a:v", ns)
                    value = "" if v is None else (v.text or "")
                    if cell_type == "s" and value:
                        try:
                            value = shared[int(value)]
                        except Exception:
                            pass
                    elif cell_type == "inlineStr":
                        t = cell.find(".//a:t", ns)
                        value = "" if t is None else (t.text or "")
                    values[idx] = value.strip() if isinstance(value, str) else value
                if any(str(v).strip() for v in values):
                    rows.append(values)
            sheets.append({"name": sheet.attrib.get("name", "Sheet"), "rows": rows})
        return sheets


def norm(value):
    text = str(value or "").strip()
    text = re.sub(r"\s+", " ", text)
    return text


def parse_barid(blob: bytes):
    sheets = parse_xlsx(blob)
    best = max(sheets, key=lambda s: len(s["rows"]))
    rows = best["rows"]
    header_i = 0
    for i, row in enumerate(rows[:20]):
        joined = " | ".join(norm(v).lower() for v in row)
        if "ville" in joined and ("quartier" in joined or "local" in joined):
            header_i = i
            break
    header = [norm(v) for v in rows[header_i]]
    lowered = [h.lower() for h in header]
    def find_col(tokens):
        for i, h in enumerate(lowered):
            if any(token in h for token in tokens):
                return i
        return None
    city_col = find_col(["ville", "localité", "localite"])
    district_col = find_col(["quartier", "secteur", "zone"])
    postal_col = find_col(["code postal", "postal"])
    parsed = []
    if city_col is not None and district_col is not None:
        for row in rows[header_i + 1:]:
            city = norm(row[city_col] if city_col < len(row) else "")
            district = norm(row[district_col] if district_col < len(row) else "")
            postal = norm(row[postal_col] if postal_col is not None and postal_col < len(row) else "")
            if city and district:
                parsed.append({"city": city, "district": district, "postalCode": postal})
    return {
        "sheet": best["name"],
        "header": header,
        "rowCount": len(parsed),
        "cityCount": len({r["city"] for r in parsed}),
        "districtPairCount": len({(r["city"], r["district"]) for r in parsed}),
        "topCities": Counter(r["city"] for r in parsed).most_common(30),
        "rows": parsed,
    }


def inspect_hcp(blob: bytes):
    sheets = parse_xlsx(blob)
    return {
        "sheetCount": len(sheets),
        "sheets": [
            {"name": s["name"], "rowCount": len(s["rows"]), "preview": s["rows"][:8]}
            for s in sheets[:10]
        ],
    }


def inspect_geoboundaries(level: str):
    meta = fetch_json(GEOB_API.format(level=level))
    url = meta.get("simplifiedGeometryGeoJSON") or meta.get("gjDownloadURL")
    if not url:
        return {"level": level, "available": False, "meta": meta}
    geo = fetch_json(url)
    features = geo.get("features", [])
    props = [feature.get("properties", {}) for feature in features[:5]]
    return {
        "level": level,
        "available": True,
        "boundaryID": meta.get("boundaryID"),
        "boundaryYearRepresented": meta.get("boundaryYearRepresented"),
        "boundarySource": meta.get("boundarySource"),
        "boundaryLicense": meta.get("boundaryLicense"),
        "licenseSource": meta.get("licenseSource"),
        "admUnitCount": meta.get("admUnitCount"),
        "downloadURL": url,
        "featureCount": len(features),
        "propertyKeys": sorted({key for feature in features[:50] for key in feature.get("properties", {}).keys()}),
        "propertySamples": props,
    }


def main():
    report = {"ok": False, "sources": {}, "errors": []}

    try:
        blob = fetch_bytes(BARID_XLSX)
        barid = parse_barid(blob)
        report["sources"]["barid"] = {
            "url": BARID_XLSX,
            "license": "ODbL-1.0",
            **{k: v for k, v in barid.items() if k != "rows"},
        }
        (OUT / "barid-neighborhoods.json").write_text(json.dumps(barid["rows"], ensure_ascii=False, indent=2))
    except Exception as error:
        report["errors"].append({"source": "barid", "error": repr(error)})

    try:
        blob = fetch_bytes(HCP_XLSX)
        report["sources"]["hcp"] = {"url": HCP_XLSX, **inspect_hcp(blob)}
    except Exception as error:
        report["errors"].append({"source": "hcp", "error": repr(error)})

    geob = {}
    for level in ["ADM2", "ADM3", "ADM4", "ADM5"]:
        try:
            geob[level] = inspect_geoboundaries(level)
        except Exception as error:
            geob[level] = {"level": level, "available": False, "error": repr(error)}
    report["sources"]["geoBoundaries"] = geob

    report["ok"] = "barid" in report["sources"] and any(v.get("available") for v in geob.values())
    (OUT / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))
    if not report["ok"]:
        raise SystemExit(1)

if __name__ == "__main__":
    main()
