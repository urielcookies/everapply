import type { ReactNode } from 'react'

interface ContainerProps {
  title: string
  children?: ReactNode
}

export default function Container({ title, children }: ContainerProps) {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="mb-8 text-2xl font-bold tracking-tight text-foreground">
        {title}
      </h1>
      {children}
    </main>
  )
}
