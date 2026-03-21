import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { motion, AnimatePresence } from 'motion/react'
import { Bookmark, Send, X, ExternalLink, Briefcase, AlertTriangle, Sparkles, FileText, Loader2, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent } from '#/components/ui/tooltip'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { formatDistanceToNow } from 'date-fns'
import { filter, isEmpty, isEqual, map, times } from 'lodash'
import { toast } from 'sonner'
import axios from 'axios'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { useUserStore } from '#/stores/useUserStore'
import { everApplyApi } from '#/lib/api'
import { Skeleton } from '#/components/ui/skeleton'
import { Button, buttonVariants } from '#/components/ui/button'
import Container from '#/components/Container'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

export const Route = createFileRoute('/_authenticated/dashboard/')({
  component: Dashboard,
})

type RemoteType = 'remote' | 'hybrid' | 'onsite'
type MatchStatus = 'new' | 'saved' | 'applied' | 'dismissed'

interface Job {
  id: string
  title: string
  company: string
  location: string
  remote_type: RemoteType
  source_url: string
  posted_at: string
  description: string | null
}

interface Match {
  id: string
  score: number
  reason: string
  status: MatchStatus
  ats_resume_url: string | null
  job: Job
}

const TABS: { value: MatchStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'saved', label: 'Saved' },
  { value: 'applied', label: 'Applied' },
  { value: 'dismissed', label: 'Dismissed' },
]

function scoreBorderStyle(score: number): React.CSSProperties {
  if (score >= 80) return { borderLeftColor: 'var(--chart-5)' }
  if (score >= 60) return { borderLeftColor: 'var(--chart-2)' }
  return { borderLeftColor: 'var(--chart-1)' }
}

function remoteLabel(type: RemoteType) {
  return { remote: 'Remote', hybrid: 'Hybrid', onsite: 'On-site' }[type]
}

function remoteStyle(type: RemoteType): string {
  const map: Record<RemoteType, string> = {
    remote: 'bg-[oklch(0.623_0.188_260/0.12)] text-[oklch(0.623_0.188_260)] border-[oklch(0.623_0.188_260/0.25)]',
    hybrid: 'bg-[oklch(0.730_0.158_70/0.14)] text-[oklch(0.640_0.148_70)] border-[oklch(0.730_0.158_70/0.28)]',
    onsite: 'bg-muted text-muted-foreground border-border',
  }
  return map[type]
}

function relativeTime(dateStr: string) {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
}

