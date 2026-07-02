import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = join(fileURLToPath(import.meta.url), "..");
const dbPath = join(process.cwd(), "scripts/scrapers/output/akarfinder.db");

// District dictionary
const DISTRICTS = {
  Rabat: [
    "Agdal", "Hay Riad", "Souissi", "Hassan", "Océan", "Les Orangers", "Aviation", "Akkari", "Yacoub El Mansour", "Medina"
  ],
  Casablanca: [
    "Maarif", "Gauthier", "Racine", "Bourgogne", "Anfa", "Californie", "Ain Diab", "Sidi Maarouf", "Oasis", "Palmier", "Finance City", "CIL", "Beauséjour", "Derb Ghallef", "Belvédère", "Ain Sebaa", "Roches Noires"
  ],
  Marrakech: [
    "Guéliz", "Hivernage", "Palmeraie", "Targa", "Route de l'Ourika", "Route de Fès", "Majorelle", "Agdal", "Mhamid", "Massira", "Medina"
  ],
  Agadir: [
    "Founty", "Talborjt", "Haut Founty", "Hay Mohammadi", "Dakhla", "Sonaba", "Charaf", "Cité Suisse", "Bensergao"
  ],
  Tanger: [
    "Malabata", "Iberia", "Nejma", "Centre-ville", "Marshan", "Californie", "Val Fleuri", "Moujahidine", "Boubana", "Achakar"
  ],
  Fès: [
    "Agdal", "Ville Nouvelle", "Saiss", "Narjis", "Atlas", "Route d'Imouzzer", "Medina", "Champs de Course"
  ]
};

function normalize(text) {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[-_\s]+/g, " ")
    .trim();
}

function matchDistrict(text, possibleDistricts) {
  if (!text) return { district: null, confidence: "low" };

  const normalized = normalize(text);
  const words = normalized.split(/\s+/);

  for (const district of possibleDistricts) {
    const districtNorm = normalize(district);

    // Exact match
    if (normalized.includes(districtNorm)) {
      return { district, confidence: "high" };
    }

    // Partial word match
    const districtWords = districtNorm.split(/\s+/);
    for (const dw of districtWords) {
      if (dw.length >= 3 && words.some((w) => w.includes(dw))) {
        return { district, confidence: "medium" };
      }
    }
  }

  return { district: null, confidence: "low" };
}

function findDistrict(city, title, description, sourceUrl) {
  if (!city) return { district: null, confidence: "low", source: "none", applyEligible: false };

  const possibleDistricts = DISTRICTS[city] || [];
  if (possibleDistricts.length === 0) return { district: null, confidence: "low", source: "none", applyEligible: false };

  const titleMatch = matchDistrict(title, possibleDistricts);
  if (titleMatch.district) return { ...titleMatch, source: "title", applyEligible: titleMatch.confidence === "high" };

  const descMatch = matchDistrict(description, possibleDistricts);
  if (descMatch.district) return { ...descMatch, source: "description", applyEligible: descMatch.confidence === "high" };

  const urlMatch = matchDistrict(sourceUrl, possibleDistricts);
  if (urlMatch.district && urlMatch.confidence === "high") return { ...urlMatch, source: "source_url", applyEligible: true };

  return { district: null, confidence: "low", source: "none", applyEligible: false };
}

console.log("=== LISTING-DISTRICT-RECOVERY-1 — DRY-RUN ANALYSIS ===\n");

const db = new DatabaseSync(dbPath, { readonly: true });

