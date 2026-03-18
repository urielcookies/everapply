import { ClerkProvider } from '@clerk/clerk-react'
import { Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { useState } from 'react'

import '../styles.css'
import Header from '#/components/Header'
import Sidebar from '#/components/Sidebar'

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/">

      <Header onMenuToggle={() => setSidebarOpen(prev => !prev)} isSidebarOpen={sidebarOpen} />
      <div className="flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
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
    </ClerkProvider>
  )
}
