# 004 — One migration history in `supabase/migrations`, starting from a reconstructed baseline

**Status:** accepted 2026-10-14. Supersedes the remediation proposed in ADR 002.
Partially rolled out: the history exists and is verified against Staging's schema;
it is not yet recorded on Staging (adoption pending a Docker-validated Local) or on
Production (pending read-only verification + release approval).

## Context

- The `app` schema was built by hand (ADR 002). `packages/db/migrations/` held two
  hand-run SQL scripts (`0001_platform_settings`, `0002_performance_stats`) with no
  drizzle-kit journal; no hosted project had any migration history table rows.
- We need a local Supabase stack (Auth, Storage, Studio, resettable DB), a staging
  promotion path, and protection for Production.
- ADR 002 suggested `drizzle-kit introspect` to create a baseline. Introspection
  covers tables and enums but not the functions, triggers, RLS policies and grants
  this schema depends on (audit trail, Stats Board ledger), so it cannot reproduce
  the database.

## Decision

1. Adopt the **Supabase CLI** migration format (`supabase/migrations/<version>_<name>.sql`,
   `supabase_migrations.schema_migrations`) as the **only** history.
2. Add `20260928000000_baseline_app_schema.sql`, reconstructed from Staging's catalog
   (read-only) and limited to objects that predate 0001.
3. Move 0001/0002 into the history unchanged in content and order
   (`20260928000100_platform_settings`, `20261013000000_performance_stats`); drop
   0002's inner `BEGIN/COMMIT` because the CLI already applies each file atomically.
4. Prove the baseline instead of trusting it: a catalog fingerprint
   (`packages/db-tools/scripts/schema-fingerprint.sql`) of a fresh replay must equal
   Staging's recorded fingerprint (`pnpm db:verify`, also in CI).
5. Hosted projects that already contain the schema _record_ the versions with
   `migration repair` after the fingerprint proves equality; nothing is re-run and no
   hosted database is reset.
6. drizzle-kit is limited to the ORM schema and SQL drafts in a git-ignored folder.

## Consequences

- Fresh environments (Local, CI, disaster recovery rehearsal) can be built from source.
- Drift is detectable per table/function/enum without `pg_dump`.
- The baseline reflects Staging; Production must be fingerprinted read-only before
  its history is adopted (docs/RELEASE.md step 0).
- The replay harness uses PGlite (Postgres 17.5) with a small Supabase shim — it
  verifies SQL and catalog equivalence but is not a substitute for the Docker stack.
