import { ResetPasswordForm } from './reset-password-form'
import { APP } from '@/lib/config'

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">{APP.name}</h1>
          <p className="text-sm text-muted-foreground mt-2">Reset your password</p>
        </div>
        <ResetPasswordForm />
      </div>
    </div>
  )
}
