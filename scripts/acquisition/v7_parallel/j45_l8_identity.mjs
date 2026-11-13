/** Check ONE supplied URL with actual merged L8 validators, no fetch or DB. */
import {readFileSync} from 'node:fs';
import {adaptLegacyReport} from '../v7_multisource/legacy_candidate_bridge.mjs';
const allowed=new Set(['avito.ma','sarouty.ma','mubawab.ma','marocannonces.com']);
try {
  const inputText=readFileSync(0,'utf8');
  if(inputText.length>4500) throw new Error('TOO_LARGE');
  const req=JSON.parse(inputText);
  if(!req || typeof req!=='object' || Array.isArray(req) ||
    Object.keys(req).sort().join('|')!=='source_domain|source_url' ||
    !allowed.has(req.source_domain)) throw new Error('UNSUPPORTED_INPUT');
  const result=adaptLegacyReport(req.source_domain,{
    zeroDbWrites:true, stoppedEarly:null, listingUrls:[req.source_url]
  });
  if(result.url_only_count!==1 || result.candidates.length!==1) throw new Error('INVALID_ID');
  const x=result.candidates[0];
  process.stdout.write(JSON.stringify({
    source_domain:x.source_domain, source_offer_id:x.source_offer_id,
    source_url:x.source_url, record_kind:x.record_kind,
    detail_observed:x.detail_observed,
    eligible_for_private_detail_staging:x.eligible_for_private_detail_staging,
    eligible_for_public_admission:x.eligible_for_public_admission
  })+'\n');
} catch {
  process.stderr.write('L8_IDENTITY_REJECTED\n');
  process.exitCode=2;
}
