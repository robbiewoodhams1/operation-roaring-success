# 002 — Schema has been managed directly against the live database, not via migrations

**Status:** documented as-found (2026-09-28 audit). **Superseded 2026-10-14 by
ADR 004** — the history now lives in `supabase/migrations/` from a verified,
reconstructed baseline. The "Recommended remediation" below was not followed
(introspection cannot capture the functions/triggers/policies); see ADR 004.

## Context

`packages/db/migrations/` contains exactly one file, `0001_platform_settings.sql`,
whose own header comment instructs "Run once in the Supabase SQL editor." The other
18 tables, every enum, every RLS policy, and every function/trigger in the `app`
schema exist live in the Supabase project with no corresponding migration file
anywhere in the repo. `packages/db/src/schema/*.ts` was written or updated to
describe the live schema after the fact, and has already drifted from it in
verifiable ways (see AUDIT.md H1, H3).

## Decision (as observed)

Schema changes have been made directly against the live database (via the Supabase
dashboard SQL editor or equivalent), rather than through `drizzle-kit generate` +
`drizzle-kit migrate`. `drizzle.config.ts` exists and is configured, but the
migration workflow it implies has not actually been the team's practice.

## Consequences

- There is currently no reproducible way to stand up a fresh database from source.
- Schema drift between the live DB and the Drizzle schema files has no automated
  detection — it was only caught by this audit's manual spot-checks (three enum
  mismatches, one column type bug found; more may exist unchecked).
- Any future Claude session that trusts `packages/db/src/schema/*.ts` as ground
  truth without cross-checking the live database risks writing code against a
  schema that doesn't match reality.

## What future sessions must not do

- **Do not** assume `packages/db/src/schema/*.ts` is authoritative for anything
  security- or correctness-sensitive — verify against the live database via the
  Supabase MCP when it matters.
- **Do not** make a schema change by editing only the Drizzle files and running
  `drizzle-kit push`/`migrate` without checking whether that would conflict with
  the live schema's actual current state, which may not match what the last
  generated migration (if any) implies.
- **Do not** silently "fix" enum drift by changing the live database to match
  Drizzle, or vice versa, without checking which one reflects the actually-intended
  business rule — e.g. the live `service_status` enum's `cant_provision` value
  might be load-bearing for existing rows or app logic.

## Recommended remediation (not yet done)

Run `drizzle-kit introspect` (or `pull`) against the live database to generate a
baseline migration matching current-state exactly, commit it as the new migration
`0001` (superseding the ad-hoc manual script), and require all schema changes from
that point forward to go through `drizzle-kit generate` and a real, committed
migration file. This is real work, not a quick fix — scope it as its own piece of
work rather than folding it into an unrelated change.
