import _ from 'lodash'
import { createFileRoute } from '@tanstack/react-router'
import {
  Brain,
  RefreshCw,
  MapPin,
  ShieldOff,
  FileText,
  SlidersHorizontal,
  ListChecks,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '#/components/ui/button'

export const Route = createFileRoute('/')({ component: LandingPage })

/* ─── Data ──────────────────────────────────────────────────────────────── */

interface Step {
  number: string
  title: string
  description: string
  icon: LucideIcon
}

interface Feature {
  icon: LucideIcon
  title: string
  description: string
}

interface MockMatch {
  score: number
  title: string
  company: string
  type: string
}

const STEPS: Step[] = [
  {
    number: '01',
    title: 'Upload your resume',
    description: 'One upload. AI extracts your skills, titles, and experience level.',
    icon: FileText,
  },
  {
    number: '02',
    title: 'Set your preferences',
    description: 'Remote, hybrid, or onsite. Location, salary range, clearance preference.',
    icon: SlidersHorizontal,
  },
  {
    number: '03',
    title: 'Review your matches',
    description: 'Every morning, a ranked list. Save, apply, or dismiss.',
    icon: ListChecks,
  },
]

const FEATURES: Feature[] = [
  {
    icon: Brain,
    title: 'AI scoring',
    description:
      'Every job gets a 0–100 match score against your resume. DeepSeek reads both and tells you why it fits.',
  },
  {
    icon: RefreshCw,
    title: 'Daily updates',
    description:
      'Fresh job listings pulled every morning. New matches land in your queue automatically — no manual searching.',
  },
  {
    icon: MapPin,
    title: 'Location & remote filter',
    description:
      "Set once. Remote, hybrid, or onsite. You never see a job that doesn't match your preference.",
  },
  {
    icon: ShieldOff,
    title: 'Clearance filter',
    description:
      'Mark clearance-required jobs as off-limits and they stay out of your queue entirely.',
  },
]

const MOCK_MATCHES: MockMatch[] = [
  { score: 94, title: 'Senior Software Engineer', company: 'Stripe', type: 'Remote' },
  { score: 87, title: 'Backend Engineer', company: 'Linear', type: 'Remote' },
  { score: 76, title: 'Software Engineer', company: 'Vercel', type: 'Hybrid' },
  { score: 58, title: 'Software Engineer II', company: 'Amazon', type: 'Onsite' },
]

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function scoreClass(score: number): string {
  if (score >= 80) return 'score-high'
  if (score >= 60) return 'score-mid'
  return 'score-low'
}

/* ─── Sections ───────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-12 px-4 py-24 lg:grid-cols-2">
      <div>
        <p className="mb-4 font-mono text-sm font-medium text-primary">
          AI-powered job matching
        </p>
        <h1 className="mb-4 text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
          Jobs scored.{' '}
          <span className="text-muted-foreground">Noise filtered.</span>{' '}
          Every morning.
        </h1>
        <p className="mb-8 text-base leading-relaxed text-muted-foreground sm:text-lg">
          EverApply pulls fresh job listings daily, scores every one 0–100
          against your resume, and surfaces only the matches worth your time.
        </p>
        <Button size="lg" className="font-semibold">
          Get started
        </Button>
      </div>

      {/* Mock match list */}
      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Today's matches
          </span>
          <span className="font-mono text-xs text-primary">
            {MOCK_MATCHES.length} new
          </span>
        </div>
        {_.map(MOCK_MATCHES, (match) => (
          <div key={match.company} className="job-row gap-3">
            <span className={`score-badge ${scoreClass(match.score)}`}>
              {match.score}
            </span>
            <div className="min-w-0 flex-1">
              <p className="job-row__title truncate">{match.title}</p>
              <p className="job-row__meta">{match.company}</p>
            </div>
            <span className="status-chip shrink-0" data-status="new">
              {match.type}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

function HowItWorks() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-5xl px-4 py-20">
        <h2 className="mb-12 text-2xl font-bold tracking-tight text-foreground">
          How it works
        </h2>
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
          {_.map(STEPS, ({ number, title, description, icon: Icon }) => (
            <div key={number}>
              <div className="mb-4 flex items-center gap-3">
                <span className="font-mono text-2xl font-bold text-primary">
                  {number}
                </span>
                <Icon size={18} className="text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-base font-semibold text-foreground">
                {title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Features() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-5xl px-4 py-20">
        <h2 className="mb-12 text-2xl font-bold tracking-tight text-foreground">
          What it does
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {_.map(FEATURES, ({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-lg border border-border bg-card p-6"
            >
              <Icon size={20} className="mb-4 text-primary" />
              <h3 className="mb-2 text-sm font-semibold text-foreground">
                {title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function BottomCTA() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-5xl px-4 py-20 text-center">
        <h2 className="mb-3 text-2xl font-bold tracking-tight text-foreground">
          Ready to stop searching?
        </h2>
        <p className="mb-8 text-sm text-muted-foreground">
          Upload your resume once. Get ranked matches every morning.
        </p>
        <Button size="lg" className="font-semibold">
          Get started
        </Button>
      </div>
    </section>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

function LandingPage() {
  return (
    <main>
      <Hero />
      <HowItWorks />
      <Features />
      <BottomCTA />
    </main>
  )
}
