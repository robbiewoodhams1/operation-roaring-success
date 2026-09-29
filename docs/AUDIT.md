# Audit Log

## Audit: 2026-09-28

**Scope:** Full-system audit per user request — architecture, database/RLS/security,
application↔database consistency, authentication/authorization, business logic,
frontend, code quality, and testing. Performed by inspecting the live codebase
(read-only) and the live Supabase database via the Supabase MCP (read-only SQL,
schema introspection, security/performance advisors). No fixes have been applied yet
— this is the Phase 1/2 findings report, produced before any code changes per
explicit instruction.

**Method note:** initial `list_tables` calls returned stale/cached row-count
estimates (reported 0 rows for `tenants`, `users`, `customers` when live counts are
1 / 9 / 4,564) — this was corrected with direct `COUNT(*)` queries. All counts and
policy text below are from direct SQL against the live database, not cached
metadata.

---

### CRITICAL

**C1 — RLS policies provide no real tenant or role isolation on 19 of 22 tables.**

- **Evidence:** `select * from pg_policies where schemaname='app'` shows
  `customers`, `deals`, `deal_services`, `deal_pricing`, `deal_billing`,
  `provisioning`, `provisioning_services`, `faults`, `fault_comments`, `complaints`,
  `complaint_comments`, `debts`, `debt_comments`, `todos`, `todo_comments`,
  `transfer_ceases`, `transfer_cease_comments`, `user_invitations`, `tenants`,
  `users` all have exactly one policy: `for all using (auth.role() = 'authenticated')`,
  no `with_check`, no tenant/role condition.
- **Why it matters:** the database provides zero defense-in-depth. If the schema is
  ever exposed via PostgREST, or a client component ever queries `app.*` directly via
  `supabase.from(...)`, or Realtime is enabled on any of these tables, any logged-in
  user — including one still `approval_status='pending'` — could read/write any row
  in any tenant, including bank details (`deal_billing`) and could self-promote to
  admin (`update app.users set role='admin' where id = auth.uid()`).
- **Currently exploitable?** No — verified `anon`/`authenticated` have no `USAGE`
  grant on the `app` schema (`has_schema_privilege` returns `false`), so PostgREST
  access is blocked at a more fundamental level regardless of RLS. The app's own
  traffic bypasses RLS entirely via a privileged DB connection (see C1-context below).
  This downgrades urgency but not importance — it's a landmine, and it makes
  `SECURITY.md`'s and CLAUDE.md's claims about RLS false today.
- **Affected:** all 19 tables listed above (`app` schema).
- **Recommended fix:** rewrite policies to check `tenant_id = (select tenant_id from
app.users where id = auth.uid())` at minimum; add role-appropriate `with_check`
  clauses for INSERT/UPDATE; consider whether RLS should become the actual
  enforcement layer (see C1-context) rather than a decorative one.
- **Risk of changing:** low-to-moderate — since the app doesn't route through RLS
  today, tightening policies won't break current app behavior, but should be tested
  against any direct Supabase client usage before deploying.
- **Fix now or defer:** recommend fixing soon, but not an emergency given it's not
  currently reachable. Should be bundled with C1-context (below) as one piece of work
  so the two aren't fixed inconsistently.

**C1-context — the application's own database traffic bypasses RLS entirely, so 100% of authorization lives in application code with zero DB-level backstop.**

- **Evidence:** `packages/db/src/client.ts` connects via `postgres-js` using
  `DATABASE_URL` (direct Postgres, not PostgREST). `select rolbypassrls from pg_roles
where rolname='postgres'` → `true`. Grepped the full repo for
  `supabase.from(`/`supabase.rpc(` — zero hits outside `@supabase/ssr` auth calls
  (`.auth.getUser()`, `.auth.signOut()`, `.auth.admin.*`). Every data read/write in
  the app goes through Drizzle against a connection that ignores RLS.
- **Why it matters:** this isn't inherently wrong (many production apps use a
  service-style DB connection and enforce authorization entirely in application code
  by design), but it means the app's authorization correctness rests **entirely** on
  every Server Action remembering to call `requireUser()`/`requireRole()` — there's no
  second layer. C2 below shows exactly one place where that discipline lapsed.
