export function estimateJ18RedisCommandUse(args:{accepted:number;denied:number;acceptedCost?:number}):number;
export const J18I_REDIS_SLIDING_WINDOW_LUA:string;
export function createJ18UpstashRedisQuota(args:{
 url:string;token:string;fetchImpl?:typeof fetch;timeoutMs?:number;
}):{reserveAtomic(args:{namespace:string;subjectKey:string;periodMs:number;maxHits:number;cost:number}):Promise<boolean>};
