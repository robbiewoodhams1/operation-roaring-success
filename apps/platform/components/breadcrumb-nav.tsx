'use client'

import { usePathname } from 'next/navigation'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import React from 'react'

const routeLabels: Record<string, string> = {
  dashboard: 'Home',
  customers: 'Customers',
  deals: 'Deals',
  provisioning: 'Provisioning',
  complaints: 'Complaints',
  tech: 'Tech',
  targets: 'Targets',
  analytics: 'Analytics',
  users: 'Users',
  admin: 'Admin',
  new: 'New',
}

function getLabel(segment: string): string {
  // If it looks like a UUID or ID, return it shortened
  if (segment.match(/^[0-9a-f-]{36}$/)) {
    return segment.slice(0, 8) + '...'
  }
  return routeLabels[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1)
}

export function BreadcrumbNav() {
  const pathname = usePathname()

  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 0) return null

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1
          const href = '/' + segments.slice(0, index + 1).join('/')
          const label = getLabel(segment)

          return (
            <React.Fragment key={href}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={href}>{label}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
