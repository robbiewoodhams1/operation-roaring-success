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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
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
  Search,
  ChevronRight,
  CircleHelp,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type NavChild = {
  title: string
  href: string
  active?: boolean
}

type NavItem = {
  title: string
  href?: string
  icon: React.ElementType
  roles: string[]
  active: boolean
  children?: NavChild[]
}

type NavGroup = {
  label: string
  items: NavItem[]
}

const navItems: NavGroup[] = [
  {
    label: 'Operations',
    items: [
      {
        title: 'Home',
        href: '/home',
        icon: House,
        roles: ['sales', 'agent', 'team_leader', 'manager', 'director', 'admin'],
        active: true,
      },
      {
        title: 'Customers',
        href: '/customers',
        icon: Users,
        roles: ['sales', 'agent', 'team_leader', 'manager', 'director', 'admin'],
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
        roles: ['sales', 'agent', 'team_leader', 'manager', 'director', 'admin'],
        active: true,
      },
      {
        title: 'Deals',
        href: '/deals',
        icon: FileChartLine,
        roles: ['sales', 'agent', 'team_leader', 'manager', 'director', 'admin'],
        active: true,
      },
    ],
  },
  {
    label: 'Tools',
    items: [
      {
        title: 'Search',
        href: '/search',
        icon: Search,
        roles: ['sales', 'agent', 'team_leader', 'manager', 'director', 'admin'],
        active: true,
      },
      {
        title: 'Stats',
        href: '/stats',
        icon: FileChartLine,
        roles: ['sales', 'agent', 'team_leader', 'manager', 'director', 'admin'],
        active: true,
      },
      {
        title: 'Targets',
        icon: Target,
        roles: ['sales', 'agent', 'team_leader', 'manager', 'director', 'admin'],
        active: true,
        children: [
          { title: 'Provisioning', href: '/targets/provisioning', active: true },
          { title: 'Sales', href: '/targets/sales', active: true },
        ],
      },
      {
        title: 'Help',
        href: '/help',
        icon: CircleHelp,
        roles: ['sales', 'agent', 'team_leader', 'manager', 'director', 'admin'],
        active: true,
      },
    ],
  },
  {
    label: 'Intelligence',
    items: [
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
                {visibleItems.map((item) => {
                  // Item with children — collapsible
                  if (item.children) {
                    const isAnyChildActive = item.children.some((c) => pathname.startsWith(c.href))
                    return (
                      <Collapsible
                        key={item.title}
                        defaultOpen={isAnyChildActive}
                        className="group/collapsible"
                      >
                        <SidebarMenuItem>
                          <CollapsibleTrigger className="w-full">
                            <div
                              className={cn(
                                'peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md px-2 py-1.5 text-sm outline-none cursor-pointer hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors',
                                isAnyChildActive &&
                                  'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <item.icon className="size-4 shrink-0" />
                                <span className="flex-1 truncate">{item.title}</span>
                              </div>
                              <ChevronRight className="ml-auto size-3.5 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {item.children.map((child) => (
                                <SidebarMenuSubItem key={child.href}>
                                  {child.active !== false ? (
                                    <SidebarMenuSubButton
                                      isActive={pathname === child.href}
                                      className="w-full"
                                      href={child.href}
                                    >
                                      {child.title}
                                    </SidebarMenuSubButton>
                                  ) : (
                                    <SidebarMenuSubButton className="opacity-40 cursor-not-allowed w-full pointer-events-none">
                                      {child.title}
                                    </SidebarMenuSubButton>
                                  )}
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    )
                  }

                  // Regular item
                  return (
                    <SidebarMenuItem key={item.href}>
                      {item.active ? (
                        <Link href={item.href!}>
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
                  )
                })}
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
