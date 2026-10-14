# Stats Board

The Stats Board (`/stats`) reports what employees and teams have done, using an
append-only ledger of **credit events** written by the database itself. This file is
the source of truth for what each figure means, how it is recorded, what history it
covers, and what is still waiting for a business decision.

Status (2026-10-13): built and verified on **Development** (`gqkugpjmguufavbladxt`)
only. Nothing here has been applied to Production — see [Release plan](#release-plan-for-production).

---

## Metric definitions

Approved rules (2026-10-13). The registry in `apps/platform/lib/stats/metrics.ts` is
the code copy of this table; the UI shows each definition next to its figure.

| Metric                                                     | Counts when                                                                            | Credited to                                 | Status                                                |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------- |
| Deals opened                                               | A deal sheet is submitted successfully (once per deal)                                 | The selected **sales agent**                | Active                                                |
| Deals closed                                               | The same submission — closing-agent credit, _not_ "services live"                      | The selected **closing agent**              | Active                                                |
| Broadband applied / live                                   | A BB or MPF Broadband service first reaches `applied` / reaches `live`                 | The **assigned provisioner** at that moment | Active                                                |
| Voice applied / live                                       | Same, for WHC, MPF Voice and NFON                                                      | The assigned provisioner                    | Active                                                |
| Per-type (BB, MPF BB, WHC, MPF Voice, NFON) applied / live | Same, per service type                                                                 | The assigned provisioner                    | Active                                                |
| Mobile applied / live                                      | —                                                                                      | —                                           | **Unavailable** — no workflow creates mobile services |
| Routers dispatched                                         | `router_dispatched` changes to `yes` (once per record)                                 | Proposed: the new **router assignee** field | **Awaiting approval**                                 |
| Welcome calls logged                                       | A WC1–3 outcome is first recorded                                                      | Undefined — no assigned caller              | **Awaiting approval**                                 |
| Faults resolved / Complaints closed                        | Status changes to Resolved / Closed                                                    | Proposed: the assignee                      | **Awaiting approval**                                 |
| Debts closed                                               | `closed_at` is set (outcome payment, payment plan, uncollectable, deceased, free bill) | Proposed: the assignee                      | **Awaiting approval**                                 |
| Transfers / Ceases completed                               | Status changes to Completed (`cease`/`standard_cease` → cease; others → transfer)      | Proposed: the assignee                      | **Awaiting approval**                                 |
| To-dos completed                                           | Status changes to Completed                                                            | Proposed: the assignee                      | **Awaiting approval**                                 |

"Awaiting approval" metrics are **already being recorded** — the events exist — but the
board shows them as pending rather than as numbers. Activating one is a one-line change
to `status` in the registry once the rule is agreed; history recorded since go-live
will then appear.

Rules common to every metric:

- **Idempotent.** Each credit has a subject (a deal; a provisioning record + service
  type; a router; a case). A subject can hold at most one standing award per metric.
  Edits, resubmissions, retries and repeated saves never add a second credit.
- **Retries share a subject.** Attempt 2 of a BB service is the same subject as
  attempt 1, so "applied" and "live" are each counted once per service.
- **Reversals, not deletes.** Undoing a qualifying state records a `reversal` (−1)
  that points at the award it cancels and carries the **same credited employee and
  team**, so personal and team totals both net to zero. The ledger cannot be updated
  or deleted (enforced by trigger).
- **What reverses what (current implementation — confirm, see Open questions):**
  - Service `applied` → reversed only if the status is corrected back to `not_applied`
    and no other attempt shows the service was applied. A later cancellation does
    **not** reverse "applied" (the application happened).
  - Service `live` → reversed when no attempt of that service is live any more
    (e.g. `live → delayed`). Returning to live re-awards once.
  - Router `yes` → reversed when changed away from `yes`.
  - Case workflows → reversed when reopened.
  - Any source record deleted → its standing credits are reversed.
- **Reversals count against the original period.** A reversal's `effective_at` is
  the award's, so "Deals closed in March" means deals closed in March that still
  stand. `occurred_at` records when the reversal actually happened.
- **Reassignment does not move credit.** Changing a deal's agents or a provisioner
  later never rewrites existing credit (policy not yet approved). Future milestones
  go to whoever is assigned at that time. The deal edit screen says so.
- **The creator is audited, not credited.** `deals.created_by` and every event's
  `actor_user_id` record who actually performed the action; they are never used as
  the credited employee.

## Reporting periods

`Today | WTD | MTD | YTD` on **Europe/London** calendar boundaries, Monday-start
weeks, from the period's London midnight up to now. All boundary maths is done on
wall-clock dates and converted at the end, so BST/GMT changes never shift a boundary
(`lib/stats/periods.ts`, tested across both 2026 changes).

Comparisons use the same span of the previous period (yesterday to this time, last
week to the same weekday and time, last month to the same day — clamped — and last
year to the same date). A comparison is shown **only** when the earlier period is
fully covered by live tracking; otherwise the board says "No comparable history".
A percentage is only shown against a non-zero baseline.

## Architecture

See `docs/decisions/003-credit-events-written-by-database-triggers.md` for why.

```
deal sheet / deal edit / provisioning / faults / … (Server Actions)
        │  setAuditUser(tx, user.id)  — declares the actor for the transaction
        ▼
app.deals, app.provisioning, app.provisioning_services, app.faults, …
        │  AFTER triggers (pe_deals, pe_provisioning, pe_provisioning_services, pe_completion)
        ▼
app.record_performance_event()   — advisory lock + net-state check + idempotency key
        ▼
app.performance_events (append-only)  ◄── lib/stats/queries.ts ◄── /stats (Server Components + Actions)
```

Schema (migration `supabase/migrations/20261013000000_performance_stats.sql`, formerly `packages/db/migrations/0002_performance_stats.sql`):

| Object                                                        | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app.performance_events`                                      | The ledger: `event_type`, `kind` (award/reversal), generated `delta` (±1), `sequence`, source type/id, `subject_key`, service type/group, `credited_user_id`, `actor_user_id`, `team_id` (team at the time), `attribution` (recorded/unattributed), `origin` (live/backfill), `occurred_at`, `effective_at`, `recorded_at` (clock time), `idempotency_key` (unique per tenant), `reverses_event_id`, `reason`, `detail` (no PII) |
| `app.performance_tracking`                                    | Per tenant: `live_from` (complete recording starts), `backfilled_at`, `backfill_report`                                                                                                                                                                                                                                                                                                                                          |
| `app.teams`                                                   | Stable team identity per tenant; retired, never deleted                                                                                                                                                                                                                                                                                                                                                                          |
| `app.user_team_memberships`                                   | Membership history, maintained by trigger whenever `users.team_id` changes                                                                                                                                                                                                                                                                                                                                                       |
| `users.team_id`                                               | Current team                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `deals.sales_agent_id`, `closing_agent_id`                    | Stable credited employees (names kept as a display snapshot)                                                                                                                                                                                                                                                                                                                                                                     |
| `deals.submission_key`                                        | One deal per deal-sheet form — unique per tenant                                                                                                                                                                                                                                                                                                                                                                                 |
| `provisioning.provisioner_user_id`                            | Credited provisioner (free-text `provisioner` kept as a snapshot)                                                                                                                                                                                                                                                                                                                                                                |
| `provisioning.router_assigned_user_id`                        | Proposed router-dispatch credit                                                                                                                                                                                                                                                                                                                                                                                                  |
| `provisioning.updated_by`, `provisioning_services.updated_by` | Who last changed the row — set by trigger from the session actor                                                                                                                                                                                                                                                                                                                                                                 |
| `app.current_actor()`                                         | The validated user from `app.current_user_id` (NULL for direct SQL)                                                                                                                                                                                                                                                                                                                                                              |
| `app.team_at(user, at)`                                       | Team membership at an instant                                                                                                                                                                                                                                                                                                                                                                                                    |
| `app.enforce_attribution()`                                   | Rejects credited users from another tenant; overwrites `deals.created_by` and `updated_by` with the session actor                                                                                                                                                                                                                                                                                                                |
| `app.backfill_performance_events(tenant)`                     | Rebuilds history from timestamped evidence (below)                                                                                                                                                                                                                                                                                                                                                                               |

Indexes: `(tenant_id, effective_at)`, `(tenant_id, credited_user_id, effective_at)`,
`(tenant_id, team_id, effective_at)`, `(tenant_id, event_type, subject_key)`,
`(source_type, source_id)`, the feed keyset `(tenant_id, occurred_at desc, recorded_at desc, id desc)`,
plus FK indexes. Verified at ~20k events: personal and team totals use
`performance_events_credited_effective` / `performance_events_team_effective`, no
sequential scans. Every board query is a tenant-scoped aggregate over one period; no
page load scans a business table.

### Access control

Authorization is in app code (ADR 001). The new tables have RLS enabled with no
policies and all privileges revoked from `anon`/`authenticated`; the recording and
backfill functions are revoked from public. Clients cannot write events — only
triggers can — and the actor comes from the server session.

Visibility (`lib/stats/permissions.ts`, enforced in every Server Action):

| Role                     | Sees counts                       | Can open events behind a figure                           |
| ------------------------ | --------------------------------- | --------------------------------------------------------- |
| agent, sales             | Own, every team, all leaderboards | Own only                                                  |
| team_leader              | Same                              | Own + members of their current team + their team's totals |
| manager, director, admin | Same                              | Everything, including unattributed                        |

Activity feed: agents see events credited to or performed by them; team leaders see
their team's plus their own; managers and above see the whole tenant. Customer
details are never shown — events link to the CRM record, which applies its own
access checks.

## Historical coverage

Backfill only uses evidence with a trustworthy timestamp, and credits an employee only
where a stable id already exists. Free-text names are **never** matched to accounts
automatically.

| Metric                                           | History source                                          | Attribution                                       | Coverage                                                  |
| ------------------------------------------------ | ------------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------- |
| Deals opened / closed                            | `deals.created_at`                                      | Only if `*_agent_id` set (no legacy deal has one) | **Partial** — counts complete, all unattributed           |
| Services applied / live                          | Status transitions in `app.audit_logs`                  | None (no provisioner id historically)             | **Partial** — from when audit logging began; unattributed |
| Routers dispatched                               | `router_dispatched` transitions in `audit_logs`         | None                                              | Partial (none exist in Dev)                               |
| Welcome calls                                    | Outcome transitions in `audit_logs`                     | None                                              | Partial (none exist in Dev)                               |
| Faults / complaints / transfers / ceases / debts | Server-set `resolved_at` / `closed_at` / `completed_at` | None                                              | Partial (current state only; none in Dev)                 |
| To-dos                                           | Status transitions in `audit_logs`                      | None                                              | Partial (none in Dev)                                     |

**Development backfill (2026-10-13):** live tracking from 10:04:57 UTC; backfill
recorded 117 deals opened + 117 deals closed (8–9 Jul 2026) and 35 services applied
(9–10 Jul 2026), all unattributed. 37 applied transitions exist in the audit log;
the other 2 belong to provisioning records that were later deleted and correctly earn
nothing. The board labels these figures "rebuilt from history" and shows periods that
reach before `live_from` with a history warning and no comparisons.

## Verification

- `pnpm --filter @roaring/platform test` — 182 unit tests: periods & DST, comparisons,
  registry, permissions, leaderboard ranking, every changed Server Action (session
  attribution, agent/provisioner validation, duplicate submissions, tenant checks,
  drill-down permissions).
- `pnpm --filter @roaring/platform test:integration` — 35 tests against the
  **Development** database, each inside a transaction that is always rolled back
  (`test/integration/setup.ts` refuses any other project). Covers triggers,
  idempotency, retries, reversals, cancellations, deletions, append-only enforcement,
  tenant isolation, team transfers, inactive employees, backfill, DST day bucketing,
  pagination and index use at volume.
- Rendering checked end-to-end on the Development dev server as a synthetic QA
  manager in the isolated tenant **"Stats QA (synthetic)"** (`stats-qa-synthetic`,
  login `stats-qa@synthetic.invalid`). Its numbers reconcile with the seeded actions.
  That tenant and login remain in Development for further QA; remove them when no
  longer needed (append-only events require disabling `append_only` on
  `app.performance_events` for that cleanup — do it in one transaction).

## Open questions (need a business decision)

1. **Router dispatch credit** — credit the new "router assignee" on the provisioning
   record? (Metric hidden until approved.)
2. **Case workflows and to-dos** — credit the assignee or the person who completed it?
   Do historical transfers count? Which debt outcomes are a success?
3. **Welcome calls** — does any outcome count as a completed call, or only "answered"?
   Who gets credit (there is no assigned caller)?
4. **Reversal semantics** — confirm: cancelling an applied service keeps the "applied"
   credit; leaving `live` (including to `cancelled`) removes the "live" credit;
   reversals count against the original period.
5. **Reassignment** — when a deal's agent or a provisioner is changed, should past
   credit move (correction) or stay (handover)? Currently it stays.
6. **Visibility** — confirm the table above (agents can't open colleagues' events;
   team leaders can open their team's).
7. **Deal cancellation** — `deals.status` is never changed by any workflow. Should a
   cancelled deal reverse its opened/closed credit, and from which period?
8. **Applied when skipped** — a service moved straight from `not_applied` to `live`
   earns "live" but not "applied". Should reaching live imply applied?
9. **Legacy names** — Production deals carry free-text agent names. Approve a
   name → user mapping (reviewed list) before any historical credit is attributed.

## Release plan for Production

Nothing below has been run against Production (`wvdwwmfzwvrniwpmiahu`). Each step
needs explicit sign-off, and the general procedure in `docs/RELEASE.md` (including
its read-only step 0) applies.

1. **Prerequisites.** Answer open questions 4–7 at least (they affect stored data).
   Take a Production backup / PITR checkpoint.
2. **Dry run.** Restore a recent Production snapshot into a branch or a scratch
   project, apply the migration with `supabase db push --db-url …` (docs/RELEASE.md),
   run the integration tests against it, and run the backfill in preview mode
   (`select app.backfill_performance_events(...)` inside a rolled-back transaction).
   Review the report.
3. **Deploy order.** Apply the migration first (it is additive — new nullable columns,
   new tables, triggers — and the current app keeps working against it), then deploy
   the app. Live tracking starts at migration time.
4. **Backfill.** Run `app.backfill_performance_events(<tenant>)` once; record the
   report in this file.
5. **Teams.** Admins create teams under Admin → Teams and assign people. Optionally
   seed teams from the legacy `users.team` text after review — not automatically.
6. **Legacy attribution.** Produce the distinct `deals.sales_agent` /
   `closing_agent` / `provisioning.provisioner` names with candidate users for
   review. Only approved mappings are applied; attribution corrections are written as
   reversal + re-award pairs (`reason = 'attribution_corrected'`), never by editing
   events.
7. **Monitoring.** Watch `pg_stat_statements` for the stats queries and the trigger
   overhead on deal/provisioning writes for the first week.

Rollback: the app can be redeployed to the previous version at any time — the
migration is additive and old code ignores the new columns. To stop recording, drop
the `performance_events` triggers; the ledger and new columns can stay.
