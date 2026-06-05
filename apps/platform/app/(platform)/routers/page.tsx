import { requireUser } from '@roaring/auth/server'
import RoutersForm from './routers-form'

export default async function RoutersPage() {
  const user = await requireUser()
  return <RoutersForm />
}
