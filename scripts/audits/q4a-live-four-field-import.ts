import fs from 'node:fs'
import readline from 'node:readline'
import { createClient } from '@supabase/supabase-js'

const ARTIFACT = process.env.Q4A_LIVE_JSONL || '.tmp/q4a-live/search-ready-combined.jsonl'
const OUT = process.env.Q4A_LIVE_OUT || '.tmp/q4a-live-out'
const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')

const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
const now = new Date()

function validPolicy(p: any) {
  const effective = p.policy_effective_at ? new Date(p.policy_effective_at) : null
  const expires = p.policy_expires_at ? new Date(p.policy_expires_at) : null
  const temporal = effective && effective <= now && expires && expires > now
  const rich = p.authorization_status === 'authorized_partner'
    && p.content_reuse_policy === 'authorized'
    && p.display_policy === 'partner_content'
    && ['authorized_detail_feed','partner_feed'].includes(p.acquisition_mode)
    && ['authorized_detail_feed','partner_feed'].includes(p.machine_gate)
    && ['current','due_soon'].includes(p.review_status)
    && temporal && p.no_bypass_required === true
  const minimal = p.authorization_status !== 'prohibited'
    && p.display_policy === 'canonical_link_only'
    && p.machine_gate === 'canonical_link_only'
    && p.ingestion_gate === 'canonical_link_only'
    && p.display_gate === 'external_tail_link_only'
    && ['current','due_soon'].includes(p.review_status)
    && temporal && p.no_bypass_required === true
  return rich || minimal
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const { data: pols, error: pe } = await sb.from('source_policy_registry').select('*')
  if (pe) throw pe
  const allowed = new Set((pols || []).filter(validPolicy).map((p:any)=>p.source_domain))

  const artifact = new Map<string, any>()
  const byDomain: Record<string, number> = {}
  const rl = readline.createInterface({ input: fs.createReadStream(ARTIFACT), crlfDelay: Infinity })
  for await (const line of rl) {
    if (!line.trim()) continue
    const r = JSON.parse(line)
    if (!allowed.has(r.source_domain)) continue
    const k = String(r.url).trim().toLowerCase()
    artifact.set(k, r)
    byDomain[r.source_domain] = (byDomain[r.source_domain] || 0) + 1
  }

  const allowedSeedProviders = new Set(['public_sitemap','commoncrawl_cdx','serper_search'])
  let matched = 0, updated = 0, scanned = 0
  const matchedByDomain: Record<string, number> = {}
  const updateRows: any[] = []
  const pageSize = 1000

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await sb.from('thin_index_search_documents')
      .select('seed_id,canonical_url,source_domain,seed_provider,freshness_status,document_kind,display_eligibility,recovery_evidence,normalization_evidence,quality_dimensions,updated_at,normalized_city,normalized_price_mad,normalized_surface_m2')
      .order('seed_id', { ascending: true })
      .range(from, from + pageSize - 1)
    if (error) throw error
    const rows = data || []
    scanned += rows.length
    for (const d of rows as any[]) {
      const r = artifact.get(String(d.canonical_url).trim().toLowerCase())
      if (!r) continue
      if (d.document_kind !== 'LISTING') continue
      if (!['eligible_primary','eligible_secondary'].includes(d.display_eligibility)) continue
      if (!allowedSeedProviders.has(d.seed_provider)) continue
      matched++
      matchedByDomain[d.source_domain] = (matchedByDomain[d.source_domain] || 0) + 1
      const city = r.city
      const price = Number(r.price_mad)
      const surface = Number(r.surface_m2)
      if (!city || !(price > 0) || !(surface > 0)) continue
      updateRows.push({
        seed_id: d.seed_id,
        canonical_url: d.canonical_url,
        source_domain: d.source_domain,
        seed_provider: d.seed_provider,
        freshness_status: d.freshness_status,
        recovery_evidence: d.recovery_evidence || {},
        normalization_evidence: d.normalization_evidence || {},
        quality_dimensions: d.quality_dimensions || {},
        document_kind: d.document_kind,
        display_eligibility: d.display_eligibility,
        normalized_city: city,
        normalized_price_mad: price,
        normalized_surface_m2: surface,
        updated_at: new Date().toISOString(),
      })
    }
    if (rows.length < pageSize) break
  }

  const batchSize = 250
  for (let i = 0; i < updateRows.length; i += batchSize) {
    const batch = updateRows.slice(i, i + batchSize)
    const { error } = await sb.from('thin_index_search_documents').upsert(batch, { onConflict: 'seed_id' })
    if (error) throw error
    updated += batch.length
  }

  const { data: check, error: ce } = await sb.rpc('search_public_representations_v2', { p_limit: 1 })
  if (ce) throw ce
  const publicSearchCount = Array.isArray(check) && check.length ? Number(check[0].total_count) : 0

  const summary = {
    schemaVersion: 'q4a-live-four-field-import-v1',
    artifactRowsPolicyAllowed: artifact.size,
    artifactRowsPolicyAllowedByDomain: byDomain,
    thinIndexRowsScanned: scanned,
    matchedExistingEligibleListings: matched,
    matchedExistingEligibleListingsByDomain: matchedByDomain,
    productionRowsUpdated: updated,
    publicSearchCountAfter: publicSearchCount,
    sourcePolicyRegistryMutations: 0,
    freshnessStatusMutations: 0,
    documentKindMutations: 0,
    displayEligibilityMutations: 0,
    insertedThinIndexRows: 0,
    vercelDeployments: 0,
  }
  fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify(summary, null, 2) + '\n')
  console.log(JSON.stringify(summary, null, 2))
}

main().catch(e => { console.error(e); process.exit(1) })
