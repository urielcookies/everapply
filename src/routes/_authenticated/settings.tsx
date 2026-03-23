import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { useClerk } from '@clerk/clerk-react'
import axios from 'axios'
import { isEqual, map } from 'lodash'
import { format, parseISO } from 'date-fns'
import { FileText, Upload, X, Loader2, User, CheckCircle2, ShieldCheck, Clock, Ban, Brain, BarChart2 } from 'lucide-react'
import { toast } from 'sonner'
import { useUserStore } from '#/stores/useUserStore'
import { everApplyApi } from '#/lib/api'
import Container from '#/components/Container'
import PdfViewerModal from '#/components/PdfViewerModal'
import { Button } from '#/components/ui/button'

export const Route = createFileRoute('/_authenticated/settings')({
  component: Settings,
})

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface ParsedData {
  name: string
  skills: string[]
  titles: string[]
  seniority: 'junior' | 'mid' | 'senior'
  years_exp: number
  summary: string
}

interface UsageData {
  used: number
  limit: number
  remaining: number
}

/* ─── Usage bar ──────────────────────────────────────────────────────────── */

function UsageBar({ label, data }: { label: string; data: UsageData | undefined }) {
  if (!data) return null
  const pct = data.limit > 0 ? Math.round((data.used / data.limit) * 100) : 0
  const depleted = data.remaining === 0

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className={depleted ? 'font-semibold text-destructive' : 'text-muted-foreground'}>
          {data.remaining} of {data.limit} remaining today
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${depleted ? 'bg-destructive' : 'bg-primary'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

/* ─── Plan badge ─────────────────────────────────────────────────────────── */

function PlanBadge({ isWhitelisted, isPaid, trialExpired }: {
  isWhitelisted: boolean
  isPaid: boolean
  trialExpired: boolean
}) {
  if (isWhitelisted) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
        <ShieldCheck size={12} />
        Whitelisted
      </span>
    )
  }
  if (isPaid) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 size={12} />
        Pro
      </span>
    )
  }
  if (trialExpired) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
        <Ban size={12} />
        Trial expired
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
      <Clock size={12} />
      Trial active
    </span>
  )
}

/* ─── Section wrapper ────────────────────────────────────────────────────── */

interface SectionProps {
  icon: React.ReactNode
  title: string
  description: string
  children: React.ReactNode
}

function Section({ icon, title, description, children }: SectionProps) {
  return (
    <div className="grid grid-cols-1 gap-6 border-b border-border pb-8 last:border-0 last:pb-0 sm:grid-cols-[1fr_1.6fr]">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </span>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        <p className="pl-9 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  )
}

/* ─── Resume uploader ────────────────────────────────────────────────────── */

function ResumeUploader({ onSuccess }: { onSuccess: () => void }) {
  const { getToken } = useAuth()
  const [dragOver, setDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const handleFile = useCallback((file: File) => {
    if (!isEqual(file.type, 'application/pdf')) {
      setUploadError('Only PDF files are accepted.')
      return
    }
    setUploadError(null)
    setSelectedFile(file)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const { mutate: uploadResume, isPending } = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return everApplyApi('/users/resume', getToken, {
        method: 'POST',
        data: formData,
      })
    },
    onSuccess: () => {
      toast.success('Resume updated')
      onSuccess()
    },
    onError: (err) => {
      const detail = axios.isAxiosError(err) ? err.response?.data?.detail : null
      setUploadError(detail ?? 'Failed to upload resume. Please try again.')
    },
  })

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById('settings-resume-input')?.click()}
        className={`relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/40'}`}
      >
        <input
          id="settings-resume-input"
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileInput}
        />
        {selectedFile ? (
          <>
            <FileText size={28} className="text-primary" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">{selectedFile.name}</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setSelectedFile(null) }}
                className="rounded p-0.5 text-muted-foreground transition-colors hover:text-destructive"
              >
                <X size={14} />
              </button>
            </div>
            <span className="text-xs text-muted-foreground">
              {(selectedFile.size / 1024).toFixed(0)} KB
            </span>
          </>
        ) : (
          <>
            <Upload size={28} className="text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">Drag & drop your resume here</p>
              <p className="text-xs text-muted-foreground">or click to browse — PDF only</p>
            </div>
          </>
        )}
      </div>

      {uploadError && (
        <p className="text-sm text-destructive">{uploadError}</p>
      )}

      <Button
        onClick={() => selectedFile && uploadResume(selectedFile)}
        disabled={!selectedFile || isPending}
        className="self-end gap-2"
      >
        {isPending && <Loader2 size={14} className="animate-spin" />}
        {isPending ? 'Uploading...' : 'Upload resume'}
      </Button>
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

