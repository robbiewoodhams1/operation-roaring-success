import { requireUser } from '@roaring/auth/server'
import { AppSidebar } from '@/components/app-sidebar'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <SidebarTrigger className="absolute top-3 left-3 z-10" />
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
