create table if not exists search_gateway_cache (
  cache_key text primary key,
  query text not null,
  provider text not null default 'serper',
  request_hash text not null,
  response_json jsonb not null,
  result_count integer not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_hit_at timestamptz,
  hit_count integer not null default 0,
  stale_until timestamptz
);

create index if not exists search_gateway_cache_expires_at_idx
on search_gateway_cache (expires_at);

create index if not exists search_gateway_cache_provider_query_idx
on search_gateway_cache (provider, query);
