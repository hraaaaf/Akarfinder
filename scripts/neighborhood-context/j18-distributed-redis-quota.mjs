/**
 * J18-I experimental, non-published Upstash Redis REST quota adapter.
 * Integrates with evaluateJ18Release via {reserveAtomic}; NEVER enables a route.
 * One atomic Lua EVAL per reservation; server-side TIME avoids instance clock skew.
 * A single region/primary is required: async multi-region replicas cannot enforce
 * a strict cross-instance quota. External provider use needs a distinct gate.
 */
import {createHash, randomUUID} from 'node:crypto';

export const J18I_REDIS_SLIDING_WINDOW_LUA = `#!lua flags=allow-key-locking
local key = KEYS[1]
local period = tonumber(ARGV[1])
local max_hits = tonumber(ARGV[2])
local cost = tonumber(ARGV[3])
local nonce = ARGV[4]
local parts = redis.call('TIME')
local now = tonumber(parts[1]) * 1000 + math.floor(tonumber(parts[2]) / 1000)
local cutoff = now - period
-- ZCOUNT ignores expired scores without writing; denied calls remain cheap.
local used = redis.call('ZCOUNT', key, '(' .. cutoff, '+inf')
if (used + cost > max_hits) then
  return 0
end
-- Prune only on successful reservations to bound storage on active subjects.
redis.call('ZREMRANGEBYSCORE', key, '-inf', cutoff)
for i = 1, cost do
  local added = redis.call('ZADD', key, 'NX', now, nonce .. ':' .. i)
  if added ~= 1 then return -1 end
end
redis.call('PEXPIRE', key, period + 2000)
return 1
`;
/** Predicted billed commands with Upstash counting EVAL + each Lua command.
 * Planning estimate only; retries, WAF, analytics, other tenants and real
 * invoices/metrics are NOT included. Allowed: EVAL+TIME+ZCOUNT+ZREM+cost*ZADD+PEXPIRE.
 * Denied: EVAL+TIME+ZCOUNT.
 */
export function estimateJ18RedisCommandUse({accepted,denied,acceptedCost=1}={}) {
  if (![accepted,denied].every(x=>Number.isSafeInteger(x)&&x>=0) ||
      !Number.isSafeInteger(acceptedCost) || acceptedCost<1 || acceptedCost>1000)
    throw new TypeError('j18i_invalid_cost_projection');
  return accepted*(5+acceptedCost)+denied*3;
}
const valid = (s, re) => typeof s === 'string' && re.test(s);
const validUrl = (v) => {
  try {
    const u = new URL(v);
    return u.protocol === 'https:' && u.username === '' && u.password === '' &&
      u.pathname === '/' && !u.search && !u.hash &&
      // Upstash REST only; reject arbitrary remote endpoints/SSRF.
      /^[a-z0-9-]+\.upstash\.io$/i.test(u.hostname);
  } catch { return false; }
};
function validateReservation({namespace, subjectKey, periodMs, maxHits, cost}) {
  if (!valid(namespace, /^[a-z0-9_-]{1,48}$/i) ||
    !valid(subjectKey, /^[-_a-zA-Z0-9:.]{12,128}$/) ||
    !Number.isInteger(periodMs) || periodMs < 1000 || periodMs > 600000 ||
    !Number.isInteger(maxHits) || maxHits < 1 || maxHits > 1000 ||
    !Number.isInteger(cost) || cost < 1 || cost > maxHits) {
    throw new TypeError('j18i_quota_contract_invalid');
  }
}

/**
 * Inject fetchImpl ONLY for offline tests. Never accepts a caller-supplied URL.
 * Construction is inert: no request until reserveAtomic() is invoked.
 */
export function createJ18UpstashRedisQuota({url, token, fetchImpl=globalThis.fetch, timeoutMs=1500}={}) {
  if (!validUrl(url) || !valid(token,/^[^\s]{16,2048}$/) ||
      typeof fetchImpl !== 'function' ||
      !Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 5000) {
    throw new TypeError('j18i_redis_not_configured');
  }
  const endpoint = new URL(url).toString();
  return Object.freeze({
    async reserveAtomic(input={}) {
      validateReservation(input);
      const {namespace, subjectKey, periodMs, maxHits, cost} = input;
      // No raw IP / actor identity enters the Redis key or response.
      const digest = createHash('sha256').update(namespace + '\0' + subjectKey).digest('hex');
      const key = 'akarfinder:j18i:quota:' + digest;
      const requestId = randomUUID();
      const requestBody = JSON.stringify(['EVAL', J18I_REDIS_SLIDING_WINDOW_LUA,
        '1', key, String(periodMs), String(maxHits), String(cost), requestId]);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetchImpl(endpoint, {
          method:'POST', redirect:'error', cache:'no-store',
          headers:{Authorization:'Bearer ' + token, 'Content-Type':'application/json'},
          body:requestBody, signal:controller.signal,
        });
        if (!response || response.ok !== true) throw new Error('j18i_redis_http_failure');
        const body = await response.json();
        if (body?.error !== undefined || !Number.isInteger(body?.result))
          throw new Error('j18i_redis_bad_response');
        if (body.result === 1) return true;
        if (body.result === 0) return false;
        throw new Error('j18i_redis_invalid_result');
      } finally { clearTimeout(timer); }
    }
  });
}
