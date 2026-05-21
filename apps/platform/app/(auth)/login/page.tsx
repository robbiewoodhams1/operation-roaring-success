import { redirect } from 'next/navigation'
import { getUser } from '@roaring/auth/server'
import { LoginForm } from './login-form'

export default async function LoginPage() {
  const user = await getUser()
  if (user) redirect('/dashboard')

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Roaring Success</h1>
          <p className="text-sm text-muted-foreground mt-2">Sign in to your account</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
