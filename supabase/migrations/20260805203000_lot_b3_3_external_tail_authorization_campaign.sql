-- LOT B3.3 — External Tail Authorization Campaign
-- Tracks outreach only. It never grants display permission and never publishes candidates.

create table if not exists public.source_external_tail_authorization_campaign_v1 (
  source_domain text primary key references public.source_external_tail_policy_v1(source_domain) on delete cascade,
  candidate_count integer not null check (candidate_count >= 0),
  contact_method text not null check (contact_method in ('email','contact_form','support_portal','manual_research')),
  contact_value text,
  contact_evidence_url text,
  campaign_status text not null default 'ready_to_contact' check (campaign_status in ('ready_to_contact','draft_prepared','submitted','awaiting_reply','approved','declined','no_response','contact_unresolved')),
  request_scope text not null default 'external_tail_link_only',
  requested_fields text[] not null default array['akar_generated_title','normalized_city','normalized_property_type','normalized_intent','source_domain','canonical_url']::text[],
  forbidden_fields text[] not null default array['source_title','description','snippet','image','price','surface','contact_details']::text[],
  draft_subject text not null,
  draft_body text not null,
  last_contacted_at timestamptz,
  next_follow_up_at timestamptz,
  response_evidence text,
  written_authorization_received boolean not null default false,
  activation_review_eligible boolean generated always as (
    campaign_status = 'approved' and written_authorization_received = true
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.source_external_tail_authorization_campaign_v1 enable row level security;
revoke all on table public.source_external_tail_authorization_campaign_v1 from public, anon, authenticated;
grant select, insert, update, delete on table public.source_external_tail_authorization_campaign_v1 to service_role;

insert into public.source_external_tail_authorization_campaign_v1 (
  source_domain,candidate_count,contact_method,contact_value,contact_evidence_url,campaign_status,draft_subject,draft_body
) values
('1immo.ma',4814,'email','support@1immo.ma','https://1immo.ma/page/privacy','draft_prepared','Demande d’autorisation — référencement externe limité sur AkarFinder','Bonjour,\n\nAkarFinder développe un moteur de recherche immobilier marocain. Nous sollicitons votre autorisation écrite pour afficher, en fin de résultats, une référence externe minimale vers certaines pages publiques de 1immo.ma.\n\nLa représentation serait strictement limitée à un titre généré par AkarFinder, la ville, le type de bien, l’intention, le nom 1immo.ma et un lien direct vers la page originale. Aucun titre source, description, image, prix, surface ou coordonnées ne serait repris.\n\nLes résultats seraient clairement identifiés comme externes et classés après les résultats certifiés AkarFinder. Vous pourriez demander une suspension ou un retrait à tout moment.\n\nPouvez-vous confirmer par écrit si vous autorisez ce format ?\n\nCordialement,\nÉquipe AkarFinder'),
('avito.ma',3815,'support_portal',null,'https://www.avito.ma/','ready_to_contact','Demande d’autorisation — référencement externe limité sur AkarFinder','Même demande limitée : titre généré, dimensions normalisées, domaine et lien original uniquement; aucune reprise de contenu.'),
('agenz.ma',2359,'contact_form',null,'https://agenz.ma/','ready_to_contact','Demande d’autorisation — référencement externe limité sur AkarFinder','Même demande limitée : titre généré, dimensions normalisées, domaine et lien original uniquement; aucune reprise de contenu.'),
('soukimmobilier.com',2184,'contact_form',null,'https://www.soukimmobilier.com/contactez-nous','ready_to_contact','Demande d’autorisation — référencement externe limité sur AkarFinder','Même demande limitée : titre généré, dimensions normalisées, domaine et lien original uniquement; aucune reprise de contenu.'),
('kawtarimmobilier.com',135,'email','contact@kawtarimmobilier.com','https://www.kawtarimmobilier.com/contact.html','draft_prepared','Demande d’autorisation — référencement externe limité sur AkarFinder','Bonjour,\n\nAkarFinder développe un moteur de recherche immobilier marocain. Nous sollicitons votre autorisation écrite pour afficher, en fin de résultats, une référence externe minimale vers certaines pages publiques de Kawtar Immobilier.\n\nLa représentation serait strictement limitée à un titre généré par AkarFinder, la ville, le type de bien, l’intention, le nom Kawtar Immobilier et un lien direct vers la page originale. Aucun titre source, description, image, prix, surface ou coordonnées ne serait repris.\n\nLes résultats seraient clairement identifiés comme externes et classés après les résultats certifiés AkarFinder. Vous pourriez demander une suspension ou un retrait à tout moment.\n\nPouvez-vous confirmer par écrit si vous autorisez ce format ?\n\nCordialement,\nÉquipe AkarFinder'),
('mouldar.com',1259,'email','contact@mouldar.com','https://mouldar.com/fr/contact','draft_prepared','Demande d’autorisation écrite — référencement externe minimal','Demande d’autorisation écrite préalable pour une représentation minimale sans reprise de contenu, conformément aux CGU de Mouldar.'),
('masaken.ma',1255,'contact_form',null,'https://www.masaken.ma/fr/info/legal-notice','ready_to_contact','Demande d’autorisation écrite — référencement externe minimal','Demande d’autorisation écrite préalable pour une représentation minimale sans reprise de contenu, conformément aux mentions légales de MASAKEN.MA.')
on conflict (source_domain) do update set
  candidate_count=excluded.candidate_count,
  contact_method=excluded.contact_method,
  contact_value=excluded.contact_value,
  contact_evidence_url=excluded.contact_evidence_url,
  draft_subject=excluded.draft_subject,
  draft_body=excluded.draft_body,
  updated_at=now();

create or replace function public.odm_b3_3_external_tail_authorization_campaign_report_v1()
returns jsonb
language sql
stable
security invoker
set search_path=''
as $$
select jsonb_build_object(
  'audit_version','odm_b3_3_external_tail_authorization_campaign_v1',
  'sources',count(*),
  'candidates',sum(candidate_count),
  'draft_prepared',count(*) filter(where campaign_status='draft_prepared'),
  'ready_to_contact',count(*) filter(where campaign_status='ready_to_contact'),
  'submitted',count(*) filter(where campaign_status in ('submitted','awaiting_reply')),
  'approved',count(*) filter(where activation_review_eligible),
  'publication_eligible',0,
  'fail_closed',count(*) filter(where activation_review_eligible and written_authorization_received=false)=0
) from public.source_external_tail_authorization_campaign_v1;
$$;

revoke all on function public.odm_b3_3_external_tail_authorization_campaign_report_v1() from public, anon, authenticated;
grant execute on function public.odm_b3_3_external_tail_authorization_campaign_report_v1() to service_role;
