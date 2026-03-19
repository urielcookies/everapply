import { type ReactNode, Suspense } from 'react'
import { useAuth, RedirectToSignIn } from '@clerk/clerk-react'
import { Skeleton } from '#/components/ui/skeleton'

interface ContainerProps {
  title: string
  requireAuth?: boolean
  children?: ReactNode
}

export default function Container({ title, requireAuth, children }: ContainerProps) {
  const { isSignedIn, isLoaded } = useAuth()

  if (requireAuth && !isSignedIn) {
    return <RedirectToSignIn />
  }

  const skeleton = (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <Skeleton className="mb-8 h-8 w-48" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </main>
  )

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="mb-8 text-2xl font-bold tracking-tight text-foreground">
        {title}
      </h1>
      <Suspense fallback={skeleton}>
        {children}
      </Suspense>
    </main>
  )
}
