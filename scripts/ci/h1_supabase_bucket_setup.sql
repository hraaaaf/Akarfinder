-- H1 DEV evidence only. Apply on the approved AkarfFnder Supabase project
-- mgqsckxsqdqbzqwkgvwo. Does NOT touch public app tables or existing buckets.
-- A separate Auth worker must be provisioned by an administrator with
-- app_metadata.h1_storage='enabled'. NEVER use service_role in GitHub Actions.
BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'h1-historical-evidence') THEN
    RAISE EXCEPTION 'H1_BUCKET_EXISTS_REVIEW_REQUIRED';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
    AND policyname IN ('h1_evidence_worker_read', 'h1_evidence_worker_insert')) THEN
    RAISE EXCEPTION 'H1_POLICY_EXISTS_REVIEW_REQUIRED';
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('h1-historical-evidence', 'h1-historical-evidence', false, 10485760);

-- Only allow H1 append-only evidence paths in this one private bucket.
-- The Auth user's signed app_metadata is admin-controlled, never user_metadata.
-- SELECT is owner-restricted; the same principal must perform all resumes.
CREATE POLICY h1_evidence_worker_read
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'h1-historical-evidence'
  AND auth.uid() IS NOT NULL
  AND owner_id = (select auth.uid())::text
  AND (select auth.jwt()->'app_metadata'->>'h1_storage') = 'enabled'
  AND name ~ '^akarfinder/h1/run-[0-9]{1,20}/(checkpoints/[0-9]{3}[.]json|final-manifest[.]json|batches/[0-9]{3}/(input/rows[.]jsonl[.]gz|parsed/[A-Za-z0-9._/-]+))$'
  AND name !~ '(^|/)[.][.](/|$)'
);

CREATE POLICY h1_evidence_worker_insert
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'h1-historical-evidence'
  AND auth.uid() IS NOT NULL
  AND (select auth.jwt()->'app_metadata'->>'h1_storage') = 'enabled'
  AND name ~ '^akarfinder/h1/run-[0-9]{1,20}/(checkpoints/[0-9]{3}[.]json|final-manifest[.]json|batches/[0-9]{3}/(input/rows[.]jsonl[.]gz|parsed/[A-Za-z0-9._/-]+))$'
  AND name !~ '(^|/)[.][.](/|$)'
);

COMMIT;
