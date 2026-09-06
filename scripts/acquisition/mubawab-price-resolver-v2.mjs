import fs from 'node:fs/promises';
import path from 'node:path';

const LEADING_MAD_RE = /^\s*([0-9][0-9\s.,]{0,20})\s*(?:DH|DHS|MAD)\b/i;

function parseGroupedInteger(raw) {
  const digits = String(raw || '').replace(/[^0-9]/g, '');
  if (!digits) return null;
  const value = Number.parseInt(digits, 10);
  return Number.isSafeInteger(value) ? value : null;
}

export function resolveLeadingCardPrice(observations) {
  const ambiguous = observations.filter((o) => o?.priceAmbiguous === true);
  if (!ambiguous.length) return { status: 'not_target' };
  const alreadySafe = observations.some((o) => o?.price !== null && o?.price !== undefined && o?.priceAmbiguous !== true);
  if (alreadySafe) return { status: 'already_resolved' };

  const values = [];
  for (const obs of ambiguous) {
    const match = String(obs.context || '').match(LEADING_MAD_RE);
    if (!match) return { status: 'unresolved', reason: 'missing_leading_mad_price' };
    const value = parseGroupedInteger(match[1]);
    if (value === null || value < 100 || value > 2_147_483_647) {
      return { status: 'unresolved', reason: 'invalid_leading_mad_price' };
    }
    values.push(value);
  }

  const unique = [...new Set(values)];
  if (unique.length !== 1) return { status: 'unresolved', reason: 'leading_price_conflict', values: unique };

  return {
    status: 'resolved',
    value: unique[0],
    currency: 'MAD',
    source: 'safe_shard_card_primary_price_consensus',
    evidenceCount: ambiguous.length,
  };
}

const files = process.argv.slice(2);
if (!files.length) throw new Error('Provide lane JSON files');

const byId = new Map();
for (const file of files) {
  const report = JSON.parse(await fs.readFile(file, 'utf8'));
  for (const obs of report.observations || []) {
    const id = String(obs.id);
    if (!byId.has(id)) byId.set(id, []);
    byId.get(id).push(obs);
  }
}

const resolved = [];
const unresolved = [];
for (const [id, observations] of byId.entries()) {
  const result = resolveLeadingCardPrice(observations);
  if (result.status === 'resolved') resolved.push({ id, ...result });
  else if (result.status === 'unresolved') unresolved.push({ id, ...result });
}

const output = {
  success: true,
  targetAmbiguousIdCount: resolved.length + unresolved.length,
  resolvedCount: resolved.length,
  unresolvedCount: unresolved.length,
  projectedPriceUniqueCount: 11296 + resolved.length,
  projectedCoveragePct: Number((((11296 + resolved.length) / 18445) * 100).toFixed(2)),
  unresolved,
};

const outDir = 'artifacts/mubawab-price-resolver-v2';
await fs.mkdir(outDir, { recursive: true });
await fs.writeFile(path.join(outDir, 'report.json'), JSON.stringify(output, null, 2));
await fs.writeFile(path.join(outDir, 'resolved.json'), JSON.stringify(resolved, null, 2));
console.log(JSON.stringify(output, null, 2));
