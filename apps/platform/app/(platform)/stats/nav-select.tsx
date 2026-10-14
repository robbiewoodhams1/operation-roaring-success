'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useTransition } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/** A select whose value lives in the URL, so it survives switching views. */
export function NavSelect({
  param,
  value,
  options,
  label,
}: {
  param: string
  value: string
  options: { value: string; label: string }[]
  label: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()

  return (
    <Select
      value={value}
      items={options}
      onValueChange={(v) => {
        if (!v) return
        const next = new URLSearchParams(params)
        next.set(param, v as string)
        startTransition(() => router.push(`${pathname}?${next.toString()}`))
      }}
    >
      <SelectTrigger
        className="h-9 w-full sm:w-60"
        aria-label={label}
        data-pending={pending || undefined}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
