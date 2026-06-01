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
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'
import { ChevronsUpDown, LogOut, UserRound, Sun, Moon, Monitor } from 'lucide-react'
import { signOut } from '@roaring/auth/client'
import { useTheme } from 'next-themes'
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
  const { theme, setTheme } = useTheme()

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor

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

        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer gap-2">
              <ThemeIcon className="size-4" />
              Theme
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => setTheme('light')} className="cursor-pointer gap-2">
                <Sun className="size-4" />
                Light
                {theme === 'light' && (
                  <span className="ml-auto text-xs text-muted-foreground">✓</span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('dark')} className="cursor-pointer gap-2">
                <Moon className="size-4" />
                Dark
                {theme === 'dark' && (
                  <span className="ml-auto text-xs text-muted-foreground">✓</span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('system')} className="cursor-pointer gap-2">
                <Monitor className="size-4" />
                System
                {theme === 'system' && (
                  <span className="ml-auto text-xs text-muted-foreground">✓</span>
                )}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuGroup>

        <DropdownMenuGroup>
          <Link href="/account">
            <DropdownMenuItem className="cursor-pointer gap-2">
              <UserRound className="size-4" />
              Account
            </DropdownMenuItem>
          </Link>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

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
