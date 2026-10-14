import { requireRole } from '@roaring/auth/server'
import { db, teams, users } from '@roaring/db'
import { asc, count, eq, and } from 'drizzle-orm'
import { TeamsManager } from './teams-manager'

export default async function TeamsPage() {
  const user = await requireRole('admin')

  const [teamRows, memberCounts] = await Promise.all([
    db
      .select({ id: teams.id, name: teams.name, isActive: teams.isActive })
      .from(teams)
      .where(eq(teams.tenantId, user.tenantId))
      .orderBy(asc(teams.name)),
    db
      .select({ teamId: users.teamId, members: count() })
      .from(users)
      .where(and(eq(users.tenantId, user.tenantId), eq(users.isActive, true)))
      .groupBy(users.teamId),
  ])

  const membersByTeam = new Map(memberCounts.map((m) => [m.teamId, m.members]))

  return (
    <div className="p-6 w-full max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Teams</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Teams group employees on the Stats Board. Assign people to a team from their user page.
          Moving someone keeps their past results with the team they earned them in.
        </p>
      </div>

      <TeamsManager
        teams={teamRows.map((t) => ({ ...t, members: membersByTeam.get(t.id) ?? 0 }))}
        unassigned={membersByTeam.get(null) ?? 0}
      />
    </div>
  )
}
