import { copyFileSync, mkdirSync } from 'fs'

mkdirSync('public/dashboard', { recursive: true })
copyFileSync('node_modules/pdfjs-dist/build/pdf.worker.mjs', 'public/dashboard/pdf.worker.mjs')
copyFileSync('node_modules/pdfjs-dist/build/pdf.worker.min.mjs', 'public/pdf.worker.min.mjs')
