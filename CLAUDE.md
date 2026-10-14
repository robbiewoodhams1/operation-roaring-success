# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from the repo root using `pnpm`.

```bash
pnpm dev              # Start all apps (platform :3000, admin :3001)
pnpm build            # Build all apps and packages
pnpm lint             # ESLint across monorepo
pnpm type-check       # TypeScript checks across monorepo
pnpm format           # Prettier write
pnpm format:check     # Prettier check only
pnpm clean            # Remove build artifacts + node_modules
```

Environment-aware entry point (see `docs/ENVIRONMENTS.md`):

```bash
pnpm crm --local                       # Start local Supabase (Docker) if needed, run platform on it (--dev = alias)
pnpm crm --staging                     # Run platform on hosted Staging (gqkugpjmguufavbladxt), apps/platform/.env.staging.local
pnpm crm --local --test                # DB integration tests against Local (--staging --test for Staging; never Production)
pnpm crm --prod --credentials <file>   # Production build + validation only — no server, deploy, DB session or migrations
pnpm crm --status                      # All three environments' state (never prints secrets)
```

Database (see `docs/MIGRATIONS.md`, `docs/LOCAL_DEVELOPMENT.md`):

```bash
pnpm db:start | db:stop | db:status    # Local Supabase stack (Docker)
pnpm db:reset                          # Rebuild Local from supabase/migrations + seed.sql, run supabase/checks
pnpm db new <name> / pnpm db:migrate   # New migration / apply pending to Local
pnpm db:verify                         # Docker-free replay of all migrations + seed + checks (CI runs this)
pnpm db staging:status | staging:push [--apply] | staging:adopt   # Staging: read-only / dry-run / gated
```

To run a single app:

```bash
pnpm --filter @roaring/platform dev
pnpm --filter @roaring/admin dev
```

To run a command in a specific package (e.g., db migrations):

```bash
pnpm --filter @roaring/db <script>
```

Run tests (vitest, platform app only):

```bash
pnpm --filter @roaring/platform test          # run once
pnpm --filter @roaring/platform test:watch    # watch mode
```

Pre-commit hooks (Husky + lint-staged) run lint and format checks on staged files automatically.

## Architecture

### Monorepo Structure

Turborepo monorepo with `pnpm` workspaces. Two apps and six shared packages:

- **`apps/platform`** — Main user-facing Next.js 16 app (port 3000). All customer-facing features live here.
- **`apps/admin`** — Internal admin dashboard (port 3001). Stripe payments and platform administration.
- **`packages/db`** — Drizzle ORM schema and Supabase client. The single source of truth for the database schema.
- **`packages/auth`** — Session management, Supabase SSR helpers, and middleware. Consumed by both apps.
- **`packages/config`** — Shared TypeScript, ESLint, and Zod-based env validation (`createEnv()`). All env vars are validated at startup.
- **`packages/algorithms`** — Business logic and target-scoring calculations, isolated from UI concerns.
- **`packages/ui`** — Shared React components used across apps.
- **`packages/telephony`** — Telephony integration (placeholder).

### Platform App Routing

Uses Next.js App Router with route groups:

- `(auth)/` — Public auth pages (login, confirm, reset-password)
- `(platform)/` — Protected routes; session required
  - `(admin)/` — Admin-only sub-routes (users, audit)
  - Feature pages: customers, deals, provisioning, routers, stats, targets, complaints, faults, search, help

### Authentication & Authorization

