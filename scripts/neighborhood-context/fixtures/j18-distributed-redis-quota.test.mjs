import test from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createJ18UpstashRedisQuota,J18I_REDIS_SLIDING_WINDOW_LUA,estimateJ18RedisCommandUse} from '../j18-distributed-redis-quota.mjs';
const url='https://arbitrary-candidate.upstash.io/';
const token='test-only-token-with-length-not-real';
const policy={namespace:'j18h-indicative',subjectKey:'trusted:visitor:abc123',periodMs:60000,maxHits:20,cost:1};
function mock(result=1){const calls=[];
 const quota=createJ18UpstashRedisQuota({url,token,fetchImpl:async (target,opts)=>{
   calls.push({target,opts});return {ok:true,json:async()=>({result})};
 }});
 return {quota,calls};
}
test('J18-I one EVAL REST per reserve, no network at construction',async()=>{
 const {quota,calls}=mock();assert.equal(calls.length,0);
 assert.equal(await quota.reserveAtomic(policy),true);assert.equal(calls.length,1);
 const c=calls[0]; assert.equal(c.target,url);assert.equal(c.opts.method,'POST');
 const a=JSON.parse(c.opts.body); assert.equal(a[0],'EVAL');assert.equal(a[2],'1');
 assert.match(a[3],/^akarfinder:j18i:quota:[a-f0-9]{64}$/);
 assert.deepEqual(a.slice(4,7),['60000','20','1']);
 assert.match(a[7],/^[0-9a-f-]{36}$/);assert.equal(c.opts.redirect,'error');
 assert.equal(c.opts.cache,'no-store');assert.equal(c.opts.headers.Authorization,'Bearer '+token);
});
test('J18-I denied returns false and source/actor absent from key',async()=>{
 const {quota,calls}=mock(0);assert.equal(await quota.reserveAtomic(policy),false);
 const s=JSON.stringify(calls[0].opts.body);assert.ok(!s.includes(policy.subjectKey));
 assert.ok(!s.includes(token));
});
test('J18-I strict URL validation blocks SSRF/http/credentials',()=>{
 for(const bad of ['http://a.upstash.io/','https://a.upstash.io.evil.net/',
  'https://evil.example/','https://user:pass@a.upstash.io/',
  'https://a.upstash.io/a','https://a.upstash.io/?x=1']){
  assert.throws(()=>createJ18UpstashRedisQuota({url:bad,token}),/j18i_redis_not_configured/);
 }
});
test('J18-I missing endpoint or token fails closed',()=>{
 assert.throws(()=>createJ18UpstashRedisQuota({url,token:''}),TypeError);
 assert.throws(()=>createJ18UpstashRedisQuota({url:'',token}),TypeError);
});
test('J18-I invalid quotas/identities never reach network',async()=>{
 const {quota,calls}=mock();
 for(const wrong of [{...policy,subjectKey:'untrusted'}, {...policy,cost:21},
  {...policy,maxHits:0},{...policy,periodMs:0},{...policy,namespace:'../../escape'},
  {...policy, cost:1.5}]){
  await assert.rejects(quota.reserveAtomic(wrong),TypeError);
 }
 assert.equal(calls.length,0);
});
test('J18-I unexpected result cannot grant quota',async()=>{
 for(const code of [2,-1,null,'1',true]){
  const {quota}=mock(code);
  await assert.rejects(quota.reserveAtomic(policy));
 }
});
test('J18-I HTTP error and malformed response fail closed',async()=>{
 for(const fetchImpl of [
  async()=>({ok:false,status:429}),async()=>({ok:true,json:async()=>({error:'down'})}),
  async()=>({ok:true,json:async()=>({})}),
  async()=>{throw new Error('connection reset')},
 ]){
  const quota=createJ18UpstashRedisQuota({url,token,fetchImpl});
  await assert.rejects(quota.reserveAtomic(policy));
 }
});
test('J18-I timeout abort uses AbortSignal (no fail-open)',async()=>{
 const quota=createJ18UpstashRedisQuota({url,token,timeoutMs:100,
   fetchImpl:(_url,{signal})=>new Promise((_resolve,reject)=>{
      signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true});
   })});
 await assert.rejects(quota.reserveAtomic(policy),/aborted/);
});
test('J18-I atomic sliding-window Lua uses server TIME and same key',()=>{
 assert.match(J18I_REDIS_SLIDING_WINDOW_LUA,/redis\.call\('TIME'\)/);
 assert.match(J18I_REDIS_SLIDING_WINDOW_LUA,/ZREMRANGEBYSCORE/);
 assert.match(J18I_REDIS_SLIDING_WINDOW_LUA,/ZCOUNT/);
 assert.match(J18I_REDIS_SLIDING_WINDOW_LUA,/allow-key-locking/);
 assert.match(J18I_REDIS_SLIDING_WINDOW_LUA,/ZADD/);
 assert.match(J18I_REDIS_SLIDING_WINDOW_LUA,/PEXPIRE/);
 assert.ok(!J18I_REDIS_SLIDING_WINDOW_LUA.includes('FLUSH'));
});
test('J18-I new nonce per request and same hashed subject key',async()=>{
 const {quota,calls}=mock(); await quota.reserveAtomic(policy);await quota.reserveAtomic(policy);
 const [a,b]=calls.map(x=>JSON.parse(x.opts.body));
 assert.equal(a[3],b[3]);assert.notEqual(a[7],b[7]);
});

test('J18-I estimates billed command load without claiming real billing',()=>{
 assert.equal(estimateJ18RedisCommandUse({accepted:20,denied:16}),168);
 assert.equal(estimateJ18RedisCommandUse({accepted:1,denied:0,acceptedCost:3}),8);
 assert.equal(estimateJ18RedisCommandUse({accepted:0,denied:1}),3);
 assert.throws(()=>estimateJ18RedisCommandUse({accepted:-1,denied:0}),TypeError);
});
test('J18-I does not enable J18-H route or add production Redis credentials',()=>{
 const route=readFileSync(new URL('../../../app/api/geo/indicative-landmarks/route.ts',import.meta.url),'utf8');
 assert.match(route,/J18H_SOURCE_PUBLICATION_ENABLED/);
 assert.match(route,/status:404/);
 assert.doesNotMatch(route,/j18-distributed-redis-quota|UPSTASH_REDIS_REST_TOKEN|process\.env\.J18I/);
});
