'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { UserNav } from '@/components/user-nav'
import type { AuthUser, UserRole } from '@roaring/auth'
import {
  House,
  Users,
  FileChartLine,
  PanelBottomOpen,
  SquareX,
  Package,
  Target,
  ChartColumn,
  UserRoundPen,
  FilePlusCorner,
  Router,
  TriangleAlert,
} from 'lucide-react'

// Nav items with role requirements
const navItems = [
  {
    label: 'Operations',
    items: [
      {
        title: 'Home',
        href: '/home',
        icon: House,
        roles: ['agent', 'team_leader', 'manager', 'director', 'admin'],
        active: true,
      },
      {
        title: 'Customers',
        href: '/customers',
        icon: Users,
        roles: ['agent', 'team_leader', 'manager', 'director', 'admin'],
        active: true,
      },
      {
        title: 'Provisioning',
        href: '/provisioning',
        icon: PanelBottomOpen,
        roles: ['agent', 'team_leader', 'manager', 'director', 'admin'],
        active: true,
      },
      {
        title: 'Complaints',
        href: '/complaints',
        icon: SquareX,
        roles: ['agent', 'team_leader', 'manager', 'director', 'admin'],
        active: false,
      },
      {
        title: 'Tech',
        href: '/tech',
        icon: Package,
        roles: ['agent', 'team_leader', 'manager', 'director', 'admin'],
        active: false,
      },
      {
        title: 'Routers',
        href: '/routers',
        icon: Router,
        roles: ['agent', 'team_leader', 'manager', 'director', 'admin'],
        active: true,
      },
      {
        title: 'Faults',
        href: '/faults',
        icon: TriangleAlert,
        roles: ['agent', 'team_leader', 'manager', 'director', 'admin'],
        active: true,
      },
    ],
  },
  {
    label: 'Sales',
    items: [
      {
        title: 'Deal Sheet',
        href: '/deal-sheet',
        icon: FilePlusCorner,
        roles: ['team_leader', 'manager', 'director', 'admin'],
        active: true,
      },
      {
        title: 'Deals',
        href: '/deals',
        icon: FileChartLine,
        roles: ['manager', 'director', 'admin'],
        active: true,
      },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      {
        title: 'Targets',
        href: '/targets',
        icon: Target,
        roles: ['team_leader', 'manager', 'director', 'admin'],
        active: false,
      },
      {
        title: 'Analytics',
        href: '/analytics',
        icon: ChartColumn,
        roles: ['manager', 'director', 'admin'],
        active: false,
      },
    ],
  },
  {
    label: 'Admin',
    items: [{ title: 'Users', href: '/users', icon: UserRoundPen, roles: ['admin'], active: true }],
  },
]

function hasAccess(roles: string[], userRole: UserRole) {
  return roles.includes(userRole)
}

export function AppSidebar({ user }: { user: AuthUser }) {
  const pathname = usePathname()

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <div className="px-2 py-2">
          <p className="text-sm font-semibold">Roaring Success</p>
          <p className="text-xs text-muted-foreground capitalize">{user.role.replace('_', ' ')}</p>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {navItems.map((group) => {
          const visibleItems = group.items.filter((item) => hasAccess(item.roles, user.role))

          if (visibleItems.length === 0) return null

          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarMenu>
                {visibleItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    {item.active ? (
                      <Link href={item.href}>
                        <SidebarMenuButton
                          isActive={pathname === item.href}
                          className="cursor-pointer"
                        >
                          <item.icon className="size-4" />
                          {item.title}
                        </SidebarMenuButton>
                      </Link>
                    ) : (
                      <SidebarMenuButton disabled className="opacity-40 cursor-not-allowed">
                        <item.icon className="size-4" />
                        {item.title}
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          )
        })}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <UserNav user={user} />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
