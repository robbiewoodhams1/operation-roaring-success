import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShieldAlert } from 'lucide-react'

export default function UnauthorisedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md px-4">
        <Card>
          <ShieldAlert className="mx-auto my-3 text-red-500" size={48} />
          <CardHeader>
            <CardTitle>Access denied</CardTitle>
            <CardDescription>
              You don&apos;t have permission to access this page. Contact your administrator if you
              think this is a mistake.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/home">
              <Button variant="outline" className="w-full cursor-pointer">
                Back to dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