- **Recommended fix:** either (a) accept and document this as the intended model, and
  invest instead in tests + a shared "must call requireUser" convention (e.g. a
  lint rule or a typed wrapper) to prevent future lapses like C2; or (b) migrate to a
  connection that respects RLS (e.g. per-request role switching) and make RLS the
  real enforcement layer, fixing C1's policies properly first. (a) is far less
  invasive and matches how the app already works — recommend (a) unless you have a
  specific reason multi-tenancy needs DB-level enforcement.
- **Fix now or defer:** decision needed from you — this is an architectural choice,
  not a bug to patch. Flagging for discussion, not auto-fixing.

**C2 — `search()` Server Action has no authentication check; customer PII is queryable without login.**

- **Evidence:** `apps/platform/app/(platform)/search/actions.ts:7` —
  `export async function search(tenantId: string, query: string)` — grepped the full
  file, zero calls to `requireUser`/`requireRole`. `tenantId` is a plain caller-supplied
  parameter, not derived from session. Confirmed via a grep across all 17
  protected-route `'use server'` files that this is the _only_ one missing the check
  (all 16 others call `requireUser`/`requireRole` at least once).
- **Why it matters:** Next.js Server Actions are independent POST endpoints — a
  parent layout's `requireUser()` (in `apps/platform/app/(platform)/layout.tsx`) does
  not protect them. Anyone who can reach this action's endpoint (its ID is present in
  the client JS bundle, not secret) can retrieve customer names, addresses, phone
  numbers, emails, and account numbers without ever logging in.
- **Affected:** `apps/platform/app/(platform)/search/actions.ts`.
- **Recommended fix:** add `const user = await requireUser()` at the top and use
  `user.tenantId` in place of the `tenantId` parameter (drop the parameter entirely).
  Small, contained, low-risk change — the existing test suite for this file
  (`search/__tests__/actions.test.ts`) does not test authorization and will need a new
  test added alongside the fix.
- **Risk of changing:** very low.
- **Fix now or defer:** **recommend fixing now**, pending your go-ahead — this is the
  highest-value, lowest-risk fix in the whole audit.

**C3 — Nearly every mutating Server Action's `UPDATE`/`DELETE` omits the `tenant_id` check that the matching read path correctly applies — systemic, not isolated.**

- **Evidence (confirmed directly against source, not just sampled):**
  - `customers/[id]/actions.ts` (`updateCustomer`) — `.where(eq(customers.id, id))`, no tenant filter.
  - `deals/[id]/actions.ts` (`updateDeal`) — all 5 updates (`deals`, `deal_services`, `deal_pricing`, `deal_billing`, `customers`) use `.where(eq(<table>.id, ...))` with no tenant filter.
  - `deal-sheet/actions.ts` (`submitDeal`, the deal **creation** flow) — calls `requireUser()` but discards the result for authorization purposes: every insert (`customers`, `deals`, `provisioning`) uses `data.tenantId` and `data.createdBy` taken directly from the client-supplied payload, not `user.tenantId`/`user.id`. A forged request can attribute a new deal (with a real cascading customer + provisioning chain) to an arbitrary tenant and arbitrary user.
  - `todo/actions.ts` — `updateTodoStatus`/`deleteTodo`/`deleteTodoComment` all use `.where(eq(todos.id, id))` / `.where(eq(todoComments.id, id))` with no tenant filter.
  - Same pattern reported (not independently re-verified line-by-line by this pass, but consistent with the above and flagged with specific file:line evidence) across `complaints/actions.ts`, `complaints/[id]/actions.ts`, `faults/actions.ts`, `faults/[id]/actions.ts`, `debt/actions.ts`, `debt/[id]/actions.ts`, `transfers-ceases/actions.ts`, `transfers-ceases/[id]/actions.ts`, `provisioning/[id]/actions.ts`.
  - By contrast, every **read** path checked (`customers/[id]/page.tsx`, `deals/[id]/page.tsx`, `todo/[id]/page.tsx`, `provisioning/[id]/page.tsx`, `faults/[id]/page.tsx`) correctly does `if (record.tenantId !== user.tenantId) notFound()`. The tenant-check pattern is known and consistently used for reads — it was omitted from writes across the board.
