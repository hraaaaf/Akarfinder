import { createWriteStream } from "node:fs";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL missing");
const sql = neon(url);
const outPath = process.env.OUTPUT_JSONL ?? "neon-semantic-corpus.jsonl";
const summaryPath = process.env.OUTPUT_SUMMARY ?? "neon-semantic-corpus-summary.json";
const out = createWriteStream(outPath, { encoding: "utf8" });

const PAGE = 2000;
let lastId = 0;
let rows = 0;
const summary = {
  total: 0,
  price_null: 0,
  surface_null: 0,
  flags: {
    transaction_conflict: 0,
    property_type_conflict: 0,
    surface_title_conflict: 0,
    sale_title_price_conflict: 0,
    unsupported_rental_cadence: 0,
    bedroom_conflict: 0,
    bathroom_conflict: 0,
    room_conflict: 0,
    extreme_price: 0,
    physical_surface: 0,
  },
  certified_no_strong_conflict: 0,
};

function uniqueNumbers(matches) {
  const values = matches.map((m) => Number(String(m).replace(/[^0-9]/g, ""))).filter(Number.isFinite);
  return [...new Set(values)];
}
function one(regex, text) {
  const values = uniqueNumbers(Array.from(text.matchAll(regex), (m) => m[1]));
  return values.length === 1 ? values[0] : null;
}
function explicitCount(text, kind) {
  const patterns = kind === "bedroom"
    ? [/(?:chambres?|bedrooms?)\s*[:=-]?\s*(\d{1,3})(?!\d)/giu, /(\d{1,3})\s*chambres?/giu]
    : kind === "bathroom"
      ? [/(?:salle?s?\s*de\s*bain|sdb|bathrooms?)\s*[:=-]?\s*(\d{1,2})(?!\d)/giu, /(\d{1,2})\s*(?:salle?s?\s*de\s*bain|sdb)/giu]
      : [/(?:pi[eè]ces?|rooms?)\s*[:=-]?\s*(\d{1,3})(?!\d)/giu, /(\d{1,3})\s*pi[eè]ces?/giu, /(\d{1,3})\s*rooms?/giu];
  const vals = [];
  for (const re of patterns) for (const m of text.matchAll(re)) vals.push(Number(m[1]));
  const unique = [...new Set(vals.filter(Number.isFinite))];
  return unique.length === 1 ? unique[0] : null;
}
function structuralUrlEvidence(r) {
  const raw = r.listing_url ?? "";
  let url;
  try { url = new URL(raw); } catch { return {transaction:null,propertyType:null}; }
  const host = url.hostname.toLowerCase().replace(/^www\./,"");
  const segments = decodeURIComponent(url.pathname).toLowerCase().split("/").filter(Boolean);
  const mapType = (value) => {
    const v = value ?? "";
    if (/^appart(?:ement|ements)?$/.test(v)) return "apartment";
    if (/^studios?$/.test(v)) return "studio";
    if (/^villas?$/.test(v) || v === "villas_et_riads") return "villa";
    if (/^maisons?$/.test(v)) return "house";
    if (/^terrains?$/.test(v)) return "land";
    if (/^bureaux?$/.test(v)) return "office";
    if (/^(?:local|locaux|commerce|commercial|magasin)s?$/.test(v) || v === "locaux-magasins") return "commercial";
    if (/^riads?$/.test(v)) return "riad";
    return null;
  };
  if (host === "agenz.ma") {
    const route=segments.find((x)=>/^(?:vente|location)-/.test(x));
    if(route){const [tx,...rest]=route.split("-");return {transaction:tx==="vente"?"sale":"rent",propertyType:mapType(rest.join("-"))};}
  }
  if(host==="marocimmo.com"){
    const i=segments.findIndex((x)=>x==="vente"||x==="location");
    if(i>=0)return {transaction:segments[i]==="vente"?"sale":"rent",propertyType:mapType(segments[i+1])};
  }
  if(host==="domio.ma"){
    const i=segments.findIndex((x)=>x==="vendre"||x==="louer");
    if(i>0)return {transaction:segments[i]==="vendre"?"sale":"rent",propertyType:mapType(segments[i-1])};
  }
  if(host==="mouldar.com"){
    const i=segments.findIndex((x)=>x==="achat"||x==="location"||x==="rent");
    if(i>=0)return {transaction:segments[i]==="achat"?"sale":"rent",propertyType:mapType(segments[i+1])};
  }
  if(host==="masaken.ma"){
    const route=segments.find((x)=>/^(?:vente|location)-/.test(x));
    if(route){const parts=route.split("-");return {transaction:parts[0]==="vente"?"sale":"rent",propertyType:mapType(parts[1])};}
  }
  if(host==="sarouty.ma"){
    const i=segments.findIndex((x)=>x==="acheter"||x==="louer");
    if(i>=0)return {transaction:segments[i]==="acheter"?"sale":"rent",propertyType:mapType((segments[i+1]??"").split("-")[0])};
  }
  if(host==="avito.ma"){
    return {transaction:null,propertyType:segments.map(mapType).find(Boolean)??null};
  }
  return {transaction:null,propertyType:null};
}
function primaryTitleTransaction(r){
  const t=(r.title??"").toLowerCase();
  const sale=/(?:^|\W)(?:vente|vendu|à vendre|a vendre)(?:\W|$)/u.test(t);
  const rent=/(?:^|\W)(?:location|loué|loue|à louer|a louer)(?:\W|$)/u.test(t);
  return sale===rent?null:(sale?"sale":"rent");
}
function primaryTitleType(r){
  const t=(r.title??"").toLowerCase();
  const rules=[
    ["land",/^(?:terrain|lot de terrain|ferme)\b|\b(?:terrain|lot de terrain|ferme)\s+(?:à|a)\s+(?:vendre|louer)\b/u],
    ["villa",/^villa\b|\bvilla\s+(?:à|a)\s+(?:vendre|louer)\b/u],
    ["studio",/^studio\b|\bstudio\s+(?:à|a)\s+(?:vendre|louer)\b/u],
    ["office",/^(?:bureau|plateau bureau)\b|\b(?:bureau|plateau bureau)\s+(?:à|a)\s+(?:vendre|louer)\b/u],
    ["commercial",/^(?:local commercial|magasin|commerce)\b|\b(?:local commercial|magasin|commerce)\s+(?:à|a)\s+(?:vendre|louer)\b/u],
    ["riad",/^riad\s+(?:à|a)\s+(?:vendre|louer)\b/u],
    ["apartment",/^(?:appartement|appart)\b|\b(?:appartement|appart)\s+(?:à|a)\s+(?:vendre|louer)\b/u],
    ["house",/^maison\b|\bmaison\s+(?:à|a)\s+(?:vendre|louer)\b/u],
  ];
  return rules.find(([,re])=>re.test(t))?.[0]??null;
}

