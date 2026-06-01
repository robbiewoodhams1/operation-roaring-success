import { requireUser } from '@roaring/auth/server'
import { AppSidebar } from '@/components/app-sidebar'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { BreadcrumbNav } from '@/components/breadcrumb-nav'

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="flex flex-row gap-3 p-3 items-center">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <BreadcrumbNav />
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
