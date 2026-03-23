import { preview } from 'vite'
import puppeteer from 'puppeteer'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const ROUTES = ['/', '/about']
const PORT = 3001

async function prerender() {
  console.log('Starting prerender...')

  const server = await preview({
    preview: { port: PORT, open: false },
  })

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    for (const route of ROUTES) {
      process.stdout.write(`  Rendering ${route}...`)
      const page = await browser.newPage()

      await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('main h1', { timeout: 15000 })

      const html = await page.content()

      if (route === '/') {
        writeFileSync('dist/index.html', html)
      } else {
        const dir = join('dist', route.slice(1))
        mkdirSync(dir, { recursive: true })
        writeFileSync(join(dir, 'index.html'), html)
      }

      console.log(' ✓')
      await page.close()
    }
  } finally {
    await browser.close()
    server.httpServer.close()
  }

  console.log('Prerender complete.')
}

prerender().catch((err) => {
  console.error('Prerender failed:', err)
  process.exit(1)
})
