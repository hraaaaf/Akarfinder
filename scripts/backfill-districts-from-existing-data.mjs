import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";

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

    // Partial word match (at least 3 chars)
    const districtWords = districtNorm.split(/\s+/);
    for (const dw of districtWords) {
      if (dw.length >= 3 && words.some((w) => w.includes(dw))) {
        return { district, confidence: "medium" };
      }
    }
  }

  return { district: null, confidence: "low" };
}

function findDistrict(city, title, description) {
  if (!city) return { district: null, confidence: "low", source: "none" };

  const possibleDistricts = DISTRICTS[city] || [];
  if (possibleDistricts.length === 0) return { district: null, confidence: "low", source: "none" };

  const titleMatch = matchDistrict(title, possibleDistricts);
  if (titleMatch.district) return { ...titleMatch, source: "title" };

  const descMatch = matchDistrict(description, possibleDistricts);
  if (descMatch.district) return { ...descMatch, source: "description" };

  return { district: null, confidence: "low", source: "none" };
}

const dryRun = !process.argv.includes("--apply");

console.log(`=== LISTING-DISTRICT-RECOVERY-1 BACKFILL ${dryRun ? "(DRY-RUN)" : "(APPLY)"} ===\n`);

const db = new DatabaseSync(dbPath, { readonly: dryRun });

try {
  const listings = db.prepare(`
    SELECT id, city, title, description_snippet, district
    FROM property_listings
    WHERE city IS NOT NULL AND city != '' AND (district IS NULL OR district = '')
  `).all();

  console.log(`Processing ${listings.length} listings without district...\n`);

  let highConfidence = 0;
  let mediumConfidence = 0;
  let updated = 0;
  const updates = [];

  for (const listing of listings) {
    const match = findDistrict(listing.city, listing.title, listing.description_snippet);

    if (match.district && match.applyEligible) {
      if (match.confidence === "high") highConfidence++;
      if (match.confidence === "medium") mediumConfidence++;

      updates.push({
        id: listing.id,
        district: match.district,
        confidence: match.confidence,
        source: match.source
      });
    }
  }

  console.log(`Found ${updates.length} matches:`);
  console.log(`  High confidence: ${highConfidence}`);
  console.log(`  Medium confidence: ${mediumConfidence}\n`);

  if (!dryRun && updates.length > 0) {
    const stmt = db.prepare("UPDATE property_listings SET district = ? WHERE id = ?");

    for (const update of updates) {
      stmt.run(update.district, update.id);
      updated++;
    }

    console.log(`Updated ${updated} listings in database.\n`);
  } else if (dryRun) {
    console.log("DRY-RUN: No changes applied. Use --apply flag to actually update the database.\n");
    console.log("Sample updates that would be applied (first 10):");
    updates.slice(0, 10).forEach((u, i) => {
      console.log(`  ${i + 1}. ID ${u.id} → district="${u.district}" (${u.confidence} from ${u.source})`);
    });
    console.log("");
  }

  console.log("=== SUMMARY ===");
  console.log(`Before: ${listings.length} without district`);
  console.log(`Would update: ${updates.length}`);
  console.log(`After: ${listings.length - updates.length} without district`);
  console.log(`Increase in coverage: ${(100 * updates.length / listings.length).toFixed(1)}%`);

  if (dryRun && updates.length > 0.2 * listings.length) {
    console.log("\n✅ DRY-RUN SUCCESSFUL: >20% coverage gain.");
    console.log("Run with --apply flag to apply changes.");
  }
} finally {
  db.close();
}
