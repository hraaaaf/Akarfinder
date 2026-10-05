import fs from "node:fs";
import zlib from "node:zlib";
import readline from "node:readline";
import crypto from "node:crypto";
import path from "node:path";

const input = process.env.FREEZE_JSONL_GZ || process.argv[2];
const outDir = process.env.OUTPUT_DIR || process.argv[3] || "data/recovery/parser-readiness-v2";
const expectedSha =
  process.env.FREEZE_SHA256 ||
  "e7ac4bca2db34ad334ed7234cfb8be93fc9baca68a9694f5024989b5cc2bb953";

if (!input) throw new Error("FREEZE_JSONL_GZ or argv[2] is required");

const actualSha = crypto
  .createHash("sha256")
  .update(fs.readFileSync(input))
  .digest("hex");

if (actualSha !== expectedSha) {
  throw new Error("freeze sha mismatch: " + actualSha);
}

function present(value) {
  return value !== null && value !== undefined && value !== "";
}

function normalize(value) {
  return String(value).trim().toLowerCase().replaceAll("_", "-");
}

function pathParts(url) {
  try {
    return new URL(url).pathname
      .split("/")
      .filter(Boolean)
      .map((part) => decodeURIComponent(part).toLowerCase());
  } catch {
    return [];
  }
}

function structuredRouteCandidates(row) {
  const source = row.source_domain;
  const p = pathParts(row.canonical_url);
  const out = {};

  if (
    source === "agenz.ma" &&
    p.length >= 6 &&
    p[1] === "annonces" &&
    p[2].startsWith("immo-")
  ) {
    out.city = p[2].slice(5);
    const split = p[3].indexOf("-");
    if (split > 0) {
      const tx = p[3].slice(0, split);
      const propertyType = p[3].slice(split + 1);
      if (["vente", "location"].includes(tx)) out.transaction_type = tx;
      if (propertyType) out.property_type = propertyType.replace(/s$/, "");
    }
    if (p[4] && !/^\d+$/.test(p[4])) out.district = p[4];
  } else if (
    source === "marocimmo.com" &&
    p.length >= 6 &&
    ["fr", "en", "ar"].includes(p[0])
  ) {
    if (["vente", "location"].includes(p[1])) out.transaction_type = p[1];
    out.property_type = p[2];
    out.city = p[3];
    out.district = p[4];
  } else if (
    source === "domio.ma" &&
    p.length >= 5 &&
    ["fr", "en", "ar"].includes(p[0])
  ) {
    out.property_type = p[1];
    if (["louer", "vendre"].includes(p[2])) out.transaction_type = p[2];
    out.city = p[3];
  } else if (
    source === "mouldar.com" &&
    p.length >= 6 &&
    ["fr", "en", "ar"].includes(p[0])
  ) {
    const tx = {
      buy: "sale",
      achat: "sale",
      rent: "rent",
      location: "rent",
    }[p[1]];
    if (tx) out.transaction_type = tx;
    out.property_type = p[2];
    out.city = p[3];
    if (!["all-the-city", "toute-la-ville", "all-city"].includes(p[4])) {
      out.district = p[4];
    }
  } else if (
    source === "kawtarimmobilier.com" &&
    p.length >= 4 &&
    ["vente", "location"].includes(p[1])
  ) {
    out.city = p[0];
    out.transaction_type = p[1];
    out.property_type = p[2];
  } else if (
    source === "barnes-marrakech.com" &&
    p.length >= 4 &&
    ["fr", "en"].includes(p[0]) &&
    ["vente", "location", "sale", "rent"].includes(p[1])
  ) {
    out.transaction_type = p[1];
    out.city = p[2];
  } else if (
    source === "masaken.ma" &&
    p.length >= 4 &&
    p[1] === "immobilier-maroc"
  ) {
    const segment = p[2];
    const transactions = [
      ["vente-", "sale"],
      ["location-", "rent"],
      ["sale-", "sale"],
      ["rental-", "rent"],
    ];
    const propertyTypes = [
      "appartement",
      "apartment",
      "terrain",
      "land",
      "villa",
      "maison",
      "house",
      "bureau",
      "office",
      "commerce",
      "commercial",
      "riad",
      "ferme",
      "farm",
    ];

    for (const [prefix, tx] of transactions) {
      if (!segment.startsWith(prefix)) continue;
      const remainder = segment.slice(prefix.length);
      for (const propertyType of propertyTypes) {
        if (remainder.startsWith(propertyType + "-")) {
          out.transaction_type = tx;
          out.property_type = propertyType;
          out.city = remainder.slice(propertyType.length + 1);
          break;
        }
      }
      break;
    }
  } else if (
    source === "soukimmobilier.com" &&
    p.length >= 4 &&
    ["fr", "ar", "en"].includes(p[0])
  ) {
    const notCity = ["sale", "vente", "location", "rent", "buy", "achat"];
    if (!notCity.includes(p[1]) && !/^\d+$/.test(p[1])) {
      out.city = p[1];
      out.property_type = p[2];
    }
  }

  return out;
}

const requiredFields = [
  "canonical_url",
  "city",
  "district",
  "price_mad",
  "surface_m2",
];

const trackedFields = [
  "city",
  "district",
  "price_mad",
  "surface_m2",
  "title",
  "description",
  "published_at",
];

const structuredFields = [
  "city",
  "district",
  "transaction_type",
  "property_type",
];

