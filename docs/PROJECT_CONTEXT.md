# Project Context

Read this first. Last verified against the live codebase and database: 2026-09-28.

## What this is

Operation Roaring Success is a CRM for a telecoms reseller. It tracks customers,
sales deals, provisioning (getting broadband/voice services live), and four
case-tracking workflows: faults, complaints, debts, and transfer/cease requests.
There's also a lightweight todo/task system and a targets/leaderboard feature for
sales performance.

**Who uses it:** internal staff at a single company ("Roaring-Success") — agents,
team leaders, managers, directors, and admins. It is currently a **single-tenant
deployment** (`app.tenants` has exactly one row) even though the schema is built to
support multiple tenants.

## Core concepts

- **Customer** — a person or business. Has a `type` (residential/business) and a
  lifecycle `status` (prospect → active → at_risk → churned).
- **Deal** — a sale tied to a customer, split into `deal_services` (what was sold),
  `deal_pricing` (bundle price/cost/GP), and `deal_billing` (payment details) —
  each a 1:1 satellite table, not duplication.
- **Provisioning** — the operational workflow of turning a signed deal into a live
  service: welcome calls, router dispatch, per-service order tracking
  (`provisioning_services` — a provisioning record can involve multiple services:
  broadband, voice, mobile, each with its own status).
- **Faults / Complaints / Debts / Transfer-Ceases** — four parallel case-tracking
  workflows, each shaped the same way (parent record + `*_comments` child table).
- **Todos** — generic tasks, optionally linked to any of the above.
- **Targets** — leaderboards/scoring for sales, provisioning, debt, EFT, and tech
  performance.

## Architecture

Turborepo + pnpm monorepo, two Next.js 16 (App Router, RSC-by-default) apps and six
shared packages:

- **`apps/platform`** (port 3000) — the actual product. Every feature above lives
  here.
- **`apps/admin`** (port 3001) — intended for internal Stripe/platform
  administration. **Currently mostly a stub**: `dashboard/page.tsx` renders a static
  placeholder, `payments/page.tsx` is a 0-byte empty file (see AUDIT.md M2), and
  there is zero Stripe integration code anywhere in the app despite it being
  documented as the app's purpose. Actual admin functionality (user management,
  platform settings) currently lives in `apps/platform`'s `(admin)` route group
  instead — worth deciding which app should own "admin" going forward (see AUDIT.md
  M2).
- **`packages/db`** — Drizzle ORM schema (`src/schema/*.ts`) + a `postgres-js`
  client (`src/client.ts`) connecting directly to Postgres via `DATABASE_URL`. This
  is a privileged connection that bypasses Supabase RLS entirely — see
  `SECURITY.md` for what that means for authorization.
- **`packages/auth`** — Supabase Auth session helpers (`server.ts`, `client.ts`,
  `middleware.ts`), the `requireUser`/`requireRole` authorization gate
  (`actions.server.ts`), and the audit-trail session-variable helper (`audit.ts`).
  This package is the **entire** authorization system — there is no database-level
  backstop (see SECURITY.md).
- **`packages/config`** — Zod-based `createEnv()` used by both apps' `lib/env.ts`
  for startup env validation. (Zod is otherwise barely used elsewhere in the
  codebase — see AUDIT.md H5.)
- **`packages/algorithms`** — documented as holding target-scoring business logic,
  isolated from UI. **Currently empty** (`export {}`) — the real scoring logic lives
  duplicated inside each target page's client component instead. See AUDIT.md M1.
- **`packages/ui`** — shared shadcn/ui-based React components.
- **`packages/telephony`** — documented as a placeholder. Confirmed: it is, literally
  (`export {}`, no other code, nothing imports it).

## Authentication model

Supabase Auth (`auth.users`) via `@supabase/ssr`. `packages/auth/src/middleware.ts`
redirects unauthenticated requests to `/login`. `getUser()` joins the Supabase auth
identity to `app.users` for the app-level profile. `requireUser()` additionally
enforces `approval_status` (redirects `pending`→`/pending-approval`,
`rejected`→`/rejected`) and `is_active` (signs out + redirects if suspended).
`requireRole(...)` layers a role allow-list on top, used only by the
`(admin)` route group.

**Every Server Action must call `requireUser`/`requireRole` itself** — a parent
layout's check does not propagate to Server Actions (they're independent POST
endpoints in Next.js). One action currently doesn't (`search/actions.ts` — see
AUDIT.md C2, being flagged as a priority fix).

## Authorization model