- **Supabase Auth** for identity; session cookie managed via `@supabase/ssr`
- Middleware in `packages/auth` redirects unauthenticated requests to `/login`; it does NOT check role or approval status
- `requireUser()` / `requireRole()` (`packages/auth/src/actions.server.ts`) are the actual authorization gate — **every Server Action must call one of these itself**, since a parent layout's check does not protect Server Actions (they're independent POST endpoints in Next.js)
- Roles (live DB enum): `agent | team_leader | manager | director | admin | sales` — stored on `app.users.role`
- Users have an `approval_status`: `pending | approved | rejected` (not `active` — that's a separate `is_active` boolean column)
- `tenants` table exists and every domain table has a `tenant_id`, but the deployment is currently single-tenant (one row) in practice
- **RLS is enabled on every table but is not a real enforcement layer for this app** — the app's own DB connection bypasses it entirely (see `docs/SECURITY.md`). Authorization is 100% application-code responsibility. Read `docs/SECURITY.md` and `docs/decisions/001-authorization-lives-in-app-code-not-rls.md` before touching anything auth- or RLS-related.

### Database

- **Drizzle ORM** over **Supabase PostgreSQL**. **The schema is defined by `supabase/migrations/`**, not by the Drizzle files in `packages/db/src/schema/` — those are a hand-maintained ORM description with known drift (see `docs/AUDIT.md`). When correctness matters, check the migrations and the local DB (`supabase-local` MCP), or Staging read-only (`supabase-staging` MCP).
- The real schema is in the **`app`** Postgres schema, not `public`.
- Key tables: `tenants`, `users`, `customers`, `deals` (+ `deal_services`/`deal_pricing`/`deal_billing`), `provisioning` (+ `provisioning_services`), `faults`, `complaints`, `debts`, `transfer_ceases` (each with a `*_comments` child table), `todos`, `audit_logs`, `user_invitations`
- Customers have a `type` (`residential | business`) and `status` (`prospect | active | at_risk | churned`)
- **One migration history: `supabase/migrations/`** (Supabase CLI), starting from a baseline reconstructed from Staging and verified by schema fingerprint (ADR 004, `docs/MIGRATIONS.md`). Every schema change is a new migration file created with `pnpm db new`, proven with `pnpm db:reset` + tests + `pnpm db:verify`, promoted to Staging only with `pnpm db staging:push --apply`, and to Production only via `docs/RELEASE.md`. Never use `drizzle-kit push/migrate`, a dashboard SQL editor or an MCP `apply_migration`/DDL `execute_sql` against a hosted project. `supabase/seed.sql` is synthetic and local-only.
- `app.audit_logs` is populated automatically by a trigger (`app.audit_trigger()`) on 18 of 19 tables — every mutating Server Action must call `setAuditUser(tx, user.id)` (`packages/auth/src/audit.ts`) inside its transaction _before_ the write, or the audit entry's `changed_by` will be `NULL`.

### Environment Variables

- **`CRM_ENV` (`local` | `staging` | `production`) is required — there is no default** (`development` was retired and fails with a hint). `assertCrmEnvironment()` (`packages/config/src/environments.ts`) checks that `NEXT_PUBLIC_SUPABASE_URL`, both API keys and `DATABASE_URL` all belong to that environment: loopback-only with no hosted ref for `local`, exactly `gqkugpjmguufavbladxt` for `staging`, exactly `wvdwwmfzwvrniwpmiahu` for `production`. It runs before the Drizzle pool is created (`packages/db/src/client.ts`), in `createClient`/`createAdminClient` and `updateSession` (`packages/auth`), in `drizzle.config.ts` and in the integration-test setup. It also refuses `production` under `next dev`, Production in a Vercel Preview, and anything but production in Vercel Production. Any new privileged client or DB connection must call it first.
- Credentials: Local — generated by the Supabase CLI and injected by `pnpm crm --local` (no file). Staging — `apps/platform/.env.staging.local` (git-ignored; template `apps/platform/.env.example`). Production — only in Vercel; never download them or write them into `apps/platform`.
- `pnpm crm` refuses to run while `apps/platform/.env`, `.env.local`, `.env.development`, `.env.development.local`, `.env.production` or `.env.production.local` define Supabase variables (Next.js auto-loads them).
- MCP (`.mcp.json`): `supabase-local` (the Docker stack, full access — use this for normal development) and `supabase-staging` (Staging, **read-only**). There is no Production MCP and there must never be one.
- `lib/env.ts` in each app defines a `createEnv()` (Zod) schema for the full variable list, but nothing imports it, so it is not enforced at runtime (AUDIT.md E4).

### Tech Stack

- **React 19**, **Next.js 16** (App Router, RSC by default), **TypeScript 5** strict mode
- **TailwindCSS 4**, **shadcn/ui** components, **base-ui/react** headless primitives
- **Zod 4** is the intended validation approach, but in practice is only used for env-var validation and one Server Action — most Server Actions have no runtime input validation (see `docs/AUDIT.md` H5). Don't assume an action's input is validated just because Zod is "the convention."
- All package imports use the `@roaring/*` workspace alias
- `packages/algorithms` and `packages/telephony` are currently empty stubs (`export {}`) despite being described as holding business logic — target-scoring logic actually lives duplicated inside each `targets/*/targets-client.tsx` component. Don't add code to these packages assuming existing logic is there to build on; there isn't any yet.
- `apps/admin` is largely unbuilt (`dashboard/page.tsx` is a placeholder, `payments/page.tsx` is a 0-byte empty file, zero Stripe code exists anywhere). Admin functionality (user management, platform settings) currently lives in `apps/platform`'s `(admin)` route group instead.

## Persistent Documentation

This repo has a `/docs` directory that is the source of truth for architecture,
database, and security context beyond what fits here. **Read these before starting
non-trivial work:**

- `docs/PROJECT_CONTEXT.md` — what this system is, architecture, workflows, start here
- `docs/DATABASE.md` — the actual live schema, enums, indexes, RLS, migrations status
- `docs/SECURITY.md` — the real authentication/authorization model and known gaps
- `docs/WORKFLOWS.md` — traced end-to-end request flows for key features
- `docs/AUDIT.md` — dated findings log (CRITICAL/HIGH/MEDIUM/LOW), updated per audit pass
- `docs/decisions/` — ADRs for things that look like bugs but are documented, intentional (or at least observed-and-flagged) tradeoffs — check here before "fixing" something that might be load-bearing

These describe the system **as it actually is**, verified against the live
codebase and database — not an idealized version. If this file (`CLAUDE.md`) and
`/docs` ever disagree, trust `/docs` and flag the discrepancy; `/docs` is updated
per-audit, this file is a summary that can lag.

## Things Claude should NOT change casually

- **RLS policies** — don't weaken or remove them, even though they're not currently
  load-bearing for the app's own traffic (see `docs/SECURITY.md`). Only tighten them,
  and only with the full picture in `docs/decisions/001-*.md` in mind.
- **`requireUser`/`requireRole` semantics** — many pages depend on their specific
  redirect targets (`/pending-approval`, `/rejected`, `/login?suspended=true`,
  `/unauthorised`). Check every call site before changing behavior.
- **`packages/db/src/schema/*.ts`** — don't "fix" a migration/Drizzle mismatch by
  guessing which side is right; check the migrations, Staging (read-only MCP) and
  `docs/AUDIT.md` for known drift first.
- **Applied migrations** — never edit a file in `supabase/migrations/` that has been
  applied to Staging (see `packages/db-tools/fingerprints/staging.txt` → `applied-through`);
  add a new migration instead. Never reset, re-seed or dump-restore Staging or
  Production.
- **The `app.audit_trigger()` pattern** — don't remove `setAuditUser(tx, user.id)`
  calls or the `db.transaction` wrapper around mutations without understanding the
  audit-log dependency on it (`docs/DATABASE.md` → "Audit trail mechanism").
- **Production is a live database with real operational data**, and **Staging also
  contains a clone of real customer records** (plus the synthetic `stats-qa-synthetic`
  tenant, which must be preserved). Never copy rows from either into Local, fixtures
  or docs; never run schema changes or data mutations on either without the user's
  explicit go-ahead. Destructive experiments belong on Local.

## Known technical debt (see `docs/AUDIT.md` for full detail)

Top priority items as of the 2026-09-28 audit: no auth check on the `search` Server
Action (CRITICAL), RLS policies provide no real isolation though not currently
reachable (CRITICAL), a handful of Drizzle enum definitions missing values that
exist live (HIGH), no tracked migration history (HIGH — remediated 2026-10-14, ADR 004), 43 foreign keys with no
covering index (HIGH), minimal Zod validation coverage (HIGH). Full list with
evidence and recommended fixes in `docs/AUDIT.md`.

## How to verify changes

- `pnpm lint` / `pnpm type-check` / `pnpm --filter @roaring/platform test` before
  considering any change done.
- For anything touching the database: `pnpm db:reset` (Local, Docker),
  `pnpm crm --local --test`, and `pnpm db:verify`. Inspect Local with the
  `supabase-local` MCP tools and Staging read-only with `supabase-staging` rather than
  trusting `packages/db/src/schema/*.ts` alone — see `docs/decisions/004-*.md`.
- For anything touching auth/authorization, re-grep every `'use server'` file for
  `requireUser`/`requireRole` after the change to confirm coverage didn't regress
  (this is exactly how the `search` action's missing check was found).
