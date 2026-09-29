# 001 — Authorization lives in application code, not RLS

**Status:** documented as-found (2026-09-28 audit), not yet ratified by the team as
intentional. Treat as "this is what the code currently does," not "this is
confirmed as the right design" — flag to a human before changing either direction.

## Context

`packages/db/src/client.ts` connects to Postgres directly via `DATABASE_URL` using
`postgres-js`, authenticating as the `postgres` role, which has `rolbypassrls = true`.
Every Drizzle query the application makes — which is 100% of its data access —
bypasses Row Level Security entirely. Meanwhile, every table in the `app` schema has
RLS enabled with policies that (for 19 of 22 tables) only check
`auth.role() = 'authenticated'`, providing no real tenant or role isolation.

## Decision (as observed, not necessarily endorsed)

The system currently enforces all authorization in Next.js application code —
`requireUser()`/`requireRole()` calls at the top of Server Actions and Server
Components — with **no database-level backstop**. RLS policies exist (satisfying
"RLS is enabled" checklists) but do not do meaningful work for the app's actual
request path.

## Why this might be intentional

Some production apps deliberately centralize authorization in application code for
simplicity and because a single application is the only client of the database. If
`app.*` is never meant to be queried by anything other than this Next.js codebase,
RLS's weakness is genuinely harmless — the "authenticated" role's Postgres
privileges never come into play at all in practice.

## Why this is risky as currently implemented

1. There is no second layer of defense. A single missed `requireUser()` call (see
   AUDIT.md C2 — the `search` action had exactly this bug) is immediately and fully
   exploitable, with nothing else standing in the way.
2. It makes `SECURITY.md`'s and CLAUDE.md's own claim ("Supabase RLS enforces
   row-level access") actively false, which will mislead anyone — human or
   Claude — who reads that claim and assumes RLS is protecting something.
3. If a client component is ever changed to call `supabase.from(...)` directly
   (bypassing the Next.js Server Action layer), the current RLS policies provide
   zero protection — this is a landmine for a future well-intentioned refactor.

## Consequences / what future sessions must not do

- **Do not** "clean up" RLS policies by deleting them or loosening them further —
  they should be tightened, not removed, regardless of which model the team settles
  on.
- **Do not** add a direct client-side Supabase data query against `app.*` tables
  without first fixing the RLS policies (AUDIT.md C1) — doing so today would be an
  instant full data exposure.
- **Do** treat every new Server Action as needing its own explicit
  `requireUser`/`requireRole` call — there is no ambient protection from a parent
  layout or from the database.

## Alternatives considered (by this audit, for the team to weigh)

1. **Keep app-code-only authorization, fix the RLS policies anyway as defense-in-depth.**
   Lower effort, keeps the current architecture, closes the landmine.
2. **Switch to a connection that respects RLS** (e.g. per-request role/JWT
   impersonation) and make RLS the real enforcement layer. Higher effort, more
   "correct" in the Supabase-idiomatic sense, but a meaningful architecture change
   to `packages/db/src/client.ts` and every call site's assumptions.

This audit recommends option 1 as lower-risk, but the choice is the team's to make —
see AUDIT.md's "recommended next steps."
