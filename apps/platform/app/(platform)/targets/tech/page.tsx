import { requireUser } from '@roaring/auth/server'
import { TechTargetsClient } from './targets-client'

export default async function TechTargetsPage() {
  const user = await requireUser()
  return <TechTargetsClient userId={user.id} />
}