function flags(r) {
  const title = r.title ?? "";
  const t = title.toLowerCase();
  const u = (r.listing_url ?? "").toLowerCase();
  const text = `${title} ${r.description_snippet ?? ""}`;
  const titleTx = primaryTitleTransaction(r);
  const structural = structuralUrlEvidence(r);
  const transaction_conflict =
    Boolean(titleTx && structural.transaction && titleTx !== structural.transaction) ||
    Boolean(titleTx && titleTx !== r.transaction_type) ||
    Boolean(structural.transaction && structural.transaction !== r.transaction_type);

  const titleType = primaryTitleType(r);
  const equivalent = (evidenceType) =>
    evidenceType == null ||
    evidenceType === r.property_type ||
    (evidenceType === "studio" && r.property_type === "apartment") ||
    (evidenceType === "apartment" && r.property_type === "studio") ||
    (evidenceType === "villa" && r.property_type === "house") ||
    (evidenceType === "house" && r.property_type === "villa") ||
    (evidenceType === "riad" && ["house","villa"].includes(r.property_type));
  const property_type_conflict =
    Boolean(titleType && structural.propertyType && titleType !== structural.propertyType) ||
    !equivalent(titleType) ||
    !equivalent(structural.propertyType);

  const titleSurface = one(/([0-9]{1,3}(?:[ .,'’][0-9]{3})+|[0-9]{1,7})\s*m(?:²|2)(?=[^0-9]|$)/giu, title);
  const surface_title_conflict = r.surface_m2 != null && titleSurface != null && titleSurface >= 8 && titleSurface <= 10_000_000 && titleSurface !== r.surface_m2;
  const physical_surface = r.surface_m2 != null && (r.surface_m2 < 8 || (r.property_type === "land" ? r.surface_m2 > 10_000_000 : r.surface_m2 > 10_000));

  let titlePrice = null;
  if (r.transaction_type === "sale" && !/(?:mad|dhs?|dh|dirhams?)\s*(?:\/|par)\s*m(?:²|2)/iu.test(title)) {
    titlePrice = one(/([0-9]{1,3}(?:[ .,'’][0-9]{3})+|[0-9]{3,10})\s*(?:-\s*)?(?:mad|dhs?|dh|dirhams?)/giu, title);
  }
  const sale_title_price_conflict = r.price_mad != null && titlePrice != null && titlePrice >= 10_000 && titlePrice <= 500_000_000 && titlePrice !== r.price_mad;
  const extreme_price = r.price_mad != null && (r.price_mad > 500_000_000 || (r.transaction_type === "sale" && r.price_mad < 10_000) || (r.transaction_type === "rent" && r.price_mad < 100));
  const unsupported_rental_cadence = r.transaction_type === "rent" && /(?:par\s+jour|\/jour|journalier|journali[eè]re|par\s+nuit|nuit[eé]e|par\s+semaine|\/semaine|weekly|daily)/iu.test(text);

  const eb = explicitCount(text,"bedroom");
  const eba = explicitCount(text,"bathroom");
  const er = explicitCount(text,"room");
  const bedroom_conflict = r.bedrooms_count != null && eb != null && r.bedrooms_count !== eb;
  const bathroom_conflict = r.bathrooms_count != null && eba != null && r.bathrooms_count !== eba;
  const room_conflict = r.rooms_count != null && er != null && r.rooms_count !== er;

  return {transaction_conflict,property_type_conflict,surface_title_conflict,sale_title_price_conflict,unsupported_rental_cadence,bedroom_conflict,bathroom_conflict,room_conflict,extreme_price,physical_surface};
}

while (true) {
  const page = await sql`
    SELECT p.id,p.canonical_fingerprint,p.title,p.price_mad,p.city,p.district,
           p.property_type,p.transaction_type,p.surface_m2,p.rooms_count,
           p.bedrooms_count,p.bathrooms_count,p.description_snippet,
           p.data_completeness_score,p.field_confidence,p.built_surface_m2,p.plot_surface_m2,
           p.condition,p.property_age_range,p.orientation,p.floor_type,p.floors_count,
           p.garden_m2,p.terrace_m2,p.garage_spaces,p.has_pool,p.has_concierge,
           p.has_moroccan_living_room,p.has_european_living_room,p.has_equipped_kitchen,
           p.premium_features,p.thumbnail_url,
           s.source_name,s.listing_url,s.source_url,s.origin_type,s.compliance_status,
           s.ingestion_run_id,s.displayed_price,s.price_currency,s.price_period,s.price_status
    FROM property_listings p
    JOIN listing_sources s ON s.property_listing_id=p.id
    WHERE p.id > ${lastId}
    ORDER BY p.id
    LIMIT ${PAGE}
  `;
  if (!page.length) break;
  for (const r of page) {
    const integrity = flags(r);
    const conflict = Object.values(integrity).some(Boolean);
    const record = { ...r, semantic_integrity: { strong_conflict: conflict, flags: integrity } };
    out.write(JSON.stringify(record) + "\n");
    rows++;
    summary.total++;
    if (r.price_mad == null) summary.price_null++;
    if (r.surface_m2 == null) summary.surface_null++;
    for (const [k,v] of Object.entries(integrity)) if (v) summary.flags[k]++;
    if (!conflict) summary.certified_no_strong_conflict++;
    lastId = Number(r.id);
  }
  process.stdout.write(`exported=${rows} last_id=${lastId}\n`);
}
await new Promise((resolve,reject)=>out.end((err)=>err?reject(err):resolve()));
await import("node:fs/promises").then(({writeFile})=>writeFile(summaryPath,JSON.stringify(summary,null,2)+"\n"));
if (rows !== 151900) throw new Error(`expected 151900 rows, exported ${rows}`);
console.log(JSON.stringify(summary,null,2));
