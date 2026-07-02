import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";

const dbPath = join(process.cwd(), "scripts/scrapers/output/akarfinder.db");
const db = new DatabaseSync(dbPath, { readonly: true });

console.log("=== SEARCH-STOCK-COVERAGE-AUDIT-1 ===\n");

try {
  // 1. VOLUME GLOBAL
  console.log("1. VOLUME GLOBAL");
  const vol = db.prepare("SELECT COUNT(*) AS total FROM property_listings").get();
  console.log(`   Total listings: ${vol.total}\n`);

  // 2. TOP 10 VILLES
  console.log("2. TOP 10 VILLES");
  const cities = db.prepare(`
    SELECT city, COUNT(*) AS count
    FROM property_listings
    WHERE city IS NOT NULL
    GROUP BY city
    ORDER BY count DESC
    LIMIT 10
  `).all();
  cities.forEach(c => console.log(`   ${c.city}: ${c.count}`));
  console.log("");

  // 3. VOLUME 6 PRINCIPALES
  console.log("3. VOLUME VILLES PRINCIPALES");
  const main6 = db.prepare(`
    SELECT city, COUNT(*) AS total,
      COUNT(DISTINCT district) AS districts,
      SUM(CASE WHEN price_mad IS NOT NULL THEN 1 ELSE 0 END) AS has_price,
      SUM(CASE WHEN surface_m2 IS NOT NULL THEN 1 ELSE 0 END) AS has_surface,
      SUM(CASE WHEN district IS NOT NULL AND district != '' THEN 1 ELSE 0 END) AS has_district
    FROM property_listings
    WHERE city IN ('Rabat', 'Casablanca', 'Marrakech', 'Agadir', 'Tanger', 'Fès')
    GROUP BY city
    ORDER BY total DESC
  `).all();
  main6.forEach(c => {
    console.log(`   ${c.city}: ${c.total} (${c.districts} districts, price: ${c.has_price}, surface: ${c.has_surface}, district: ${c.has_district})`);
  });
  console.log("");

  // 4. PRIX
  console.log("4. DISTRIBUTION PRIX");
  const prices = db.prepare(`
    SELECT city,
      COUNT(*) AS total,
      COUNT(CASE WHEN price_mad IS NOT NULL THEN 1 END) AS with_price,
      MIN(CASE WHEN price_mad > 0 THEN price_mad END) AS min_price,
      MAX(price_mad) AS max_price,
      ROUND(AVG(CASE WHEN price_mad > 0 THEN price_mad END)) AS avg_price
    FROM property_listings
    WHERE city IN ('Rabat', 'Casablanca', 'Marrakech', 'Agadir', 'Tanger', 'Fès')
    GROUP BY city
    ORDER BY total DESC
  `).all();
  prices.forEach(p => {
    console.log(`   ${p.city}: ${p.with_price}/${p.total} prix | min=${p.min_price}, max=${p.max_price}, avg=${p.avg_price}`);
  });
  console.log("");

  // 5. SURFACE
  console.log("5. DISTRIBUTION SURFACE");
  const surfaces = db.prepare(`
    SELECT city,
      COUNT(*) AS total,
      COUNT(CASE WHEN surface_m2 IS NOT NULL THEN 1 END) AS with_surface,
      MIN(CASE WHEN surface_m2 > 0 THEN surface_m2 END) AS min_surface,
      MAX(surface_m2) AS max_surface,
      ROUND(AVG(CASE WHEN surface_m2 > 0 THEN surface_m2 END)) AS avg_surface
    FROM property_listings
    WHERE city IN ('Rabat', 'Casablanca', 'Marrakech', 'Agadir', 'Tanger', 'Fès')
    GROUP BY city
    ORDER BY total DESC
  `).all();
  surfaces.forEach(s => {
    console.log(`   ${s.city}: ${s.with_surface}/${s.total} surfaces | min=${s.min_surface}, max=${s.max_surface}, avg=${s.avg_surface}`);
  });
  console.log("");

  // 6. TYPE
  console.log("6. TYPE DE BIEN");
  const types = db.prepare(`
    SELECT COALESCE(property_type, '[UNKNOWN]') AS type, COUNT(*) AS count
    FROM property_listings
    GROUP BY property_type
    ORDER BY count DESC
  `).all();
  types.forEach(t => console.log(`   ${t.type}: ${t.count}`));
  console.log("");

  // 7. TRANSACTION
  console.log("7. TRANSACTION TYPE");
  const tx = db.prepare(`
    SELECT COALESCE(transaction_type, '[UNKNOWN]') AS type, COUNT(*) AS count
    FROM property_listings
    GROUP BY transaction_type
    ORDER BY count DESC
  `).all();
  tx.forEach(t => console.log(`   ${t.type}: ${t.count}`));
  console.log("");

  // 8. COMPLÉTUDE
  console.log("8. COMPLÉTUDE CHAMPS (%)");
  const completeness = db.prepare(`
    SELECT
      COUNT(*) AS total,
      ROUND(100.0 * SUM(CASE WHEN title IS NOT NULL AND title != '' THEN 1 ELSE 0 END) / COUNT(*), 1) AS title_pct,
      ROUND(100.0 * SUM(CASE WHEN description_snippet IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*), 1) AS description_pct,
      ROUND(100.0 * SUM(CASE WHEN price_mad IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*), 1) AS price_pct,
      ROUND(100.0 * SUM(CASE WHEN surface_m2 IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*), 1) AS surface_pct,
      ROUND(100.0 * SUM(CASE WHEN city IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*), 1) AS city_pct,
      ROUND(100.0 * SUM(CASE WHEN district IS NOT NULL AND district != '' THEN 1 ELSE 0 END) / COUNT(*), 1) AS district_pct,
      ROUND(100.0 * SUM(CASE WHEN images_count > 0 THEN 1 ELSE 0 END) / COUNT(*), 1) AS images_pct
    FROM property_listings
  `).get();
  console.log(`   Title: ${completeness.title_pct}%`);
  console.log(`   Description: ${completeness.description_pct}%`);
  console.log(`   Price: ${completeness.price_pct}%`);
  console.log(`   Surface: ${completeness.surface_pct}%`);
  console.log(`   City: ${completeness.city_pct}%`);
  console.log(`   District: ${completeness.district_pct}%`);
  console.log(`   Images: ${completeness.images_pct}%\n`);

  // 9. FIABILITÉ
  console.log("9. FIABILITÉ");
  const reliability = db.prepare(`
    SELECT
      COALESCE(reliability_badge, '[UNKNOWN]') AS badge,
      COUNT(*) AS count,
      ROUND(AVG(reliability_score), 2) AS avg_score
    FROM property_listings
    WHERE reliability_badge IS NOT NULL
    GROUP BY reliability_badge
    ORDER BY count DESC
  `).all();
  reliability.forEach(r => console.log(`   ${r.badge}: ${r.count} (avg: ${r.avg_score})`));
  console.log("");

  // 10. DOUBLONS
  console.log("10. DOUBLONS");
  const dupes = db.prepare(`
    SELECT
      COUNT(*) AS total,
      COUNT(CASE WHEN duplicate_group_id IS NOT NULL THEN 1 END) AS in_duplicate_group,
      COUNT(DISTINCT CASE WHEN duplicate_group_id IS NOT NULL THEN duplicate_group_id END) AS unique_groups,
      ROUND(100.0 * COUNT(CASE WHEN duplicate_group_id IS NOT NULL THEN 1 END) / COUNT(*), 1) AS duplicate_pct
    FROM property_listings
  `).get();
  console.log(`   Total in duplicate groups: ${dupes.in_duplicate_group}/${dupes.total} (${dupes.duplicate_pct}%)`);
  console.log(`   Unique groups: ${dupes.unique_groups}\n`);

  // 11. SCÉNARIOS
  console.log("11. SCÉNARIOS UTILISATEUR");
  const scenarios = db.prepare(`
    SELECT 'Rabat' AS s, COUNT(*) AS r FROM property_listings WHERE city = 'Rabat'
    UNION ALL SELECT 'appartement Rabat', COUNT(*) FROM property_listings WHERE city = 'Rabat' AND LOWER(property_type) LIKE '%apartment%'
    UNION ALL SELECT 'Rabat Agdal', COUNT(*) FROM property_listings WHERE city = 'Rabat' AND district = 'Agdal'
    UNION ALL SELECT 'Casablanca', COUNT(*) FROM property_listings WHERE city = 'Casablanca'
    UNION ALL SELECT 'appartement Casablanca', COUNT(*) FROM property_listings WHERE city = 'Casablanca' AND LOWER(property_type) LIKE '%apartment%'
    UNION ALL SELECT 'Marrakech', COUNT(*) FROM property_listings WHERE city = 'Marrakech'
    UNION ALL SELECT 'villa Marrakech', COUNT(*) FROM property_listings WHERE city = 'Marrakech' AND LOWER(property_type) LIKE '%villa%'
    UNION ALL SELECT 'Agadir', COUNT(*) FROM property_listings WHERE city = 'Agadir'
    UNION ALL SELECT 'Agadir Founty', COUNT(*) FROM property_listings WHERE city = 'Agadir' AND district = 'Founty'
    UNION ALL SELECT 'Tanger', COUNT(*) FROM property_listings WHERE city = 'Tanger'
    UNION ALL SELECT 'Fès', COUNT(*) FROM property_listings WHERE city = 'Fès'
  `).all();
  scenarios.forEach(sc => console.log(`   ${sc.s}: ${sc.r}`));

  console.log("\n=== AUDIT COMPLET ===");
} finally {
  db.close();
}
