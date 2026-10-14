# Database

Last verified against the live Supabase project (`wvdwwmfzwvrniwpmiahu`) on 2026-09-28.
This document describes the database **as it actually exists**, not the idealised
version implied by `packages/db/src/schema/*.ts`. See AUDIT.md for the drift between
the two.

## Important: the schema lives in `app`, not `public`

All application tables, enums, functions, and triggers live in the **`app`** Postgres
schema. `public` is essentially empty. `packages/db/src/schema/index.ts` re-exports
Drizzle table definitions that target `appSchema` (`pgSchema('app')`), so this is
intentional and matches the code — just don't go looking in `public` when using
Supabase's dashboard or MCP tools without specifying the schema.

Live row counts (single tenant, real operational data, not a demo/seed set):

| Table                                        |     Rows | Notes                                                       |
| -------------------------------------------- | -------: | ----------------------------------------------------------- |
| tenants                                      |        1 | Single tenant: "Roaring-Success"                            |
| users                                        |        9 | 7 approved, 2 pending                                       |
| customers                                    |    4,564 |                                                             |
| deals                                        |      240 |                                                             |
| deal_services / deal_pricing / deal_billing  | 240 each | 1:1 with deals                                              |
| provisioning                                 |      240 |                                                             |
| provisioning_services                        |      241 | one provisioning row has 2 service attempts — not an orphan |
| faults                                       |       11 | 10 outstanding, 1 resolved                                  |
| complaints / debts / todos / transfer_ceases |   0 each | feature areas exist but unused so far                       |
| user_invitations                             |        0 |                                                             |
| audit_logs                                   |    8,911 | populated by triggers on almost every table                 |
| platform_settings                            |        1 | singleton row, `id` pinned to `true`                        |

## Conceptual data model

- **Tenant** (`app.tenants`) — top-level org boundary. Every domain table carries a
  `tenant_id` FK. Only one tenant exists today; the schema is multi-tenant-shaped but
  the deployment is not yet actually multi-tenant.
- **User** (`app.users`) — app-level profile for a Supabase Auth identity.
  `users.id` is both the PK and an FK to `auth.users.id` (1:1). Carries `role`,
  `approval_status`, `is_active`, `tenant_id`.
- **Customer** (`app.customers`) — a person or company doing business with the
  tenant. Has `type` (residential/business), `status` (prospect/active/at_risk/churned),
  and an `assigned_to` agent. `account_number` is unique.
- **Deal** (`app.deals`) — a sale tied to one customer, split into four 1:1 satellite
  tables: `deal_services` (what was sold — broadband/voice config),
  `deal_pricing` (bundle price, wholesale cost, GP), `deal_billing` (payment/billing
  details). This is a deliberate normalization (not duplication) — each satellite
  captures a distinct concern of the same deal.
- **Provisioning** (`app.provisioning`) — the operational workflow of getting a deal's
  services live (welcome calls, router dispatch, order tracking). Has its own child
  table `provisioning_services` (one row per service being provisioned — bb/whc/nfon/
  mpf_broadband/mpf_voice/mobile — since a single provisioning record can involve
  multiple services with independent statuses, hence 241 rows for 240 provisioning
  records).
- **Faults / Complaints / Debts / Transfer-Ceases** — four parallel case-tracking
  workflows, all shaped the same way: a parent table (`tenant_id`, `provisioning_id`,
  `assigned_to`, `status`, `created_by`, timestamps) plus a `*_comments` child table
  (`author_id`, `body`, `created_at`). This is a consistent, repeated pattern — see
  AUDIT.md for whether it's implemented consistently in application code too.
- **Todos** (`app.todos`) — generic task/reminder, optionally linked to any of the
  above via a polymorphic `link_type` + `link_id` pair (no FK enforcement possible on
  a polymorphic reference — this is a known trade-off, not a bug).
- **Audit logs** (`app.audit_logs`) — populated by a single shared trigger function
  (`app.audit_trigger()`) attached to INSERT/UPDATE/DELETE on 18 of the 19 domain
  tables (not attached to `platform_settings`). Captures `table_name`, `record_id`,
  `action`, `old_data`/`new_data` as JSONB snapshots, and `changed_by` (read from a
  session-local `app.current_user_id` setting — see "Audit trail mechanism" below).

## Enums

Every enum used by a table matches its Drizzle definition **except**:

- `app.user_role` has 6 live values (`agent, team_leader, manager, director, admin,
sales`) — Drizzle's `userRoleEnum` (`packages/db/src/schema/users.ts`) only defines 5,
  missing `sales`.
- `app.service_status` has 6 live values including `cant_provision` — Drizzle's
  `serviceStatusEnum` (`provisioning-services.ts`) is missing it.
