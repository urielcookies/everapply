import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useAuth } from '@clerk/clerk-react'
import { useEffect } from 'react'
import { useUserStore } from '#/stores/useUserStore'
import { Skeleton } from '#/components/ui/skeleton'

function TrialExpiredBanner() {
  return (
    <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2.5 text-center text-xs font-medium text-destructive">
      Your free trial has ended — new matches and ATS resume generation are paused.
    </div>
  )
}

export const Route = createFileRoute('/_authenticated')({
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const { isSignedIn, isLoaded, getToken } = useAuth()
  const { isFetched, isLoading, fetchUser, user } = useUserStore()

  useEffect(() => {
    if (isLoaded && isSignedIn && !isFetched && !isLoading) {
      fetchUser(getToken)
    }
  }, [isLoaded, isSignedIn])

  if (!isLoaded || (isSignedIn && !isFetched)) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12">
        <Skeleton className="mb-8 h-8 w-48" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </main>
    )
  }

  if (!isSignedIn) {
    throw redirect({ to: '/' })
  }

  return (
    <>
      {user.trial_expired && <TrialExpiredBanner />}
      <Outlet />
    </>
  )
}
