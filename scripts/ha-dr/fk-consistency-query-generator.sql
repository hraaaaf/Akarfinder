\set ON_ERROR_STOP on

-- Emits one tab-separated row per FK owned by public.<table_name>:
--   constraint_name<TAB>read_only_violation_count_query
-- The caller executes each emitted query and requires a zero count.
with fk as (
  select
    con.oid,
    con.conname,
    con.conrelid,
    con.confrelid,
    con.confmatchtype,
    con.conkey,
    con.confkey,
    con.conpfeqop
  from pg_constraint con
  where con.contype = 'f'
    and con.conrelid = to_regclass(format('public.%I', :'table_name'))
),
pairs as (
  select
    fk.oid,
    fk.conname,
    fk.conrelid,
    fk.confrelid,
    fk.confmatchtype,
    child_key.ord,
    child_att.attname as child_column,
    parent_att.attname as parent_column,
    op_ns.nspname as operator_schema,
    op.oprname as operator_name
  from fk
  join lateral unnest(fk.conkey) with ordinality
    as child_key(attnum, ord) on true
  join lateral unnest(fk.confkey) with ordinality
    as parent_key(attnum, ord) on parent_key.ord = child_key.ord
  join lateral unnest(fk.conpfeqop) with ordinality
    as eqop(op_oid, ord) on eqop.ord = child_key.ord
  join pg_attribute child_att
    on child_att.attrelid = fk.conrelid
   and child_att.attnum = child_key.attnum
  join pg_attribute parent_att
    on parent_att.attrelid = fk.confrelid
   and parent_att.attnum = parent_key.attnum
  join pg_operator op
    on op.oid = eqop.op_oid
  join pg_namespace op_ns
    on op_ns.oid = op.oprnamespace
),
agg as (
  select
    oid,
    conname,
    conrelid,
    confrelid,
    confmatchtype,
    string_agg(
      format('c.%I is not null', child_column),
      ' and ' order by ord
    ) as all_nonnull,
    string_agg(
      format('c.%I is null', child_column),
      ' and ' order by ord
    ) as all_null,
    string_agg(
      format(
        'c.%I OPERATOR(%I.%I) p.%I',
        child_column,
        operator_schema,
        operator_name,
        parent_column
      ),
      ' and ' order by ord
    ) as parent_match
  from pairs
  group by oid, conname, conrelid, confrelid, confmatchtype
)
select
  conname || E'\t' ||
  case confmatchtype
    when 's' then format(
      'select count(*) from %s c where (%s) and not exists (select 1 from %s p where %s);',
      conrelid::regclass,
      all_nonnull,
      confrelid::regclass,
      parent_match
    )
    when 'f' then format(
      'select count(*) from %s c where ((not (%s) and not (%s)) or ((%s) and not exists (select 1 from %s p where %s)));',
      conrelid::regclass,
      all_null,
      all_nonnull,
      all_nonnull,
      confrelid::regclass,
      parent_match
    )
    else 'select 1;'
  end
from agg
order by conname;
