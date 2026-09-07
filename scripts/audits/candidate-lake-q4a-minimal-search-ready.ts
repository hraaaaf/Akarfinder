import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

async function main() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')

  const out = process.env.Q4A_OUT || '.tmp/q4a-minimal-search-ready'
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

  const thin = await pageAll(
    'thin_index_search_documents',
    'id,canonical_url,source_domain,city,recovered_city,normalized_city,price_mad,normalized_price_mad,surface_m2,normalized_surface_m2,title,freshness_status,updated_at,document_kind'
  )
  const propertyListings = await pageAll(
    'property_listings',
    'id,city,price_mad,surface_m2,title,updated_at'
  )
  const listingSources = await pageAll(
    'listing_sources',
    'id,property_listing_id,source_name,listing_url,source_url,is_active,last_seen_at'
  )

  const propsById = new Map(propertyListings.map((r: any) => [r.id, r]))

  type ReadyRow = {
    canonical_url: string
    source_domain: string | null
    city: string
    price_mad: number
    surface_m2: number
    title: string | null
    source_reservoirs: string[]
    freshness_metadata: any[]
    search_ready: true
    search_ready_rule: 'link+city+price+surface'
  }

  const byUrl = new Map<string, ReadyRow>()
  const counts = {
    thinReadyBeforeDedupe: 0,
    propertyReadyBeforeDedupe: 0,
    overlapReady: 0,
  }

  function validText(v: any): v is string {
    return typeof v === 'string' && v.trim().length > 0
  }
  function positiveNumber(v: any): v is number {
    return typeof v === 'number' && Number.isFinite(v) && v > 0
  }
  function hostOf(raw: string) {
    try { return new URL(raw).hostname.toLowerCase().replace(/^www\./, '') } catch { return null }
  }
  function addRow(row: ReadyRow, reservoir: string) {
    const key = row.canonical_url.trim().toLowerCase()
    const existing = byUrl.get(key)
    if (!existing) {
      byUrl.set(key, row)
      return
    }
    if (!existing.source_reservoirs.includes(reservoir)) existing.source_reservoirs.push(reservoir)
    if (reservoir === 'property_listings+listing_sources' && !existing.source_reservoirs.includes('property_listings+listing_sources')) {
      existing.source_reservoirs.push('property_listings+listing_sources')
    }
    if (!existing.title && row.title) existing.title = row.title
    existing.freshness_metadata.push(...row.freshness_metadata)
  }

  for (const r of thin) {
    if (r.document_kind !== 'LISTING') continue
    const link = r.canonical_url
    const city = r.normalized_city ?? r.recovered_city ?? r.city
    const price = r.normalized_price_mad ?? r.price_mad
    const surface = r.normalized_surface_m2 ?? r.surface_m2
    if (!validText(link) || !validText(city) || !positiveNumber(price) || !positiveNumber(surface)) continue
    counts.thinReadyBeforeDedupe += 1
    addRow({
      canonical_url: link.trim(),
      source_domain: r.source_domain ?? hostOf(link),
      city: city.trim(),
      price_mad: price,
      surface_m2: surface,
      title: validText(r.title) ? r.title.trim() : null,
      source_reservoirs: ['thin_index_search_documents'],
      freshness_metadata: [{ reservoir: 'thin_index_search_documents', freshness_status: r.freshness_status ?? null, observed_at: r.updated_at ?? null }],
      search_ready: true,
      search_ready_rule: 'link+city+price+surface',
    }, 'thin_index_search_documents')
  }

  const thinUrls = new Set(byUrl.keys())
  for (const s of listingSources) {
    const p: any = propsById.get(s.property_listing_id)
    if (!p) continue
    const link = s.listing_url ?? s.source_url
    if (!validText(link) || !validText(p.city) || !positiveNumber(p.price_mad) || !positiveNumber(p.surface_m2)) continue
    counts.propertyReadyBeforeDedupe += 1
    const key = link.trim().toLowerCase()
    if (thinUrls.has(key)) counts.overlapReady += 1
    addRow({
      canonical_url: link.trim(),
      source_domain: validText(s.source_name) ? s.source_name.trim().toLowerCase() : hostOf(link),
      city: p.city.trim(),
      price_mad: p.price_mad,
      surface_m2: p.surface_m2,
      title: validText(p.title) ? p.title.trim() : null,
      source_reservoirs: ['property_listings+listing_sources'],
      freshness_metadata: [{ reservoir: 'listing_sources', is_active: s.is_active ?? null, last_seen_at: s.last_seen_at ?? null }],
      search_ready: true,
      search_ready_rule: 'link+city+price+surface',
    }, 'property_listings+listing_sources')
  }

  const rows = [...byUrl.values()].sort((a, b) => a.canonical_url.localeCompare(b.canonical_url))
  for (const r of rows) r.source_reservoirs.sort()

  const text = rows.map(r => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : '')
  const sha = createHash('sha256').update(text).digest('hex')
  await writeFile(path.join(out, 'search-ready.jsonl'), text)

  const byDomain: Record<string, number> = {}
  for (const r of rows) {
    const d = r.source_domain || 'unknown'
    byDomain[d] = (byDomain[d] || 0) + 1
  }
  await writeFile(path.join(out, 'coverage-by-domain.json'), JSON.stringify(byDomain, null, 2) + '\n')

  const summary = {
    schemaVersion: 'q4a-minimal-search-ready-v1',
    rule: {
      requiredFields: ['canonical_url', 'city', 'price_mad', 'surface_m2'],
      expression: 'link && city && price > 0 && surface > 0',
      freshnessIsGate: false,
      liveConfidenceIsGate: false,
      clusteringIsGate: false,
      policyIsProductCompletenessGate: false,
    },
    thinReady: counts.thinReadyBeforeDedupe,
    propertyReady: counts.propertyReadyBeforeDedupe,
    overlapReady: counts.overlapReady,
    unionReady: rows.length,
    searchReadySha256: sha,
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
