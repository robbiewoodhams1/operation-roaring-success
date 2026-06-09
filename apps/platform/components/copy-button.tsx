'use client'

import { Copy, Check } from 'lucide-react'
import { useState } from 'react'

export default function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="ml-1.5 text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? <Check className="size-3 text-green-600" /> : <Copy className="size-3" />}
    </button>
  )
}
