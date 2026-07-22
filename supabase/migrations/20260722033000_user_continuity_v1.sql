-- #19H User Continuity V1
-- User-owned search projects and continuity artifacts.
-- No public/anon access. Commercial tiers are intentionally absent.

create table if not exists public.user_search_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  status text not null default 'active' check (status in ('active','archived')),
  profile jsonb not null default '{}'::jsonb,
  companion_session jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table if not exists public.user_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid,
  result_key text not null check (char_length(result_key) between 1 and 500),
  target_kind text not null check (target_kind in ('internal_listing','external_result')),
  listing_id bigint references public.property_listings(id) on delete cascade,
  source_url text,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, result_key),
  foreign key (project_id, user_id) references public.user_search_projects(id, user_id) on delete cascade,
  check (
    (target_kind = 'internal_listing' and listing_id is not null)
    or (target_kind = 'external_result' and source_url is not null)
  )
);

create table if not exists public.user_saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid,
  name text not null check (char_length(name) between 1 and 120),
  query_state jsonb not null default '{}'::jsonb,
  alerts_enabled boolean not null default false,
  alert_frequency text not null default 'daily' check (alert_frequency in ('immediate','daily','weekly')),
  status text not null default 'active' check (status in ('active','paused','archived')),
  last_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (project_id, user_id) references public.user_search_projects(id, user_id) on delete cascade
);

create table if not exists public.user_search_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid,
  query_state jsonb not null default '{}'::jsonb,
  result_count integer check (result_count is null or result_count >= 0),
  created_at timestamptz not null default now(),
  foreign key (project_id, user_id) references public.user_search_projects(id, user_id) on delete cascade
);

create table if not exists public.user_comparisons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid,
  name text not null default 'Comparaison' check (char_length(name) between 1 and 120),
  entries jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (project_id, user_id) references public.user_search_projects(id, user_id) on delete cascade
);

create table if not exists public.user_eliminated_properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null,
  result_key text not null check (char_length(result_key) between 1 and 500),
  reasons jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, project_id, result_key),
  foreign key (project_id, user_id) references public.user_search_projects(id, user_id) on delete cascade
);

create table if not exists public.user_learned_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid,
  preference_key text not null check (char_length(preference_key) between 1 and 120),
  preference_value jsonb not null,
  source text not null check (source in ('explicit','companion_derived','behavioral_inference')),
  confidence text not null check (confidence in ('high','medium','low')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, project_id, preference_key),
  foreign key (project_id, user_id) references public.user_search_projects(id, user_id) on delete cascade
);

create index if not exists user_search_projects_user_idx on public.user_search_projects(user_id, updated_at desc);
create index if not exists user_favorites_user_idx on public.user_favorites(user_id, created_at desc);
create index if not exists user_saved_searches_user_idx on public.user_saved_searches(user_id, updated_at desc);
create index if not exists user_search_history_user_idx on public.user_search_history(user_id, created_at desc);
create index if not exists user_comparisons_user_idx on public.user_comparisons(user_id, updated_at desc);
create index if not exists user_eliminated_properties_project_idx on public.user_eliminated_properties(user_id, project_id, created_at desc);
create index if not exists user_learned_preferences_project_idx on public.user_learned_preferences(user_id, project_id, updated_at desc);

alter table public.user_search_projects enable row level security;
alter table public.user_favorites enable row level security;
alter table public.user_saved_searches enable row level security;
alter table public.user_search_history enable row level security;
alter table public.user_comparisons enable row level security;
alter table public.user_eliminated_properties enable row level security;
alter table public.user_learned_preferences enable row level security;

-- Explicit Data API grants: authenticated users are row-scoped by RLS; service_role is server-only.
grant select, insert, update, delete on public.user_search_projects to authenticated, service_role;
grant select, insert, update, delete on public.user_favorites to authenticated, service_role;
grant select, insert, update, delete on public.user_saved_searches to authenticated, service_role;
grant select, insert, update, delete on public.user_search_history to authenticated, service_role;
grant select, insert, update, delete on public.user_comparisons to authenticated, service_role;
grant select, insert, update, delete on public.user_eliminated_properties to authenticated, service_role;
grant select, insert, update, delete on public.user_learned_preferences to authenticated, service_role;

-- Four-operation ownership policies. UPDATE always has USING + WITH CHECK.
create policy "user_search_projects_select_own" on public.user_search_projects for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_search_projects_insert_own" on public.user_search_projects for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "user_search_projects_update_own" on public.user_search_projects for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "user_search_projects_delete_own" on public.user_search_projects for delete to authenticated using ((select auth.uid()) = user_id);

create policy "user_favorites_select_own" on public.user_favorites for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_favorites_insert_own" on public.user_favorites for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "user_favorites_update_own" on public.user_favorites for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "user_favorites_delete_own" on public.user_favorites for delete to authenticated using ((select auth.uid()) = user_id);

create policy "user_saved_searches_select_own" on public.user_saved_searches for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_saved_searches_insert_own" on public.user_saved_searches for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "user_saved_searches_update_own" on public.user_saved_searches for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "user_saved_searches_delete_own" on public.user_saved_searches for delete to authenticated using ((select auth.uid()) = user_id);

create policy "user_search_history_select_own" on public.user_search_history for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_search_history_insert_own" on public.user_search_history for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "user_search_history_update_own" on public.user_search_history for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "user_search_history_delete_own" on public.user_search_history for delete to authenticated using ((select auth.uid()) = user_id);

create policy "user_comparisons_select_own" on public.user_comparisons for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_comparisons_insert_own" on public.user_comparisons for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "user_comparisons_update_own" on public.user_comparisons for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "user_comparisons_delete_own" on public.user_comparisons for delete to authenticated using ((select auth.uid()) = user_id);

create policy "user_eliminated_properties_select_own" on public.user_eliminated_properties for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_eliminated_properties_insert_own" on public.user_eliminated_properties for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "user_eliminated_properties_update_own" on public.user_eliminated_properties for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "user_eliminated_properties_delete_own" on public.user_eliminated_properties for delete to authenticated using ((select auth.uid()) = user_id);

create policy "user_learned_preferences_select_own" on public.user_learned_preferences for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_learned_preferences_insert_own" on public.user_learned_preferences for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "user_learned_preferences_update_own" on public.user_learned_preferences for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "user_learned_preferences_delete_own" on public.user_learned_preferences for delete to authenticated using ((select auth.uid()) = user_id);
