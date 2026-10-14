'use server'

import { requireUser } from '@roaring/auth'
import { db, users } from '@roaring/db'
import { and, eq } from 'drizzle-orm'
import { getViewer } from '@/lib/stats/board'
import { getMetric, VISIBLE_EVENT_TYPES } from '@/lib/stats/metrics'
import { isPeriod, periodRange } from '@/lib/stats/periods'
import {
  canViewTeamEvents,
  canViewUnattributedEvents,
  canViewUserEvents,
  feedScope,
  hasFullVisibility,
} from '@/lib/stats/permissions'
import { getEvents, type EventCursor, type EventPage, type EventScope } from '@/lib/stats/queries'

export type DrillScope =
  | { kind: 'user'; userId: string }
  | { kind: 'team'; teamId: string }
  | { kind: 'unattributed' }
  | { kind: 'tenant' }

export type EventsResult = { ok: true; page: EventPage } | { ok: false; error: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function validCursor(cursor: unknown): EventCursor | null {
  if (!cursor || typeof cursor !== 'object') return null
  const c = cursor as Record<string, unknown>
  const isTime = (v: unknown) => typeof v === 'string' && !Number.isNaN(Date.parse(v))
  if (isTime(c.occurredAt) && isTime(c.recordedAt) && typeof c.id === 'string' && UUID.test(c.id)) {
    return { occurredAt: c.occurredAt as string, recordedAt: c.recordedAt as string, id: c.id }
  }
  return null
}

/** The events behind one figure on the board — only if the viewer may see them. */
export async function getMetricEvents(input: {
  metricKey: string
  period: string
  scope: DrillScope
  cursor?: EventCursor | null
}): Promise<EventsResult> {
  const user = await requireUser()
  const viewer = await getViewer(user)

  const metric = getMetric(input.metricKey)
  if (!metric || metric.status !== 'active') return { ok: false, error: 'Unknown statistic.' }
  if (!isPeriod(input.period)) return { ok: false, error: 'Unknown period.' }

  let scope: EventScope
  switch (input.scope?.kind) {
    case 'user': {
      if (!UUID.test(input.scope.userId)) return { ok: false, error: 'Unknown employee.' }
      const [subject] = await db
        .select({ id: users.id, teamId: users.teamId })
        .from(users)
        .where(and(eq(users.id, input.scope.userId), eq(users.tenantId, user.tenantId)))
        .limit(1)
      if (!subject || !canViewUserEvents(viewer, subject))
        return { ok: false, error: 'You can’t view this employee’s activity.' }
      scope = { kind: 'credited', userId: subject.id }
      break
    }
    case 'team':
      if (!UUID.test(input.scope.teamId) || !canViewTeamEvents(viewer, input.scope.teamId))
        return { ok: false, error: 'You can’t view this team’s activity.' }
      scope = { kind: 'team', teamId: input.scope.teamId }
      break
    case 'unattributed':
      if (!canViewUnattributedEvents(viewer))
        return { ok: false, error: 'Only managers can view unattributed activity.' }
      scope = { kind: 'unattributed' }
      break
    case 'tenant':
      if (!hasFullVisibility(viewer))
        return { ok: false, error: 'Only managers can view everyone’s activity.' }
      scope = { kind: 'tenant' }
      break
    default:
      return { ok: false, error: 'Unknown scope.' }
  }

  // Team ids are only meaningful within the caller's tenant — the query is
  // tenant-scoped, so a foreign id simply returns nothing.
  const page = await getEvents(db, user.tenantId, {
    scope,
    range: periodRange(input.period),
    match: metric.match,
    cursor: validCursor(input.cursor),
    limit: 25,
  })
  return { ok: true, page }
}

/** Recent credited activity the viewer may see, newest first. */
export async function getActivityFeed(
  input: { cursor?: EventCursor | null } = {}
): Promise<EventsResult> {
  const user = await requireUser()
  const viewer = await getViewer(user)
  const fs = feedScope(viewer)
  const scope: EventScope =
    fs.kind === 'tenant'
      ? { kind: 'tenant' }
      : fs.kind === 'team'
        ? { kind: 'team', teamId: fs.teamId, userId: fs.userId }
        : { kind: 'involving', userId: fs.userId }

  const page = await getEvents(db, user.tenantId, {
    scope,
    eventTypes: VISIBLE_EVENT_TYPES,
    cursor: validCursor(input.cursor),
    limit: 20,
  })
  return { ok: true, page }
}
