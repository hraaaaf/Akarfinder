import fs from 'node:fs'
import readline from 'node:readline'
import { createClient } from '@supabase/supabase-js'

const ARTIFACT = process.env.Q4A_LIVE_JSONL || '.tmp/q4a-live/search-ready-combined.jsonl'
const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')

const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

async function main() {
  const rows:any[] = []
  const rl = readline.createInterface({ input: fs.createReadStream(ARTIFACT), crlfDelay: Infinity })
  for await (const line of rl) {
    if (!line.trim()) continue
    const r = JSON.parse(line)
    const price = Number(r.price_mad)
    const surface = Number(r.surface_m2)
    if (!r.url || !r.city || !(price > 0) || !(surface > 0)) continue
    rows.push({
      canonical_url: String(r.url).trim(),
      source_domain: String(r.source_domain || new URL(r.url).hostname.replace(/^www\./,'')).toLowerCase(),
      city: String(r.city).trim(),
      price_mad: price,
      surface_m2: surface,
      title: r.title || null,
      district: r.district || null,
      provenance: 'public_dataset',
      artifact_row_index: Number.isInteger(r.row_index) ? r.row_index : null,
      updated_at: new Date().toISOString(),
    })
  }

  if (rows.length !== 72834) throw new Error(`expected 72834 rows, got ${rows.length}`)

  const batchSize = 500
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    const { error } = await sb.from('minimal_live_search_documents_v1').upsert(batch, { onConflict: 'canonical_url' })
    if (error) throw error
  }

  const { count, error: ce } = await sb.from('minimal_live_search_documents_v1').select('*', { count:'exact', head:true })
  if (ce) throw ce
  const { data: search, error: se } = await sb.rpc('search_public_representations_v2', { p_limit: 1 })
  if (se) throw se
  const publicCount = Array.isArray(search) && search.length ? Number(search[0].total_count) : 0

  const summary = { inputRows: rows.length, tableCount: count, publicSearchCount: publicCount }
  fs.mkdirSync('.tmp/q4a-minimal-live-out', { recursive: true })
  fs.writeFileSync('.tmp/q4a-minimal-live-out/summary.json', JSON.stringify(summary, null, 2) + '\n')
  console.log(JSON.stringify(summary, null, 2))
}

main().catch(e => { console.error(e); process.exit(1) })
