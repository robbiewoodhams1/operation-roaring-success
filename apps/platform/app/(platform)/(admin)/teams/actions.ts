'use server'

import { db, teams } from '@roaring/db'
import { and, eq, ne, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { requireRole, setAuditUser } from '@roaring/auth'

export type TeamActionResult = { error: string | null }

function cleanName(name: string): string | null {
  const trimmed = name.trim().replace(/\s+/g, ' ')
  return trimmed.length >= 1 && trimmed.length <= 80 ? trimmed : null
}

async function nameTaken(tenantId: string, name: string, exceptId?: string) {
  const [row] = await db
    .select({ id: teams.id })
    .from(teams)
    .where(
      and(
        eq(teams.tenantId, tenantId),
        sql`lower(${teams.name}) = lower(${name})`,
        exceptId ? ne(teams.id, exceptId) : undefined
      )
    )
    .limit(1)
  return !!row
}

export async function createTeam(name: string): Promise<TeamActionResult> {
  const user = await requireRole('admin')
  const clean = cleanName(name)
  if (!clean) return { error: 'Team names must be 1–80 characters.' }
  if (await nameTaken(user.tenantId, clean))
    return { error: 'A team with that name already exists.' }

  await db.transaction(async (tx) => {
    await setAuditUser(tx, user.id)
    await tx.insert(teams).values({ tenantId: user.tenantId, name: clean })
  })
  revalidatePath('/teams')
  return { error: null }
}

export async function renameTeam(id: string, name: string): Promise<TeamActionResult> {
  const user = await requireRole('admin')
  const clean = cleanName(name)
  if (!clean) return { error: 'Team names must be 1–80 characters.' }
  if (await nameTaken(user.tenantId, clean, id))
    return { error: 'A team with that name already exists.' }

  await db.transaction(async (tx) => {
    await setAuditUser(tx, user.id)
    await tx
      .update(teams)
      .set({ name: clean, updatedAt: new Date() })
      .where(and(eq(teams.id, id), eq(teams.tenantId, user.tenantId)))
  })
  revalidatePath('/teams')
  revalidatePath('/stats')
  return { error: null }
}

/**
 * Retiring a team hides it from new assignments; its history and current
 * members are untouched (teams are never deleted, so past results keep a home).
 */
export async function setTeamActive(id: string, isActive: boolean): Promise<TeamActionResult> {
  const user = await requireRole('admin')
  await db.transaction(async (tx) => {
    await setAuditUser(tx, user.id)
    await tx
      .update(teams)
      .set({ isActive, updatedAt: new Date() })
      .where(and(eq(teams.id, id), eq(teams.tenantId, user.tenantId)))
  })
  revalidatePath('/teams')
  return { error: null }
}
