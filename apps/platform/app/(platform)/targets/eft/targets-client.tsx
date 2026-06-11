'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Users, User } from 'lucide-react'

type ViewMode = 'team' | 'individual'

export function ETFTargetsClient({ userId }: { userId: string }) {
  const [view, setView] = useState<ViewMode>('team')

  return (
    <div className="p-6 w-full space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">ETF Targets</h1>
        <div className="flex items-center gap-1 border rounded-lg p-1">
          <Button
            variant={view === 'team' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('team')}
            className="gap-2"
          >
            <Users className="size-3.5" />
            Team
          </Button>
          <Button
            variant={view === 'individual' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('individual')}
            className="gap-2"
          >
            <User className="size-3.5" />
            Individual
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 text-center py-16">
          <p className="text-2xl font-semibold text-muted-foreground/30">ETF Targets</p>
          <p className="text-sm text-muted-foreground mt-2">
            {view === 'team' ? 'Team ETF targets coming soon' : 'Your ETF targets coming soon'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
