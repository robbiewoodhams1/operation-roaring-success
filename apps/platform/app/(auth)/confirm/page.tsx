'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { setPasswordAndActivate } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'

export default function ConfirmPage() {
  const router = useRouter()
  const accessTokenRef = useRef<string | null>(null)
  const refreshTokenRef = useRef<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const hash = window.location.hash
    const params = new URLSearchParams(hash.slice(1))
    const token = params.get('access_token')
    const refresh = params.get('refresh_token')
    const type = params.get('type')

    if (!token || type !== 'invite') {
      router.push('/login?error=invalid-link')
      return
    }

    accessTokenRef.current = token
    refreshTokenRef.current = refresh
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true)
  }, [router])

  async function handleSubmit(e: React.SyntheticEvent) {
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

    if (!accessTokenRef.current || !refreshTokenRef.current) {
      setError('Invalid invite link')
      return
    }

    setLoading(true)

    const { error } = await setPasswordAndActivate({
      password,
      accessToken: accessTokenRef.current,
      refreshToken: refreshTokenRef.current,
    })

    if (error) {
      setError(error)
      setLoading(false)
      return
    }

    window.location.href = '/login?activated=true'
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Setting up your account...</p>
      </div>
    )
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
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Spinner /> : 'Set password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
