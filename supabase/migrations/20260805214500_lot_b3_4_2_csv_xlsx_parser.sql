-- LOT B3.4.2 — CSV/XLSX parser metadata and quarantine persistence.
-- No listing mutation and no publication.

alter table public.partner_feed_imports
  add column if not exists detected_format text,
  add column if not exists selected_sheet_name text,
  add column if not exists parser_version text,
  add column if not exists parsed_at timestamptz,
  add column if not exists parse_error text,
  add column if not exists preview_rows jsonb not null default '[]'::jsonb,
  add column if not exists formula_cells_neutralized integer not null default 0;

alter table public.partner_feed_imports
  drop constraint if exists partner_feed_imports_detected_format_check;
alter table public.partner_feed_imports
  add constraint partner_feed_imports_detected_format_check
  check (detected_format is null or detected_format in ('csv','xlsx'));

alter table public.partner_feed_imports
  drop constraint if exists partner_feed_imports_formula_cells_neutralized_check;
alter table public.partner_feed_imports
  add constraint partner_feed_imports_formula_cells_neutralized_check
  check (formula_cells_neutralized >= 0);

alter table public.partner_feed_import_rows
  add column if not exists parser_version text,
  add column if not exists source_sheet_name text,
  add column if not exists source_row_number integer;

alter table public.partner_feed_import_rows
  drop constraint if exists partner_feed_import_rows_source_row_number_check;
alter table public.partner_feed_import_rows
  add constraint partner_feed_import_rows_source_row_number_check
  check (source_row_number is null or source_row_number > 0);

create or replace function public.odm_b3_4_2_feed_parser_report_v1()
returns jsonb
language sql
stable
security invoker
set search_path=''
as $$
select jsonb_build_object(
  'audit_version','odm_b3_4_2_feed_parser_v1',
  'csv_imports',(select count(*) from public.partner_feed_imports where detected_format='csv'),
  'xlsx_imports',(select count(*) from public.partner_feed_imports where detected_format='xlsx'),
  'parsed_imports',(select count(*) from public.partner_feed_imports where parsed_at is not null),
  'parse_errors',(select count(*) from public.partner_feed_imports where parse_error is not null),
  'parsed_rows',(select count(*) from public.partner_feed_import_rows where parser_version is not null),
  'publication_eligible_imports',(select count(*) from public.partner_feed_imports where publication_eligible),
  'publication_eligible_rows',(select count(*) from public.partner_feed_import_rows where publication_eligible),
  'fail_closed',(
    (select count(*) from public.partner_feed_imports where publication_eligible)=0
    and (select count(*) from public.partner_feed_import_rows where publication_eligible)=0
  )
);
$$;

revoke all on function public.odm_b3_4_2_feed_parser_report_v1() from public,anon,authenticated;
grant execute on function public.odm_b3_4_2_feed_parser_report_v1() to service_role;
