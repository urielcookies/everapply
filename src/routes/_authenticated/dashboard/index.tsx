import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { motion, AnimatePresence } from 'motion/react'
import { Bookmark, Send, X, ExternalLink, Briefcase, AlertTriangle, Sparkles, FileText, Loader2, RotateCcw, SlidersHorizontal, LayoutList, Columns2, Grid3x3, DollarSign } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent } from '#/components/ui/tooltip'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import PdfViewerModal from '#/components/PdfViewerModal'
import { formatDistanceToNow } from 'date-fns'
import { filter, isEmpty, isEqual, map, times } from 'lodash'
import { toast } from 'sonner'
import axios from 'axios'
import { useUserStore } from '#/stores/useUserStore'
import { everApplyApi } from '#/lib/api'
import { Skeleton } from '#/components/ui/skeleton'
import { Button } from '#/components/ui/button'
import { Slider } from '#/components/ui/slider'
import { Switch } from '#/components/ui/switch'
import Container from '#/components/Container'

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
  salary_min: number | null
  salary_max: number | null
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

const SALARY_MAX = 300000

function formatSalary(val: number): string {
  if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`
  return `$${Math.round(val / 1000)}k`
}

function salaryRangeLabel(range: [number, number]): string {
  const [min, max] = range
  if (min === 0 && max === SALARY_MAX) return 'Any'
  if (min === 0) return `Up to ${formatSalary(max)}`
  if (max === SALARY_MAX) return `${formatSalary(min)}+`
  return `${formatSalary(min)} – ${formatSalary(max)}`
}

function jobSalaryText(job: Job): string {
  if (job.salary_min == null && job.salary_max == null) return 'Salary N/A'
  if (job.salary_min != null && job.salary_max != null)
    return `${formatSalary(job.salary_min)} – ${formatSalary(job.salary_max)}`
  if (job.salary_min != null) return `${formatSalary(job.salary_min)}+`
  return `Up to ${formatSalary(job.salary_max!)}`
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

function TrialExpiredState() {
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
        <p className="text-sm font-semibold text-foreground">Your free trial has ended</p>
        <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
          New job matches are paused. Contact us to upgrade your account and resume matching.
        </p>
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


interface MatchCardProps {
  match: Match
  currentStatus: MatchStatus
  onAction: (id: string, status: MatchStatus) => void
  isPending: boolean
  isAnyGenerating: boolean
  isTrialExpired: boolean
  onGeneratingChange: (id: string | null) => void
  reasonExpanded: boolean
  onReasonExpandedChange: (expanded: boolean) => void
  isVisited: boolean
  onVisit: (jobId: string) => void
}

function MatchCard({ match, currentStatus, onAction, isPending, isAnyGenerating, isTrialExpired, onGeneratingChange, reasonExpanded, onReasonExpandedChange, isVisited, onVisit }: MatchCardProps) {
  const { getToken } = useAuth()
  const [atsUrl, setAtsUrl] = useState<string | null>(match.ats_resume_url)
  const [modalOpen, setModalOpen] = useState(false)
  const [descriptionOpen, setDescriptionOpen] = useState(false)
  const [reasonTruncated, setReasonTruncated] = useState(false)
  const reasonRef = useRef<HTMLParagraphElement>(null)

  useLayoutEffect(() => {
    const el = reasonRef.current
    if (!el) return
    const clampedHeight = el.clientHeight
    el.style.display = 'block'
    el.style.setProperty('-webkit-line-clamp', 'unset')
    el.style.overflow = 'visible'
    const naturalHeight = el.scrollHeight
    el.style.display = ''
    el.style.removeProperty('-webkit-line-clamp')
    el.style.overflow = ''
    setReasonTruncated(naturalHeight > clampedHeight)
  }, [])

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
      everApplyApi<{ remaining: number; limit: number }>('/matches/ats-usage', getToken)
        .then(({ remaining, limit }) => {
          toast.success('Resume ready', { description: `${remaining} of ${limit} remaining today` })
        })
        .catch(() => {
          toast.success('Resume ready')
        })
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
      className={`@container group relative flex h-full flex-col gap-5 rounded-xl border border-l-[3px] bg-card p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${isVisited ? 'border-indigo-400/60' : 'border-border'}`}
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
            onClick={() => onVisit(match.job.id)}
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
            <span className="text-border">·</span>
            <span className={`text-xs ${match.job.salary_min == null && match.job.salary_max == null ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>
              {jobSalaryText(match.job)}
            </span>
          </div>
        </div>
        <ScoreBlock score={match.score} />
      </div>

      {/* Reason */}
      <button
        onClick={() => (reasonTruncated || reasonExpanded) && onReasonExpandedChange(!reasonExpanded)}
        className="group/reason border-l-2 border-border pl-3 text-left"
      >
        <p ref={reasonRef} className={`text-sm leading-relaxed text-muted-foreground transition-all ${reasonExpanded ? '' : 'line-clamp-2'}`}>
          {match.reason}
        </p>
        {(reasonTruncated || reasonExpanded) && (
          <span className="mt-1 block text-[0.625rem] font-medium text-muted-foreground/50 transition-colors group-hover/reason:text-muted-foreground">
            {reasonExpanded ? 'Show less' : 'Read more'}
          </span>
        )}
      </button>

      {/* Footer */}
      <div className="mt-auto flex flex-col gap-3 border-t border-border pt-4 @lg:flex-row @lg:items-center @lg:justify-between">
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

        <div className="flex w-full items-center gap-2 @lg:w-auto">
          <Tooltip>
            <TooltipTrigger render={<span className={isAnyGenerating ? 'cursor-not-allowed' : ''} />}>
              <Button
                variant="outline"
                size="icon-sm"
                disabled={isPending || isGenerating || isAnyGenerating || (isTrialExpired && !atsUrl)}
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
              {isGenerating ? 'Generating ATS resume…' : isAnyGenerating ? 'A resume is being generated, please wait' : atsUrl ? 'View ATS Resume' : isTrialExpired ? 'Trial ended — upgrade to generate ATS resumes' : 'Generate ATS Resume'}
            </TooltipContent>
          </Tooltip>
          {currentStatus !== 'new' && (
            <Tooltip>
              <TooltipTrigger render={<span />}>
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={isPending}
                  onClick={() => onAction(match.id, 'new')}
                >
                  <RotateCcw size={13} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Restore to new</TooltipContent>
            </Tooltip>
          )}
          {currentStatus !== 'dismissed' && (
            <>
              {currentStatus !== 'saved' && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => onAction(match.id, 'saved')}
                  className="flex-1 @lg:flex-none"
                >
                  <Bookmark size={12} />
                  Save
                </Button>
              )}
              {currentStatus !== 'applied' && (
                <Button
                  variant="default"
                  size="sm"
                  disabled={isPending}
                  onClick={() => onAction(match.id, 'applied')}
                  className="flex-1 @lg:flex-none"
                >
                  <Send size={12} />
                  Mark Applied
                </Button>
              )}
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
            </>
          )}
        </div>
      </div>

      {atsUrl && (
        <PdfViewerModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          url={`${import.meta.env.VITE_API_URL}/matches/${match.id}/ats-resume`}
          title="ATS Resume"
          subtitle={match.job.title}
          downloadName={`${match.job.title} - ATS Resume.pdf`}
          getToken={getToken}
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
  const [columns, setColumns] = useState<1 | 2 | 3>(1)
  const [isXl, setIsXl] = useState(() => window.matchMedia('(min-width: 1280px)').matches)
  const [reasonExpanded, setReasonExpanded] = useState(false)
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())
  const [lastVisitedJobId, setLastVisitedJobId] = useState<string | null>(null)
  const [minScore, setMinScore] = useState<number>(70)
  const [salaryEnabled, setSalaryEnabled] = useState<boolean>(false)
  const [salaryRange, setSalaryRange] = useState<[number, number]>([0, SALARY_MAX])
  const [generatingMatchId, setGeneratingMatchId] = useState<string | null>(null)

  useEffect(() => {
    if (!user.resume_url) {
      navigate({ to: '/onboarding' })
    }
  }, [user.resume_url])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)')
    const handler = (e: MediaQueryListEvent) => setIsXl(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const effectiveColumns = columns === 3 && !isXl ? 2 : columns

  const { data: matches, isLoading, isError, error } = useQuery({
    queryKey: ['matches', activeTab],
    queryFn: () => everApplyApi<Match[]>(`/matches?status=${activeTab}`, getToken),
    enabled: Boolean(user.resume_url),
  })

  useEffect(() => { setHiddenIds(new Set()) }, [matches])

  const { mutate: updateStatus, variables, isPending: isMutating } = useMutation({
    mutationFn: ({ id, status }: { id: string; status: MatchStatus }) =>
      everApplyApi(`/matches/${id}/status`, getToken, {
        method: 'PUT',
        data: { status },
      }),
    onMutate: ({ id }) => setHiddenIds((prev) => new Set([...prev, id])),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] })
    },
    onError: (err, { id }) => {
      setHiddenIds((prev) => { const s = new Set(prev); s.delete(id); return s })
      const message = axios.isAxiosError(err)
        ? (err.response?.data?.message ?? err.response?.data?.error ?? err.message)
        : err.message
      toast.error('Failed to update status', { description: message })
    },
  })

  const handleMinScoreChange = (val: number) => {
    setMinScore(val)
  }

  const handleSalaryEnabledChange = (enabled: boolean) => {
    setSalaryEnabled(enabled)
    if (!enabled) setSalaryRange([0, SALARY_MAX])
  }

  const handleSalaryRangeChange = (val: [number, number]) => {
    setSalaryRange(val)
  }

  const handleVisit = (jobId: string) => {
    setLastVisitedJobId(jobId)
  }

  useEffect(() => {
    if (!lastVisitedJobId) return
    const handler = () => setLastVisitedJobId(null)
    const timer = setTimeout(() => document.addEventListener('click', handler), 0)
    return () => { clearTimeout(timer); document.removeEventListener('click', handler) }
  }, [lastVisitedJobId])

  const salaryFilterActive = salaryEnabled && (salaryRange[0] > 0 || salaryRange[1] < SALARY_MAX)
  const hasSalaryData = matches?.some((m) => m.job.salary_min != null || m.job.salary_max != null) ?? false

  const filteredMatches = filter(matches, (m) => {
    if (m.score < minScore) return false
    if (salaryFilterActive) {
      const { salary_min, salary_max } = m.job
      if (salary_min != null && salary_min > salaryRange[1]) return false
      if (salary_max != null && salary_max < salaryRange[0]) return false
    }
    return true
  })

  const gridClass: Record<1 | 2 | 3, string> = {
    1: 'flex flex-col gap-3',
    2: 'grid grid-cols-1 gap-3 lg:grid-cols-2',
    3: 'grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3',
  }

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
                {(minScore > 0 || salaryFilterActive) ? `${filteredMatches.length}/${matches!.length}` : matches!.length}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Filters */}
      {!isLoading && !isError && !isEmpty(matches) && (
        <div className="mb-5 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border">
            <SlidersHorizontal size={13} className="shrink-0 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filters</span>
            <div className="ml-auto hidden shrink-0 items-center gap-1 lg:flex">
              {([
                { col: 1 as const, icon: <LayoutList size={14} />, requiresXl: false },
                { col: 2 as const, icon: <Columns2 size={14} />, requiresXl: false },
                { col: 3 as const, icon: <Grid3x3 size={14} />, requiresXl: true },
              ]).filter(({ requiresXl }) => !requiresXl || isXl).map(({ col, icon }) => (
                <Button
                  key={col}
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setColumns(col)}
                  className={effectiveColumns === col ? 'bg-muted text-foreground' : 'text-muted-foreground'}
                >
                  {icon}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex flex-col divide-y divide-border sm:flex-row sm:divide-x sm:divide-y-0">
            {/* Match score */}
            <div className="flex flex-1 items-center gap-3 px-4 py-3">
              <div className="flex flex-1 flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Min. match score</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-foreground">{minScore}%</span>
                    {minScore > 0 && (
                      <button
                        onClick={() => handleMinScoreChange(0)}
                        className="text-[0.625rem] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
                <Slider
                  value={[minScore]}
                  min={0}
                  max={100}
                  step={5}
                  onValueChange={(val) => handleMinScoreChange(typeof val === 'number' ? val : val[0])}
                />
              </div>
            </div>
            {/* Salary range */}
            {hasSalaryData && (
              <div className="flex flex-1 flex-col gap-2 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSalaryEnabledChange(!salaryEnabled)}
                      className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${salaryEnabled ? 'text-foreground' : 'text-muted-foreground'}`}
                    >
                      <DollarSign size={12} />
                      Salary range
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    {salaryEnabled && (
                      <span className="font-mono text-xs font-semibold text-foreground">{salaryRangeLabel(salaryRange)}</span>
                    )}
                    {salaryEnabled && salaryFilterActive && (
                      <button
                        onClick={() => handleSalaryRangeChange([0, SALARY_MAX])}
                        className="text-[0.625rem] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                      >
                        Reset
                      </button>
                    )}
                    <Switch
                      checked={salaryEnabled}
                      onCheckedChange={handleSalaryEnabledChange}
                    />
                  </div>
                </div>
                {salaryEnabled && (
                  <Slider
                    value={salaryRange}
                    min={0}
                    max={SALARY_MAX}
                    step={5000}
                    onValueChange={(val) => handleSalaryRangeChange(val as [number, number])}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className={gridClass[columns]}>
          {times(3, (i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : isError ? (
        <ErrorState error={error as Error} />
      ) : user.trial_expired && isEqual(activeTab, 'new') ? (
        <TrialExpiredState />
      ) : isEmpty(matches) ? (
        <EmptyState status={activeTab} />
      ) : isEmpty(filteredMatches) ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center gap-4 py-24 text-center"
        >
          <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
            <SlidersHorizontal size={24} className="text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-semibold text-foreground">No matches above {minScore}</p>
            <p className="text-xs text-muted-foreground">Lower the score filter to see more results.</p>
          </div>
        </motion.div>
      ) : (
        <motion.div layout className={gridClass[columns]}>
          <AnimatePresence mode="popLayout">
            {map(filter(filteredMatches, (m) => !hiddenIds.has(m.id)), (match, i) => (
              <motion.div key={match.id} transition={{ delay: i * 0.04 }} className="h-full">
                <MatchCard
                  match={match}
                  currentStatus={activeTab}
                  onAction={(id, status) => updateStatus({ id, status })}
                  isPending={isMutating && isEqual(variables?.id, match.id)}
                  isVisited={lastVisitedJobId === match.job.id}
                  onVisit={handleVisit}
                  isAnyGenerating={!isEqual(generatingMatchId, null) && !isEqual(generatingMatchId, match.id)}
                  isTrialExpired={user.trial_expired}
                  onGeneratingChange={setGeneratingMatchId}
                  reasonExpanded={reasonExpanded}
                  onReasonExpandedChange={setReasonExpanded}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </Container>
  )
}
