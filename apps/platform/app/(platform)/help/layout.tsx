import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

const helpNav = [
  { title: 'Overview', href: '/help' },
  { title: 'Customers', href: '/help/customers' },
  { title: 'Deals', href: '/help/deals' },
  { title: 'Provisioning', href: '/help/provisioning' },
  { title: 'Targets', href: '/help/targets' },
  { title: 'FAQs', href: '/help/faqs' },
]

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r p-4 space-y-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-2">
          Help
        </p>
        {helpNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted transition-colors"
          >
            <ChevronRight className="size-3 text-muted-foreground" />
            {item.title}
          </Link>
        ))}
      </aside>

      {/* Content */}
      <main className="flex-1 p-8 max-w-3xl">
        <article className="prose prose-sm dark:prose-invert max-w-none">{children}</article>
      </main>
    </div>
  )
}
