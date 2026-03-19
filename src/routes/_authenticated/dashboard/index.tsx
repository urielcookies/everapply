import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { motion, AnimatePresence } from 'motion/react'
import { Bookmark, Send, X, ExternalLink, Briefcase } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent } from '#/components/ui/tooltip'
import { formatDistanceToNow } from 'date-fns'
import { filter, isEmpty, isEqual, map, times } from 'lodash'
import { useUserStore } from '#/stores/useUserStore'
import { everApplyApi } from '#/lib/api'
import { Skeleton } from '#/components/ui/skeleton'
import { Button } from '#/components/ui/button'
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
}

interface Match {
  id: string
  score: number
  reason: string
  status: MatchStatus
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
            New matches are fetched at 7:00 AM Mountain Time daily, with an additional run at 10:00 AM on weekdays. Check back then.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Nothing here yet.</p>
        )}
      </div>
    </motion.div>
  )
}

interface MatchCardProps {
  match: Match
  onAction: (id: string, status: MatchStatus) => void
  isPending: boolean
}

function MatchCard({ match, onAction, isPending }: MatchCardProps) {
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
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
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
    </motion.div>
  )
}

function Dashboard() {
  const { user } = useUserStore()
  const { getToken } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<MatchStatus>('new')

  useEffect(() => {
    if (!user.resume_url) {
      navigate({ to: '/onboarding' })
    }
  }, [user.resume_url])

  const { data: matches, isLoading } = useQuery({
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
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </Container>
  )
}
