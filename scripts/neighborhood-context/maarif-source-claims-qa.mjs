import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const SOURCE_CLAIMS_SCHEMA = "AKARFINDER_MAARIF_SOURCE_CLAIMS_QA_V1";
export const SOURCE_CONFLICTS_SCHEMA = "AKARFINDER_MAARIF_SOURCE_CONFLICTS_QA_V1";

function sourceIsHttps(url) {
  if (typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

export function extractStreetNumber(address) {
  if (typeof address !== "string") return null;
  const cleaned = address.trim().replace(/\s+/g, " ");
  if (cleaned.length < 4 || cleaned.length > 350) return null;
  const front = /^(\d{1,4})\s*(?:,|-|\s)\s*.+$/u.exec(cleaned);
  if (front) return Number(front[1]);
  const afterType = /^(?:boulevard|bd\.?|rue|avenue|av\.?)[^\d]{3,100}?(?:,|\s)\s*(\d{1,4})(?:\s|$)/iu.exec(cleaned);
  return afterType ? Number(afterType[1]) : null;
}

/**
 * Records *source contradictions*, not whether venues are open.
 * Claims are copied from separately observed documents and remain private QA.
 * A publication never follows automatically from this output.
 */
export function evaluateMaarifSourceClaims(ledger) {
  const hardErrors = [];
  const result = {
    schema: SOURCE_CONFLICTS_SCHEMA,
    structural_ok: false,
    claims_count: 0,
    candidate_count: 0,
    primary_source_claims: 0,
    secondary_source_claims: 0,
    conflicts: [],
    needs_manual_resolution: [],
    source_claims_only: true,
    independent_gps_certifications: 0,
    current_operation_certifications: 0,
    ready_for_publication: 0,
    no_database_write: true,
    no_publication: true,
    hardErrors,
  };
  if (!ledger || ledger.schema !== SOURCE_CLAIMS_SCHEMA ||
      ledger.status !== "PRIVATE_QA_SOURCE_ASSERTIONS_NOT_VERIFIED" ||
      !Array.isArray(ledger.claims)) {
    hardErrors.push("schema_or_private_status_invalid");
    return result;
  }
  const grouped = new Map();
  const seen = new Set();
  for (const claim of ledger.claims) {
    if (!claim || typeof claim.osm_id !== "string" ||
        !/^(node|way|relation)\/[1-9]\d*$/u.test(claim.osm_id) ||
        claim.field !== "street_address" ||
        typeof claim.value !== "string" || claim.value.trim().length < 6 ||
        !sourceIsHttps(claim.source_url) ||
        !["institution_primary","operator_primary","other_secondary"].includes(claim.source_tier) ||
        !["webpage","pdf","operator_store_listing","public_archive"].includes(claim.document_type) ||
        typeof claim.captured_at !== "string" || !Number.isFinite(Date.parse(claim.captured_at)) ||
        claim.asserted_current_operation === true ||
        claim.asserted_independent_gps === true) {
      hardErrors.push("claim_invalid_or_forged_proof");
      return result;
    }
    const key = claim.osm_id + "|" + claim.source_url + "|" + claim.field;
    if (seen.has(key)) {
      hardErrors.push("repeated_source_claim");
      return result;
    }
    seen.add(key);
    if (!grouped.has(claim.osm_id)) grouped.set(claim.osm_id, []);
    grouped.get(claim.osm_id).push(claim);
  }
  result.structural_ok = true;
  result.claims_count = ledger.claims.length;
  result.candidate_count = grouped.size;
  result.primary_source_claims = ledger.claims.filter(c => c.source_tier !== "other_secondary").length;
  result.secondary_source_claims = ledger.claims.length - result.primary_source_claims;

  for (const [osm_id, claims] of grouped) {
    const primaries = claims.filter(c => c.source_tier !== "other_secondary");
    const numericAddresses = primaries.map(c => ({
      source_url: c.source_url,
      source_tier: c.source_tier,
      address: c.value,
      number: extractStreetNumber(c.value),
      document_date: c.document_date || null,
      captured_at: c.captured_at,
    }));
    const uniqueNumbers = [...new Set(numericAddresses.filter(c => c.number !== null).map(c => c.number))].sort((a,b)=>a-b);
    if (uniqueNumbers.length > 1) {
      result.conflicts.push({osm_id, field: "street_number", numbers:uniqueNumbers,
        source_evidence: numericAddresses, required_action:"MANUAL_SOURCE_RECONCILIATION",
        safe_to_geocode_or_publish:false});
      result.needs_manual_resolution.push(osm_id);
    } else if (primaries.length === 0 || uniqueNumbers.length === 0) {
      result.needs_manual_resolution.push(osm_id);
    }
  }
  result.conflicts.sort((a,b)=>a.osm_id.localeCompare(b.osm_id));
  result.needs_manual_resolution.sort();
  return result;
}

if(process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a=process.argv.slice(2);
  const get=k=>{const i=a.indexOf(k);return i>=0?a[i+1]:undefined};
  const input=get("--input"),out=get("--output");
  if (!input || !out) {
    console.error("Usage: node maarif-source-claims-qa.mjs --input <PRIVATE_ledger.json> --output <PRIVATE_report.json>");
    process.exitCode=2;
  } else try {
    const raw = await readFile(resolve(input),"utf8");
    const result=evaluateMaarifSourceClaims(JSON.parse(raw));
    await mkdir(dirname(resolve(out)),{recursive:true});
    await writeFile(resolve(out),JSON.stringify(result,null,2)+"\n","utf8");
    console.log(JSON.stringify({
      structural_ok:result.structural_ok,claims:result.claims_count,
      candidates:result.candidate_count,conflicts:result.conflicts.length,
      ready_for_publication:result.ready_for_publication,
      output:resolve(out),
    }));
    if(result.hardErrors.length)process.exitCode=1;
  } catch(error) {console.error(String(error));process.exitCode=1;}
}
