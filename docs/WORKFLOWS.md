# Key Workflows

Traced directly from the code (not assumed). Last verified: 2026-09-28.

## Deal edit

```
User submits deal edit form (client component)
  ↓
apps/platform/app/(platform)/deals/[id]/actions.ts: updateDeal(data)
  ↓
requireUser() — session + approval_status + is_active check
  ↓
db.transaction:
  setAuditUser(tx, user.id)  — sets app.current_user_id for this tx
  Promise.all([
    update deals, update dealServices, update dealPricing,
    update dealBilling, update customers
  ])
  ↓
app.audit_trigger() fires per-row on each UPDATE (5 tables) →
  inserts into app.audit_logs with old/new JSONB + changed_by
  ↓
revalidateTag('deals-{tenantId}', 'dealServices-{tenantId}',
  'dealPricing-{tenantId}', 'dealBilling-{tenantId}', 'customers-{tenantId}')
revalidatePath('/deals', '/customers')
  ↓
Next.js re-renders affected cached segments on next request
```

**Failure modes as implemented:**

- No input validation (no Zod) — a malformed enum string reaches Postgres directly
  and surfaces as an unhandled error, not a clean form error (AUDIT.md H5).
- No ownership/role check beyond "logged in and approved" — any approved user can
  edit any deal, not just ones assigned to them (see PROJECT_CONTEXT.md
  "Authorization model" — may be intentional, needs product confirmation).
- The five updates run via `Promise.all` inside one `db.transaction` — atomic if the
  underlying driver correctly serializes concurrent queries on one transaction
  connection (not independently verified this audit — worth confirming with the
  `postgres-js` docs/driver behavior before relying on it under contention).
- No optimistic-concurrency / "someone else edited this since you loaded it" check —
  last write wins silently.

## Customer edit

Same shape as deal edit, single table (`customers`), same
`requireUser` → `setAuditUser` → transaction → audit trigger → `revalidateTag`/`revalidatePath`
pattern. See `customers/[id]/actions.ts`.

## Search

```
User types in search box (client component)
  ↓
apps/platform/app/(platform)/search/actions.ts: search(tenantId, query)
  ↓
[NO requireUser() call — see AUDIT.md C2]
  ↓
4 sequential Drizzle queries (customers, deals, provisioning, provisioning_services)
  scoped by tenantId — a caller-supplied parameter, not derived from session
  ↓
Results deduplicated by type+id, returned to client
```

This is the one workflow in the audited sample with no authentication gate at all —
flagged as the top-priority fix (AUDIT.md C2).

## User invite → approval → login

```
Admin calls inviteUser({ email, role, tenantId, ... })
  (packages/auth/src/actions.server.ts, requires requireRole('admin') upstream
   in the calling page — apps/platform/app/(platform)/(admin)/users/new/actions.ts)
  ↓
createAdminClient().auth.admin.inviteUserByEmail(email, {...})
  — creates auth.users row, sends Supabase invite email
  ↓
db.insert(users).values({ ..., approvalStatus: 'pending', isActive: false })
  — creates app.users row
  ↓
db.insert(auditLogs).values({ tableName: 'user_invitations', action: 'INSERT', ... })
  ↓
[user clicks email link] → apps/platform/app/(auth)/confirm/actions.ts → confirmInvite(code)
  ↓
supabase.auth.exchangeCodeForSession(code)
  ↓
db.update(users).set({ approvalStatus: 'approved', isActive: true })
  ↓
User can now pass requireUser()'s approval_status/is_active checks and use the app
```

**Failure modes as implemented:**

- `inviteUser()`'s own comment flags the gap: "If app.users insert fails, we should
  ideally roll back the auth user — For now log and return error — TODO: add
  cleanup" (`packages/auth/src/actions.server.ts`). A failed second step leaves an
  orphaned `auth.users` row with no matching `app.users` row — that user could
  authenticate (pass Supabase Auth) but `getAppUser()` would return `null`, and
  `requireUser()` would redirect them to `/login` in a loop with no clear error
  message. Not currently observed in data (`auth.users` and `app.users` counts match
  1:1 today) but is a real unhandled edge case in the code.
- Admin-triggered `activateUser()` exists as an alternate path to `confirmInvite()`
  (e.g. for approving a user without them needing to click the email link) — both
  converge on the same `approved`/`active` state; worth confirming which is the
  actual intended primary path vs. a fallback.

## Provisioning, faults, complaints, debts, transfer/ceases

All four case-tracking workflows share the same shape (parent record with
`tenant_id`/`assigned_to`/`status`/`created_by` + a `*_comments` child table) and the
same `requireUser`/`requireRole` → transaction → audit-trigger → revalidate pattern
confirmed in their action files (`grep` confirmed each calls `requireUser`/`requireRole`
at least twice). Not individually traced end-to-end this audit — the pattern
consistency across `customers`/`deals`/`search` gives reasonable confidence the
others follow the same shape, but this hasn't been independently verified line by
line for faults/complaints/debts/transfer_ceases specifically. Flagged as a
follow-up if you want full per-workflow verification.
