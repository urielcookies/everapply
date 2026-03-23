import { useEffect, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { AlertTriangle, ChevronLeft, ChevronRight, Download, Loader2, X, ZoomIn, ZoomOut } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Button, buttonVariants } from '#/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '#/components/ui/tooltip'

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

interface PdfViewerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  url: string | null
  title: string
  subtitle?: string
  downloadName: string
  getToken?: () => Promise<string | null>
}

export default function PdfViewerModal({
  open,
  onOpenChange,
  url,
  title,
  subtitle,
  downloadName,
  getToken,
}: PdfViewerModalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState(1)
  const [containerWidth, setContainerWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 600
  )
  const [scale, setScale] = useState(1)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [open])

  useEffect(() => {
    if (!open || !url) return
    let objectUrl: string
    setScale(1)

    const doFetch = async () => {
      const token = getToken ? await getToken() : null
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error(`Fetch returned ${res.status}`)
      const blob = await res.blob()
      objectUrl = URL.createObjectURL(blob)
      setBlobUrl(objectUrl)
    }

    doFetch().catch((err) => {
      console.error('PDF fetch failed:', err)
    })

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      setBlobUrl(null)
    }
  }, [open, url])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex flex-col gap-0 overflow-hidden p-0 top-0 left-0 translate-x-0 translate-y-0 h-dvh w-full max-w-full rounded-none ring-0 sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:h-[95vh] sm:w-[90vw] sm:max-w-5xl! sm:rounded-lg sm:ring-1"
        showCloseButton={false}
      >
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            <DialogTitle className="truncate text-sm font-semibold">{title}</DialogTitle>
            {subtitle && (
              <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {numPages > 1 && (
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={pageNumber <= 1}
                  onClick={() => setPageNumber((p) => p - 1)}
                >
                  <ChevronLeft size={14} />
                </Button>
                <span className="min-w-[3rem] text-center text-xs text-muted-foreground">
                  {pageNumber} / {numPages}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={pageNumber >= numPages}
                  onClick={() => setPageNumber((p) => p + 1)}
                >
                  <ChevronRight size={14} />
                </Button>
              </div>
            )}
            <div className="hidden sm:flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={scale <= 0.5}
                onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
              >
                <ZoomOut size={14} />
              </Button>
              <span className="min-w-[2.5rem] text-center text-xs text-muted-foreground">
                {Math.round(scale * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={scale >= 2}
                onClick={() => setScale((s) => Math.min(2, s + 0.25))}
              >
                <ZoomIn size={14} />
              </Button>
            </div>
            <Tooltip>
              <TooltipTrigger render={<span />}>
                <a
                  href={blobUrl ?? '#'}
                  download={downloadName}
                  className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
                  aria-disabled={!blobUrl}
                  onClick={!blobUrl ? (e) => e.preventDefault() : undefined}
                >
                  <Download size={14} />
                </a>
              </TooltipTrigger>
              <TooltipContent>Download PDF</TooltipContent>
            </Tooltip>
            <Button variant="ghost" size="icon-sm" onClick={() => onOpenChange(false)}>
              <X size={14} />
            </Button>
          </div>
        </DialogHeader>

        {/* PDF Viewer */}
        <div
          ref={containerRef}
          className="flex flex-col flex-1 items-center overflow-x-hidden overflow-y-auto sm:overflow-auto bg-background sm:bg-[oklch(0.15_0_0)] sm:py-4"
        >
          <Document
            file={blobUrl}
            onLoadSuccess={({ numPages }) => {
              setNumPages(numPages)
              setPageNumber(1)
            }}
            loading={
              <div className="flex h-64 items-center justify-center">
                <Loader2 size={20} className="animate-spin text-muted-foreground" />
              </div>
            }
            error={
              <div className="flex h-64 flex-col items-center justify-center gap-2">
                <AlertTriangle size={20} className="text-destructive" />
                <p className="text-xs text-muted-foreground">Failed to load PDF</p>
              </div>
            }
          >
            <Page
              pageNumber={pageNumber}
              width={Math.round((containerWidth < 816 ? containerWidth - 16 : 816) * scale)}
              renderTextLayer
              renderAnnotationLayer
              className="shadow-2xl"
            />
          </Document>
        </div>
      </DialogContent>
    </Dialog>
  )
}
