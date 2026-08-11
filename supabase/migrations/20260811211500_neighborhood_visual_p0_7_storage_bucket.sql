-- NEIGHBORHOOD-VISUAL-P0.7 — public neighborhood visual master bucket.
-- Read is public because these three pilot masters are open-license public ambience assets.
-- Writes remain service/admin only; no anon/authenticated write policy is created here.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'neighborhood-visuals',
  'neighborhood-visuals',
  true,
  15728640,
  array['image/jpeg']::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Used by the bounded one-shot ingestion Edge Function invocation and useful for later
-- national visual-library ingestion jobs. pg_net creates its own `net` schema.
create extension if not exists pg_net;