function RemoteBadge({ type }: { type: RemoteType }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[0.625rem] font-semibold tracking-wider uppercase ${remoteStyle(type)}`}
    >
      {remoteLabel(type)}
    </span>
  )
}

function ScoreBlock({ score }: { score: number }) {
  const colors =
    score >= 80
      ? {
          bg: 'bg-[oklch(0.548_0.131_145/0.10)]',
          border: 'border-[oklch(0.548_0.131_145/0.30)]',
          text: 'text-[oklch(0.668_0.158_145)]',
        }
      : score >= 60
        ? {
            bg: 'bg-[oklch(0.730_0.158_70/0.10)]',
            border: 'border-[oklch(0.730_0.158_70/0.30)]',
            text: 'text-[oklch(0.640_0.148_70)]',
          }
        : {
            bg: 'bg-[oklch(0.558_0.195_25/0.10)]',
            border: 'border-[oklch(0.558_0.195_25/0.30)]',
            text: 'text-[oklch(0.558_0.195_25)]',
          }

  return (
    <div
      className={`flex shrink-0 flex-col items-center justify-center rounded-xl border px-4 py-3 ${colors.bg} ${colors.border}`}
    >
      <span className={`font-mono text-2xl font-bold leading-none ${colors.text}`}>
        {score}
      </span>
      <span className={`mt-1 text-[0.6rem] font-semibold uppercase tracking-widest opacity-60 ${colors.text}`}>
        match
      </span>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="flex flex-col gap-5 rounded-xl border border-border border-l-[3px] border-l-border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-1 flex-col gap-2.5">
          <Skeleton className="h-5 w-3/5" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-4 w-14 rounded" />
          </div>
        </div>
        <Skeleton className="h-15.5 w-16 rounded-xl" />
      </div>
      <Skeleton className="h-3.5 w-full" />
      <Skeleton className="h-3.5 w-4/5" />
      <div className="flex items-center justify-between border-t border-border pt-4">
        <Skeleton className="h-3.5 w-20" />
        <div className="flex gap-2">
          <Skeleton className="h-7 w-16 rounded-lg" />
          <Skeleton className="h-7 w-16 rounded-lg" />
          <Skeleton className="h-7 w-7 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

function ErrorState({ error }: { error: Error }) {
  const message = axios.isAxiosError(error)
    ? (error.response?.data?.message ?? error.response?.data?.error ?? error.message)
    : error.message

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center gap-4 py-24 text-center"
    >
      <div className="flex size-16 items-center justify-center rounded-2xl bg-destructive/10">
        <AlertTriangle size={24} className="text-destructive" />
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-semibold text-foreground">Failed to load matches</p>
        <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">{message}</p>
      </div>
    </motion.div>
  )
}

function EmptyState({ status }: { status: MatchStatus }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center gap-4 py-24 text-center"
    >
      <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
        <Briefcase size={24} className="text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-semibold text-foreground">No {status} matches</p>
        {isEqual(status, 'new') ? (
          <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
            New matches are fetched at 9:00 AM Mountain Time daily, with an additional run at 12:00 PM on weekdays. Check back then.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Nothing here yet.</p>
        )}
      </div>
    </motion.div>
  )
}

function JobDescriptionModal({
  open,
  onOpenChange,
  title,
  company,
  description,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  company: string
  description: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] w-[90vw] sm:!max-w-2xl flex-col gap-0 overflow-hidden p-0"
        showCloseButton={false}
      >
        <DialogHeader className="flex flex-row items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            <DialogTitle className="truncate text-sm font-semibold">{title}</DialogTitle>
            <p className="truncate text-xs text-muted-foreground">{company}</p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={() => onOpenChange(false)}>
            <X size={14} />
          </Button>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{description}</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ATSResumeModal({
  open,
  onOpenChange,
  matchId,
  jobTitle,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  matchId: string
  jobTitle: string
}) {
  const { getToken } = useAuth()
  const containerRef = useRef<HTMLDivElement>(null)
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState(1)
  const [containerWidth, setContainerWidth] = useState(600)
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
    if (!open) return
    let objectUrl: string
    getToken().then((token) => {
      fetch(`${import.meta.env.VITE_API_URL}/matches/${matchId}/ats-resume`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((res) => {
          if (!res.ok) throw new Error(`Proxy returned ${res.status}`)
          return res.blob()
        })
        .then((blob) => {
          objectUrl = URL.createObjectURL(blob)
          setBlobUrl(objectUrl)
        })
        .catch((err) => {
          console.error('ATS resume fetch failed:', err)
        })
    })
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      setBlobUrl(null)
    }
  }, [open, matchId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[95vh] w-[90vw] sm:!max-w-5xl flex-col gap-0 overflow-hidden p-0"
        showCloseButton={false}
      >
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            <DialogTitle className="truncate text-sm font-semibold">ATS Resume</DialogTitle>
            <p className="truncate text-xs text-muted-foreground">{jobTitle}</p>
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
            <Tooltip>
              <TooltipTrigger render={<span />}>
                <a
                  href={blobUrl ?? '#'}
                  download={`${jobTitle} - ATS Resume.pdf`}
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
          className="flex flex-col flex-1 items-center overflow-y-auto bg-[oklch(0.15_0_0)] py-4"
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
              width={containerWidth < 816 ? containerWidth - 16 : undefined}
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

interface MatchCardProps {
  match: Match
  onAction: (id: string, status: MatchStatus) => void
  isPending: boolean
  isAnyGenerating: boolean
  onGeneratingChange: (id: string | null) => void
}

function MatchCard({ match, onAction, isPending, isAnyGenerating, onGeneratingChange }: MatchCardProps) {
  const { getToken } = useAuth()
  const [atsUrl, setAtsUrl] = useState<string | null>(match.ats_resume_url)
  const [modalOpen, setModalOpen] = useState(false)
  const [descriptionOpen, setDescriptionOpen] = useState(false)

  const { mutate: generateAtsResume, isPending: isGenerating } = useMutation({
    mutationFn: () =>
      everApplyApi<{ ats_resume_url: string }>(
        `/matches/${match.id}/generate-ats-resume`,
        getToken,
        { method: 'POST' },
      ),
    onMutate: () => {
      onGeneratingChange(match.id)
    },
    onSuccess: (data) => {
      setAtsUrl(data.ats_resume_url)
      setModalOpen(true)
      onGeneratingChange(null)
    },
    onError: (err) => {
      onGeneratingChange(null)
      if (axios.isAxiosError(err)) {
        const status = err.response?.status
        const detail = err.response?.data?.detail
        if (status === 429) {
          toast.error('Daily limit reached', { description: 'Try again tomorrow.' })
        } else if (status === 400) {
          toast.error('No resume uploaded', { description: detail ?? 'Please upload your resume first.' })
        } else {
          toast.error('Failed to generate ATS resume')
        }
      }
    },
  })

  const handleAtsClick = () => {
    console.log('atsUrl-->>', atsUrl);
    if (atsUrl) {
      setModalOpen(true)
    } else {
      generateAtsResume()
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="group relative flex flex-col gap-5 rounded-xl border border-border border-l-[3px] bg-card p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
      style={scoreBorderStyle(match.score)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-5">
        <div className="flex min-w-0 flex-col gap-2">
          <a
            href={match.job.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="group/title flex items-center gap-1.5"
          >
            <h3 className="line-clamp-2 text-base font-semibold leading-snug text-foreground transition-colors group-hover/title:text-primary sm:truncate sm:line-clamp-none">
              {match.job.title}
            </h3>
            <ExternalLink
              size={13}
              className="shrink-0 text-primary opacity-0 transition-opacity group-hover/title:opacity-50"
            />
          </a>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              {match.job.company}
            </span>
            <span className="text-border">·</span>
            <span className="text-sm text-muted-foreground">{match.job.location}</span>
            <RemoteBadge type={match.job.remote_type} />
          </div>
        </div>
        <ScoreBlock score={match.score} />
      </div>

      {/* Reason */}
      <p className="border-l-2 border-border pl-3 text-sm leading-relaxed text-muted-foreground line-clamp-2">
        {match.reason}
      </p>

      {/* Footer */}
      <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">{relativeTime(match.job.posted_at)}</span>
          <span className="text-muted-foreground/40">·</span>
          <a
            href={match.job.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary whitespace-nowrap"
          >
            Source
            <ExternalLink size={10} />
          </a>
          {match.job.description && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <button
                onClick={() => setDescriptionOpen(true)}
                className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary whitespace-nowrap"
              >
                Description
              </button>
            </>
          )}
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Tooltip>
            <TooltipTrigger render={<span />}>
              <Button
                variant="outline"
                size="icon-sm"
                disabled={isPending || isGenerating || isAnyGenerating}
                onClick={handleAtsClick}
                className={atsUrl ? 'text-primary hover:text-primary' : ''}
              >
                {isGenerating ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : atsUrl ? (
                  <FileText size={12} />
                ) : (
                  <Sparkles size={12} />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isGenerating ? 'Generating ATS resume…' : atsUrl ? 'View ATS Resume' : 'Generate ATS Resume'}
            </TooltipContent>
          </Tooltip>
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => onAction(match.id, 'saved')}
            className="flex-1 sm:flex-none"
          >
            <Bookmark size={12} />
            Save
          </Button>
          <Button
            variant="default"
            size="sm"
            disabled={isPending}
            onClick={() => onAction(match.id, 'applied')}
            className="flex-1 sm:flex-none"
          >
            <Send size={12} />
            Apply
          </Button>
          <Tooltip>
            <TooltipTrigger render={<span />}>
              <Button
                variant="outline"
                size="icon-sm"
                disabled={isPending}
                onClick={() => onAction(match.id, 'dismissed')}
                className="hover:border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
              >
                <X size={13} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Dismiss this job</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {atsUrl && (
        <ATSResumeModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          matchId={match.id}
          jobTitle={match.job.title}
        />
      )}
      {match.job.description && (
        <JobDescriptionModal
          open={descriptionOpen}
          onOpenChange={setDescriptionOpen}
          title={match.job.title}
          company={match.job.company}
          description={match.job.description}
        />
      )}
    </motion.div>
  )
}

function Dashboard() {
  const { user } = useUserStore()
  const { getToken } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<MatchStatus>('new')
  const [generatingMatchId, setGeneratingMatchId] = useState<string | null>(null)

  useEffect(() => {
    if (!user.resume_url) {
      navigate({ to: '/onboarding' })
    }
  }, [user.resume_url])

  const { data: matches, isLoading, isError, error } = useQuery({
    queryKey: ['matches', activeTab],
    queryFn: () => everApplyApi<Match[]>(`/matches?status=${activeTab}`, getToken),
    enabled: !!user.resume_url,
  })

  const { mutate: updateStatus, variables, isPending: isMutating } = useMutation({
    mutationFn: ({ id, status }: { id: string; status: MatchStatus }) =>
      everApplyApi(`/matches/${id}/status`, getToken, {
        method: 'PUT',
        data: { status },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] })
    },
    onError: (err) => {
      const message = axios.isAxiosError(err)
        ? (err.response?.data?.message ?? err.response?.data?.error ?? err.message)
        : err.message
      toast.error('Failed to update status', { description: message })
    },
  })

  return (
    <Container
      title="Job Matches"
      description="AI-ranked matches based on your resume and preferences."
    >
      {/* Tabs */}
      <div className="mb-6 flex w-full overflow-x-auto rounded-lg bg-muted/60 p-1 sm:w-fit">
        {map(TABS, (tab) => (
          <Button
            key={tab.value}
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab(tab.value)}
            className={`shrink-0 ${isEqual(activeTab, tab.value) ? 'bg-card text-foreground shadow-sm hover:bg-card hover:text-foreground' : 'text-muted-foreground'}`}
          >
            {tab.label}
            {isEqual(activeTab, tab.value) && !isEmpty(matches) && (
              <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[0.625rem] font-semibold text-muted-foreground">
                {matches!.length}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {times(3, (i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : isError ? (
        <ErrorState error={error as Error} />
      ) : isEmpty(matches) ? (
        <EmptyState status={activeTab} />
      ) : (
        <motion.div layout className="flex flex-col gap-3">
          <AnimatePresence mode="popLayout">
            {map(filter(matches, (m) => !isMutating || !isEqual(m.id, variables?.id)), (match, i) => (
              <motion.div key={match.id} transition={{ delay: i * 0.04 }}>
                <MatchCard
                  match={match}
                  onAction={(id, status) => updateStatus({ id, status })}
                  isPending={isMutating && isEqual(variables?.id, match.id)}
                  isAnyGenerating={!isEqual(generatingMatchId, null) && !isEqual(generatingMatchId, match.id)}
                  onGeneratingChange={setGeneratingMatchId}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </Container>
  )
}
