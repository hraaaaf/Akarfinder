-- LOT B3.2 — External Tail Source Review.
-- Records evidence-backed source decisions without publishing any candidate.

create table if not exists public.source_external_tail_review_v1 (
  source_domain text primary key,
  review_version text not null default 'b3_2_external_tail_review_v1',
  reviewed_at timestamptz not null,
  evidence_status text not null,
  review_decision text not null,
  decision_reason text not null,
  evidence_urls text[] not null default '{}',
  contact_required boolean not null default true,
  next_action text not null,
  candidate_count integer not null default 0,
  serp_tail_eligible boolean not null default false,
  publication_eligible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.source_external_tail_review_v1 (
  source_domain, reviewed_at, evidence_status, review_decision,
  decision_reason, evidence_urls, contact_required, next_action, candidate_count
)
values
('1immo.ma', now(), 'terms_found', 'permission_required',
 'CGU protect all site content and prohibit reproduction without prior authorization; no explicit external-link display permission was found.',
 array['https://1immo.ma/page/terms'], true, 'Request written permission for minimal generated link-only references.', 4814),
('avito.ma', now(), 'insufficient_explicit_permission', 'permission_required',
 'Robots access is restricted and no explicit permission for third-party external-tail representation was evidenced.',
 array[]::text[], true, 'Request written permission or partnership terms before display.', 3815),
('agenz.ma', now(), 'insufficient_explicit_permission', 'permission_required',
 'Public listing access exists, but no explicit authorization for third-party external-tail representation was evidenced.',
 array[]::text[], true, 'Request written link-only display authorization.', 2359),
('soukimmobilier.com', now(), 'insufficient_explicit_permission', 'permission_required',
 'Public pages are observable, but no explicit external-tail display license or linking policy was evidenced.',
 array['https://www.soukimmobilier.com/privacy-2'], true, 'Request written link-only display authorization.', 2184),
('mouldar.com', now(), 'restrictive_terms_found', 'hidden_without_permission',
 'CGU prohibit unauthorized extraction and exploitation of protected content; external-tail display remains hidden without written permission.',
 array['https://mouldar.com/fr/cgu'], true, 'Request explicit written permission; keep hidden until granted.', 1259),
('masaken.ma', now(), 'restrictive_terms_found', 'hidden_without_permission',
 'Legal notice prohibits public or commercial use of site content without written authorization.',
 array['https://www.masaken.ma/fr/info/legal-notice'], true, 'Request explicit written permission; keep hidden until granted.', 1255),
('kawtarimmobilier.com', now(), 'insufficient_legal_evidence', 'permission_required',
 'No sufficiently explicit legal or linking policy was evidenced for third-party external-tail display.',
 array[]::text[], true, 'Obtain written permission or a published linking policy.', 135)
on conflict (source_domain) do update set
  reviewed_at=excluded.reviewed_at,
  evidence_status=excluded.evidence_status,
  review_decision=excluded.review_decision,
  decision_reason=excluded.decision_reason,
  evidence_urls=excluded.evidence_urls,
  contact_required=excluded.contact_required,
  next_action=excluded.next_action,
  candidate_count=excluded.candidate_count,
  serp_tail_eligible=false,
  publication_eligible=false,
  updated_at=now();

update public.source_external_tail_policy_v1 p
set
  review_status = case r.review_decision
    when 'permission_required' then 'permission_required'
    when 'hidden_without_permission' then 'prohibited_without_permission'
    else p.review_status
  end,
  display_gate = 'hidden',
  manual_approval_required = true,
  publication_eligible = false,
  evidence_basis = r.decision_reason,
  updated_at = now()
from public.source_external_tail_review_v1 r
where r.source_domain=p.source_domain;

update public.odm_b3_1_external_tail_audit_v1 a
set
  external_tail_review_status = r.review_decision,
  display_gate = 'hidden',
  tail_decision = case r.review_decision
    when 'permission_required' then 'awaiting_written_permission'
    else 'hidden_restrictive_terms'
  end,
  serp_tail_eligible = false,
  publication_eligible = false
from public.source_external_tail_review_v1 r
where r.source_domain=a.source_domain;

alter table public.source_external_tail_review_v1 enable row level security;
revoke all on table public.source_external_tail_review_v1 from public,anon,authenticated;
grant select,insert,update,delete on table public.source_external_tail_review_v1 to service_role;

create or replace function public.odm_b3_2_external_tail_source_review_report_v1()
returns jsonb
language sql
stable
security invoker
set search_path=''
as $$
select jsonb_build_object(
  'audit_version','odm_b3_2_external_tail_source_review_v1',
  'reviewed_sources',count(*)::int,
  'permission_required_sources',count(*) filter(where review_decision='permission_required')::int,
  'hidden_restrictive_sources',count(*) filter(where review_decision='hidden_without_permission')::int,
  'reviewed_candidates',coalesce(sum(candidate_count),0)::int,
  'permission_required_candidates',coalesce(sum(candidate_count) filter(where review_decision='permission_required'),0)::int,
  'hidden_restrictive_candidates',coalesce(sum(candidate_count) filter(where review_decision='hidden_without_permission'),0)::int,
  'serp_tail_eligible',count(*) filter(where serp_tail_eligible)::int,
  'publication_eligible',count(*) filter(where publication_eligible)::int,
  'contact_required',count(*) filter(where contact_required)::int,
  'fail_closed',count(*) filter(where serp_tail_eligible or publication_eligible)=0
)
from public.source_external_tail_review_v1;
$$;

revoke all on function public.odm_b3_2_external_tail_source_review_report_v1() from public,anon,authenticated;
grant execute on function public.odm_b3_2_external_tail_source_review_report_v1() to service_role;
