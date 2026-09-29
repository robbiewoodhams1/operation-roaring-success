# Security Model

Last verified against the live database and codebase: 2026-09-28.

## Authentication

- Identity is Supabase Auth (`auth.users`, `auth.sessions`). The browser holds a
  session cookie managed by `@supabase/ssr`.
- `packages/auth/src/middleware.ts` (wired into both apps' `middleware.ts`) redirects
  unauthenticated requests to `/login` for any path except the public auth routes
  (`/login`, `/reset-password`, `/update-password`, `/confirm`, `/pending-approval`,
  `/unauthorised`, `/rejected`). It only checks _whether a session exists_ — it does
  not look at role or `approval_status`.
- `packages/auth/src/actions.server.ts` — `getUser()` loads the Supabase auth user,
  then joins to `app.users` by id to get the app-level profile (role, tenant,
  approval status). `requireUser()` layers on top: redirects to `/pending-approval` if
  `approval_status = 'pending'`, `/rejected` if `'rejected'`, and signs out +
  redirects if `is_active = false`. `requireRole(...roles)` calls `requireUser()`
  and then checks `role` is in the allowed list, redirecting to `/unauthorised`
  otherwise.
- **`requireUser()`/`requireRole()` are the only authorization mechanism in the
  system.** There is no database-level backstop (see "RLS" below) — every Server
  Action and Server Component is individually responsible for calling one of these
  before touching data. This was verified by grepping every `'use server'` file:
  16 of 17 protected-route action files call `requireUser`/`requireRole`; one does
  not (see CRITICAL-2 below).
- Next.js Server Actions are independent POST endpoints. A parent layout calling
  `requireUser()` (e.g. `apps/platform/app/(platform)/layout.tsx`) protects that
  layout's own render, but does **not** automatically protect Server Actions defined
  in that subtree — each action must check for itself. This is a common Next.js
  footgun and the root cause of CRITICAL-2.

## Authorization / roles

- `app.user_role` enum (live DB): `agent | team_leader | manager | director | admin | sales`.
  The Drizzle schema (`packages/db/src/schema/users.ts`) only defines the first five —
  `sales` is missing from the TypeScript type. CLAUDE.md's role list is also stale
  (same omission).
- `app.approval_status` enum: `pending | approved | rejected`. New users are inserted
  as `pending` / `is_active=false` by `inviteUser()`, flipped to `approved` /
  `is_active=true` by `confirmInvite()` (on invite-link click) or `activateUser()`
  (used by an admin approving manually).
- Role-gated routes: only the `(admin)` route group
  (`apps/platform/app/(platform)/(admin)/{users,platform}/**`) calls
  `requireRole('admin')`. Everything else is gated only by `requireUser()` — i.e. any
  approved user of any role can read/write any customer, deal, provisioning, fault,
  complaint, debt, todo, or transfer/cease record via the app. There is no
  ownership check (e.g. "only the assigned agent can edit this deal") anywhere in the
  sampled action files (`customers/[id]/actions.ts`, `deals/[id]/actions.ts`).

## Multi-tenancy

- `app.tenants` — currently exactly **one row** ("Roaring-Success"). The app is a
  single-tenant deployment in practice today, despite the schema being tenant-shaped
  (every domain table has a `tenant_id` FK).
- Every write path threads `tenantId` from the authenticated user
  (`user.tenantId` from `requireUser()`), **except** `search()` (see CRITICAL-2),
  which takes `tenantId` as a plain function argument supplied by the caller.
- `app.tenants.database_url` is a `NOT NULL text` column with no code reference
  anywhere in `apps/` or `packages/`. It implies an originally-planned
  per-tenant-database architecture that was abandoned in favor of the current
  single-shared-database + `tenant_id` column model. Vestigial; worth removing or
  documenting as reserved.

## Row Level Security (RLS) — read this carefully

RLS is **enabled** on all 22 tables in the `app` schema, but for 19 of them the only
policy is:

```sql
create policy authenticated on app.<table>
  for all
  using (auth.role() = 'authenticated');
```

No `tenant_id` check, no role check, no `with_check` clause. Taken literally, this
policy would let any authenticated Supabase session — including a user whose
`approval_status` is still `pending` — read, insert, update, or delete any row in any
tenant, including `deal_billing` (bank sort code / account number) and `users`
(a user could `UPDATE app.users SET role = 'admin'` on their own row).

`app.audit_logs` (`admin_only`) and `app.platform_settings`
(`platform_settings_read` / `platform_settings_write`) are the only two tables with a
real role check, both via `EXISTS (SELECT 1 FROM app.users u WHERE u.id = auth.uid()
AND u.role = 'admin')`.

**Why this has not caused a breach today:**

1. `packages/db/src/client.ts` connects to Postgres directly via `DATABASE_URL`
   using `postgres-js` — not through PostgREST. The connection uses the `postgres`
   role, which is confirmed via `pg_roles` to have `rolbypassrls = true`. **All of the
   application's real database traffic (every Drizzle query in every Server Action)
   bypasses RLS entirely.** RLS only matters for requests that go through Supabase's
   PostgREST/REST API using the `anon` or `authenticated` Postgres roles.
2. The `app` schema has **no `USAGE` grant** for `anon` or `authenticated`
   (`has_schema_privilege('authenticated', 'app', 'USAGE')` → `false`), and no table
   grants exist for those roles either. This means direct calls to the Supabase REST
   API against `app.*` tables would fail with a permission error before RLS policies
   are even evaluated. Verified directly via SQL against `information_schema.role_table_grants`
   and `has_schema_privilege`.

**So the practical risk is:**

- The database has **zero authorization backstop**. 100% of access control lives in
  Next.js application code. Any bug in a Server Action's `requireUser`/`requireRole`
  call (see CRITICAL-2) is completely unprotected by the database.
- If anyone ever exposes `app.*` via PostgREST (grants the schema to
  `anon`/`authenticated`), enables Realtime on an `app.*` table, or a client
  component ever calls `supabase.from(...)` directly against `app.*` instead of going
  through a Server Action, the weak RLS policies become immediately and fully
  exploitable — full tenant-wide read/write, including a role self-escalation path
  via `app.users`.
- CLAUDE.md's claim "Supabase RLS enforces row-level access" is **false** for the
  system as it actually runs today. It reflects an intended design that the
  implementation never followed through on.

## Known vulnerabilities (see AUDIT.md for full detail and severity)

1. **RLS policies provide no real isolation** — landmine, not currently reachable
   (see above). Recommended fix: rewrite every `authenticated`-only policy to check
   `tenant_id = (select tenant_id from app.users where id = auth.uid())` at minimum,
   add role-appropriate `with_check` clauses, and treat RLS as the real second layer
   of defense it's meant to be — even though the app doesn't currently route through
   it, an incorrect assumption here is exactly the kind of thing that becomes
   exploitable the moment the data-access pattern changes.
2. **`apps/platform/app/(platform)/search/actions.ts` — no `requireUser()` call.**
   The `search(tenantId, query)` Server Action is callable with zero authentication;
   `tenantId` is caller-supplied rather than derived from session. Currently exposes
   customer name/address/phone/email/account number search without login. This is an
   isolated oversight — it is the _only_ one of 17 protected-route action files
   missing an auth check — so the fix is small and contained: add
   `const user = await requireUser()` at the top and use `user.tenantId` instead of
   the parameter.
3. **`app.audit_trigger()` is `SECURITY DEFINER` with a mutable `search_path`**
   (Supabase advisor WARN). Practical exploitability looks low — the function body
   only references schema-qualified `app.audit_logs` and built-ins — but it should
   have `SET search_path = app, pg_catalog` added per Postgres best practice.
4. **`public.rls_auto_enable()`** is `SECURITY DEFINER` and executable via RPC by
   `anon`/`authenticated` (Supabase advisor WARN). It's a DDL event-trigger handler
   with no arguments and no effect when called directly outside a DDL context, but
   `EXECUTE` should be revoked from `anon`/`authenticated` per best practice.
5. **Leaked password protection is disabled** in Supabase Auth config. Cheap to
   enable, real benefit (blocks known-compromised passwords via HaveIBeenPwned).

## Service-role usage

- `createAdminClient()` (`packages/auth/src/server.ts`) wraps `SUPABASE_SERVICE_ROLE_KEY`
  and is used for: `deletePendingUser`, `inviteUser` (creates the `auth.users` row +
  sends the invite email), `sendPasswordResetEmail`. These are legitimate
  service-role use cases (admin-only user-lifecycle operations that must act outside
  RLS). All call sites are inside `packages/auth/src/actions.server.ts` — service-role
  usage is not scattered through the app.

## What Claude sessions must NOT do without explicit sign-off

- Do not weaken any RLS policy further, or drop RLS on any table.
- Do not change `requireUser`/`requireRole` semantics without checking every call
  site — many pages rely on the specific redirect targets.
- Do not add a client-side `supabase.from(...)` call against `app.*` tables — given
  the current RLS policies, this would be an instant tenant-wide data exposure until
  the policies are fixed (see vulnerability 1 above).
- Do not commit real Supabase keys, the service role key, or `DATABASE_URL` anywhere.
