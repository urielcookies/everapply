import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const serverBundle = path.join(root, 'dist/server/entry-server.js')
const template = await fs.readFile(path.join(root, 'dist/index.html'), 'utf-8')

// ─── Add new static routes here ───────────────────────────────────────────
const ROUTES = ['/', '/about']

async function prerenderRoute(render, route) {
  const appHtml = await render(route)
  const output = template.replace('<div id="app"></div>', `<div id="app">${appHtml}</div>`)

  if (route === '/') {
    // Root writes directly to dist/index.html
    await fs.writeFile(path.join(root, 'dist/index.html'), output)
  } else {
    // All other routes write to dist/<route>/index.html
    const dir = path.join(root, 'dist', route)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(path.join(dir, 'index.html'), output)
  }

  console.log(`✓ Prerendered ${route}`)
}

async function prerender() {
  const { render } = await import(serverBundle)

  for (const route of ROUTES) {
    await prerenderRoute(render, route)
  }

  // Clean up the server bundle — not needed at runtime
  await fs.rm(path.join(root, 'dist/server'), { recursive: true, force: true })
}

prerender().catch((err) => {
  console.error('Prerender failed:', err)
  process.exit(1)
})
