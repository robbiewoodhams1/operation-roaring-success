'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Mail, Check } from 'lucide-react'

export function ResendInviteButton({
  email,
  onResend,
}: {
  email: string
  onResend: (email: string) => Promise<{ success: boolean; error: string | null }>
}) {
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  async function handleResend() {
    setSending(true)
    await onResend(email)
    setSending(false)
    setSent(true)
    setTimeout(() => setSent(false), 3000)
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleResend}
      disabled={sending || sent}
      className="gap-2"
    >
      {sent ? (
        <>
          <Check className="size-3.5 text-green-600" />
          Invite sent
        </>
      ) : (
        <>
          <Mail className="size-3.5" />
          {sending ? 'Sending...' : 'Resend invite'}
        </>
      )}
    </Button>
  )
}
