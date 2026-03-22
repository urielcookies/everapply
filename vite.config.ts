import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

const config = defineConfig({
  base: '/',
  plugins: [
    devtools(),
    tsconfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    viteReact(),
    viteStaticCopy({
      targets: [
        { src: 'node_modules/pdfjs-dist/build/pdf.worker.mjs', dest: 'dashboard' },
        { src: 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs', dest: '.' },
      ],
    }),
  ],
})

export default config
