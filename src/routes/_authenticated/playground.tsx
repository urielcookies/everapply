import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { AlertTriangle, Info, Loader2, Sparkles } from 'lucide-react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { useUserStore } from '#/stores/useUserStore'
import { everApplyApi } from '#/lib/api'
import Container from '#/components/Container'
import PdfViewerModal from '#/components/PdfViewerModal'
import { Button } from '#/components/ui/button'
import { Switch } from '#/components/ui/switch'
import { Label } from '#/components/ui/label'

export const Route = createFileRoute('/_authenticated/playground')({
  component: Playground,
})

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface UsageData {
  used: number
  limit: number
  remaining: number
}

/* ─── Trial expired state ────────────────────────────────────────────────── */

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
          Resume Playground is paused. Contact us to upgrade your account.
        </p>
      </div>
    </motion.div>
  )
}

/* ─── Usage indicator ────────────────────────────────────────────────────── */

function UsageIndicator({ used, limit, remaining }: UsageData) {
  const pct = limit > 0 ? Math.round((used / limit) * 100) : 0
  const depleted = remaining === 0

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Daily generations</span>
        <span className={depleted ? 'font-semibold text-destructive' : 'font-semibold text-foreground'}>
          {remaining} of {limit} remaining
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${depleted ? 'bg-destructive' : 'bg-primary'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {depleted && (
        <p className="text-xs text-destructive">Daily limit reached — resets at midnight MT</p>
      )}
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

function Playground() {
  const { user } = useUserStore()
  const { getToken } = useAuth()
  const [jobDescription, setJobDescription] = useState('')
  const [boostMode, setBoostMode] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null)
  const [downloadName, setDownloadName] = useState('Ideal Candidate - Resume.pdf')
  const [modalOpen, setModalOpen] = useState(false)

  const { data: usage, refetch: refetchUsage } = useQuery({
    queryKey: ['targeted-resume-usage'],
    queryFn: () => everApplyApi<UsageData>('/resumes/targeted/usage', getToken),
    enabled: !user.trial_expired,
  })

  async function handleGenerate() {
    if (!jobDescription.trim()) return
    setIsGenerating(true)
    setError(null)

    try {
      const token = await getToken()
      const endpoint = boostMode ? '/resumes/ideal-realistic' : '/resumes/ideal'
      const res = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ job_description: jobDescription }),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        if (res.status === 429) {
          setError('Daily limit reached — resets at midnight MT')
        } else if (res.status === 403) {
          setError('Your free trial has ended. Upgrade to generate resumes.')
        } else if (res.status === 400) {
          setError(json.detail ?? 'No resume uploaded. Please upload your resume in Settings first.')
        } else {
          setError(json.detail ?? 'Something went wrong. Please try again.')
        }
        return
      }

      // Use Content-Disposition filename for boost mode, fallback for ideal mode
      let resolvedDownloadName = 'Ideal Candidate - Resume.pdf'
      if (boostMode) {
        const disposition = res.headers.get('Content-Disposition')
        if (disposition) {
          const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';\r\n]+)["']?/i)
          if (match?.[1]) resolvedDownloadName = decodeURIComponent(match[1])
        }
      }

      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      setPreviewBlobUrl(blobUrl)
      setDownloadName(resolvedDownloadName)
      setModalOpen(true)
      setJobDescription('')
      toast.success('Resume ready')
      refetchUsage()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  if (user.trial_expired) {
    return (
      <Container title="Resume Playground">
        <TrialExpiredState />
      </Container>
    )
  }

  const depleted = usage ? usage.remaining === 0 : false

  return (
    <>
    <Container
      title="Resume Playground"
      description="Generate an AI-optimized resume for any job posting."
    >
      <div className="flex max-w-2xl flex-col gap-6">

        {/* Usage */}
        {usage && <UsageIndicator {...usage} />}

        {/* Toggle */}
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3.5">
          <div className="flex flex-col gap-0.5">
            <Label htmlFor="boost-mode" className="text-sm font-medium">
              Boost My Resume
            </Label>
            <p className="text-xs text-muted-foreground">
              Use your uploaded resume as the base instead of a fictional candidate
            </p>
          </div>
          <Switch
            id="boost-mode"
            checked={boostMode}
            onCheckedChange={setBoostMode}
          />
        </div>

        {/* Disclaimer */}
        <div className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/40 px-4 py-3">
          <Info size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            {boostMode
              ? 'Uses your real resume as the skeleton (contact info, companies, dates, education) but AI-generates the bullet points, skills, and summary. Your resume must be uploaded in Settings.'
              : 'Generates a fully fictional ideal candidate resume. Use it to understand what a perfect ATS resume looks like for this role.'
            }
          </p>
        </div>

        {/* Textarea */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-muted-foreground">
            Job description
          </label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the full job description here…"
            rows={14}
            className="w-full resize-none rounded-lg border border-border bg-card px-4 py-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            disabled={isGenerating || depleted}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Generate */}
        <div className="flex items-center justify-between">
          {depleted ? (
            <p className="text-xs text-muted-foreground">
              Limit resets at midnight MT
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              The resume will open as a preview. Download it — it won't be saved.
            </p>
          )}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || depleted || !jobDescription.trim()}
            className="gap-2"
          >
            {isGenerating
              ? <><Loader2 size={14} className="animate-spin" />Generating…</>
              : <><Sparkles size={14} />Generate Resume</>
            }
          </Button>
        </div>

      </div>
    </Container>

    <PdfViewerModal
      open={modalOpen}
      onOpenChange={(open) => {
        setModalOpen(open)
        if (!open && previewBlobUrl) {
          URL.revokeObjectURL(previewBlobUrl)
          setPreviewBlobUrl(null)
        }
      }}
      externalBlobUrl={previewBlobUrl}
      title={boostMode ? 'Boosted Resume' : 'Ideal Candidate Resume'}
      downloadName={downloadName}
      notice="Like what you see? Download it. This resume isn't saved and won't be retrievable later."
    />
    </>
  )
}
