import { requireUser } from '@roaring/auth/server'
import { SalesTargetsClient } from './targets-client'

export default async function SalesTargetsPage() {
  const user = await requireUser()
  return <SalesTargetsClient userId={user.id} />
}
