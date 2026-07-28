create table if not exists public.odm_shadow_divergence_events_v1 (
  id bigint generated always as identity primary key,
  version text not null check (version = 'odm_dual_read_v1'),
  stable_key_hash text not null check (char_length(stable_key_hash) = 16),
  legacy_count integer not null check (legacy_count >= 0),
  odm_count integer not null check (odm_count >= 0),
  canonical_overlap_count integer not null check (canonical_overlap_count >= 0),
  canonical_overlap_rate double precision not null check (canonical_overlap_rate >= 0 and canonical_overlap_rate <= 1),
  rank_overlap_at_10 integer not null check (rank_overlap_at_10 >= 0 and rank_overlap_at_10 <= 10),
  trusted_price_comparisons integer not null check (trusted_price_comparisons >= 0),
  trusted_price_divergences integer not null check (trusted_price_divergences >= 0 and trusted_price_divergences <= trusted_price_comparisons),
  trusted_surface_comparisons integer not null check (trusted_surface_comparisons >= 0),
  trusted_surface_divergences integer not null check (trusted_surface_divergences >= 0 and trusted_surface_divergences <= trusted_surface_comparisons),
  metric_generated_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.odm_shadow_divergence_events_v1 enable row level security;
revoke all on table public.odm_shadow_divergence_events_v1 from anon, authenticated;
revoke all on sequence public.odm_shadow_divergence_events_v1_id_seq from anon, authenticated;
grant select, insert, delete on table public.odm_shadow_divergence_events_v1 to service_role;
grant usage, select on sequence public.odm_shadow_divergence_events_v1_id_seq to service_role;

create index if not exists odm_shadow_divergence_events_v1_created_at_idx
  on public.odm_shadow_divergence_events_v1 (created_at desc);
create index if not exists odm_shadow_divergence_events_v1_stable_key_hash_idx
  on public.odm_shadow_divergence_events_v1 (stable_key_hash, created_at desc);

comment on table public.odm_shadow_divergence_events_v1 is
  'Server-only ODM dual-read divergence telemetry. Contains hashed query keys only; no raw query or user identifier.';
