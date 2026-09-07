import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

async function main() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')

  const out = process.env.Q3A_DB_OUT || '.tmp/q3a-db-freshness'
  await mkdir(out, { recursive: true })

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  async function pageAll(table: string, select: string) {
    const rows: any[] = []
    const pageSize = 1000
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from(table)
        .select(select)
        .order('id', { ascending: true })
        .range(from, from + pageSize - 1)
      if (error) throw new Error(`${table}: ${error.message}`)
      const batch = data || []
      rows.push(...batch)
      if (batch.length < pageSize) break
    }
    return rows
  }

  const seeds = await pageAll(
    'source_offer_seeds',
    'id,canonical_url,source_domain,seed_provider,first_observed_at,last_observed_at,observation_count,freshness_status,fresh_last_seen_at,fresh_channels,created_at,updated_at'
  )
  const listingSources = await pageAll(
    'listing_sources',
    'id,property_listing_id,source_name,source_url,listing_url,is_active,first_seen_at,last_seen_at,source_offer_key,origin_type,compliance_status,content_fingerprint,canonical_kind,canonical_eligible'
  )

  function jsonl(rows: any[]) {
    return rows.map(r => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : '')
  }
  function sha(s: string) { return createHash('sha256').update(s).digest('hex') }

  const seedText = jsonl(seeds)
  const listingText = jsonl(listingSources)
  await writeFile(path.join(out, 'source-offer-seeds.jsonl'), seedText)
  await writeFile(path.join(out, 'listing-sources.jsonl'), listingText)

  const summary = {
    schemaVersion: 'q3a-db-freshness-export-v1',
    generatedAt: new Date().toISOString(),
    sourceOfferSeeds: seeds.length,
    listingSources: listingSources.length,
    paginationOrder: 'id ASC',
    sourceOfferSeedsSha256: sha(seedText),
    listingSourcesSha256: sha(listingText),
    databaseReadsOnly: true,
    databaseWrites: 0,
    productionWrites: 0,
    sourceSiteFetches: 0,
    vercelDeployments: 0,
  }
  await writeFile(path.join(out, 'summary.json'), JSON.stringify(summary, null, 2) + '\n')
  console.log(JSON.stringify(summary, null, 2))
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