- **Why it matters:** given C1-context (RLS provides zero backstop — the app's own DB connection bypasses it entirely), these write paths are the **actual** authorization boundary, and right now they don't enforce the one thing the schema is built around: tenant isolation. Today's practical blast radius is bounded because there is only one tenant in production, but that's incidental, not a mitigation — the code would behave identically (and be immediately, fully exploitable cross-tenant) the moment a second tenant is onboarded. It also means, today, any authenticated+approved user of any role can write to/delete any record regardless of assignment — there is no ownership check at all, on any table.
- **This corrects an inconsistency introduced during this audit's own documentation pass:** an earlier draft of `SECURITY.md`/`WORKFLOWS.md` stated "every write path threads `tenantId` from the authenticated user... except `search()`" and described the missing ownership check as a possible product ambiguity rather than a code defect. That claim was checked against `deal-sheet/actions.ts` directly and is **false** — it is a defect, not a design question, because it's inconsistent with the read-side enforcement in the same codebase, not an open product decision.
- **Affected:** at minimum the 4 files confirmed directly above; very likely the other 9 files listed, pending a full sweep.
- **Recommended fix:** add `and(eq(<table>.tenantId, user.tenantId))` (or a dedicated ownership check where an entity has no direct `tenant_id`, e.g. via a join) to every `.where()` on an UPDATE/DELETE across all mutating Server Actions; for `submitDeal`, replace `data.tenantId`/`data.createdBy` with `user.tenantId`/`user.id` from `requireUser()`. Mechanical, low-risk per file, but wide in scope — recommend a full sweep (`grep -rn "requireUser\|\.where(eq(" apps/platform/app/**/actions.ts`) rather than fixing only the files confirmed here.
- **Risk of changing:** low per-file; needs a full-file inventory first so nothing is missed, and a regression test per action once fixed (ties into M4).
- **Fix now or defer:** **recommend fixing now, alongside C2** — this is more severe than C2 (broader surface, covers writes not just reads) and should be treated as equal or higher priority.

---

### HIGH

**H1 — Schema/code drift: Drizzle enum definitions are missing values that exist live.**

- **Evidence:** `app.user_role` (live, 6 values: `agent, team_leader, manager,
director, admin, sales`) vs. `userRoleEnum` in `packages/db/src/schema/users.ts:5-11`
  (5 values, missing `sales`). `app.service_status` (live, 6 values including
  `cant_provision`) vs. `serviceStatusEnum` in `provisioning-services.ts` (missing it).
  `app.todo_priority` (live, 6 values including `in_progress`) vs. `todoPriorityEnum`
  in `todos.ts` (missing it).
- **Why it matters:** any TypeScript code that switches/maps over `UserRole` or these
  other enum types will silently fail to handle `'sales'`, `'cant_provision'`, or
  `in_progress`-as-a-priority for real rows that carry those values — no compile error,
  since the DB will happily store and return a value TypeScript doesn't know about,
  and Drizzle doesn't validate enum reads against its narrower type.
- **Affected:** `packages/db/src/schema/users.ts`, `provisioning-services.ts`, `todos.ts`;
  every consumer that pattern-matches these types (e.g. UI badges/labels for role or
  priority).
- **Recommended fix:** add the missing enum values to each Drizzle enum definition.
  Three one-line changes. Then run `drizzle-kit introspect` (see H2) to catch any
  further drift systematically rather than by spot-check.
- **Risk:** very low — additive type changes only.
- **Fix now or defer:** low-risk, recommend fixing alongside C2.

**H2 — No tracked migration history; live schema was hand-built, not reproducible from source.**

- **Evidence:** `packages/db/migrations/` contains one file
  (`0001_platform_settings.sql`), whose own header says "Run once in the Supabase SQL
  editor" — a manual script, not a `drizzle-kit`-applied migration. The other 18
  tables, every enum, every RLS policy, every function/trigger exist live with no
  corresponding migration file. `list_migrations()` via the Supabase MCP returns
  empty.
- **Why it matters:** no way to stand up a fresh environment from source; no
  automatic drift detection (this is _why_ H1 could happen silently); no rollback
  path; a future schema change made only in the dashboard will silently repeat this
  problem.
- **Affected:** `packages/db/migrations/`, `packages/db/drizzle.config.ts`, overall dev workflow.
- **Recommended fix:** run `drizzle-kit introspect`/`pull` against the live DB to
  generate a baseline migration matching current state, commit it, and require all
  future schema changes to go through `drizzle-kit generate`.
- **Risk:** none to the running system (introspection is read-only); the risk is
  process/discipline going forward, not a code change.
- **Fix now or defer:** real effort, not a quick patch — recommend scheduling as
  dedicated follow-up work rather than folding into this pass.

**H3 — Real type bug: `transfer_cease_comments.body` is typed `uuid` in Drizzle but is `text` in the live database.**

- **Evidence:** `packages/db/src/schema/transfers-ceases.ts:47` —
  `body: uuid('body').notNull()`. Live column `information_schema.columns` confirms
  `text`. Every sibling `*_comments.body` column (`fault_comments`, `complaint_comments`,
  `debt_comments`, `todo_comments`) correctly uses `text()`. Near-certain copy-paste
  error from the `authorId` line directly above it.
- **Why it matters:** any Drizzle insert of a real text comment into
  `transfer_cease_comments` will be typed as requiring a UUID string, which is
  incompatible with actual comment text — this makes the transfer/cease comment
  feature effectively broken through the typed client (would either fail to compile
  correctly against real usage, or require an unsafe cast that then fails at the DB
  with an `invalid input syntax for type text` — actually the live column is `text`,
  so Drizzle would just serialize whatever string is given; the real damage is
  TypeScript telling callers a UUID is required when free text is what the column
  actually stores, and Drizzle's inferred `TransferCeaseComment` type is wrong for any
  code that relies on it).
- **Affected:** `packages/db/src/schema/transfers-ceases.ts:47`; any UI/actions for
  transfer/cease comments (currently 0 rows in the table, so it may not have been
  exercised yet).
- **Recommended fix:** one-line change — `body: text('body').notNull()`, matching the
  other three comment tables. Trivial, no migration needed (Drizzle type only, column
  already matches).
- **Risk:** none.
- **Fix now or defer:** recommend fixing now, bundled with C2/H1.

**H4 — 43 foreign key columns have no covering index.**

- **Evidence:** `pg_indexes` for schema `app` shows only PK/unique indexes plus one
  manual index (`idx_provisioning_customer_id`). Every `tenant_id`, `assigned_to`,
  `created_by`, `author_id`, and most `*_id` FK column across all 19 domain tables is
  unindexed. Corroborated by the Supabase performance advisor.
- **Why it matters:** every tenant-scoped query (nearly all of them) and every join
  back to a parent record is a full table scan. Not yet painful at current volume
  (4.5k customers, 240 deals) but will degrade as data grows, and will get materially
  worse the moment the app becomes genuinely multi-tenant (every query filters by
  `tenant_id`).
- **Affected:** all `app.*` tables.
- **Recommended fix:** add indexes on every FK column, prioritizing `tenant_id` on
  every table and `assigned_to`/`created_by` on the case-tracking tables (faults,
  complaints, debts, transfer_ceases, todos) since those are filtered on constantly
  for "my assigned items" views.
- **Risk:** very low (additive, no behavior change); brief write-lock during index
  creation on large tables (not a concern at current row counts) — use
  `CREATE INDEX CONCURRENTLY` regardless as good practice.
- **Fix now or defer:** low-risk, high future value — recommend fixing, not urgent.

**H5 — Zod validation is used in almost none of the Server Actions, contradicting CLAUDE.md.**

- **Evidence:** `grep -rl "from 'zod'"` across `apps/` and `packages/` returns 4
  files: `apps/platform/lib/env.ts`, `apps/admin/lib/env.ts`,
  `packages/config/src/env.ts` (all three are env-var validation, not business
  logic), and exactly one business-logic file,
  `apps/platform/app/(platform)/(admin)/platform/actions.ts`. There are 20 `'use
server'` files total. Sampled `customers/[id]/actions.ts` and `deals/[id]/actions.ts`
  directly — both accept untyped-at-the-boundary `data: {...}` objects with `as any`
  casts on every enum field and no runtime validation.
- **Why it matters:** CLAUDE.md states "Zod 4 for all validation (forms, env vars,
  server actions)" — this is not what the code does. A malformed enum value, an
  unexpectedly-missing required field, or a client bug sending the wrong shape will
  either silently corrupt data or throw an unhandled Postgres error surfaced as a
  generic 500, rather than a clean validation error.
