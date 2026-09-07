import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const outDir = process.env.Q1D_DB_OUT || '.tmp/q1d-db-export';
if (!url || !key) throw new Error('SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY required');
fs.mkdirSync(outDir, { recursive: true });
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function paged(table: string, columns: string, orderCol: string) {
  const rows: any[] = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await supabase.from(table).select(columns).order(orderCol, { ascending: true }).range(from, from + page - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < page) break;
  }
  return rows;
}

function writeJsonl(name: string, rows: any[]) {
  fs.writeFileSync(path.join(outDir, name), rows.map(r => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : ''));
}

const thin = await paged(
  'thin_index_search_documents',
  'seed_id,canonical_url,source_domain,seed_provider,title,snippet,normalized_city,normalized_property_type,normalized_intent,normalized_price_mad,normalized_surface_m2,price_per_m2_mad,quality_tier,quality_score,updated_at,document_kind',
  'seed_id'
);
const listingSources = await paged(
  'listing_sources',
  'id,property_listing_id,source_name,listing_url,source_url,source_offer_key,displayed_price,price_currency,price_period,price_status,canonical_kind,canonical_eligible,content_fingerprint',
  'id'
);
const propertyListings = await paged(
  'property_listings',
  'id,canonical_fingerprint,title,price_mad,city,district,property_type,transaction_type,surface_m2,rooms_count,bedrooms_count,bathrooms_count,description_snippet,images_count,seller_name,data_completeness_score,reliability_score,built_surface_m2,plot_surface_m2,condition,property_age_range,orientation,floor_type,floors_count,garden_m2,terrace_m2,garage_spaces,has_pool,has_concierge,has_moroccan_living_room,has_european_living_room,has_equipped_kitchen,premium_features,updated_at',
  'id'
);

writeJsonl('thin-index-features.jsonl', thin);
writeJsonl('listing-sources.jsonl', listingSources);
writeJsonl('property-listings.jsonl', propertyListings);
const summary = {
  schemaVersion: 'q1d-db-feature-export-v1',
  thinIndexRows: thin.length,
  listingSourceRows: listingSources.length,
  propertyListingRows: propertyListings.length,
  readOnly: true,
  databaseWrites: 0,
  productionWrites: 0,
  sourceSiteFetches: 0,
  sourceNetworkRequests: 0,
  vercelDeployments: 0
};
fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
