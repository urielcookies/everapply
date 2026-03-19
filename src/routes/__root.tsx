import { ClerkProvider } from '@clerk/clerk-react'
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { useEffect, useState } from 'react'
import { isEqual } from 'lodash'

import '../styles.css'
import Header from '#/components/Header'
import Sidebar from '#/components/Sidebar'
import { Toaster } from '#/components/ui/sonner'
import { TooltipProvider } from '#/components/ui/tooltip'
import { getClerkAppearance } from '#/lib/clerkAppearance'

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
})

function useIsDark() {
  const [isDark, setIsDark] = useState(() =>
    typeof window !== 'undefined'
      ? !isEqual(window.localStorage.getItem('theme'), 'light')
      : true
  )

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(!isEqual(window.localStorage.getItem('theme'), 'light'))
    })
    observer.observe(document.documentElement, { attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return isDark
}

function RootComponent() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isDark = useIsDark()

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/" appearance={getClerkAppearance(isDark)}>
      <TooltipProvider>
      <Header onMenuToggle={() => setSidebarOpen(prev => !prev)} isSidebarOpen={sidebarOpen} />
      <div className="flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
      <Toaster richColors position="top-right" />
      <TanStackDevtools
        config={{
          position: 'bottom-right',
        }}
        plugins={[
          {
            name: 'TanStack Router',
            render: <TanStackRouterDevtoolsPanel />,
          },
        ]}
      />
      </TooltipProvider>
    </ClerkProvider>
  )
}