- **Affected:** ~19 of 20 Server Action files.
- **Recommended fix:** introduce Zod schemas for at least the highest-risk mutation
  paths (deals, customers, provisioning) incrementally — not a single big-bang
  rewrite. Defer to your prioritization; this is real but not urgent work.
- **Risk:** low if done incrementally per-action; moderate if attempted as one sweeping change.
- **Fix now or defer:** defer — significant scope, not a quick fix, needs prioritization.

**H6 — `useOptimisticStatus` (`apps/platform/lib/hooks/use-optimistic-status.ts`) has no error handling; a failed status-update mutation leaves the UI showing a change that never happened.**

- **Evidence:** `apply()` (lines 11-17) calls `setOptimistic(next)`, then `await action()`, then `router.refresh()` — no try/catch anywhere in the hook or at any of its 5 call sites (`todo-detail.tsx`, and the equivalent detail components for transfers-ceases, complaints, faults, debt).
- **Why it matters:** if the underlying server action throws (a DB error, or — once C3 is fixed and these actions start rejecting cross-tenant/unowned writes — an authorization error), `router.refresh()` never runs, so the optimistic value is never reconciled against real server state. The user sees a status change that silently didn't happen, with no error message.
- **Affected:** `apps/platform/lib/hooks/use-optimistic-status.ts` and its 5 call sites.
- **Recommended fix:** wrap the `action()` call in try/catch inside `apply()`; on failure, revert `setOptimistic` to the prior value (or force `router.refresh()` to resync) and surface an error to the caller (toast/inline message).
- **Risk:** low, self-contained to one hook.
- **Fix now or defer:** recommend fixing soon — directly relevant once C3's fixes start causing writes to fail that previously silently succeeded.