Roles (`app.user_role` live enum): `agent | team_leader | manager | director | admin
| sales`. (Drizzle's type is missing `sales` — AUDIT.md H1.) Beyond the `(admin)`
route group's `requireRole('admin')` gate, there is **no per-role restriction** on
any feature — any approved user of any role can read/write any customer, deal,
provisioning, fault, complaint, debt, todo, or transfer/cease record. There is also
no ownership check (e.g. nothing stops an agent from editing a deal assigned to
someone else). If role-based or ownership-based restriction is intended product
behavior, it isn't implemented yet — worth clarifying as a product decision, not
assumed as a bug.

## Database overview

See `docs/DATABASE.md` for the full picture. Key things to know before touching
anything:

- The real schema lives in the **`app`** Postgres schema, not `public`.
- The live schema was **not built through tracked migrations** — only one migration
  file exists in the repo, and it's a manually-pasted script. Everything else was
  built directly against the database. `packages/db/src/schema/*.ts` describes it
  after the fact and has already drifted in a few places (AUDIT.md H1, H3).
- RLS is enabled on every table but is not the real enforcement layer (see
  SECURITY.md) — don't assume adding a row-scoped feature is "protected by RLS."

## Important business workflows

- **Deal creation/edit** (`apps/platform/app/(platform)/deals/[id]/actions.ts`) —
  updates `deals`, `deal_services`, `deal_pricing`, `deal_billing`, and `customers`
  in a single `db.transaction`, with `setAuditUser()` called first so the audit
  trigger attributes the change correctly.
- **Customer edit** (`customers/[id]/actions.ts`) — same transaction + audit pattern,
  simpler (one table).
- **Search** (`search/actions.ts`) — cross-entity search across customers, deals,
  provisioning, and provisioning services. See AUDIT.md C2 for its current auth gap.
- **User invite/approval** (`packages/auth/src/actions.server.ts`) —
  `inviteUser()` creates the `auth.users` row via the Supabase admin API and an
  `app.users` row with `approval_status='pending'`, `is_active=false`;
  `confirmInvite()` (on the user clicking their invite link) or `activateUser()`
  (admin-triggered) flips both to approved/active.

## Caching

`apps/platform/lib/cached-query.ts` wraps `next/cache`'s `unstable_cache` with a
1-hour revalidation window, tagged per-entity-per-tenant (e.g. `customers-${tenantId}`).
Mutations call `revalidateTag(...)` for the relevant tags plus `revalidatePath(...)`
for the list pages. Verify this pattern is used consistently before assuming any
given read path is cached — not fully audited across every feature area.

## Development commands

```bash
pnpm dev              # both apps (platform :3000, admin :3001)
pnpm build            # all apps/packages via turbo
pnpm lint             # eslint across the monorepo
pnpm type-check       # tsc across the monorepo (turbo-orchestrated)
pnpm format           # prettier write
pnpm --filter @roaring/platform test          # vitest, platform app only
pnpm --filter @roaring/platform test:watch
```

Husky + lint-staged run prettier on staged files pre-commit.

## Environment variables (names only)

Both apps validate via `createEnv()` (`packages/config/src/env.ts`, Zod-based,
throws on startup if invalid): `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`NEXT_PUBLIC_APP_URL`, `DATABASE_URL`, `RESEND_API_KEY`. Note: `apps/admin`
requires `RESEND_API_KEY` despite no visible use of it there (AUDIT.md L5) — likely
copy-pasted from platform's schema.

## Testing

Vitest, platform app only (`apps/platform`). 10 test files, 74 tests, all passing as
of this audit. Coverage is narrow — each file mocks `@roaring/db` and tests a single
Server Action's data-shaping/branching logic. **No tests exist for authentication,
authorization, or the middleware.** See AUDIT.md M4.

## Known limitations (as of this audit)

- Single-tenant in practice; multi-tenant isolation is unverified/untested since a
  second tenant has never existed.
- No database-level authorization backstop — see SECURITY.md.
- No migration history for 18 of 19 tables — schema changes must currently be made
  by hand against the live database and back-ported to Drizzle manually.
- `apps/admin` is largely unbuilt.
- `packages/algorithms` and `packages/telephony` are empty stubs.
- Minimal input validation (Zod) outside env-var checking.

## Things a future Claude session must know before touching anything

1. **Read `docs/SECURITY.md` before changing anything auth- or RLS-related.** The
   database has no authorization backstop today — application code is the only
   thing standing between a logged-in user and any row in any table.
2. **Don't assume `packages/db/src/schema/*.ts` is authoritative.** It has known
   drift from the live database (AUDIT.md H1, H3). When in doubt, check live via the
   Supabase MCP, not just the Drizzle files.
3. **Schema changes must currently be made by hand against the live DB** — there's
   no migration tooling actively in use. Until H2 (AUDIT.md) is addressed, treat any
   DDL change as a manual, careful, live-database operation, and update
   `packages/db/src/schema/*.ts` to match afterward.
4. **This is a live database with real operational data** (4,564 customers, 240
   deals) — not a seed/demo dataset. Treat destructive operations accordingly.
