import { createFileRoute, Outlet, Navigate } from '@tanstack/react-router'
import { useAuth } from '@clerk/clerk-react'
import { useEffect } from 'react'
import { useUserStore } from '#/stores/useUserStore'

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

  if (!isLoaded) return null

  if (!isSignedIn) {
    return <Navigate to="/" />
  }

  return (
    <>
      {user.trial_expired && <TrialExpiredBanner />}
      <Outlet />
    </>
  )
}