**H7 — No route-level `error.tsx` anywhere in `apps/platform`; only one shared `loading.tsx` covers all ~40 `(platform)` routes; no custom `not-found.tsx`.**

- **Evidence:** `find apps/platform/app -iname "loading.tsx" -o -iname "error.tsx" -o -iname "not-found.tsx"` returns only `apps/platform/app/(platform)/loading.tsx`.
- **Why it matters:** any uncaught exception in a server component (DB timeout, a thrown authorization error — again, more likely once C3/C2 start correctly rejecting bad requests) falls through to Next's generic error boundary — no per-feature recovery, no user-friendly message, no distinction between "you don't have access" and "something broke."
- **Affected:** `apps/platform/app/(platform)/` (missing `error.tsx`, `not-found.tsx`).
- **Recommended fix:** add at minimum a root `error.tsx` under `(platform)/` and a branded `not-found.tsx`.
- **Risk:** none, additive.
- **Fix now or defer:** low effort, recommend bundling with C2/C3 since those fixes will make actions throw authorization errors more often, which currently have nowhere good to land.

---

### MEDIUM

**M1 — `packages/algorithms` is an empty stub; target-scoring logic actually lives duplicated across 5 client components.**

- **Evidence:** `packages/algorithms/src/index.ts` is literally `export {}` with a
  comment "This file grows as you add Drizzle schema and Supabase client." The real
  leaderboard/scoring logic (`buildLeaderboard()`) lives inside
  `apps/platform/app/(platform)/targets/sales/targets-client.tsx` (a `'use client'`
  component), and near-identical target pages exist for `debt`, `eft`, `tech`,
  `provisioning` — each a self-contained client component rather than sharing logic
  from `@roaring/algorithms`.
- **Why it matters:** CLAUDE.md describes this package as "Business logic and
  target-scoring calculations, isolated from UI concerns" — it does not exist. Scoring
  logic is duplicated (or diverges) across target pages instead, and runs client-side
  rather than being testable in isolation.
- **Affected:** `packages/algorithms/src/index.ts`;
  `apps/platform/app/(platform)/targets/{sales,debt,eft,tech,provisioning}/*.tsx`.
- **Recommended fix:** either extract shared scoring logic into
  `packages/algorithms` (matching the documented intent) or update CLAUDE.md to
  reflect that scoring logic intentionally lives per-page. Recommend the former if
  the five target pages' logic is meant to converge; needs your call on whether
  divergence is intentional (different scoring rules per target type) or accidental
  duplication.
- **Risk:** moderate if consolidating — need to verify the 5 pages' logic doesn't
  already differ for good reason before merging.
- **Fix now or defer:** defer — needs a product decision, not just a refactor.

**M2 — `apps/admin` is largely unbuilt; CLAUDE.md's "Stripe payments" claim doesn't match the code.**

