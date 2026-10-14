import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="p-4 sm:p-6 space-y-6 w-full max-w-7xl" aria-busy aria-label="Loading stats">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <Skeleton className="h-9 w-80 max-w-full" />
        <Skeleton className="h-9 w-56" />
      </div>
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <Skeleton className="h-64 rounded-xl lg:col-span-3" />
        <Skeleton className="h-64 rounded-xl lg:col-span-2" />
      </div>
    </div>
  )
}
