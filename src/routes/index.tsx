import _ from 'lodash'
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import {
  Brain,
  RefreshCw,
  MapPin,
  ShieldOff,
  FileText,
  SlidersHorizontal,
  ListChecks,
  Sparkles,
  BookmarkCheck,
  Zap,
  Target,
  UserCheck,
  FlaskConical,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '#/components/ui/button'
import { useAuth } from '@clerk/clerk-react'
import { useEffect } from 'react'

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

const STEPS: Step[] = [
  {
    number: '01',
    title: 'Upload your resume',
    description: 'One upload. AI reads your skills, titles, and experience level.',
    icon: FileText,
  },
  {
    number: '02',
    title: 'Set your preferences',
    description: 'Remote, hybrid, or onsite. Location and clearance preference — set once.',
    icon: SlidersHorizontal,
  },
  {
    number: '03',
    title: 'Review your matches',
    description: 'Every morning, a fresh ranked list of jobs scored against your resume.',
    icon: ListChecks,
  },
  {
    number: '04',
    title: 'Apply with a tailored resume',
    description: 'Generate an ATS-optimized resume for any matched job in one click.',
    icon: Sparkles,
  },
]

const FEATURES: Feature[] = [
  {
    icon: Brain,
    title: 'AI scoring',
    description:
      'Every job gets a 0–100 match score against your resume. DeepSeek reads both and tells you exactly why it fits.',
  },
  {
    icon: RefreshCw,
    title: 'Daily updates',
    description:
      'Fresh listings pulled every morning. New matches land in your queue automatically — no manual searching.',
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
  {
    icon: Sparkles,
    title: '4 AI resume modes',
    description:
      'From auto-generated job match resumes to a full resume playground — four distinct AI modes to optimize, tailor, and benchmark your resume.',
  },
  {
    icon: BookmarkCheck,
    title: 'Pipeline tracking',
    description:
      'Save jobs for later, mark them applied, or dismiss them. Your queue stays clean and organized.',
  },
]

/* ─── Sections ───────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-24 text-center">
      <p className="mb-4 font-mono text-sm font-medium text-primary">
        AI-powered job matching
      </p>
      <h1 className="mx-auto mb-4 max-w-3xl text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
        Jobs scored.{' '}
        <span className="text-muted-foreground">Noise filtered.</span>{' '}
        Every morning.
      </h1>
      <p className="mx-auto mb-8 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
        EverApply pulls fresh job listings daily, scores every one 0–100
        against your resume, and surfaces only the matches worth your time.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button size="lg" className="font-semibold">
          Get started
        </Button>
        <Link
          to="/about"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          How it works
        </Link>
      </div>
    </section>
  )
}

function Screenshot() {
  return (
    <section className="mx-auto max-w-5xl px-4 pb-20">
      <div className="overflow-hidden rounded-xl border border-border shadow-2xl shadow-black/10 dark:shadow-black/40">
        {/* Light mode screenshot */}
        <img
          src="/screenshots/dashboard-light.png"
          alt="EverApply dashboard — job matches with AI scores"
          className="block w-full dark:hidden"
          width={1280}
          height={800}
        />
        {/* Dark mode screenshot */}
        <img
          src="/screenshots/dashboard-dark.png"
          alt="EverApply dashboard — job matches with AI scores"
          className="hidden w-full dark:block"
          width={1280}
          height={800}
        />
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
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          {_.map(STEPS, ({ number, title, description, icon: Icon }) => (
            <div key={number} className="flex gap-5">
              <div className="flex shrink-0 flex-col items-center">
                <span className="font-mono text-2xl font-bold leading-none text-primary">
                  {number}
                </span>
                <Icon size={16} className="mt-2 text-muted-foreground" />
              </div>
              <div>
                <h3 className="mb-1.5 text-base font-semibold text-foreground">
                  {title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </div>
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

const RESUME_MODES = [
  {
    icon: Zap,
    label: 'Automatic',
    title: 'Job Match ATS Resume',
    description:
      'Every job match gets a tailored ATS resume in one click. Your resume, rewritten to align with the specific job description — no fabrication, no fluff.',
  },
  {
    icon: Target,
    label: 'Manual',
    title: 'Targeted Resume',
    description:
      'Paste any job description and get a tailored version of your resume instantly. Same AI, fully on demand.',
  },
  {
    icon: UserCheck,
    label: 'Realistic',
    title: 'Boost My Resume',
    description:
      'Keeps your real info — name, companies, dates, education — but AI-generates optimized bullet points, skills, and summary to match the role perfectly.',
  },
  {
    icon: FlaskConical,
    label: 'Sandbox',
    title: 'Ideal Candidate',
    description:
      'Generates a completely fictional perfect candidate resume for any job. Use it to understand exactly what a top ATS resume looks like for a given role.',
  },
]

function ResumeModes() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-5xl px-4 py-20">
        <div className="mb-12">
          <p className="mb-2 font-mono text-sm font-medium text-primary">Resume generation</p>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Four AI modes. One platform.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Most tools do one thing. EverApply gives you four distinct ways to generate, optimize, and benchmark your resume — each powered by a separate AI prompt built for that specific use case.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {_.map(RESUME_MODES, ({ icon: Icon, label, title, description }) => (
            <div key={title} className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                  <Icon size={16} className="text-primary" />
                </div>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wider text-muted-foreground">
                  {label}
                </span>
              </div>
              <div>
                <h3 className="mb-1.5 text-sm font-semibold text-foreground">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
              </div>
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
  const { isSignedIn } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isSignedIn) navigate({ to: '/dashboard' })
  }, [isSignedIn, navigate])

  return (
    <main>
      <Hero />
      <Screenshot />
      <HowItWorks />
      <Features />
      <ResumeModes />
      <BottomCTA />
    </main>
  )
}
