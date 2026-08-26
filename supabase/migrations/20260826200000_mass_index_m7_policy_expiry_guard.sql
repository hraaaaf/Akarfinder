-- MASS-INDEX M7-F — source policy expiry guard
-- Goal: a public Search result must never be served outside the explicit policy window.
-- Success: both rich-content and canonical-link-only lanes require an effective, non-expired policy.
-- Impact: function catalog replacement only; no source, index or policy row is modified.
-- Re-run behavior: idempotent when both expiry predicates are already present; fail closed on partial/drifted definitions.
-- Rollback: restore the immediately previous search_public_representations_v2 body from migration history.

do $migration$
declare
  v_signature constant regprocedure := 'public.search_public_representations_v2(text,text,text,text,numeric,numeric,numeric,numeric,integer,smallint,real,timestamptz,uuid)'::regprocedure;
  v_definition text;
  v_target constant text := 'and pol.review_status in (''current'', ''due_soon'')';
  v_replacement constant text := E'and pol.review_status in (''current'', ''due_soon'')\n        and pol.policy_effective_at is not null\n        and pol.policy_effective_at <= now()\n        and pol.policy_expires_at is not null\n        and pol.policy_expires_at > now()';
  v_target_count integer;
  v_effective_count integer;
  v_expiry_count integer;
begin
  v_definition := pg_get_functiondef(v_signature);

  v_target_count := (length(v_definition) - length(replace(v_definition, v_target, ''))) / length(v_target);
  v_effective_count := (length(v_definition) - length(replace(v_definition, 'and pol.policy_effective_at <= now()', ''))) / length('and pol.policy_effective_at <= now()');
  v_expiry_count := (length(v_definition) - length(replace(v_definition, 'and pol.policy_expires_at > now()', ''))) / length('and pol.policy_expires_at > now()');

  if v_effective_count = 2 and v_expiry_count = 2 then
    return;
  end if;

  if v_effective_count <> 0 or v_expiry_count <> 0 then
    raise exception 'M7 policy expiry guard drift: expected 0 or 2 effective/expiry predicates, found effective=% expiry=%', v_effective_count, v_expiry_count;
  end if;

  if v_target_count <> 2 then
    raise exception 'M7 policy expiry guard drift: expected 2 review-status predicates, found %', v_target_count;
  end if;

  execute replace(v_definition, v_target, v_replacement);

  v_definition := pg_get_functiondef(v_signature);
  v_effective_count := (length(v_definition) - length(replace(v_definition, 'and pol.policy_effective_at <= now()', ''))) / length('and pol.policy_effective_at <= now()');
  v_expiry_count := (length(v_definition) - length(replace(v_definition, 'and pol.policy_expires_at > now()', ''))) / length('and pol.policy_expires_at > now()');

  if v_effective_count <> 2 or v_expiry_count <> 2 then
    raise exception 'M7 policy expiry guard postcondition failed: effective=% expiry=%', v_effective_count, v_expiry_count;
  end if;
end;
$migration$;

-- The application invokes this RPC through the server-side service role only.
revoke all on function public.search_public_representations_v2(
  text, text, text, text, numeric, numeric, numeric, numeric,
  integer, smallint, real, timestamptz, uuid
) from PUBLIC, anon, authenticated;

grant execute on function public.search_public_representations_v2(
  text, text, text, text, numeric, numeric, numeric, numeric,
  integer, smallint, real, timestamptz, uuid
) to service_role;
