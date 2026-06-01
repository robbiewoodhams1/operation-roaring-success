'use client'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronsUpDown, LogOut, UserRound } from 'lucide-react'
import { signOut } from '@roaring/auth/client'
import type { AuthUser } from '@roaring/auth'
import Link from 'next/link'

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export function UserNav({ user }: { user: AuthUser }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground outline-none">
        <Avatar className="h-8 w-8 rounded-lg">
          <AvatarFallback className="rounded-lg text-xs">
            {getInitials(user.fullName)}
          </AvatarFallback>
        </Avatar>
        <div className="grid flex-1 text-left text-sm leading-tight">
          <span className="truncate font-semibold">{user.fullName}</span>
          <span className="truncate text-xs text-muted-foreground">{user.email}</span>
        </div>
        <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent side="top" align="end" sideOffset={4} className="w-64">
        {/* User info header */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-2 px-2 py-2">
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarFallback className="rounded-lg text-xs">
                  {getInitials(user.fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{user.fullName}</span>
                <span className="truncate text-xs text-muted-foreground">{user.email}</span>
              </div>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Account */}
        <DropdownMenuGroup>
          <Link href="/account">
            <DropdownMenuItem className="cursor-pointer gap-2">
              <UserRound className="size-4" />
              Account
            </DropdownMenuItem>
          </Link>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Sign out */}
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="cursor-pointer gap-2"
            onClick={async () => {
              await signOut()
              window.location.href = '/login'
            }}
          >
            <LogOut className="size-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
