# 003 — Stats credit events are written by database triggers

**Status:** accepted (2026-10-13), implemented on Development only.

## Context

The Stats Board needs a reliable, append-only record of who earned credit for what
(see `docs/STATS.md`). The business actions that earn credit happen in many Server
Actions (deal sheet, deal edit, provisioning, faults, complaints, debts,
transfers/ceases, to-dos), and data also changes outside the app (imports, SQL run
directly against the database — this happened in Development on 2026-10-13).

Two options were considered:

1. **App code records events** — each Server Action inserts an event in the same
   transaction.
2. **Database triggers record events** — `AFTER` triggers on the source tables call
   one recording function.

## Decision

Option 2. Triggers on `app.deals`, `app.provisioning`, `app.provisioning_services`,
`app.faults`, `app.complaints`, `app.debts`, `app.transfer_ceases` and `app.todos`
call `app.record_performance_event()`, which serialises on an advisory lock per
subject, checks the subject's net credit, and inserts with a unique idempotency key.
`app.performance_events` rejects `UPDATE`, `DELETE` and `TRUNCATE`.

## Why

- **Atomic by construction.** The event commits or rolls back with the business
  change in the same transaction — there is no path that saves a deal but loses its
  credit, or the reverse.
- **Can't be forgotten.** A new Server Action, a bulk import or a hand-run SQL fix all
  produce correct events. Option 1 would depend on every author remembering, which is
  exactly how the audit-user pattern (ADR-adjacent: `setAuditUser`) and the tenant
  checks (AUDIT.md C3) lapsed.
- **Clients can't forge credit.** No API role can insert events; the only writer is a
  `SECURITY DEFINER` function revoked from `public`, reached only through triggers.
  The actor comes from `app.current_user_id`, which only server code sets.
- **Same mechanism as the audit log**, which the team already relies on.

## Consequences

- Business rules for _when_ credit is earned live in SQL (`supabase/migrations/20261013000000_performance_stats.sql`),
  next to the data. They are covered by integration tests against the Development
  database (`apps/platform/test/integration/`) — unit tests with mocked `db` cannot
  exercise them.
- Changing a rule means a new migration, not just an app deploy.
- Trigger overhead is small (one indexed lookup + one insert per qualifying change),
  but should be monitored after Production rollout.
- Direct SQL that sets no actor records events with `actor_user_id = NULL` — honest,
  and visible in the feed as "recorded by" being absent.