try {
  // 1. Total listings
  const total = db.prepare("SELECT COUNT(*) AS c FROM property_listings").get().c;
  console.log(`1. TOTAL LISTINGS: ${total}\n`);

  // 2. Listings without district
  const withoutDistrict = db.prepare("SELECT COUNT(*) AS c FROM property_listings WHERE district IS NULL OR district = ''").get().c;
  console.log(`2. WITHOUT DISTRICT: ${withoutDistrict}/${total} (${(100 * withoutDistrict / total).toFixed(1)}%)\n`);

  // 3. Analyze matches
  const listings = db.prepare(`
    SELECT id, city, title, description_snippet, district
    FROM property_listings
    WHERE city IS NOT NULL AND city != ''
  `).all();

  const matches = [];
  const rejected = [];
  const byCity = {};
  const bySource = {};
  const byConfidence = { high: 0, medium: 0, low: 0 };
  const byEligible = { eligible: 0, rejected: 0 };

  for (const listing of listings) {
    const existing = listing.district && listing.district.trim();
    if (existing) {
      continue; // Skip already filled
    }

    const match = findDistrict(listing.city, listing.title, listing.description_snippet, null);

    if (!byCity[listing.city]) byCity[listing.city] = { matched: 0, total: 0, eligible: 0 };
    byCity[listing.city].total++;

    if (!bySource[match.source]) bySource[match.source] = 0;
    bySource[match.source]++;

    if (match.district) {
      byConfidence[match.confidence]++;

      const entry = {
        id: listing.id,
        city: listing.city,
        title: listing.title?.substring(0, 60) || "N/A",
        district: match.district,
        confidence: match.confidence,
        source: match.source,
        applyEligible: match.applyEligible
      };

      if (match.applyEligible) {
        byCity[listing.city].matched++;
        byCity[listing.city].eligible++;
        byEligible.eligible++;
        matches.push(entry);
      } else {
        byEligible.rejected++;
        rejected.push(entry);
      }
    }
  }

  // 4. Recovery rate with safety filter
  const recovered = matches.length;
  const allMatches = recovered + rejected.length;
  console.log(`3. DISTRICT RECOVERY ANALYSIS (WITH SAFETY FILTER)`);
  console.log(`   Total matches found: ${allMatches}/${withoutDistrict}`);
  console.log(`   ✅ Apply-eligible (high conf): ${byEligible.eligible}/${withoutDistrict} (${(100 * byEligible.eligible / withoutDistrict).toFixed(1)}%)`);
  console.log(`   ⚠️  Rejected (medium/low): ${byEligible.rejected}/${withoutDistrict} (${(100 * byEligible.rejected / withoutDistrict).toFixed(1)}%)`);
  console.log(`   Confidence high: ${byConfidence.high}`);
  console.log(`   Confidence medium: ${byConfidence.medium}`);
  console.log(`   Confidence low: ${byConfidence.low}\n`);

  // 5. By city
  console.log(`4. RECOVERY BY CITY`);
  Object.entries(byCity).sort((a, b) => b[1].total - a[1].total).forEach(([city, data]) => {
    console.log(`   ${city}: ${data.matched}/${data.total} (${(100 * data.matched / data.total).toFixed(1)}%)`);
  });
  console.log("");

  // 6. By source
  console.log(`5. MATCHES BY SOURCE`);
  Object.entries(bySource).forEach(([source, count]) => {
    console.log(`   ${source}: ${count}`);
  });
  console.log("");

  // 7. Top districts
  console.log(`6. TOP DISTRICTS RECOVERED`);
  const districtCounts = {};
  matches.forEach(m => {
    districtCounts[m.district] = (districtCounts[m.district] || 0) + 1;
  });
  Object.entries(districtCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([district, count]) => console.log(`   ${district}: ${count}`));
  console.log("");

  // 8. Sample eligible matches
  console.log(`7. SAFE MATCHES (APPLY-ELIGIBLE, first 20)`);
  matches.slice(0, 20).forEach(m => {
    console.log(`   ✅ ID ${m.id} | ${m.city} | "${m.title}" → ${m.district} (${m.confidence} from ${m.source})`);
  });
  console.log("");

  // 9. Sample rejected matches (to verify safety)
  console.log(`8. REJECTED MATCHES (NOT ELIGIBLE, first 20 samples)`);
  rejected.slice(0, 20).forEach(m => {
    console.log(`   ⚠️  ID ${m.id} | ${m.city} | "${m.title}" → ${m.district} (${m.confidence} from ${m.source})`);
  });
  console.log("");

  // 10. Summary
  console.log(`=== SUMMARY ===`);
  console.log(`Safe to apply: ${recovered}/${withoutDistrict} district values`);
  console.log(`Before: ${withoutDistrict} without district`);
  console.log(`After: ${withoutDistrict - recovered} without district`);
  console.log(`New coverage: ${((recovered + 5) / total * 100).toFixed(1)}% (5 already have district)`);
  console.log("");

  if (recovered > withoutDistrict * 0.1) {
    console.log("✅ RECOMMENDATION: Safe backfill ready. Apply-eligible matches identified.");
    console.log("Run: node scripts/backfill-districts-from-existing-data.mjs --apply");
  } else {
    console.log("⚠️  Limited safe recovery. Consider improving matcher before backfill.");
  }
} finally {
  db.close();
}
