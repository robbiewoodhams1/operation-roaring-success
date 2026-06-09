'use server'

import { db, customers } from '@roaring/db'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { requireUser, setAuditUser } from '@roaring/auth'

export async function updateCustomer(
  id: string,
  data: {
    companyName: string | null
    firstName: string
    lastName: string
    mobile: string | null
    landline: string | null
    email: string | null
    addressLine1: string | null
    addressLine2: string | null
    addressLine3: string | null
    addressLine4: string | null
    postcode: string | null
    type: string
    status: string
  }
) {
  const user = await requireUser()

  await db.transaction(async (tx) => {
    await setAuditUser(tx, user.id)

    await tx
      .update(customers)
      .set({
        companyName: data.companyName || null,
        firstName: data.firstName,
        lastName: data.lastName,
        mobile: data.mobile || null,
        landline: data.landline || null,
        email: data.email || null,
        addressLine1: data.addressLine1 || null,
        addressLine2: data.addressLine2 || null,
        addressLine3: data.addressLine3 || null,
        addressLine4: data.addressLine4 || null,
        postcode: data.postcode || null,
        type: data.type as any,
        status: data.status as any,
      })
      .where(eq(customers.id, id))
  })

  revalidatePath('/customers')
}
