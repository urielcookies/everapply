import { renderToString } from 'react-dom/server'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export async function render(url: string): Promise<string> {
  const memoryHistory = createMemoryHistory({ initialEntries: [url] })

  const router = createRouter({ routeTree, history: memoryHistory })
  await router.load()

  return renderToString(<RouterProvider router={router} />)
}
