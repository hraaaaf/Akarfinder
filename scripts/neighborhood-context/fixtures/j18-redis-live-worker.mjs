/** J18-I optional manual live test; never referenced by CI. */
import {createJ18UpstashRedisQuota} from '../j18-distributed-redis-quota.mjs';
if(process.env.J18I_ALLOW_REAL_TESTS!=='1')process.exit(3);
const {J18I_UPSTASH_REST_URL:url,J18I_UPSTASH_REST_TOKEN:token,
  J18I_LIVE_NAMESPACE:namespace,J18I_LIVE_SUBJECT:subjectKey}=process.env;
const count=Number(process.env.J18I_LIVE_COUNT||12);
const quota=createJ18UpstashRedisQuota({url,token});
try{
  const results=await Promise.all(Array.from({length:count},()=>
    quota.reserveAtomic({namespace,subjectKey,periodMs:60000,maxHits:20,cost:1})));
  process.stdout.write(JSON.stringify({approved:results.filter(Boolean).length,denied:results.filter(x=>!x).length})+'\n');
}catch{
  // Never print credentials, endpoint, identity or exception objects.
  process.stderr.write('LIVE_BACKEND_ERROR_FAIL_CLOSED\n');
  process.exitCode=4;
}
