import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const Q1D = process.env.Q4A_Q1D_ROOT || '.tmp/q4a-input/q1d'
const PUBLIC = process.env.Q4A_PUBLIC_ROOT || '.tmp/q4a-input/public'
const OUT = process.env.Q4A_DB_RECOVERY_OUT || '.tmp/q4a-db-url-recovery'
const EXPECTED = 251_046

function parseJsonl(text: string) {
  return text.split('\n').filter(Boolean).map(line => JSON.parse(line))
}
function rich(f: any) {
  return Boolean(f?.city && typeof f?.price_mad === 'number' && f.price_mad > 0 && typeof f?.surface_m2 === 'number' && f.surface_m2 > 0)
}
function normalizeDomain(v: string | null | undefined) {
  return (v || '').toLowerCase().replace(/^www\./, '')
}
function identityFromUrl(raw: string | null | undefined) {
  if (!raw) return null
  try {
    const u = new URL(raw)
    const d = normalizeDomain(u.hostname)
    if (d.endsWith('mubawab.ma')) {
      const m = u.pathname.match(/\/a\/(\d+)(?:\/|$)/)
      return m ? `mubawab.ma|id:${m[1]}` : null
    }
    if (d.endsWith('avito.ma')) {
      const m = u.pathname.match(/_(\d+)\.htm$/)
      return m ? `avito.ma|id:${m[1]}` : null
    }
    return null
  } catch {
    return null
  }
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) throw new Error('Supabase credentials required')
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

  const q1d = parseJsonl(await readFile(path.join(Q1D, 'manifest-q1d.jsonl'), 'utf8'))
  const pub = parseJsonl(await readFile(path.join(PUBLIC, 'public-dataset-features.jsonl'), 'utf8'))
  if (q1d.length !== EXPECTED) throw new Error(`expected ${EXPECTED} Q1D rows, got ${q1d.length}`)

  const publicUrl = new Map<string,string>()
  const publicConflicts = new Set<string>()
  for (const r of pub) {
    if (!r.identity_key || !r.url) continue
    const prev = publicUrl.get(r.identity_key)
    if (prev && prev !== r.url) publicConflicts.add(r.identity_key)
    else publicUrl.set(r.identity_key, r.url)
  }
  for (const k of publicConflicts) publicUrl.delete(k)

  const unresolved = new Set<string>()
  const richRows = new Map<string, any>()
  let alreadyReady = 0
  for (const r of q1d) {
    if (!rich(r.features)) continue
    const k = r.representation_key as string
    if (k.includes('|url:') || publicUrl.has(k)) {
      alreadyReady++
      continue
    }
    if (k.startsWith('mubawab.ma|id:') || k.startsWith('avito.ma|id:')) {
      unresolved.add(k)
      richRows.set(k, r)
    }
  }

  async function pageAll(table: string, select: string) {
    const rows:any[] = []
    const size = 1000
    for (let from=0;;from+=size) {
      const { data, error } = await supabase.from(table).select(select).order('id',{ascending:true}).range(from,from+size-1)
      if (error) throw new Error(`${table}: ${error.message}`)
      const batch = data || []
      rows.push(...batch)
      if (batch.length < size) break
    }
    return rows
  }

  const seeds = await pageAll('source_offer_seeds','id,canonical_url,source_domain,last_observed_at')
  const sources = await pageAll('listing_sources','id,listing_url,source_url,source_name,last_seen_at,is_active')

  const candidates = new Map<string, Set<string>>()
  function add(raw: string | null | undefined) {
    const key = identityFromUrl(raw)
    if (!key || !unresolved.has(key) || !raw) return
    if (!candidates.has(key)) candidates.set(key, new Set())
    candidates.get(key)!.add(raw)
  }
  for (const r of seeds) add(r.canonical_url)
  for (const r of sources) { add(r.listing_url); add(r.source_url) }

  const recovered = new Map<string,string>()
  let ambiguous = 0
  for (const [k, urls] of candidates) {
    if (urls.size === 1) recovered.set(k, [...urls][0])
    else ambiguous++
  }

  const rows:any[] = []
  for (const [k, url] of [...recovered.entries()].sort()) {
    const r = richRows.get(k)
    rows.push({
      representation_key: k,
      source_domain: k.split('|',1)[0],
      url,
      city: r.features.city,
      district: r.features.district ?? null,
      price_mad: r.features.price_mad,
      surface_m2: r.features.surface_m2,
      url_resolution_basis: 'stored_db_url_exact_source_id_unique',
      search_ready: true,
    })
  }
  await mkdir(OUT,{recursive:true})
  const text = rows.map(r => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : '')
  await writeFile(path.join(OUT,'recovered-search-ready.jsonl'), text)
  const h = createHash('sha256').update(text).digest('hex')
  const byDomain:Record<string,number> = {}
  for (const r of rows) byDomain[r.source_domain]=(byDomain[r.source_domain]||0)+1
  const summary = {
    schemaVersion:'q4a-db-url-recovery-v1',
    alreadyReadyFromQ1DPlusPublic: alreadyReady,
    unresolvedRichIds: unresolved.size,
    recoveredUniqueExactStoredUrls: recovered.size,
    remainingUnresolvedRichIds: unresolved.size - recovered.size,
    ambiguousStoredUrlIdentityMatchesExcluded: ambiguous,
    recoveredByDomain: byDomain,
    projectedSearchReadyTotal: alreadyReady + recovered.size,
    missingUrlInvented:false,
    sourceSiteFetches:0,
    databaseReadsOnly:true,
    databaseWrites:0,
    productionWrites:0,
    vercelDeployments:0,
    recoveredSha256:h,
  }
  await writeFile(path.join(OUT,'summary.json'), JSON.stringify(summary,null,2)+'\n')
  console.log(JSON.stringify(summary,null,2))
}

main().catch(err => { console.error(err); process.exitCode=1 })