function Settings() {
  const { user, fetchUser } = useUserStore()
  const { getToken } = useAuth()
  const { openUserProfile } = useClerk()
  const [replacingResume, setReplacingResume] = useState(false)
  const [viewingResume, setViewingResume] = useState(false)

  const { data: matchAtsUsage } = useQuery({
    queryKey: ['match-ats-usage'],
    queryFn: () => everApplyApi<UsageData>('/matches/ats-usage', getToken),
  })

  const { data: targetedUsage } = useQuery({
    queryKey: ['targeted-resume-usage'],
    queryFn: () => everApplyApi<UsageData>('/resumes/targeted/usage', getToken),
  })

  return (
    <>
    <Container title="Settings" description="Manage your resume and account.">
      <div className="flex flex-col gap-8">

        {/* Resume */}
        <Section
          icon={<FileText size={14} />}
          title="Resume"
          description="The resume EverApply uses to score and match jobs. Upload a new one at any time to update your matches."
        >
          {!replacingResume ? (
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3.5">
              <div className="flex items-center gap-3">
                <FileText size={16} className={user.resume_url ? 'text-primary' : 'text-muted-foreground'} />
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground">
                    {user.resume_url ? 'Resume on file' : 'No resume uploaded'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {user.resume_url ? 'Used for all job scoring and ATS generation' : 'Upload a PDF to start getting matches'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {user.resume_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewingResume(true)}
                  >
                    View
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReplacingResume(true)}
                >
                  {user.resume_url ? 'Replace' : 'Upload'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <ResumeUploader
                onSuccess={async () => {
                  await fetchUser(getToken)
                  setReplacingResume(false)
                }}
              />
              <button
                type="button"
                onClick={() => setReplacingResume(false)}
                className="self-start text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                Cancel
              </button>
            </div>
          )}
        </Section>

        {/* Resume insights */}
        {user.parsed_data && (() => {
          const parsed = user.parsed_data as unknown as ParsedData
          return (
            <Section
              icon={<Brain size={14} />}
              title="Resume insights"
              description="What was extracted from your resume. If something looks off, upload a new one."
            >
              <div className="flex flex-col gap-4">

                {/* Name / Seniority / Experience */}
                <div className="rounded-xl border border-border bg-muted/30 divide-y divide-border">
                  <div className="flex items-center justify-between px-4 py-3.5">
                    <span className="text-xs text-muted-foreground">Name</span>
                    <span className="text-sm font-medium text-foreground">{parsed.name}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3.5">
                    <span className="text-xs text-muted-foreground">Seniority</span>
                    <span className="text-sm font-medium capitalize text-foreground">{parsed.seniority}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3.5">
                    <span className="text-xs text-muted-foreground">Experience</span>
                    <span className="text-sm font-medium text-foreground">{parsed.years_exp} years</span>
                  </div>
                </div>

                {/* Titles */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Titles</span>
                  <div className="flex flex-wrap gap-1.5">
                    {map(parsed.titles, (title) => (
                      <span
                        key={title}
                        className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground"
                      >
                        {title}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Skills */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Skills</span>
                  <div className="flex flex-wrap gap-1.5">
                    {map(parsed.skills, (skill) => (
                      <span
                        key={skill}
                        className="rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Summary</span>
                  <p className="text-sm leading-relaxed text-foreground">{parsed.summary}</p>
                </div>

              </div>
            </Section>
          )
        })()}

        {/* Usage */}
        <Section
          icon={<BarChart2 size={14} />}
          title="Daily usage"
          description="How many AI-generated resumes you've used today."
        >
          <div className="flex flex-col gap-5">
            <UsageBar label="Job Match Resumes" data={matchAtsUsage} />
            <UsageBar label="Targeted Resumes" data={targetedUsage} />

            {!user.is_paid && !user.is_whitelisted && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3.5">
                <p className="text-xs font-semibold text-primary">Upgrade to Pro</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Get 15 Job Match Resumes and 10 Targeted Resumes per day. Limits reset daily at midnight Mountain Time.
                </p>
              </div>
            )}

            {(user.is_paid || user.is_whitelisted) && (
              <p className="text-xs text-muted-foreground">Limits reset daily at midnight Mountain Time.</p>
            )}
          </div>
        </Section>

        {/* Account */}
        <Section
          icon={<User size={14} />}
          title="Account"
          description="Your account details and current plan status."
        >
          <div className="flex flex-col gap-5">
            <div className="rounded-xl border border-border bg-muted/30 divide-y divide-border">
              <div className="flex items-center justify-between px-4 py-3.5">
                <span className="text-xs text-muted-foreground">Email</span>
                <span className="text-sm font-medium text-foreground">{user.email}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3.5">
                <span className="text-xs text-muted-foreground">Plan</span>
                <PlanBadge
                  isWhitelisted={user.is_whitelisted}
                  isPaid={user.is_paid}
                  trialExpired={user.trial_expired}
                />
              </div>
              {user.trial_expires_at && (
                <div className="flex items-center justify-between px-4 py-3.5">
                  <span className="text-xs text-muted-foreground">
                    {user.is_paid ? 'Plan expires' : 'Trial expires'}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {format(parseISO(user.trial_expires_at), 'MMM d, yyyy')}
                  </span>
                </div>
              )}
            </div>

            <Button
              variant="outline"
              className="self-start gap-2"
              onClick={() => openUserProfile()}
            >
              <User size={14} />
              Manage account
            </Button>
          </div>
        </Section>

      </div>
    </Container>

    {user.resume_url && (
      <PdfViewerModal
        open={viewingResume}
        onOpenChange={setViewingResume}
        url={user.resume_url}
        title="My Resume"
        downloadName="My Resume.pdf"
        getToken={getToken}
      />
    )}
    </>
  )
}
