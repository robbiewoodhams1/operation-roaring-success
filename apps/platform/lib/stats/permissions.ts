/**
 * Who may see what on the Stats Board. Every check runs on the server.
 *
 * Counts (personal totals, team totals, leaderboard positions) are visible to
 * everyone in the tenant — leaderboards are only meaningful if people can see
 * them. Event-level detail (which deals, which services, who performed the
 * action) is narrower:
 *
 *   - everyone sees the events credited to, or performed by, themselves
 *   - team leaders also see events credited to members of their current team
 *   - managers, directors and admins see every event, including unattributed ones
 *
 * This is the conservative default pending business confirmation
 * (docs/STATS.md → Open questions).
 */
import type { UserRole } from '@roaring/auth'

export interface Viewer {
  id: string
  role: UserRole
  teamId: string | null
}

const FULL_VISIBILITY = new Set<string>(['manager', 'director', 'admin'])

export function hasFullVisibility(viewer: Viewer): boolean {
  return FULL_VISIBILITY.has(viewer.role)
}

export function leadsTeam(viewer: Viewer, teamId: string | null): boolean {
  return viewer.role === 'team_leader' && teamId !== null && viewer.teamId === teamId
}

/** May the viewer list the individual events credited to this employee? */
export function canViewUserEvents(
  viewer: Viewer,
  subject: { id: string; teamId: string | null }
): boolean {
  if (subject.id === viewer.id) return true
  if (hasFullVisibility(viewer)) return true
  return leadsTeam(viewer, subject.teamId)
}

/** May the viewer list every event credited within a team? */
export function canViewTeamEvents(viewer: Viewer, teamId: string): boolean {
  return hasFullVisibility(viewer) || leadsTeam(viewer, teamId)
}

/** May the viewer list events with no credited employee? */
export function canViewUnattributedEvents(viewer: Viewer): boolean {
  return hasFullVisibility(viewer)
}

/** Whose events appear in the viewer's activity feed. */
export type FeedScope =
  | { kind: 'tenant' }
  | { kind: 'team'; teamId: string; userId: string }
  | { kind: 'self'; userId: string }

export function feedScope(viewer: Viewer): FeedScope {
  if (hasFullVisibility(viewer)) return { kind: 'tenant' }
  if (viewer.role === 'team_leader' && viewer.teamId)
    return { kind: 'team', teamId: viewer.teamId, userId: viewer.id }
  return { kind: 'self', userId: viewer.id }
}
