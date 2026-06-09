import { redirect } from 'next/navigation'
import { getUser } from '@roaring/auth/server'
import { LoginForm } from './login-form'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const user = await getUser()
  if (user) redirect('/home')

  const params = await searchParams
  const activated = params['activated'] === 'true'
  const suspended = params['suspended'] === 'true'

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Roaring Success</h1>
          <p className="text-sm text-muted-foreground mt-2">Sign in to your account</p>
        </div>
        {activated && (
          <p className="text-sm text-center text-green-600 mb-4">
            Account set up successfully — sign in to continue
          </p>
        )}
        {suspended && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-md px-4 py-3 mb-4">
            Your account has been suspended. Please contact your administrator.
          </div>
        )}
        <LoginForm />
      </div>
    </div>
  )
}
