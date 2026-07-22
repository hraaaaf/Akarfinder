-- #19H hardening: public-schema default privileges may grant anon table privileges.
-- RLS already blocks row access, but continuity tables should not expose an anon Data API surface at all.

revoke all privileges on table public.user_search_projects from anon;
revoke all privileges on table public.user_favorites from anon;
revoke all privileges on table public.user_saved_searches from anon;
revoke all privileges on table public.user_search_history from anon;
revoke all privileges on table public.user_comparisons from anon;
revoke all privileges on table public.user_eliminated_properties from anon;
revoke all privileges on table public.user_learned_preferences from anon;
