import { Link } from '@tanstack/react-router'
import { useAuth, useUser, useClerk } from '@clerk/clerk-react'
import { LayoutDashboard, SlidersHorizontal, Settings, LogOut } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/preferences', label: 'Preferences', icon: SlidersHorizontal },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const

export default function Sidebar() {
  const { isSignedIn } = useAuth()
  const { user } = useUser()
  const { openUserProfile, signOut } = useClerk()

  if (!isSignedIn) return null

  return (
    <aside className="sticky top-14 flex h-[calc(100vh-3.5rem)] w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <nav className="flex flex-col gap-0.5 p-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to as string}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            activeProps={{
              className: 'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium bg-sidebar-accent text-sidebar-accent-foreground',
            }}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto border-t border-sidebar-border p-3 flex flex-col gap-0.5">
        <button
          type="button"
          onClick={() => openUserProfile()}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-sidebar-accent"
        >
          <img
            src={user?.imageUrl}
            alt={user?.fullName ?? ''}
            className="size-6 shrink-0 rounded-full"
          />
          <span className="truncate text-sm font-medium text-sidebar-foreground/70">
            {user?.fullName ?? user?.primaryEmailAddress?.emailAddress}
          </span>
        </button>
        <button
          type="button"
          onClick={() => signOut()}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-destructive"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
