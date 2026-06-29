import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

const helpNav = [
  {
    group: 'General',
    items: [{ title: 'Overview', href: '/help' }],
  },
  {
    group: 'Operations',
    items: [
      { title: 'Home', href: '/help/home' },
      { title: 'Customers', href: '/help/customers' },
      { title: 'Provisioning', href: '/help/provisioning' },
      { title: 'Complaints', href: '/help/complaints' },
      { title: 'Faults', href: '/help/faults' },
      { title: 'Routers', href: '/help/routers' },
      { title: 'Transfers & Ceases', href: '/help/transfers-ceases' },
      { title: 'Debt', href: '/help/debt' },
    ],
  },
  {
    group: 'Sales',
    items: [
      { title: 'Deal Sheet', href: '/help/deal-sheet' },
      { title: 'Deals', href: '/help/deals' },
    ],
  },
  {
    group: 'Tools',
    items: [
      { title: 'Search', href: '/help/search' },
      { title: 'To Do', href: '/help/todo' },
      { title: 'Targets', href: '/help/targets' },
      { title: 'Stats', href: '/help/stats' },
    ],
  },
  {
    group: 'Account',
    items: [
      { title: 'Account', href: '/help/account' },
      { title: 'FAQs', href: '/help/faqs' },
    ],
  },
]

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r p-4 space-y-4">
        {helpNav.map((section) => (
          <div key={section.group}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 px-2">
              {section.group}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted transition-colors"
                >
                  <ChevronRight className="size-3 text-muted-foreground" />
                  {item.title}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </aside>

      {/* Content */}
      <main className="flex-1 p-8 max-w-3xl">
        <article className="prose prose-sm dark:prose-invert max-w-none">{children}</article>
      </main>
    </div>
  )
}
