'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { setPasswordAndActivate } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function ConfirmPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState<string | null>(null)

  useEffect(() => {
    // Extract tokens from URL fragment
    const hash = window.location.hash
    const params = new URLSearchParams(hash.slice(1))
    const token = params.get('access_token')
    const refresh = params.get('refresh_token')
    const type = params.get('type')

    if (!token || type !== 'invite') {
      router.push('/login?error=invalid-link')
      return
    }

    setAccessToken(token)
    setRefreshToken(refresh)
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (!accessToken || !refreshToken) {
      setError('Invalid invite link')
      return
    }

    setLoading(true)

    const { error } = await setPasswordAndActivate({
      password,
      accessToken,
      refreshToken,
    })

    if (error) {
      setError(error)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Roaring Success</h1>
          <p className="text-sm text-muted-foreground mt-2">Set up your account</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Create your password</CardTitle>
            <CardDescription>Choose a password to complete your account setup</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading || !accessToken}>
                {loading ? 'Setting up account...' : 'Set password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