const total = {
  rows: 0,
  unique_urls: 0,
  scope_eligible: 0,
  keep: 0,
  deep200: 0,
  complete_required: 0,
};

const keyPresence = Object.fromEntries(trackedFields.map((field) => [field, 0]));
const routeCandidateCounts = Object.fromEntries(
  structuredFields.map((field) => [field, 0]),
);
const definiteStructuredRouteParserMisses = Object.fromEntries(
  structuredFields.map((field) => [field, 0]),
);
const structuredRouteSame = Object.fromEntries(
  structuredFields.map((field) => [field, 0]),
);
const structuredRouteConflicts = Object.fromEntries(
  structuredFields.map((field) => [field, 0]),
);

const uniqueUrls = new Set();
const sources = {};
const misses = [];

const rl = readline.createInterface({
  input: fs.createReadStream(input).pipe(zlib.createGunzip()),
  crlfDelay: Infinity,
});

for await (const line of rl) {
  if (!line.trim()) continue;
  const row = JSON.parse(line);
  total.rows += 1;
  uniqueUrls.add(row.canonical_url);
  if (row.scope_eligible) total.scope_eligible += 1;
  if (row.classification === "KEEP") total.keep += 1;
  if ((row.deep_http_statuses || []).includes(200)) total.deep200 += 1;
  if (requiredFields.every((field) => present(row[field]))) {
    total.complete_required += 1;
  }

  for (const field of trackedFields) {
    if (present(row[field])) keyPresence[field] += 1;
  }

  const sourceName = row.source_domain;
  sources[sourceName] ||= {
    rows: 0,
    scope_eligible: 0,
    keep: 0,
    deep200: 0,
    city: 0,
    district: 0,
    price_mad: 0,
    surface_m2: 0,
    complete_required: 0,
    structured_parser_miss: {},
  };
  const source = sources[sourceName];
  source.rows += 1;
  if (row.scope_eligible) source.scope_eligible += 1;
  if (row.classification === "KEEP") source.keep += 1;
  if ((row.deep_http_statuses || []).includes(200)) source.deep200 += 1;
  for (const field of ["city", "district", "price_mad", "surface_m2"]) {
    if (present(row[field])) source[field] += 1;
  }
  if (requiredFields.every((field) => present(row[field]))) {
    source.complete_required += 1;
  }

  const candidates = structuredRouteCandidates(row);
  for (const [field, value] of Object.entries(candidates)) {
    routeCandidateCounts[field] += 1;
    if (!present(row[field])) {
      definiteStructuredRouteParserMisses[field] += 1;
      source.structured_parser_miss[field] =
        (source.structured_parser_miss[field] || 0) + 1;
      misses.push({
        url: row.canonical_url,
        source: sourceName,
        field,
        value,
        state: "parser_miss_structured_route",
        confidence: "high",
        evidence: "canonical_url_structured_route",
      });
    } else if (normalize(row[field]) === normalize(value)) {
      structuredRouteSame[field] += 1;
    } else {
      structuredRouteConflicts[field] += 1;
      misses.push({
        url: row.canonical_url,
        source: sourceName,
        field,
        value,
        current: row[field],
        state: "conflict",
        confidence: "high",
        evidence: "canonical_url_structured_route",
      });
    }
  }
}

total.unique_urls = uniqueUrls.size;

for (const source of Object.values(sources)) {
  source.deep200_pct = +(100 * source.deep200 / source.rows).toFixed(2);
  source.complete_required_pct_all = +(
    100 *
    source.complete_required /
    source.rows
  ).toFixed(3);

  if (source.deep200) {
    source.complete_required_pct_deep200 = +(
      100 *
      source.complete_required /
      source.deep200
    ).toFixed(2);
    for (const field of ["city", "district", "price_mad", "surface_m2"]) {
      source[field + "_pct_deep200"] = +(
        100 *
        source[field] /
        source.deep200
      ).toFixed(2);
    }
  }
}

const sourcePriority = Object.entries(sources)
  .sort(([, a], [, b]) => b.rows - a.rows)
  .map(([source, stats]) => ({
    source,
    rows: stats.rows,
    scope_eligible: stats.scope_eligible,
    deep200: stats.deep200,
    complete_required: stats.complete_required,
    structured_parser_miss: stats.structured_parser_miss,
  }));

const summary = {
  schema_version: "AKARFINDER_PARSER_READINESS_V2_BASELINE",
  freeze_sha256: actualSha,
  database_access: 0,
  database_writes: 0,
  required_exploitable_fields: requiredFields,
  total,
  key_presence: keyPresence,
  route_candidate_counts: routeCandidateCounts,
  definite_structured_route_parser_misses:
    definiteStructuredRouteParserMisses,
  structured_route_same: structuredRouteSame,
  structured_route_conflicts: structuredRouteConflicts,
  source_priority: sourcePriority,
  source: sources,
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, "parser-readiness-v2-summary.json"),
  JSON.stringify(summary, null, 2) + "\n",
);
fs.writeFileSync(
  path.join(outDir, "parser-readiness-v2-structured-route-misses.jsonl"),
  misses.map((row) => JSON.stringify(row)).join("\n") + "\n",
);

console.log(JSON.stringify(summary, null, 2));

if (
  total.rows !== 226286 ||
  total.unique_urls !== 226286 ||
  Object.values(structuredRouteConflicts).some(Boolean)
) {
  process.exitCode = 2;
}