- `app.todo_priority` has 6 live values including `in_progress` — Drizzle's
  `todoPriorityEnum` (`todos.ts`) is missing it. (Confusingly, `todos.status` already
  has its own separate `in_progress` value — this looks like an enum value that leaked
  from one enum's intent into another during a schema edit.)

There are also two **orphaned duplicate enum types** in the live DB, left over from an
apparent rename that didn't clean up after itself:

- `app.cancelled_by` (unused — the actual column `provisioning_services.cancelled_by`
  uses a _different_ type, `app.cancelled_by_type`, with identical values)
- `app.provisioning_install_type` (unused — `deal_services.install_type` uses
  `app.install_type` instead, identical values)

Safe to drop both orphaned types once confirmed nothing external references them.

## Indexes

Every table has a primary key index and, where applicable, a unique index
(`customers.account_number`, `tenants.slug`, `user_invitations.token`). Beyond that,
**only one manual index exists**: `idx_provisioning_customer_id` on
`provisioning.customer_id`. Every other foreign key — `tenant_id` on every table,
`assigned_to`/`created_by`/`author_id` everywhere, `deal_id`, `provisioning_id`,
`customer_id` on `deals`, `complaint_id`, `fault_id`, `debt_id`, `todo_id`,
`transfer_cease_id` — has **no covering index**. Confirmed via `pg_indexes` and the
Supabase performance advisor (43 unindexed foreign keys flagged). Not a problem yet at
current data volumes, but every `tenant_id = ...` filter (which is in nearly every
query the app runs) is a full table scan, and this will bite hard once the app is
genuinely multi-tenant or data volume grows further.

## Functions & triggers

| Function                   | Security               | Purpose                                                                                                                                                                                                                                                                                              |
| -------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app.audit_trigger()`      | DEFINER                | Fires AFTER INSERT/UPDATE/DELETE on 18 tables. Inserts a row into `app.audit_logs` with before/after JSONB and `changed_by` read from `current_setting('app.current_user_id', true)`.                                                                                                                |
| `app.normalise_customer()` | INVOKER                | Fires BEFORE INSERT/UPDATE on `customers`. Normalizes postcode (strip spaces, uppercase), title-cases names/address lines, lowercases + trims email (nulls it out if empty or the literal placeholder `noemail@noemail.com`), strips non-numeric chars from mobile (nulls it out if empty or `'0'`). |
| `public.rls_auto_enable()` | DEFINER, event trigger | Fires on `CREATE TABLE` in the `public` schema only (not `app`) and force-enables RLS on the new table. A safety net for `public`, but does not cover new tables created in `app` — anyone adding a new `app.*` table must remember to enable + write RLS policies manually.                         |

### Audit trail mechanism

The audit trigger reads `changed_by` from a Postgres session variable
(`app.current_user_id`), set per-request by `packages/auth/src/audit.ts`'s
`setAuditUser(tx, userId)` — called at the top of every mutating Server Action's
`db.transaction(...)` block. This works because the app connects via a persistent
`postgres-js` connection pool and each transaction gets its own session-local
`set_config(..., true)` (the third `true` argument scopes it to the transaction).
If a mutation is ever made without first calling `setAuditUser`, the audit log entry's
`changed_by` will be `NULL` — worth grepping for before removing/refactoring the
transaction wrapper pattern in any Server Action.

## Migrations

**Since 2026-10-14 the schema has one migration history: `supabase/migrations/`**
(Supabase CLI format). Full workflow: `docs/MIGRATIONS.md`; decision: ADR 004.

| Version          | File                      | Notes                                                                                                                                                                                |
| ---------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `20260928000000` | `baseline_app_schema.sql` | The original hand-built schema (19 tables, enums, `audit_trigger`, `normalise_customer`, triggers, RLS), reconstructed from Staging's catalog                                        |
| `20260928000100` | `platform_settings.sql`   | Formerly `packages/db/migrations/0001_platform_settings.sql`                                                                                                                         |
| `20261013000000` | `performance_stats.sql`   | Formerly `packages/db/migrations/0002_performance_stats.sql` — Stats Board ledger, teams, attribution columns, triggers. **Not applied to Production.** See `docs/STATS.md`, ADR 003 |

Replaying all three into a fresh Postgres 17 reproduces Staging's `app` schema
exactly (per-object fingerprint, `pnpm db:verify`, 2026-10-14). Before that date the
schema had no history at all (ADR 002) — `packages/db/src/schema/*.ts` is still a
hand-maintained description and may drift (AUDIT.md H1); the migrations, not the
Drizzle files, define the schema.

Hosted status: Staging contains every version but has not yet had them recorded in
`supabase_migrations.schema_migrations` (`pnpm db staging:adopt`, pending). Production
is unverified against the baseline (docs/RELEASE.md step 0).

## RLS

See `SECURITY.md` for the full RLS policy audit — summary: RLS is enabled everywhere
but 19 of 22 tables only check `auth.role() = 'authenticated'`, providing no real
tenant or role isolation. This is currently not exploitable because the app's actual
DB traffic bypasses RLS via a privileged connection, and `anon`/`authenticated` have
no grant on the `app` schema at all — but the policies themselves are not doing their
documented job and should be fixed.

## Storage / Realtime

No storage buckets are in active use (checked `storage.buckets` — empty), despite
`users.avatar_url` existing as a column; avatar upload, if it exists in the UI, is not
backed by Supabase Storage yet (not confirmed either way — flagged for a follow-up
pass). No tables have Realtime publications configured.
