alter table public.listing_sources
  add column if not exists canonical_kind text,
  add column if not exists canonical_eligible boolean,
  add column if not exists canonical_hygiene_version smallint,
  add column if not exists canonical_classified_at timestamptz;

comment on column public.listing_sources.canonical_kind is 'Classification of source URL shape for individual-listing canonical eligibility.';
comment on column public.listing_sources.canonical_eligible is 'True only when the source URL is eligible to represent an individual listing canonical URL.';
comment on column public.listing_sources.canonical_hygiene_version is 'Version of canonical URL classification policy.';
comment on column public.listing_sources.canonical_classified_at is 'Timestamp of the latest canonical eligibility classification.';
