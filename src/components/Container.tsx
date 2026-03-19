import type { ReactNode } from 'react'

interface ContainerProps {
  title: string
  description?: string
  children?: ReactNode
}

export default function Container({ title, description, children }: ContainerProps) {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </main>
  )
}
