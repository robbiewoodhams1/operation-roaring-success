import { requireUser } from '@roaring/auth/server'
import { DebtTargetsClient } from './targets-client'

export default async function DebtTargetsPage() {
  const user = await requireUser()
  return <DebtTargetsClient userId={user.id} />
}