- **Evidence:** `apps/admin/app/(dashboard)/payments/page.tsx` is a literal 0-byte
  file (no default export — will fail to render/build as a Next.js page).
  `apps/admin/app/(dashboard)/dashboard/page.tsx` renders a static `<div>Dashboard</div>`.
  Grepped `apps/admin` for "stripe" (case-insensitive) — zero hits anywhere in the app.
- **Why it matters:** CLAUDE.md describes `apps/admin` as handling "Stripe payments
  and platform administration" — the payments feature does not exist. The empty
  `page.tsx` is also a likely build/runtime break for that specific route (not
  independently confirmed via a full `next build`, given the cost of running one —
  flagged as a fast follow-up check).
- **Affected:** `apps/admin/app/(dashboard)/payments/page.tsx`,
  `apps/admin/app/(dashboard)/dashboard/page.tsx`, CLAUDE.md.
- **Recommended fix:** either build the payments page (real scope, needs
  prioritization) or remove the empty route and correct CLAUDE.md to describe the
  admin app's actual current state (user management + platform settings, which the
  audit confirmed ARE implemented under `apps/platform/app/(platform)/(admin)/**` —
  worth double-checking whether "admin" functionality is meant to live in
  `apps/admin` or in platform's `(admin)` route group, since right now both exist and
  it's unclear which is authoritative).
- **Risk:** low to fix the empty file (delete or stub it); the Stripe feature itself
  is new scope, not a fix.
- **Fix now or defer:** recommend at minimum resolving the empty `page.tsx` (breaks
  or 404s), deferring the Stripe feature build-out itself.

**M3 — Two orphaned duplicate enum types in the live DB.**

- **Evidence:** `app.cancelled_by` and `app.provisioning_install_type` exist but are
  used by zero columns (confirmed via `information_schema.columns` — the actual
  columns use `app.cancelled_by_type` and `app.install_type` respectively, which have
  identical value sets). Leftover from an apparent rename that didn't clean up the
  old type.
- **Why it matters:** minor confusion risk for anyone introspecting the schema by
  hand; no functional impact.
- **Affected:** `app.cancelled_by`, `app.provisioning_install_type` (unused Postgres types).
- **Recommended fix:** `DROP TYPE app.cancelled_by; DROP TYPE
app.provisioning_install_type;` once confirmed nothing external references them.
- **Risk:** very low.
- **Fix now or defer:** low priority, safe to defer or bundle with other DB cleanup.

**M4 — Zero test coverage for authentication/authorization; existing tests only cover narrow action logic.**

- **Evidence:** `pnpm --filter @roaring/platform test` → 74/74 tests pass across 10
  files. Every test file mocks `@roaring/db` directly and tests a single action's
  data-shaping logic (e.g. `search/__tests__/actions.test.ts` tests query mapping/
  dedup, never authorization — consistent with C2, since there's no auth check to
  test). No test exists for `requireUser`, `requireRole`, the middleware redirect
  logic, or approval-status gating.
- **Why it matters:** the single most security-sensitive code path in the app
  (who can do what) has no regression protection. C2 (search action missing auth)
  is exactly the kind of bug a basic "every action requires a session" test would
  have caught.
- **Affected:** test suite as a whole; `packages/auth/src/actions.server.ts` has no
  dedicated test file at all.
- **Recommended fix:** add a test suite for `packages/auth/src/actions.server.ts`
  (requireUser/requireRole redirect behavior for each approval_status/role
  combination), and add an authorization-check test to each existing action test file.
- **Risk:** none — additive tests only.
- **Fix now or defer:** recommend fixing alongside C2, since C2's fix needs a
  regression test anyway.

**M5 — `admin_only`/`platform_settings_write` RLS policies and all 22 policies trip the "auth RLS initplan" performance lint.**

- **Evidence:** Supabase performance advisor flags every policy using
  `auth.role()`/`auth.uid()` unwrapped (should be `(select auth.role())` /
  `(select auth.uid())` to avoid per-row re-evaluation).
- **Why it matters:** low priority given RLS isn't in the app's actual request path
  today (see C1-context), but relevant for `audit_logs`/`platform_settings` policies,
  which may actually be evaluated if those tables are ever queried through a
  RLS-respecting path.
