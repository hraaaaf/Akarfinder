/**
 * Manual ONLY. An explicit environment gate + isolated single-region Upstash
 * instance are mandatory. No live tests run in CI, no production credentials.
 * Usage: J18I_ALLOW_REAL_TESTS=1 J18I_UPSTASH_REST_URL=... \
 * J18I_UPSTASH_REST_TOKEN=... J18I_ISOLATED_INSTANCE_CONFIRMED=1 node scripts/neighborhood-context/fixtures/j18-redis-live-run.mjs
 * Each isolated subject key self-expires; never FLUSH/DEL unrelated keys.
 */
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
if(process.env.J18I_ALLOW_REAL_TESTS!=='1'||
   process.env.J18I_ISOLATED_INSTANCE_CONFIRMED!=='1'||
   !process.env.J18I_UPSTASH_REST_URL||!process.env.J18I_UPSTASH_REST_TOKEN){
  console.error('BLOCKED: isolated Upstash credentials and explicit test gate required');
  process.exit(2);
}
const marker=randomUUID().replaceAll('-','');
const env={...process.env,J18I_LIVE_NAMESPACE:'j18i-live-'+marker.slice(0,18),
  J18I_LIVE_SUBJECT:'trusted:live:'+marker,J18I_LIVE_COUNT:'12'};
const worker=fileURLToPath(new URL('./j18-redis-live-worker.mjs',import.meta.url));
function one(){return new Promise((resolve,reject)=>{
 const child=spawn(process.execPath,[worker],{env,stdio:['ignore','pipe','pipe']});
 let out='',err='';
 child.stdout.on('data',d=>out+=d);
 child.stderr.on('data',d=>err+=d);
 child.on('error',()=>reject(new Error('worker_start_failed')));
 child.on('close',code=>{
  if(code!==0)return reject(new Error('worker_failed_closed'));
  try{resolve(JSON.parse(out.trim()))}catch{reject(new Error('worker_bad_result'))}
 });
});}
try{
 const rows=await Promise.all([one(),one(),one()]);
 const approved=rows.reduce((s,r)=>s+r.approved,0);
 const denied=rows.reduce((s,r)=>s+r.denied,0);
 if(approved!==20||denied!==16)throw new Error('non_atomic_or_incorrect_limit');
 console.log(JSON.stringify({pass:true,workers:3,requests:36,approved,denied,
  expectedRedisCommandsApprox:20*6+16*3, realBillingNotMeasured:true,
  storage:'temporary isolated subject auto-expires', productionUsed:'NOT_VERIFIED_AUTOMATICALLY'},null,2));
}catch{
 console.error('FAIL_CLOSED: external Redis test did not meet its invariant');
 process.exitCode=1;
}
