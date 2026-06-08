import { requireUser } from '@roaring/auth/server'
import { ETFTargetsClient } from './targets-client'

export default async function ETFTargetsPage() {
  const user = await requireUser()
  return <ETFTargetsClient userId={user.id} />
}
