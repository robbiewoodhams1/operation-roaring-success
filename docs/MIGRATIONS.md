# Database migrations — one history, LOCAL → STAGING → PRODUCTION

Established 2026-10-14. Decision record: `docs/decisions/004-supabase-cli-migrations-with-reconstructed-baseline.md`.

## The rules

1. **`supabase/migrations/` is the only migration history.** Files are named
   `<14-digit version>_<name>.sql` and applied in version order. Each file is applied
   atomically together with its row in `supabase_migrations.schema_migrations`.
2. Every schema change — tables, columns, enums, functions, triggers, RLS policies,
   grants — is a new migration file, reviewed in a PR. Never edit a migration that
   has been applied to Staging; add a new one.
3. No schema changes in a hosted dashboard SQL editor, through an MCP server, or with
   `drizzle-kit push`/`migrate`. The Staging MCP (`supabase-staging`) is read-only
   for this reason; there is no Production MCP.
4. Drizzle (`packages/db/src/schema/*.ts`) describes the schema for the ORM; it is not
   a migration source. `drizzle-kit generate` may be used to _draft_ SQL into the
   git-ignored `packages/db/drizzle-drafts/`, which is then copied into a
   `pnpm db new` file and reviewed. Update the Drizzle files in the same PR.
5. `supabase/seed.sql` is synthetic data for an empty **local** database only. It
   refuses to run if `app.tenants` has any row, and is never pushed to a hosted
   project (no `--include-seed` anywhere).

## The history today

| Version          | File                  | Local | Staging                         | Production                        |
| ---------------- | --------------------- | ----- | ------------------------------- | --------------------------------- |
| `20260928000000` | `baseline_app_schema` | ✔     | present (schema verified equal) | presumed present — **unverified** |
| `20260928000100` | `platform_settings`   | ✔     | present (applied 2026-10-13)    | **unverified**                    |
| `20261013000000` | `performance_stats`   | ✔     | present (applied 2026-10-13)    | **not applied** (needs release)   |

"Present" means the objects exist; Staging has **no `schema_migrations` rows yet**
(adoption, below, records them).

### How the baseline was made

The original 19 tables were created by hand with no history (ADR 002). The baseline
was reconstructed on 2026-10-14 from Staging's catalog (read-only queries), minus
every object `platform_settings` and `performance_stats` create. It is verified, not
assumed: `pnpm db:verify` replays `baseline → platform_settings → performance_stats`
into a fresh Postgres 17 and compares a per-object schema fingerprint
(`packages/db-tools/scripts/schema-fingerprint.sql`) with Staging's recorded fingerprint
(`packages/db-tools/fingerprints/staging.txt`). Result on 2026-10-14: **identical** for all
26 tables, 15 functions and 34 enums. A deliberately altered replay is detected
(negative control run the same day).

The baseline describes Staging. Staging was created from a Production snapshot, so
it very probably also describes Production — but that has not been checked and must
be before Production's history is adopted (docs/RELEASE.md).

### Why Supabase CLI and not drizzle-kit

Neither tool had a real history: `packages/db/migrations/` held two hand-run scripts
with no drizzle journal, and Staging's `supabase_migrations` was empty. The Supabase
CLI was chosen because it alone provides the local stack (Auth, Storage, Studio),
`db reset` with seeding, `db diff`, explicit `--local`/`--db-url` targeting and a
history table hosted projects understand. Converting both scripts into the CLI's
history keeps their order and content (the only edit: 0002's inner `BEGIN/COMMIT`
was removed because the CLI already wraps each file in a transaction, and an inner
`COMMIT` would split the file from its history row). There is one history, not two.

## Workflow

### 1. Create the migration locally

```bash
pnpm db start                      # Docker stack (first run downloads images)
pnpm db new add_customer_notes     # creates supabase/migrations/<timestamp>_add_customer_notes.sql
# write the SQL; or prototype in Studio (http://127.0.0.1:54323) and capture it with:
pnpm db diff                       # prints SQL for app-schema changes made in the local DB
pnpm db migrate                    # apply pending migrations to the running local DB
```

Update `packages/db/src/schema/*.ts` to match.

### 2. Prove it on a fresh database

