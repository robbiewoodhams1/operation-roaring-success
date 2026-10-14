-- Schema fingerprint of the `app` schema — read-only, catalog queries only.
--
-- One row per table (columns, constraints, indexes, triggers, policies, RLS
-- flags and grants together), function (definition + grants) and enum, with an
-- md5 of its whitespace-normalised definition. No row data is read.
--
-- The same query runs everywhere, so two environments can be compared without
-- pg_dump: `pnpm db:fingerprint` (Local or the replay harness), or pasted into
-- a read-only session on a hosted project (see docs/MIGRATIONS.md). Equal
-- hashes mean equal definitions; whitespace-only differences (e.g. CRLF line
-- endings in function bodies written from the dashboard) are ignored.
with
tbl as (
  select c.oid, c.relname
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app' and c.relkind in ('r', 'p')
),
detail as (
  select t.relname, 'table rls=' || c.relrowsecurity || ' force=' || c.relforcerowsecurity
         || ' acl=' || coalesce(c.relacl::text, '') as line
    from tbl t join pg_class c on c.oid = t.oid
  union all
  select t.relname, 'column ' || a.attname || ' ' || format_type(a.atttypid, a.atttypmod)
         || case when a.attnotnull then ' not null' else '' end
         || coalesce(' default ' || pg_get_expr(d.adbin, d.adrelid), '')
         || case a.attgenerated when 's' then ' generated' else '' end
         || case when a.attidentity <> '' then ' identity ' || a.attidentity::text else '' end
    from tbl t
    join pg_attribute a on a.attrelid = t.oid and a.attnum > 0 and not a.attisdropped
    left join pg_attrdef d on d.adrelid = t.oid and d.adnum = a.attnum
  union all
  select t.relname, 'constraint ' || con.conname || ' ' || pg_get_constraintdef(con.oid)
    from tbl t join pg_constraint con on con.conrelid = t.oid
  union all
  select t.relname, 'index ' || pg_get_indexdef(i.indexrelid)
    from tbl t join pg_index i on i.indrelid = t.oid
  union all
  select t.relname, 'trigger ' || pg_get_triggerdef(tg.oid) || ' enabled=' || tg.tgenabled::text
    from tbl t join pg_trigger tg on tg.tgrelid = t.oid and not tg.tgisinternal
  union all
  select p.tablename, 'policy ' || p.policyname || ' ' || p.permissive || ' ' || p.roles::text || ' '
         || p.cmd || ' using(' || coalesce(p.qual, '') || ') check(' || coalesce(p.with_check, '') || ')'
    from pg_policies p where p.schemaname = 'app'
),
objects as (
  select 'table' as kind, relname::text as name,
         string_agg(line, E'\n' order by line) as def
    from detail group by relname
  union all
  select 'function', p.oid::regprocedure::text,
         pg_get_functiondef(p.oid) || ' acl=' || coalesce(p.proacl::text, '')
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'app'
  union all
  select 'enum', t.typname::text, string_agg(e.enumlabel, ',' order by e.enumsortorder)
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    join pg_enum e on e.enumtypid = t.oid
   where n.nspname = 'app'
   group by t.typname
)
select kind, name, md5(btrim(regexp_replace(def, '\s+', ' ', 'g'))) as hash
  from objects
 order by kind, name;
