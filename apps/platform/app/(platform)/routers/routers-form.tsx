'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, Router, Wifi, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'

type RouterType = 'no_sip' | 'sip'

function ConfirmDialog({
  onConfirm,
  onCancel,
  details,
}: {
  onConfirm: () => void
  onCancel: () => void
  details: Record<string, string>
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-yellow-100 shrink-0">
              <AlertTriangle className="size-5 text-yellow-600" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Confirm router order</h2>
              <p className="text-sm text-muted-foreground mt-1">
                This will order a router instantly. Ensure all details are correct before
                proceeding.
              </p>
            </div>
          </div>

          <div className="rounded-md bg-muted/50 border divide-y text-sm">
            {Object.entries(details).map(([key, value]) => (
              <div key={key} className="flex px-3 py-2 gap-4">
                <span className="text-muted-foreground w-32 shrink-0">{key}</span>
                <span className="font-mono font-medium">{value}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={onConfirm}>Proceed</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function RoutersPage() {
  const [routerType, setRouterType] = useState<RouterType>('no_sip')
  const [accountNumber, setAccountNumber] = useState('')
  const [sipUsername, setSipUsername] = useState('')
  const [sipPassword, setSipPassword] = useState('')
  const [domainName, setDomainName] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [ordering, setOrdering] = useState(false)
  const [ordered, setOrdered] = useState(false)
  const [errors, setErrors] = useState<Record<string, boolean>>({})

  function validate() {
    const e: Record<string, boolean> = {}
    if (!accountNumber.trim()) e.accountNumber = true
    if (routerType === 'sip') {
      if (!sipUsername.trim()) e.sipUsername = true
      if (!sipPassword.trim()) e.sipPassword = true
      if (!domainName.trim()) e.domainName = true
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleOrderClick() {
    if (!validate()) return
    setShowConfirm(true)
  }

  async function handleConfirm() {
    setOrdering(true)
    setShowConfirm(false)
    // TODO: wire to actual order action
    await new Promise((r) => setTimeout(r, 1000))
    setOrdering(false)
    setOrdered(true)
  }

  function reset() {
    setAccountNumber('')
    setSipUsername('')
    setSipPassword('')
    setDomainName('')
    setErrors({})
    setOrdered(false)
  }

  const confirmDetails: Record<string, string> = {
    'Router type': routerType === 'sip' ? 'SIP' : 'No SIP',
    'Account number': accountNumber,
    ...(routerType === 'sip' && {
      'SIP username': sipUsername,
      'SIP password': sipPassword,
      'Domain name': domainName,
    }),
  }

  return (
    <div className="p-6 max-w-xl">
      {showConfirm && (
        <ConfirmDialog
          details={confirmDetails}
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Routers</h1>
          <p className="text-sm text-muted-foreground mt-1">Order a router for a customer</p>
        </div>
      </div>

      {ordered ? (
        <Card>
          <CardContent className="pt-6 text-center space-y-3">
            <div className="flex justify-center">
              <div className="p-3 rounded-full bg-green-100">
                <Router className="size-6 text-green-600" />
              </div>
            </div>
            <p className="font-semibold">Router ordered successfully</p>
            <p className="text-sm text-muted-foreground">
              Order placed for account {accountNumber}
            </p>
            <Button variant="outline" onClick={reset}>
              Order another
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Router type toggle */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setRouterType('no_sip')}
              className={cn(
                'flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left',
                routerType === 'no_sip'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/40'
              )}
            >
              <WifiOff
                className={cn(
                  'size-5 shrink-0',
                  routerType === 'no_sip' ? 'text-primary' : 'text-muted-foreground'
                )}
              />
              <div>
                <p
                  className={cn(
                    'text-sm font-semibold',
                    routerType === 'no_sip' ? 'text-primary' : ''
                  )}
                >
                  No SIP
                </p>
                <p className="text-xs text-muted-foreground">Standard router</p>
              </div>
            </button>
            <button
              onClick={() => setRouterType('sip')}
              className={cn(
                'flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left',
                routerType === 'sip'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/40'
              )}
            >
              <Wifi
                className={cn(
                  'size-5 shrink-0',
                  routerType === 'sip' ? 'text-primary' : 'text-muted-foreground'
                )}
              />
              <div>
                <p
                  className={cn(
                    'text-sm font-semibold',
                    routerType === 'sip' ? 'text-primary' : ''
                  )}
                >
                  SIP
                </p>
                <p className="text-xs text-muted-foreground">With SIP credentials</p>
              </div>
            </button>
          </div>

          {/* Form */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label
                  className={cn(
                    'text-sm font-semibold',
                    errors.accountNumber && 'text-destructive'
                  )}
                >
                  Account number
                  {errors.accountNumber && (
                    <span className="text-xs font-normal ml-2 text-destructive">Required</span>
                  )}
                </Label>
                <Input
                  value={accountNumber}
                  onChange={(e) => {
                    setAccountNumber(e.target.value)
                    setErrors((prev) => {
                      const n = { ...prev }
                      delete n.accountNumber
                      return n
                    })
                  }}
                  placeholder="e.g. DFB11143"
                  className={cn('font-mono', errors.accountNumber && 'border-destructive')}
                />
              </div>

              {routerType === 'sip' && (
                <>
                  <div className="space-y-2">
                    <Label
                      className={cn(
                        'text-sm font-semibold',
                        errors.sipUsername && 'text-destructive'
                      )}
                    >
                      SIP username
                      {errors.sipUsername && (
                        <span className="text-xs font-normal ml-2 text-destructive">Required</span>
                      )}
                    </Label>
                    <Input
                      value={sipUsername}
                      onChange={(e) => {
                        setSipUsername(e.target.value)
                        setErrors((prev) => {
                          const n = { ...prev }
                          delete n.sipUsername
                          return n
                        })
                      }}
                      placeholder="e.g. 01213456789"
                      className={cn(errors.sipUsername && 'border-destructive')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      className={cn(
                        'text-sm font-semibold',
                        errors.sipPassword && 'text-destructive'
                      )}
                    >
                      SIP password
                      {errors.sipPassword && (
                        <span className="text-xs font-normal ml-2 text-destructive">Required</span>
                      )}
                    </Label>
                    <Input
                      value={sipPassword}
                      onChange={(e) => {
                        setSipPassword(e.target.value)
                        setErrors((prev) => {
                          const n = { ...prev }
                          delete n.sipPassword
                          return n
                        })
                      }}
                      placeholder="SIP password"
                      className={cn(errors.sipPassword && 'border-destructive')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      className={cn(
                        'text-sm font-semibold',
                        errors.domainName && 'text-destructive'
                      )}
                    >
                      Domain name
                      {errors.domainName && (
                        <span className="text-xs font-normal ml-2 text-destructive">Required</span>
                      )}
                    </Label>
                    <Input
                      value={domainName}
                      onChange={(e) => {
                        setDomainName(e.target.value)
                        setErrors((prev) => {
                          const n = { ...prev }
                          delete n.domainName
                          return n
                        })
                      }}
                      placeholder="e.g. sip.giacom.com"
                      className={cn(errors.domainName && 'border-destructive')}
                    />
                  </div>
                </>
              )}

              <Button className="w-full" onClick={handleOrderClick} disabled={ordering}>
                {ordering ? 'Ordering...' : 'Order router'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
