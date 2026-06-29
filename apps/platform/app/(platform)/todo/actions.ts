'use server'

import { db, todos, todoComments } from '@roaring/db'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { requireUser, setAuditUser } from '@roaring/auth'

export async function createTodo(data: {
  title: string
  description: string | null
  priority: string
  assignedTo: string
  linkType: string | null
  linkId: string | null
  linkLabel: string | null
}) {
  const user = await requireUser()

  await db.transaction(async (tx) => {
    await setAuditUser(tx, user.id)
    await tx.insert(todos).values({
      tenantId: user.tenantId,
      assignedTo: data.assignedTo,
      assignedBy: data.assignedTo === user.id ? null : user.id,
      title: data.title,
      description: data.description || null,
      priority: data.priority as any,
      status: 'not_started',
      linkType: (data.linkType || null) as any,
      linkId: data.linkId || null,
      linkLabel: data.linkLabel || null,
      createdBy: user.id,
    })
  })

  revalidatePath('/todo')
  revalidatePath('/home')
}

export async function updateTodoStatus(id: string, status: string) {
  const user = await requireUser()

  await db.transaction(async (tx) => {
    await setAuditUser(tx, user.id)
    await tx
      .update(todos)
      .set({
        status: status as any,
        updatedAt: new Date(),
      })
      .where(eq(todos.id, id))
  })

  revalidatePath('/todo')
  revalidatePath(`/todo/${id}`)
}

export async function deleteTodo(id: string) {
  const user = await requireUser()

  await db.transaction(async (tx) => {
    await setAuditUser(tx, user.id)
    await tx.delete(todos).where(eq(todos.id, id))
  })

  revalidatePath('/todo')
}

export async function addTodoComment(todoId: string, body: string) {
  const user = await requireUser()

  await db.transaction(async (tx) => {
    await setAuditUser(tx, user.id)
    await tx.insert(todoComments).values({
      todoId,
      authorId: user.id,
      body,
    })
  })

  revalidatePath(`/todo/${todoId}`)
}

export async function deleteTodoComment(id: string, todoId: string) {
  const user = await requireUser()

  await db.transaction(async (tx) => {
    await setAuditUser(tx, user.id)
    await tx.delete(todoComments).where(eq(todoComments.id, id))
  })

  revalidatePath(`/todo/${todoId}`)
}