```bash
pnpm db reset                      # rebuild Local from every migration + seed, then run supabase/checks
pnpm crm --local --test            # DB integration tests against Local (rolled back)
pnpm --filter @roaring/platform test
pnpm lint && pnpm type-check
pnpm db:verify                     # Docker-free fresh-install replay (also runs in CI)
```

`pnpm db:verify` reports the new file as "pending for Staging" — expected.

### 3. Review

Open a PR. CI runs unit tests, lint, type-check and `pnpm db:verify`. Reviewers check
the SQL against the rules in "Writing safe migrations" below. CI never applies
migrations anywhere.

### 4. Promote to Staging (after merge to the reviewed branch)

```bash
pnpm db staging:status             # read-only: history + live-schema drift check
pnpm db staging:push               # dry run: lists what would be applied
pnpm db staging:push --apply       # re-runs db:verify, checks drift, asks you to type the ref
```

`--apply` refuses if Staging's recorded history does not match the repo, if the live
Staging schema differs from the recorded fingerprint (drift), or without an
interactive confirmation. On success it re-fingerprints Staging and updates
`packages/db-tools/fingerprints/staging.txt` — commit that file.

### 5. Staging acceptance

```bash
pnpm crm --staging --test          # integration tests against Staging (each rolls back)
pnpm crm --staging                 # manual acceptance on http://localhost:3000
```

Check the Stats Board and the affected modules with the synthetic QA tenant.

### 6. Production release plan → 7. human approval → 8. release

Follow `docs/RELEASE.md`. Nothing in the development tooling can reach Production.

## One-time adoption of the history on Staging

Staging already contains everything up to `20261013000000` but has no history rows.
Recording them is a metadata-only write, done once, after Local has been validated
on the real Docker stack:

```bash
pnpm db staging:adopt
```

It refuses if Staging already has a history, re-checks that the live schema still
equals the recorded fingerprint, lists the versions, and asks you to type the
project ref. It runs `supabase migration repair --status applied <versions>`, which
only inserts rows into `supabase_migrations.schema_migrations`. **Status 2026-10-14:
not run** — waiting for Local to be validated on Docker.

## Drift

Drift = a hosted schema that differs from the replay of its recorded history.
`staging:status` / `staging:push` detect it and stop. Never "fix" drift by resetting
a hosted database or editing it to match; instead:

1. Find what differs: `pnpm db staging:status` lists the tables/functions/enums.
   Inspect them read-only (`supabase-staging` MCP or SQL) and decide which side is
   intended.
2. If the hosted change is wanted: write a migration that makes the same change
   (idempotent — `if not exists` / `create or replace`), replay it locally, then
   `migration repair` it as applied on the drifted environment and refresh the
   fingerprint.
3. If it is unwanted: write a migration that reverts it, through the normal workflow.

## Writing safe migrations

Production holds real customer records and the deployed app may be one version
behind the schema, so every migration must be compatible with **both the currently
deployed app and the new one**.

- Additive changes (new tables, nullable columns, new enum values appended, new
  indexes `concurrently` where large) are safe to release before the app.
- Never rewrite or delete business rows in a migration without a written, approved
  data plan. Backfills are separate, idempotent, batched and logged.
- Destructive or renaming changes use **expand → migrate → contract**:
  1. _Expand_: add the new column/table; keep the old one; app writes both.
  2. _Migrate_: backfill in batches; switch reads to the new shape; release.
  3. _Contract_: in a later release, after a full release cycle on Production,
     drop the old shape. Each step is its own migration and its own release.
- Enum values: add with `alter type … add value`. The new value cannot be _used_
  in the same transaction (i.e. the same migration file), so reference it from a
  later migration. Never remove or rename values in use.
- Keep audit attribution working: triggers rely on `app.current_user_id`
  (`setAuditUser`) — see `docs/DATABASE.md`.
- RLS: only tighten, never weaken (ADR 001).

## Fingerprints

`packages/db-tools/scripts/schema-fingerprint.sql` hashes every `app` table (columns,
constraints, indexes, triggers, policies, RLS flags, grants), function (definition +
grants) and enum. It reads only the catalog. Whitespace differences are ignored.
`packages/db-tools/fingerprints/staging.txt` is the recorded Staging fingerprint plus the
`applied-through` version it corresponds to; `pnpm db:verify` replays to that version
and compares.
