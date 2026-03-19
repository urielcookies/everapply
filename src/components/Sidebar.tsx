import { Link } from '@tanstack/react-router'
import { useAuth, useUser, useClerk } from '@clerk/clerk-react'
import { dark } from '@clerk/themes'
import { LayoutDashboard, SlidersHorizontal, Settings, LogOut } from 'lucide-react'
import { useUserStore } from '#/stores/useUserStore'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/preferences', label: 'Preferences', icon: SlidersHorizontal },
  // { to: '/settings', label: 'Settings', icon: Settings },
] as const

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { isSignedIn } = useAuth()
  const { user } = useUser()
  const { openUserProfile, signOut } = useClerk()
  const { clearUser } = useUserStore()

  if (!isSignedIn) return null

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`fixed top-14 z-50 flex h-[calc(100dvh-3.5rem)] w-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-200 md:sticky md:w-56 md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <nav className="flex flex-col gap-0.5 p-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to as string}
            onClick={onClose}
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
          onClick={() => openUserProfile({
            appearance: getClerkAppearance(window.localStorage.getItem('theme') === 'dark'),
          })}
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
          onClick={() => { signOut(); clearUser() }}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-destructive"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
    </>
  )
}

function getClerkAppearance(isDark: boolean) {
  return {
    baseTheme: isDark ? dark : undefined,
    variables: isDark
      ? {
          colorBackground: '#121a13',
          colorInputBackground: '#1a221b',
          colorText: '#e6ebe7',
          colorTextSecondary: '#6b8a6e',
          colorPrimary: '#4cb86c',
          colorDanger: '#c05232',
          borderRadius: '0.375rem',
          fontFamily: 'Manrope, ui-sans-serif, system-ui, sans-serif',
        }
      : {
          colorBackground: '#f2f6f2',
          colorInputBackground: '#ffffff',
          colorText: '#111b14',
          colorTextSecondary: '#5a7a5e',
          colorPrimary: '#3a8752',
          colorDanger: '#c04525',
          borderRadius: '0.375rem',
          fontFamily: 'Manrope, ui-sans-serif, system-ui, sans-serif',
        },
  }
}
