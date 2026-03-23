import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { AlertTriangle, Loader2, Sparkles } from 'lucide-react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { useUserStore } from '#/stores/useUserStore'
import { everApplyApi } from '#/lib/api'
import Container from '#/components/Container'
import PdfViewerModal from '#/components/PdfViewerModal'
import { Button } from '#/components/ui/button'

export const Route = createFileRoute('/_authenticated/targeted-resume')({
  component: TargetedResume,
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
          Targeted resume generation is paused. Contact us to upgrade your account.
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

function TargetedResume() {
  const { user } = useUserStore()
  const { getToken } = useAuth()
  const [jobDescription, setJobDescription] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null)
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
      const res = await fetch(`${import.meta.env.VITE_API_URL}/resumes/targeted`, {
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
        } else {
          setError(json.detail ?? 'Something went wrong. Please try again.')
        }
        return
      }

      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      setPreviewBlobUrl(blobUrl)
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
      <Container title="Targeted Resume">
        <TrialExpiredState />
      </Container>
    )
  }

  const depleted = usage ? usage.remaining === 0 : false

  return (
    <>
    <Container
      title="Targeted Resume"
      description="Paste a job description and get a tailored, ATS-optimized resume — downloaded instantly."
    >
      <div className="flex max-w-2xl flex-col gap-6">

        {/* Usage */}
        {usage && <UsageIndicator {...usage} />}

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
              Your resume is tailored to the job and opens as a preview
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
      title="Targeted Resume"
      downloadName="Targeted Resume.pdf"
      notice="Like what you see? Download it. This resume isn't saved and won't be retrievable later."
    />
    </>
  )
}