- **Affected:** all `app.*` RLS policies.
- **Recommended fix:** wrap `auth.uid()`/`auth.role()` calls in `(select ...)` when
  policies are rewritten for C1.
- **Risk:** none.
- **Fix now or defer:** bundle with C1 fix.

---

### LOW

- **L1 — `app.audit_trigger()` is `SECURITY DEFINER` with mutable `search_path`**
  (Supabase advisor WARN). Practical exploitability looks low (function only
  references schema-qualified objects and built-ins) but should have
  `SET search_path = app, pg_catalog` added per Postgres best practice. Affected:
  the function definition. Fix now or defer: cheap, bundle with other DB cleanup.
- **L2 — `public.rls_auto_enable()` is `SECURITY DEFINER` and executable via RPC by
  `anon`/`authenticated`** (Supabase advisor WARN). No-op when called directly outside
  a DDL context, but `EXECUTE` should be revoked from those roles per best practice.
  Fix now or defer: cheap, bundle with other DB cleanup.
- **L3 — Leaked password protection is disabled** in Supabase Auth config. Cheap
  toggle in the Supabase dashboard, real benefit. Fix now or defer: recommend
  enabling; not a code change.
- **L4 — `app.tenants.database_url` column is vestigial** — `NOT NULL text`, no code
  reference anywhere in `apps/` or `packages/`. Implies an abandoned
  per-tenant-database design. Fix now or defer: low priority; document as reserved or
  drop, your call.
- **L5 — `apps/admin/lib/env.ts` requires `RESEND_API_KEY` despite no visible use of
  it in `apps/admin`** — looks copy-pasted from platform's `env.ts` without pruning.
  Fix now or defer: low priority cleanup.
- **L6 — CLAUDE.md documentation drift** (separate from the functional findings
  above): role list missing `sales`; `approval_status` described as
  "pending → approved → active" when the real/coded values are
  `pending | approved | rejected`; RLS description doesn't match reality (see C1);
  `packages/algorithms` and admin "Stripe payments" descriptions don't match
  implementation (see M1, M2). Addressed by this audit's CLAUDE.md update.

---

## Changes made this audit

None yet — this is the Phase 1/2 findings report. Per your explicit instruction not
to start by changing code, no fixes have been applied. Documentation
(`docs/AUDIT.md`, `docs/DATABASE.md`, `docs/SECURITY.md`, and in progress
`docs/PROJECT_CONTEXT.md`, `docs/WORKFLOWS.md`, `CLAUDE.md`) was written/updated to
capture the system as it actually is.

## Remaining / not yet audited

Given the scope of the original request, this pass prioritized the highest-risk
areas (security, data integrity, auth/authz, schema drift) with verified evidence
over attempting shallow coverage of every item in the original brief. Not yet
covered in depth:

- Full frontend audit (loading/error/empty states, double-submit protection, N+1
  client-side fetching) beyond the two action files sampled.
- Full dependency audit (outdated/unused packages) beyond what surfaced incidentally.
- `packages/ui` component-level review.
- `apps/admin` dashboard beyond the two pages checked (M2).
- End-to-end workflow tracing (e.g. full deal → provisioning → fault lifecycle)
  beyond what the schema/action-file sampling revealed.
- Live confirmation that `apps/admin`'s empty `payments/page.tsx` actually breaks
  `next build` (inferred from Next.js's page-export requirement, not independently
  run).

## Recommended next steps, in priority order

1. Fix C2 (add `requireUser()` to `search()`) — small, contained, highest-value fix. Add a regression test (M4) alongside it.
2. Fix H1 and H3 (enum drift, `transfer_cease_comments.body` type) — trivial, safe, unblocks trusting the Drizzle schema.
3. Decide on C1-context (accept app-layer-only authorization as the model, or invest in RLS as a real second layer) — this is a decision for you, not something to auto-fix.
4. Rewrite the RLS policies (C1) to match whichever model is chosen in step 3.
5. Establish migration discipline (H2) — `drizzle-kit introspect` baseline, then real migrations going forward.
6. Add FK indexes (H4) — safe, mechanical, schedule whenever convenient.
7. Resolve the empty `apps/admin` payments page (M2) — decide whether admin functionality lives in `apps/admin` or platform's `(admin)` group, then fix CLAUDE.md and the code to match.
8. Incrementally introduce Zod validation on the highest-risk Server Actions (H5).
