import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: About,
})

function About() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-20">

      <section className="mb-16">
        <p className="mb-4 font-mono text-sm font-medium text-primary">About</p>
        <h1 className="mb-4 text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
          Built because job searching is broken.
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          EverApply started as a personal tool. Spending hours scrolling Indeed every day,
          opening the same kinds of roles, and realizing most of them weren't worth
          the time — that problem has a technical solution.
        </p>
      </section>

      <section className="mb-16 border-t border-border pt-12">
        <h2 className="mb-6 text-xl font-bold tracking-tight text-foreground">
          What it actually does
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {[
            ['Pulls listings daily', 'Fresh job postings are fetched automatically every morning so you don\'t have to.'],
            ['Scores against your resume', 'DeepSeek reads your resume and each job description, then gives a 0–100 match score with a short explanation.'],
            ['Filters your preferences', 'Remote, hybrid, onsite, location, salary range, clearance — set once, applied to everything.'],
            ['Surfaces only what fits', 'You see a ranked list of jobs that passed your filters and scored above your threshold. Everything else stays out.'],
          ].map(([title, desc]) => (
            <div key={title} className="rounded-lg border border-border bg-card p-5">
              <h3 className="mb-2 text-sm font-semibold text-foreground">{title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border pt-12">
        <h2 className="mb-6 text-xl font-bold tracking-tight text-foreground">
          Stack
        </h2>
        <div className="flex flex-wrap gap-2">
          {['React', 'TypeScript', 'TanStack Router', 'Tailwind CSS', 'shadcn/ui', 'DeepSeek AI', 'Python'].map((tech) => (
            <span
              key={tech}
              className="rounded border border-border bg-card px-3 py-1 font-mono text-xs text-muted-foreground"
            >
              {tech}
            </span>
          ))}
        </div>
      </section>

    </main>
  )
}
