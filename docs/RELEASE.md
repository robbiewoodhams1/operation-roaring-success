# Production database release procedure

Production (`wvdwwmfzwvrniwpmiahu`) holds live customer and financial data. Nothing
in the development tooling can reach it: there is no Production MCP server, no
`pnpm db` Production command, no Production credentials in the repo or in
`apps/platform`, and CI never applies migrations. A Production database change is a
separate, human-approved operation using restricted credentials that are issued for
the release and revoked afterwards.

## 0. Before the first release: verify Production's schema (read-only)

The migration baseline was reconstructed from Staging, which was cloned from
Production. Before any Production release — and before Production's history is
adopted — confirm Production really matches it. Proposed narrowly scoped method
(requires separate authorisation; nobody has done this yet):

1. A Production owner creates a temporary **read-only** Postgres role in the
   Production SQL editor:
   ```sql
   create role schema_inspector login password '<generated, shared out-of-band>'
     nosuperuser nocreatedb nocreaterole noinherit connection limit 1
     valid until '<now + 24 hours>';
   -- No grants at all: the fingerprint reads only pg_catalog, which every role
   -- can read. The role cannot see a single row of app data.
   alter role schema_inspector set default_transaction_read_only = on;
   ```
2. The owner runs `packages/db-tools/scripts/schema-fingerprint.sql` as that role (or
   pastes it into the SQL editor themselves) and saves the output as
   `packages/db-tools/fingerprints/production.txt`, adding a header line
   `# applied-through: <version>` once known.
3. Compare: the replay through `20260928000100` (baseline + platform*settings) should
   equal Production. Differences are drift — reconcile per docs/MIGRATIONS.md → Drift
   \_before* releasing anything.
4. `drop role schema_inspector;`

Never point a development MCP server, `pnpm crm --staging`, or the integration tests
at Production to do this.

## 1. Release plan (written per release)

Create `docs/releases/<date>-<summary>.md` containing:

- Migration versions to apply (must already be on Staging, with Staging acceptance
  passed) and the reviewed PR(s).
- `pnpm db:verify` output and Staging fingerprint commit.
- Compatibility statement: the currently deployed app works against the new schema
  (expand/contract — docs/MIGRATIONS.md), and the order of app deploy vs migration.
- Data impact: rows touched (expected: none for schema-only migrations), backfills
  and their batches.
- Backup point: confirm PITR / a fresh backup timestamp in the Supabase dashboard.
- Rollback: the forward-fix migration or app redeploy that undoes it; destructive
  steps are never in the same release as their expand step.
- Who approves, who executes, the window.

## 2. Approval

Explicit written approval from the business owner on the release plan. No approval,
no release. Approval for one release does not carry over to the next.

## 3. Execute (release operator, not ordinary development)

1. Obtain a **time-limited** Production database credential (e.g. a dedicated
   `release_<date>` role or a temporary password reset), kept outside the repo and
   outside `apps/platform`.
2. First Production release only: adopt the history once Step 0 proved equality:
   `supabase migration repair --status applied <verified versions> --db-url <prod>`.
3. Dry run: `supabase db push --db-url <prod> --dry-run` — the listed versions must
   equal the plan exactly.
4. Apply: `supabase db push --db-url <prod>` (never `--include-seed`, never
   `db reset`, never a dump restore).
5. Verify read-only: fingerprint equals the Staging replay through the same version;
   smoke-check the app; `select count(*)` on the main tables unchanged.
6. Deploy the app via Vercel if the plan says so.
7. Revoke the credential. Record the outcome in the release file.

## Never

- Reset Production, restore a dump over it, or run `seed.sql` on it.
- Copy Production rows into Staging or Local.
- Add a Production MCP server or keep Production credentials on a development machine.
- Apply a migration that has not been through Local and Staging.

## Pending releases

- `20261013000000_performance_stats` (Stats Board) — see `docs/STATS.md` → "Release
  plan for Production" for its specific steps (backfill, teams, legacy attribution).
  Blocked on: Step 0 verification, open business questions in docs/STATS.md, approval.
